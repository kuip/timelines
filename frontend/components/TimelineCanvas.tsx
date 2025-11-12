'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { EventResponse } from '@/types';
import { calculateEventY, getDisplayableEvents, getFutureHorizonTime } from '@/lib/coordinateHelper';
import { useZoomThresholds } from '@/lib/useZoomThresholds';
import {
  TIME_UNITS,
  selectDisplayUnit,
  generateCalendarTicks,
  generateFixedUnitTicks,
  formatDateLabel,
  formatExtremityDateLabel,
  formatExtremityLabels,
} from '@/lib/tickGeneration';
import {
  CATEGORY_COLORS,
  drawTimelineLine,
  drawNowMarker,
  drawFutureHorizonMarker,
  drawFutureOverlay,
  drawTick,
  drawTickLabel,
  drawExtremityLabels,
  drawEventMarker,
  drawRelationshipArc,
} from '@/lib/canvasDrawing';
import {
  constrainTransform,
  createWheelHandler,
  createMouseDownHandler,
  type Transform,
} from '@/lib/canvasInteraction';

interface TimelineCanvasProps {
  events: EventResponse[];
  displayedCardEvents?: EventResponse[];
  onEventClick?: (event: EventResponse) => void;
  onTransformChange?: (transform: Transform) => void;
  onVisibleEventsChange?: (visibleEvents: EventResponse[]) => void;
  onCanvasClick?: (unixSeconds: number) => void;
  onShiftClick?: (unixSeconds: number) => void;
  onDimensionsChange?: (dimensions: { width: number; height: number }) => void;
  modalOpen?: boolean;
  initialTransform?: Transform;
  transform?: Transform;
}

interface EventRelationship {
  id: string;
  event_id_a: string;
  event_id_b: string;
  relationship_type: string;
  weight: number;
  description?: string;
}

