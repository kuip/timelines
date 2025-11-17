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
  getCategoryColor,
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
import { apiCache } from '@/lib/apiCache';

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

  // Use ref to always have current transform in event handlers
  const transformRef = useRef(transform);
  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  // Update transform - either through parent callback or local state
  const updateTransform = (newTransform: Transform) => {
    if (propsTransform && onTransformChange) {
      onTransformChange(newTransform);
    } else {
      setLocalTransform(newTransform);
    }
  };
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const [imagesLoaded, setImagesLoaded] = useState(0);
  const [currentTime, setCurrentTime] = useState(Date.now() / 1000);
  const [relationships, setRelationships] = useState<EventRelationship[]>([]);
  const fetchedEventIdsRef = useRef<Set<string>>(new Set()); // Cache which events we've fetched relationships for

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
    if (dimensions.width === 0 || !onVisibleEventsChange) {
      return;
    }

    const margin = 0;
    const timelineHeight = dimensions.height - margin * 2;
    const timelineTop = margin;

    const visibleEvents = events.filter((event) => {
      const unixSeconds = typeof event.unix_seconds === 'number' ? event.unix_seconds : parseInt(event.unix_seconds as any);

      // At extreme zoom levels, use time-based visibility instead of Y-coordinate
      // because floating-point precision breaks down with huge multiplications
      if (transform.k > 1e6) {
        // Calculate visible time range using the same coordinate system
        const referenceY = timelineHeight / 3;
        const topTime = transform.y + (referenceY * transform.k); // Top of screen (Y=0)
        const bottomTime = transform.y - ((timelineHeight - referenceY) * transform.k); // Bottom of screen

        return unixSeconds >= Math.min(topTime, bottomTime) && unixSeconds <= Math.max(topTime, bottomTime);
      }

      // For normal zoom levels, use the standard Y-coordinate check
      const y = calculateEventY(unixSeconds, timelineHeight, transform);
      return y >= 0 && y <= dimensions.height;
    });

    onVisibleEventsChange(visibleEvents);
  }, [dimensions, events, transform, onVisibleEventsChange]);

  // Track visible events for relationship fetching
  const [visibleEventsForRelationships, setVisibleEventsForRelationships] = useState<EventResponse[]>([]);

  // Update visible events when visibility changes
  useEffect(() => {
    if (dimensions.width === 0) return;

    const margin = 0;
    const timelineHeight = dimensions.height - margin * 2;

    const visible = events.filter((event) => {
      const unixSeconds = typeof event.unix_seconds === 'number' ? event.unix_seconds : parseInt(event.unix_seconds as any);

      if (transform.k > 1e6) {
        const referenceY = timelineHeight / 3;
        const topTime = transform.y + (referenceY * transform.k);
        const bottomTime = transform.y - ((timelineHeight - referenceY) * transform.k);
        return unixSeconds >= Math.min(topTime, bottomTime) && unixSeconds <= Math.max(topTime, bottomTime);
      }

      const y = calculateEventY(unixSeconds, timelineHeight, transform);
      return y >= 0 && y <= dimensions.height;
    });

    setVisibleEventsForRelationships(visible);
  }, [dimensions, events, transform]);

  // Memoize visible event IDs for relationship fetching
  const memoizedVisibleEventIdsStr = useMemo(() => {
    if (!visibleEventsForRelationships || visibleEventsForRelationships.length === 0) {
      return '';
    }
    return visibleEventsForRelationships.map(e => e.id).join(',');
  }, [visibleEventsForRelationships]);

  // Fetch relationships for visible events
  useEffect(() => {
    const fetchRelationshipsForVisibleEvents = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

        // Only fetch relationships if we have events
        if (memoizedVisibleEventIdsStr.length === 0) {
          setRelationships([]);
          fetchedEventIdsRef.current.clear();
          return;
        }

        // Parse event IDs from the memoized string
        const eventIds = memoizedVisibleEventIdsStr.split(',');

        // Check if we need to re-fetch (visible events changed completely)
        const currentIds = new Set(eventIds);
        const previouslyFetchedIds = Array.from(fetchedEventIdsRef.current);
        const hasOverlap = previouslyFetchedIds.some(id => currentIds.has(id));

        // If no overlap with previously fetched events, clear the cache and relationships
        if (previouslyFetchedIds.length > 0 && !hasOverlap) {
          fetchedEventIdsRef.current.clear();
          setRelationships([]);
        }

        // Only fetch for NEW events we haven't seen before
        const newEventIds = eventIds.filter(id => !fetchedEventIdsRef.current.has(id));

        if (newEventIds.length === 0) {
          // No new events to fetch, don't make any API calls
          return;
        }

        // Fetch relationships only for the NEW events
        const allRelationships: EventRelationship[] = [];
        const fetchedRelationshipIds = new Set<string>();

        for (const eventId of newEventIds) {
          try {
            // Skip special events that don't have database entries
            if (eventId === 'now' || eventId === 'future-horizon') {
              fetchedEventIdsRef.current.add(eventId);
              continue;
            }

            // Use cache for relationship fetching (5 minute TTL)
            const data = await apiCache.fetch(
              `relationships:${eventId}`,
              async () => {
                const response = await fetch(`${apiUrl}/api/events/${eventId}/relationships`);
                if (!response.ok) throw new Error('Failed to fetch');
                return response.json();
              },
              5 * 60 * 1000 // 5 minutes
            ).catch(() => ({ relationships: [] }));
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
            // Mark this event as fetched
            fetchedEventIdsRef.current.add(eventId);
          } catch (err) {
            console.warn(`Failed to fetch relationships for event ${eventId}:`, err);
            // Still mark as attempted to avoid retrying failed events
            fetchedEventIdsRef.current.add(eventId);
            continue;
          }
        }

        // Append new relationships to existing ones
        setRelationships(prev => [...prev, ...allRelationships]);
      } catch (err) {
        console.error('Error fetching relationships:', err);
      }
    };

    fetchRelationshipsForVisibleEvents();
  }, [memoizedVisibleEventIdsStr]);

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

    // Add ResizeObserver to watch the container element itself
    // This catches size changes from CSS media queries and dynamic styling
    let resizeObserver: ResizeObserver | null = null;
    if (containerRef.current) {
      resizeObserver = new ResizeObserver(updateDimensions);
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateDimensions);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
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

    // Clear - use theme-aware background color
    const isDark = document.documentElement.classList.contains('dark');
    ctx.fillStyle = isDark ? '#111827' : '#fafaf9'; // stone-50
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // Performance guard
    const visibleRangeCheck = (END_TIME - START_TIME) / transform.k;
    if (visibleRangeCheck < 1e-12) {
      return;
    }

    const margin = 0;
    const eventCircleRadius = 10; // Event marker radius
    const timelineX = dimensions.width - eventCircleRadius - 2; // 2px padding from edge
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
    ctx.strokeStyle = isDark ? '#d1d5db' : '#4b5563';
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
    ctx.strokeStyle = isDark ? 'rgba(155, 160, 163, 0.5)' : 'rgba(75, 85, 99, 0.5)';
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
    // Calculate visible time range from transform
    // Past is DOWN (higher Y), future is UP (lower Y)
    const referenceY = timelineHeight / 3;
    const topSeconds = transform.y + (referenceY * transform.k); // Top of screen (Y=0) is future
    const bottomSeconds = transform.y - ((timelineHeight - referenceY) * transform.k); // Bottom is past
    const visibleRange = Math.abs(topSeconds - bottomSeconds);

    // Select unit based on zoom level using JSON thresholds
    const result = selectDisplayUnit(visibleRange, timelineHeight, 32);

    let unitToDisplay;
    let unitIndexToDisplay;
    let tickMinSpacing = 32; // Default

    // Find the first threshold where k is greater than or equal to the threshold value
    // Thresholds are ordered from largest k to smallest k
    let matchedThreshold = null;
    for (const threshold of thresholds) {
      if (transform.k >= threshold.k) {
        matchedThreshold = threshold;
        tickMinSpacing = threshold.minPixelSpacing;
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
      // NOTE: bottomSeconds is in the past (smaller timestamp), topSeconds is in the future (larger timestamp)
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

    // Always draw ticks if we have them, with minimum spacing constraints
    if (ticksToRender.length > 0) {
      const MIN_LABEL_SPACING = 100; // Minimum 100px between labels
      let lastLabelY = -Infinity;

      for (const seconds of ticksToRender) {
        // Skip ticks outside the valid timeline range (before Big Bang or after Future Horizon)
        if (seconds < START_TIME || seconds > FUTURE_HORIZON_TIME) continue;

        const y = yScale(seconds);
        if (y < timelineTop - 500 || y > timelineTop + timelineHeight + 500) continue;

        // Apply reduced opacity for ticks in the future zone (between Now and Future Horizon)
        const isInFutureZone = seconds > realNowSeconds && seconds < FUTURE_HORIZON_TIME;
        ctx.globalAlpha = isInFutureZone ? 0.6 : 1;

        // Always draw the tick mark (minimum 24px spacing is enforced by tick generation)
        drawTick(ctx, y, timelineX);

        // Only draw label if it's at least 100px from the last label
        if (Math.abs(y - lastLabelY) >= MIN_LABEL_SPACING) {
          const label = formatDateLabel(seconds, unitToDisplay.precision, unitToDisplay.unit, unitToDisplay.quantity);
          drawTickLabel(ctx, label, timelineX - 5, y);
          lastLabelY = y;
        }

        ctx.globalAlpha = 1; // Reset opacity
      }
    }

    // Draw extremity labels (always show them)
    const visibleTopTime = Math.max(START_TIME, Math.min(FUTURE_HORIZON_TIME, topSeconds));
    const visibleBottomTime = Math.max(START_TIME, Math.min(FUTURE_HORIZON_TIME, bottomSeconds));

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
        const color = getCategoryColor(event.category);
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

      // Only draw each relationship once
      const relationshipKey = [rel.event_id_a, rel.event_id_b].sort().join('-');
      if (drawnRelationships.has(relationshipKey)) return;
      drawnRelationships.add(relationshipKey);

      const timeRangeSeconds = Math.abs(unixSecondsB - unixSecondsA);
      const color = getCategoryColor(eventA.category);

      // Calculate Y positions with higher precision for extreme zoom
      // At extreme zoom (k > 1e6), calculate pixel distance directly from time difference
      let yA, yB, verticalDistance;

      if (transform.k > 1e6) {
        // High precision mode: calculate relative positions
        const referenceY = timelineHeight / 3;
        const laterTime = Math.max(unixSecondsA, unixSecondsB);
        const earlierTime = Math.min(unixSecondsA, unixSecondsB);

        // Calculate Y for later event (more recent, higher Y value in screen coords)
        const laterOffsetFromCenter = laterTime - transform.y;
        const laterPixelOffset = -laterOffsetFromCenter / transform.k;
        const laterY = referenceY + laterPixelOffset;

        // Calculate Y for earlier event directly from the time difference
        const timeDiff = laterTime - earlierTime;
        const pixelSpan = timeDiff / transform.k;
        const earlierY = laterY + pixelSpan; // Earlier is further down (higher Y)

        // Assign to yA and yB based on which is which
        yA = unixSecondsA === laterTime ? laterY : earlierY;
        yB = unixSecondsB === laterTime ? laterY : earlierY;
        verticalDistance = Math.abs(pixelSpan);
      } else {
        // Normal mode: use standard yScale
        yA = yScale(unixSecondsA);
        yB = yScale(unixSecondsB);
        verticalDistance = Math.abs(yA - yB);
      }

      // Always draw from later event (larger unixSeconds) to earlier event
      const isALater = unixSecondsA > unixSecondsB;
      const finalStartY = isALater ? yA : yB;
      const finalEndY = isALater ? yB : yA;

      // Only show relationship if events are at least 40px apart
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

    // Draw arrow pointing up at NOW on the timeline (gray color matching now.svg icon)
    const arrowSize = 10.67; // 16 / 1.5 for 1.5x smaller
    ctx.fillStyle = '#808080'; // same color as now.svg icon
    ctx.beginPath();
    ctx.moveTo(timelineX, nowY - 2); // arrow point (peak at now, 2px up)
    ctx.lineTo(timelineX - arrowSize / 2, nowY + arrowSize - 2); // left base
    ctx.lineTo(timelineX + arrowSize / 2, nowY + arrowSize - 2); // right base
    ctx.closePath();
    ctx.fill();

    // Draw extremity labels last (on top of everything)
    drawExtremityLabels(ctx, topLabel, bottomLabel, dimensions, isDark);
  }, [dimensions, events, transform, imagesLoaded, currentTime, START_TIME, END_TIME, JSON.stringify(relationships)]);

  // Handle zoom/pan - use state updater function and query canvas dimensions on demand
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const currentTransform = transformRef.current;
      const rect = canvas.getBoundingClientRect();
      const mouseY = e.clientY - rect.top;

      // Calculate the timestamp at the mouse position (before zoom)
      const referenceY = canvas.clientHeight / 3;
      const pixelOffset = mouseY - referenceY;
      const timestampAtMouse = currentTransform.y - (pixelOffset * currentTransform.k);

      // Reduce zoom sensitivity by 1.5x (from 1.05/0.95 to 1.033/0.967)
      const delta = e.deltaY > 0 ? 1.033 : 0.967;
      const newK = Math.max(1, Math.min(1e18, currentTransform.k * delta));

      // Keep the same timestamp at the mouse position after zoom
      // Reverse: unixSeconds = transform.y - (pixelOffset * k)
      // So: transform.y = unixSeconds + (pixelOffset * k)
      const newReferenceTimestamp = timestampAtMouse + (pixelOffset * newK);

      let newTransform: Transform = {
        y: newReferenceTimestamp,
        k: newK
      };

      const constrainer = (t: Transform) =>
        constrainTransform(t, { width: canvas.clientWidth, height: canvas.clientHeight }, START_TIME, END_TIME, FUTURE_HORIZON_TIME);

      newTransform = constrainer(newTransform);
      updateTransform(newTransform);
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

          const currentTransform = transformRef.current;
          // Panning: dragging down pulls timeline down (shows future), dragging up pulls timeline up (shows past)
          // Positive deltaY (drag down) should increase transform.y (center moves to future)
          const timestampDelta = frameDeltaY * currentTransform.k;

          let newTransform: Transform = { ...currentTransform, y: currentTransform.y + timestampDelta };

          const constrainer = (t: Transform) =>
            constrainTransform(t, { width: canvas.clientWidth, height: canvas.clientHeight }, START_TIME, END_TIME, FUTURE_HORIZON_TIME);

          newTransform = constrainer(newTransform);
          updateTransform(newTransform);
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
          const eventCircleRadius = 10;
          const timelineX = canvas.clientWidth - eventCircleRadius - 2;
          const isShiftClick = upEvent.shiftKey;

          // Check if shift-click on timeline to create new event
          const distFromTimeline = Math.abs(clickX - timelineX);
          if (isShiftClick && onShiftClick && distFromTimeline < 40) {
            // Convert pixel Y to unix_seconds using reverse of calculateEventY
            // pixelOffset = -timestampOffset / k, so timestampOffset = -pixelOffset * k
            const currentTransform = transformRef.current;
            const referenceY = canvas.clientHeight / 3;
            const pixelOffset = clickY - referenceY;
            const unixSeconds = currentTransform.y - (pixelOffset * currentTransform.k);
            onShiftClick(unixSeconds);
            return;
          }

          // Check if click is near any event marker or image
          const eventRadius = 10;
          const displaySize = 100;

          const currentTransform = transformRef.current;
          for (const event of events) {
            const unixSeconds = typeof event.unix_seconds === 'number' ? event.unix_seconds : parseInt(event.unix_seconds as any);
            const yScale = (seconds: number): number => {
              return calculateEventY(seconds, canvas.clientHeight, currentTransform);
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
            // Reverse the calculateEventY formula:
            // eventY = referenceY + (-timestampOffset / k)
            // pixelOffset = eventY - referenceY = -timestampOffset / k
            // timestampOffset = -pixelOffset * k
            // unixSeconds = transform.y + timestampOffset = transform.y - pixelOffset * k
            const currentTransform = transformRef.current;
            const referenceY = canvas.clientHeight / 3;
            const pixelOffset = clickY - referenceY;
            const unixSeconds = currentTransform.y - (pixelOffset * currentTransform.k);
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
  }, [START_TIME, END_TIME, FUTURE_HORIZON_TIME, modalOpen, onCanvasClick, onShiftClick, events, updateTransform]);


  return (
    <div ref={containerRef} className="w-full h-full bg-stone-50 dark:bg-gray-900 relative">
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-crosshair"
      />
    </div>
  );
};

export default TimelineCanvas;