const TimelineCanvas: React.FC<TimelineCanvasProps> = ({
  events,
  displayedCardEvents = [],
  onEventClick,
  onTransformChange,
  onVisibleEventsChange,
  onCanvasClick,
  onShiftClick,
  onDimensionsChange,
  modalOpen,
  initialTransform,
  transform: propsTransform,
}) => {
  const thresholds = useZoomThresholds();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  // Use propsTransform if provided by parent, otherwise manage locally
  const [localTransform, setLocalTransform] = useState<Transform>(initialTransform || { y: 0, k: 1 });
  const transform = propsTransform || localTransform;
  const setTransform = propsTransform ? () => {} : setLocalTransform; // No-op if using props
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const [imagesLoaded, setImagesLoaded] = useState(0);
  const [currentTime, setCurrentTime] = useState(Date.now() / 1000);
  const [relationships, setRelationships] = useState<EventRelationship[]>([]);

  const START_TIME = -435494878264400000;
  const END_TIME = 435457000000000000;
  const FUTURE_HORIZON_TIME = getFutureHorizonTime();

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now() / 1000);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Notify parent of transform changes (only in uncontrolled mode)
  // In controlled mode (propsTransform provided), don't notify parent since
  // the parent already manages the transform state and sends it back as props
  useEffect(() => {
    if (!propsTransform && onTransformChange) {
      onTransformChange(transform);
    }
  }, [transform, onTransformChange, propsTransform]);

  // Compute and notify parent of visible events
  useEffect(() => {
    if (dimensions.width === 0 || !onVisibleEventsChange) return;

    const margin = 0;
    const timelineHeight = dimensions.height - margin * 2;
    const timelineTop = margin;

    const visibleEvents = events.filter((event) => {
      const unixSeconds = typeof event.unix_seconds === 'number' ? event.unix_seconds : parseInt(event.unix_seconds as any);

      // At extreme zoom levels, use time-based visibility instead of Y-coordinate
      // because floating-point precision breaks down with huge multiplications
      if (transform.k > 1e6) {
        // For extreme zoom, calculate the visible time range
        const visibleTimeSpan = (END_TIME - START_TIME) / transform.k;
        const topTime = END_TIME - (Math.abs(transform.y) / timelineHeight) * visibleTimeSpan + timelineHeight * visibleTimeSpan / timelineHeight;
        const bottomTime = END_TIME - (Math.abs(transform.y) + timelineHeight) / timelineHeight * visibleTimeSpan - timelineHeight * visibleTimeSpan / timelineHeight;

        return unixSeconds >= Math.min(topTime, bottomTime) && unixSeconds <= Math.max(topTime, bottomTime);
      }

      // For normal zoom levels, use the standard Y-coordinate check
      const y = timelineTop + ((END_TIME - unixSeconds) / (END_TIME - START_TIME)) * timelineHeight * transform.k + transform.y;
      const isVisible = y >= 0 && y <= dimensions.height;

      return isVisible;
    });

    console.log('TimelineCanvas: Computing visible events', {
      totalEvents: events.length,
      visibleCount: visibleEvents.length,
      timelineHeight,
      transformK: transform.k,
      transformY: transform.y,
      dimensionsHeight: dimensions.height,
    });

    onVisibleEventsChange(visibleEvents);
  }, [dimensions, events, transform, onVisibleEventsChange]);

  // Memoize displayed card event IDs to avoid unnecessary fetches
  const memoizedDisplayedEventIds = useMemo(() => {
    if (!displayedCardEvents || !Array.isArray(displayedCardEvents) || displayedCardEvents.length === 0) {
      return [];
    }
    return displayedCardEvents.map(e => e.id);
  }, [displayedCardEvents]);

  // Fetch relationships only for displayed card events with memoization
  useEffect(() => {
    const fetchRelationshipsForDisplayedEvents = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

        // Only fetch relationships for displayed card events
        if (memoizedDisplayedEventIds.length === 0) {
          setRelationships([]);
          return;
        }

        // Fetch relationships only for displayed events
        const allRelationships: EventRelationship[] = [];
        const fetchedRelationshipIds = new Set<string>();

        for (const eventId of memoizedDisplayedEventIds) {
          try {
            const response = await fetch(`${apiUrl}/api/events/${eventId}/relationships`);
            if (!response.ok) continue;

            const data = await response.json();
            if (data.relationships && Array.isArray(data.relationships)) {
              for (const rel of data.relationships) {
                // Use a consistent key to avoid duplicates (A-B and B-A should be treated as same relationship)
                const key = [rel.event_id_a, rel.event_id_b].sort().join('-');
                if (!fetchedRelationshipIds.has(key)) {
                  allRelationships.push(rel);
                  fetchedRelationshipIds.add(key);
                }
              }
            }
          } catch (err) {
            console.warn(`Failed to fetch relationships for event ${eventId}:`, err);
            continue;
          }
        }

        setRelationships(allRelationships);
      } catch (err) {
        console.error('Error fetching relationships:', err);
      }
    };

    fetchRelationshipsForDisplayedEvents();
  }, [memoizedDisplayedEventIds]);

  // Update dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newDimensions = {
          width: rect.width,
          height: rect.height,
        };
        setDimensions(newDimensions);
        if (onDimensionsChange) {
          onDimensionsChange(newDimensions);
        }
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [onDimensionsChange]);

  // Main canvas drawing
  useEffect(() => {
    if (!canvasRef.current || dimensions.width === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get device pixel ratio for crisp text rendering
    const dpr = window.devicePixelRatio || 1;

    // Set canvas size with DPR for crisp rendering
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    canvas.style.width = dimensions.width + 'px';
    canvas.style.height = dimensions.height + 'px';

    // Scale context for DPR
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // Performance guard
    const visibleRangeCheck = (END_TIME - START_TIME) / transform.k;
    if (visibleRangeCheck < 1e-12) {
      return;
    }

    const margin = 0;
    const timelineX = dimensions.width / 2 + 43;
    const timelineHeight = dimensions.height - margin * 2;
    const timelineTop = margin;

    const yScale = (seconds: number): number => {
      return calculateEventY(seconds, timelineHeight, transform);
    };

    const realNowSeconds = Date.now() / 1000;
    const nowY = yScale(realNowSeconds);
    const futureHorizonY = yScale(FUTURE_HORIZON_TIME);
    const bigBangY = yScale(START_TIME);

    // Draw timeline line in two parts: normal opacity for past, reduced for future
    // Draw the full line from Big Bang to Now, clipping to screen bounds
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 2;

    // Past portion (from Big Bang to Now) - normal opacity
    // Note: Y increases downward, so Big Bang has higher Y than Now
    const pastStartY = Math.min(bigBangY, dimensions.height + 50);
    const pastEndY = Math.max(nowY, -50);
    ctx.beginPath();
    ctx.moveTo(timelineX, pastStartY);
    ctx.lineTo(timelineX, pastEndY);
    ctx.stroke();

    // Future portion (from Now to Future Horizon) - reduced opacity
    // Note: Y increases downward, so Now has higher Y than Future Horizon
    ctx.globalAlpha = 0.6;
    const futureStartY = Math.min(nowY, dimensions.height + 50);
    const futureEndY = Math.max(futureHorizonY, -50);
    ctx.beginPath();
    ctx.moveTo(timelineX, futureStartY);
    ctx.lineTo(timelineX, futureEndY);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Big Bang marker removed

    // Draw arc for all past: from Now to Big Bang at the edge of canvas (4px inset)
    const arcRadius = 30;
    const edgeX = 4;
    ctx.strokeStyle = 'rgba(155, 160, 163, 0.5)';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.8;

    ctx.beginPath();
    // Start from Now marker
    ctx.moveTo(timelineX, nowY);
    // Horizontal line to the left
    ctx.lineTo(edgeX + arcRadius, nowY);
    // Top arc (Now corner)
    ctx.quadraticCurveTo(edgeX, nowY, edgeX, nowY + arcRadius);
    // Vertical line down to Big Bang
    ctx.lineTo(edgeX, bigBangY - arcRadius);
    // Bottom arc (Big Bang corner)
    ctx.quadraticCurveTo(edgeX, bigBangY, edgeX + arcRadius, bigBangY);
    // Horizontal line back to timeline
    ctx.lineTo(timelineX, bigBangY);

    ctx.stroke();
    ctx.globalAlpha = 1;

    // NOW marker removed

    // Future overlay removed

    // Future Horizon marker removed

    // Draw ticks and labels
    const visibleRange = (END_TIME - START_TIME) / transform.k;
    const topSeconds = END_TIME - (Math.abs(transform.y) / timelineHeight) * visibleRange + timelineHeight * visibleRange / timelineHeight;
    const bottomSeconds = END_TIME - (Math.abs(transform.y) + timelineHeight) / timelineHeight * visibleRange - timelineHeight * visibleRange / timelineHeight;

    // Select unit based on zoom level using JSON thresholds
    const result = selectDisplayUnit(visibleRange, timelineHeight, 32);

    let unitToDisplay;
    let unitIndexToDisplay;
    let tickMinSpacing = 32; // Default

    // Find the first threshold where k is greater than the threshold value
    let matchedThreshold = null;
    for (const threshold of thresholds) {
      if (transform.k > threshold.k) {
        matchedThreshold = threshold;
        tickMinSpacing = threshold.minPixelSpacing; // Update the variable
        break;
      }
    }

    if (matchedThreshold) {
      // Use the matched threshold
      unitToDisplay = {
        quantity: matchedThreshold.quantity,
        unit: matchedThreshold.unit,
        seconds: matchedThreshold.seconds,
        precision: matchedThreshold.precision
      };
      unitIndexToDisplay = 0; // Will be set based on unit type
    } else {
      // Fallback to auto-selection
      unitToDisplay = result.unit;
      unitIndexToDisplay = result.index;
    }

    let ticksToRender: number[] = [];

    // tickMinSpacing is now set from the matched threshold above

    if (unitToDisplay.precision === 'century') {
      // For centuries, check if we should show decade ticks
      // Calculate spacing between decade ticks
      const decadeTicks = generateCalendarTicks(bottomSeconds, topSeconds, 'century', timelineHeight, tickMinSpacing);
      if (decadeTicks.length >= 2) {
        const y1 = yScale(decadeTicks[0]);
        const y2 = yScale(decadeTicks[1]);
        const pixelsPerDecade = Math.abs(y2 - y1);

        // Only show decade ticks if spacing > tickMinSpacing
        if (pixelsPerDecade > tickMinSpacing) {
          ticksToRender = decadeTicks;
        } else {
          // Use fixed unit ticks for centuries
          ticksToRender = generateFixedUnitTicks(bottomSeconds, topSeconds, unitToDisplay.seconds, timelineHeight, tickMinSpacing);
        }
      } else {
        ticksToRender = generateFixedUnitTicks(bottomSeconds, topSeconds, unitToDisplay.seconds, timelineHeight, tickMinSpacing);
      }
    } else if (unitToDisplay.precision === 'year' || unitToDisplay.precision === 'month') {
      ticksToRender = generateCalendarTicks(bottomSeconds, topSeconds, unitToDisplay.precision, timelineHeight, tickMinSpacing);
      if (ticksToRender.length === 0) {
        ticksToRender = generateFixedUnitTicks(bottomSeconds, topSeconds, unitToDisplay.seconds, timelineHeight, tickMinSpacing);
      }
    } else {
      ticksToRender = generateFixedUnitTicks(bottomSeconds, topSeconds, unitToDisplay.seconds, timelineHeight, tickMinSpacing);
    }

    const pixelsPerUnit = (unitToDisplay.seconds / visibleRange) * timelineHeight;

    // Always draw ticks if we have them, regardless of spacing
    if (ticksToRender.length > 0) {
      // Calculate actual spacing between rendered ticks
      let pixelsPerTick = 0;
      if (ticksToRender.length >= 2) {
        const y1 = yScale(ticksToRender[0]);
        const y2 = yScale(ticksToRender[1]);
        pixelsPerTick = Math.abs(y2 - y1);
      }

      for (const seconds of ticksToRender) {
        // Skip ticks outside the valid timeline range (before Big Bang or after Future Horizon)
        if (seconds < START_TIME || seconds > FUTURE_HORIZON_TIME) continue;

        const y = yScale(seconds);
        if (y < timelineTop - 500 || y > timelineTop + timelineHeight + 500) continue;

        // Apply reduced opacity for ticks in the future zone (between Now and Future Horizon)
        const isInFutureZone = seconds > realNowSeconds && seconds < FUTURE_HORIZON_TIME;
        ctx.globalAlpha = isInFutureZone ? 0.6 : 1;

        drawTick(ctx, y, timelineX);

        // Draw labels on every tick since spacing is already managed by tick generation
        const label = formatDateLabel(seconds, unitToDisplay.precision, unitToDisplay.unit, unitToDisplay.quantity);
        drawTickLabel(ctx, label, timelineX - 5, y);

        ctx.globalAlpha = 1; // Reset opacity
      }
    }

    // Draw extremity labels (always show them)
    const visibleTopTime = Math.max(START_TIME, Math.min(FUTURE_HORIZON_TIME, END_TIME - (Math.abs(transform.y) / timelineHeight) * visibleRange));
    const visibleBottomTime = Math.max(START_TIME, Math.min(FUTURE_HORIZON_TIME, END_TIME - (Math.abs(transform.y) + timelineHeight) / timelineHeight * visibleRange));

    let topLabel = '';
    let bottomLabel = '';

    // Check if we should show specialized boundary labels
    // Note: visibleTopTime is actually smaller (earlier) than visibleBottomTime (later)
    // because the timeline goes from Big Bang (past) at top to Future Horizon (future) at bottom
    const BOUNDARY_THRESHOLD = 365 * 86400 * 100; // 100 years in seconds
    const isAtStartBoundary = visibleBottomTime - START_TIME < BOUNDARY_THRESHOLD; // Near Big Bang (bottom of visible range is near Big Bang)
    const isAtEndBoundary = FUTURE_HORIZON_TIME - visibleTopTime < BOUNDARY_THRESHOLD; // Near Future Horizon (top of visible range is near Future Horizon)

    // Set boundary labels or use same formatting as ticks
    if (isAtStartBoundary) {
      bottomLabel = '"Before" Time';
    } else {
      // Use extremity formatting for bottom (earliest visible time) - shows year month day on one line
      bottomLabel = formatExtremityDateLabel(visibleBottomTime, unitToDisplay.precision, unitToDisplay.unit);
    }

    if (isAtEndBoundary) {
      topLabel = 'Far Future';
    } else {
      // Use extremity formatting for top (latest visible time) - shows year month day on one line
      topLabel = formatExtremityDateLabel(visibleTopTime, unitToDisplay.precision, unitToDisplay.unit);
    }

    // Draw event markers and images
    const eventPositions = events
      .map((event) => {
        const unixSeconds = typeof event.unix_seconds === 'number' ? event.unix_seconds : parseInt(event.unix_seconds as any);
        const y = yScale(unixSeconds);
        return { event, y };
      })
      .sort((a, b) => a.y - b.y);

    const displayableImageEvents = getDisplayableEvents(eventPositions, dimensions.height);

    // Draw event markers
    eventPositions.forEach(({ event, y }) => {
      const unixSeconds = typeof event.unix_seconds === 'number' ? event.unix_seconds : parseInt(event.unix_seconds as any);
      // Skip events outside valid timeline range
      if (unixSeconds < START_TIME || unixSeconds > FUTURE_HORIZON_TIME) return;

      if (y >= 0 && y <= dimensions.height) {
        const color = (event.category && CATEGORY_COLORS[event.category]) || '#3b82f6';
        drawEventMarker(ctx, y, timelineX, color);
      }
    });

    // Draw relationship arcs between linked events
    const visibleTimeRangeSeconds = Math.abs(visibleBottomTime - visibleTopTime);
    const drawnRelationships = new Set<string>();

    // Collect all relationships first to sort by time range
    const relationshipsToDrawArray: Array<{
      startY: number;
      endY: number;
      color: string;
      timeRangeSeconds: number;
      relationshipKey: string;
    }> = [];

    // Create a map for quick event lookup
    const eventMap = new Map(events.map(e => [e.id, e]));

    // Process relationships from the fetched relationships array
    relationships.forEach((rel) => {
      // Get both events involved in the relationship
      const eventA = eventMap.get(rel.event_id_a);
      const eventB = eventMap.get(rel.event_id_b);

      if (!eventA || !eventB) return;

      const unixSecondsA = typeof eventA.unix_seconds === 'number' ? eventA.unix_seconds : parseInt(eventA.unix_seconds as any);
      const unixSecondsB = typeof eventB.unix_seconds === 'number' ? eventB.unix_seconds : parseInt(eventB.unix_seconds as any);

      if (unixSecondsA < START_TIME || unixSecondsA > FUTURE_HORIZON_TIME) return;
      if (unixSecondsB < START_TIME || unixSecondsB > FUTURE_HORIZON_TIME) return;

      // Get Y positions
      const yA = yScale(unixSecondsA);
      const yB = yScale(unixSecondsB);

      // Only draw each relationship once
      const relationshipKey = [rel.event_id_a, rel.event_id_b].sort().join('-');
      if (drawnRelationships.has(relationshipKey)) return;
      drawnRelationships.add(relationshipKey);

      const timeRangeSeconds = Math.abs(unixSecondsB - unixSecondsA);
      const color = (eventA.category && CATEGORY_COLORS[eventA.category]) || '#3b82f6';

      // Always draw from later event (larger unixSeconds) to earlier event
      const isALater = unixSecondsA > unixSecondsB;
      const finalStartY = isALater ? yA : yB;
      const finalEndY = isALater ? yB : yA;

      // Only show relationship if events are at least 40px apart
      const verticalDistance = Math.abs(finalStartY - finalEndY);
      if (verticalDistance < 40) return;

      relationshipsToDrawArray.push({
        startY: finalStartY,
        endY: finalEndY,
        color,
        timeRangeSeconds,
        relationshipKey
      });
    });

    // Sort by time range (smallest first) so bigger relationships are drawn last with larger indices
    relationshipsToDrawArray.sort((a, b) => a.timeRangeSeconds - b.timeRangeSeconds);

    // Draw relationships with index based on sorted order
    relationshipsToDrawArray.forEach((rel, index) => {
      drawRelationshipArc(ctx, rel.startY, rel.endY, timelineX, rel.color, dimensions, rel.timeRangeSeconds, visibleTimeRangeSeconds, index);
    });

    // Images are now rendered in HTML cards in EventPanel instead of canvas

    // Draw arrow pointing up at NOW on the timeline (same color as timeline, peak at nowY)
    const arrowSize = 10.67; // 16 / 1.5 for 1.5x smaller
    ctx.fillStyle = '#d1d5db'; // same color as main timeline
    ctx.beginPath();
    ctx.moveTo(timelineX, nowY - 2); // arrow point (peak at now, 2px up)
    ctx.lineTo(timelineX - arrowSize / 2, nowY + arrowSize - 2); // left base
    ctx.lineTo(timelineX + arrowSize / 2, nowY + arrowSize - 2); // right base
    ctx.closePath();
    ctx.fill();

    // Draw extremity labels last (on top of everything)
    drawExtremityLabels(ctx, topLabel, bottomLabel, dimensions);
  }, [dimensions, events, transform, imagesLoaded, currentTime, START_TIME, END_TIME, JSON.stringify(relationships)]);

  // Handle zoom/pan - use state updater function and query canvas dimensions on demand
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const mouseY = e.clientY - rect.top;

      // Reduce zoom sensitivity by 1.5x (from 1.05/0.95 to 1.033/0.967)
      const delta = e.deltaY > 0 ? 1.033 : 0.967;

      setTransform((prevTransform) => {
        const newK = Math.max(1, Math.min(1e18, prevTransform.k * delta));
        const timelineHeight = canvas.clientHeight;
        const oldWorldY = (prevTransform.y - mouseY) / prevTransform.k;

        let newTransform: Transform = {
          y: oldWorldY * newK + mouseY,
          k: newK
        };

        const constrainer = (t: Transform) =>
          constrainTransform(t, { width: canvas.clientWidth, height: canvas.clientHeight }, START_TIME, END_TIME, FUTURE_HORIZON_TIME);

        newTransform = constrainer(newTransform);
        return newTransform;
      });
    };

    const handleMouseDown = (e: MouseEvent) => {
      const startY = e.clientY;
      const startX = e.clientX;
      let moved = false;
      let lastY = startY;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const totalDeltaY = moveEvent.clientY - startY;
        if (Math.abs(totalDeltaY) > 5) {
          moved = true;
        }

        if (moved) {
          const frameDeltaY = moveEvent.clientY - lastY;
          lastY = moveEvent.clientY;

          setTransform((prevTransform) => {
            let newTransform: Transform = { ...prevTransform, y: prevTransform.y + frameDeltaY };

            const constrainer = (t: Transform) =>
              constrainTransform(t, { width: canvas.clientWidth, height: canvas.clientHeight }, START_TIME, END_TIME, FUTURE_HORIZON_TIME);

            newTransform = constrainer(newTransform);
            return newTransform;
          });
        }
      };

      const handleMouseUp = (upEvent: MouseEvent) => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);

        // If it was a click (not a drag), check for event clicks
        if (!moved && Math.abs(upEvent.clientX - startX) < 5) {
          const rect = canvas.getBoundingClientRect();
          const clickX = upEvent.clientX - rect.left;
          const clickY = upEvent.clientY - rect.top;
          const timelineX = canvas.clientWidth / 2 + 35;
          const isShiftClick = upEvent.shiftKey;

          console.log('Click detected:', { clickX, clickY, timelineX, canvasWidth: canvas.clientWidth, canvasHeight: canvas.clientHeight, modalOpen, isShiftClick });

          // Calculate unix_seconds for ANY click on the timeline for debug purposes
          const margin = 0;
          const timelineTop = margin;
          const timelineHeight = canvas.clientHeight - margin * 2;
          const START_TIME = -435494878264400000;
          const END_TIME = 435457000000000000;
          const calculatedUnixSeconds = END_TIME - ((clickY - timelineTop - transform.y) / (timelineHeight * transform.k)) * (END_TIME - START_TIME);
          console.log('Unix seconds for this click would be:', calculatedUnixSeconds, { clickY, timelineTop, transform, timelineHeight });

          // Check if shift-click on timeline to create new event
          const distFromTimeline = Math.abs(clickX - timelineX);
          if (isShiftClick && onShiftClick && distFromTimeline < 40) {
            const unixSeconds = END_TIME - ((clickY - timelineTop - transform.y) / (timelineHeight * transform.k)) * (END_TIME - START_TIME);
            console.log('SHIFT-CLICK: Creating new event at unix_seconds:', unixSeconds);
            onShiftClick(unixSeconds);
            return;
          }

          // Check if click is near any event marker or image
          const eventRadius = 10;
          const displaySize = 100;

          for (const event of events) {
            const unixSeconds = typeof event.unix_seconds === 'number' ? event.unix_seconds : parseInt(event.unix_seconds as any);
            const yScale = (seconds: number): number => {
              return calculateEventY(seconds, canvas.clientHeight, transform);
            };
            const eventY = yScale(unixSeconds);

            // Check if click is on the event circle
            const distance = Math.sqrt(
              (clickX - timelineX) ** 2 + (clickY - eventY) ** 2
            );

            if (distance < eventRadius && onEventClick) {
              onEventClick(event);
              return;
            }

            // Check if click is on the event image
            const imgX = timelineX + 7;
            const imgY = eventY - displaySize / 2;
            if (
              clickX >= imgX &&
              clickX <= imgX + displaySize &&
              clickY >= imgY &&
              clickY <= imgY + displaySize &&
              onEventClick
            ) {
              onEventClick(event);
              return;
            }
          }

          // If modal is open and click is on the timeline (not on an event), call onCanvasClick
          console.log('Checking timeline click:', { modalOpen, onCanvasClick: !!onCanvasClick, distFromTimeline, threshold: 40, passes: distFromTimeline < 40 });

          if (modalOpen && onCanvasClick && distFromTimeline < 40) {
            // Convert pixel Y coordinate to unix_seconds
            const margin = 0;
            const timelineTop = margin;
            const timelineHeight = canvas.clientHeight - margin * 2;
            const START_TIME = -435494878264400000;
            const END_TIME = 435457000000000000;

            // Reverse the calculateEventY formula:
            // eventY = timelineTop + ((END_TIME - unixSeconds) / (END_TIME - START_TIME)) * timelineHeight * k + y
            // Solving for unixSeconds:
            // unixSeconds = END_TIME - ((eventY - timelineTop - y) / (timelineHeight * k)) * (END_TIME - START_TIME)
            const unixSeconds = END_TIME - ((clickY - timelineTop - transform.y) / (timelineHeight * transform.k)) * (END_TIME - START_TIME);
            console.log('CALLING onCanvasClick with:', unixSeconds);
            onCanvasClick(unixSeconds);
          }
        }
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);

    return () => {
      canvas.removeEventListener('wheel', handleWheel, { passive: false } as any);
      canvas.removeEventListener('mousedown', handleMouseDown);
    };
  }, [START_TIME, END_TIME, FUTURE_HORIZON_TIME, modalOpen, onCanvasClick, onShiftClick, events]);


  return (
    <div ref={containerRef} className="w-full h-full bg-gray-900 relative">
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-crosshair"
      />
    </div>
  );
};

export default TimelineCanvas;
