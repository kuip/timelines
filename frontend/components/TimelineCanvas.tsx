'use client';

import React, { useEffect, useRef, useState } from 'react';
import { EventResponse } from '@/types';
import { getEventImageUrl, calculateImageDimensions } from '@/lib/imageHelper';
import { calculateEventY, getDisplayableEvents, getFutureHorizonTime } from '@/lib/coordinateHelper';
import {
  TIME_UNITS,
  selectDisplayUnit,
  generateCalendarTicks,
  generateFixedUnitTicks,
  formatDateLabel,
  formatExtremityLabels,
} from '@/lib/tickGeneration';
import {
  CATEGORY_COLORS,
  drawTimelineLine,
  drawNowMarker,
  drawFutureOverlay,
  drawTick,
  drawTickLabel,
  drawExtremityLabels,
  drawEventMarker,
  drawRelationshipArc,
  drawEventImage,
} from '@/lib/canvasDrawing';
import {
  constrainTransform,
  createWheelHandler,
  createMouseDownHandler,
  type Transform,
} from '@/lib/canvasInteraction';

interface TimelineCanvasProps {
  events: EventResponse[];
  onEventClick?: (event: EventResponse) => void;
  onTransformChange?: (transform: Transform) => void;
  onVisibleEventsChange?: (visibleEvents: EventResponse[]) => void;
  onCanvasClick?: (unixSeconds: number) => void;
  modalOpen?: boolean;
  initialTransform?: Transform;
}

const TimelineCanvas: React.FC<TimelineCanvasProps> = ({
  events,
  onEventClick,
  onTransformChange,
  onVisibleEventsChange,
  onCanvasClick,
  modalOpen,
  initialTransform,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [transform, setTransform] = useState<Transform>(initialTransform || { y: 0, k: 1 });
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const [imagesLoaded, setImagesLoaded] = useState(0);
  const [currentTime, setCurrentTime] = useState(Date.now() / 1000);

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

  // Notify parent of transform changes
  useEffect(() => {
    if (onTransformChange) {
      onTransformChange(transform);
    }
  }, [transform, onTransformChange]);

  // Compute and notify parent of visible events
  useEffect(() => {
    if (dimensions.width === 0 || !onVisibleEventsChange) return;

    const margin = 0;
    const timelineHeight = dimensions.height - margin * 2;
    const timelineTop = margin;

    const visibleEvents = events.filter((event) => {
      const unixSeconds = typeof event.unix_seconds === 'number' ? event.unix_seconds : parseInt(event.unix_seconds as any);
      const y = timelineTop + ((END_TIME - unixSeconds) / (END_TIME - START_TIME)) * timelineHeight * transform.k + transform.y;
      return y >= 0 && y <= dimensions.height;
    });

    onVisibleEventsChange(visibleEvents);
  }, [dimensions, events, transform, onVisibleEventsChange, START_TIME, END_TIME]);

  // Update dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: rect.height,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Main canvas drawing
  useEffect(() => {
    if (!canvasRef.current || dimensions.width === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    canvas.style.width = dimensions.width + 'px';
    canvas.style.height = dimensions.height + 'px';
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
    const timelineX = dimensions.width / 2 + 35;
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

    // Draw Big Bang marker (dotted line on right side only)
    ctx.strokeStyle = 'rgba(155, 160, 163, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(timelineX, bigBangY);
    ctx.lineTo(dimensions.width, bigBangY);
    ctx.stroke();
    ctx.setLineDash([]);

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

    // Draw NOW marker (dotted line and info box)
    drawNowMarker(ctx, nowY, timelineX, dimensions);

    // Draw reduced opacity zone from Now to Future Horizon
    if (futureHorizonY < nowY) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, futureHorizonY, dimensions.width, nowY - futureHorizonY);
    }

    // Draw Future Horizon line and label (50% gray, right side only)
    ctx.strokeStyle = 'rgba(155, 160, 163, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(timelineX, futureHorizonY);
    ctx.lineTo(dimensions.width, futureHorizonY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Future Horizon label (50% gray)
    ctx.fillStyle = 'rgba(155, 160, 163, 0.5)';
    ctx.font = '10px "Roboto Condensed", sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Future Horizon', dimensions.width - 5, futureHorizonY - 5);

    // Draw ticks and labels
    const visibleRange = (END_TIME - START_TIME) / transform.k;
    const topSeconds = END_TIME - (Math.abs(transform.y) / timelineHeight) * visibleRange + timelineHeight * visibleRange / timelineHeight;
    const bottomSeconds = END_TIME - (Math.abs(transform.y) + timelineHeight) / timelineHeight * visibleRange - timelineHeight * visibleRange / timelineHeight;

    const { unit: unitToDisplay, index: unitIndexToDisplay } = selectDisplayUnit(visibleRange, timelineHeight);

    let ticksToRender: number[] = [];

    if (unitToDisplay.precision === 'century') {
      // For centuries, check if we should show decade ticks
      // Calculate spacing between decade ticks
      const decadeTicks = generateCalendarTicks(bottomSeconds, topSeconds, 'century');
      if (decadeTicks.length >= 2) {
        const y1 = yScale(decadeTicks[0]);
        const y2 = yScale(decadeTicks[1]);
        const pixelsPerDecade = Math.abs(y2 - y1);

        // Only show decade ticks if spacing > 20px
        if (pixelsPerDecade > 20) {
          ticksToRender = decadeTicks;
        } else {
          // Use fixed unit ticks for centuries
          ticksToRender = generateFixedUnitTicks(bottomSeconds, topSeconds, unitToDisplay.seconds);
        }
      } else {
        ticksToRender = generateFixedUnitTicks(bottomSeconds, topSeconds, unitToDisplay.seconds);
      }
    } else if (unitToDisplay.precision === 'year' || unitToDisplay.precision === 'month') {
      ticksToRender = generateCalendarTicks(bottomSeconds, topSeconds, unitToDisplay.precision);
      if (ticksToRender.length === 0) {
        ticksToRender = generateFixedUnitTicks(bottomSeconds, topSeconds, unitToDisplay.seconds);
      }
    } else {
      ticksToRender = generateFixedUnitTicks(bottomSeconds, topSeconds, unitToDisplay.seconds);
    }

    const pixelsPerUnit = (unitToDisplay.seconds / visibleRange) * timelineHeight;

    // Always draw ticks if we have them, regardless of spacing
    if (ticksToRender.length > 0) {
      for (const seconds of ticksToRender) {
        // Skip ticks outside the valid timeline range (before Big Bang or after Future Horizon)
        if (seconds < START_TIME || seconds > FUTURE_HORIZON_TIME) continue;

        const y = yScale(seconds);
        if (y < timelineTop - 50 || y > timelineTop + timelineHeight + 50) continue;

        // Apply reduced opacity for ticks in the future zone (between Now and Future Horizon)
        const isInFutureZone = seconds > realNowSeconds && seconds < FUTURE_HORIZON_TIME;
        ctx.globalAlpha = isInFutureZone ? 0.6 : 1;

        drawTick(ctx, y, timelineX);

        // For year precision, only label years divisible by 10
        let shouldDrawLabel = false;
        if (unitToDisplay.precision === 'year') {
          try {
            const MAX_DATE_MS = 8.64e15;
            const tickMs = Math.max(-MAX_DATE_MS, Math.min(MAX_DATE_MS, seconds * 1000));
            const tickDate = new Date(tickMs);
            if (!isNaN(tickDate.getTime())) {
              const year = tickDate.getUTCFullYear();
              shouldDrawLabel = year % 10 === 0;
            }
          } catch {
            // Don't draw label
          }
        } else {
          shouldDrawLabel = pixelsPerUnit > 24;
        }

        if (shouldDrawLabel) {
          const label = formatDateLabel(seconds, unitToDisplay.precision, unitToDisplay.unit);
          drawTickLabel(ctx, label, timelineX - 5, y);
        }

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
      // Use same formatting as ticks for bottom (earliest visible time)
      bottomLabel = formatDateLabel(visibleBottomTime, unitToDisplay.precision, unitToDisplay.unit);
    }

    if (isAtEndBoundary) {
      topLabel = 'Far Future';
    } else {
      // Use same formatting as ticks for top (latest visible time)
      topLabel = formatDateLabel(visibleTopTime, unitToDisplay.precision, unitToDisplay.unit);
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

    eventPositions.forEach(({ event, y: startY }) => {
      if (!event.related_event_id) return;

      const unixSeconds = typeof event.unix_seconds === 'number' ? event.unix_seconds : parseInt(event.unix_seconds as any);
      if (unixSeconds < START_TIME || unixSeconds > FUTURE_HORIZON_TIME) return;

      // Find the related event
      const relatedEvent = events.find(e => e.id === event.related_event_id);
      if (!relatedEvent) return;

      const relatedUnixSeconds = typeof relatedEvent.unix_seconds === 'number' ? relatedEvent.unix_seconds : parseInt(relatedEvent.unix_seconds as any);
      if (relatedUnixSeconds < START_TIME || relatedUnixSeconds > FUTURE_HORIZON_TIME) return;

      // Only draw each relationship once by using a consistent ordering
      const relationshipKey = [event.id, event.related_event_id].sort().join('-');
      if (drawnRelationships.has(relationshipKey)) return;
      drawnRelationships.add(relationshipKey);

      const endY = yScale(relatedUnixSeconds);
      const color = (event.category && CATEGORY_COLORS[event.category]) || '#3b82f6';
      const timeRangeSeconds = Math.abs(relatedUnixSeconds - unixSeconds);

      // Always draw from later event (larger unixSeconds) to earlier event
      const isEventLater = unixSeconds > relatedUnixSeconds;
      const finalStartY = isEventLater ? startY : endY;
      const finalEndY = isEventLater ? endY : startY;

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

    // Draw event images
    eventPositions.forEach(({ event, y }) => {
      const unixSeconds = typeof event.unix_seconds === 'number' ? event.unix_seconds : parseInt(event.unix_seconds as any);
      // Skip images outside valid timeline range
      if (unixSeconds < START_TIME || unixSeconds > FUTURE_HORIZON_TIME) return;

      if (y < -150 || y > dimensions.height + 150) return;
      if (!displayableImageEvents.has(event.id)) return;

      const imageUrl = getEventImageUrl(event);
      if (!imageUrl) return;

      let img = imageCache.current.get(imageUrl);

      if (!img) {
        const newImg = new Image();
        newImg.crossOrigin = 'anonymous';
        newImg.onload = () => {
          imageCache.current.set(imageUrl, newImg);
          setImagesLoaded(prev => prev + 1);
        };
        newImg.onerror = () => {
          console.warn(`Failed to load image: ${imageUrl}`);
        };
        newImg.src = imageUrl;
      } else {
        // Always display images at the same 100px size for consistency with HTML cards
        const DISPLAY_SIZE = 100;
        drawEventImage(ctx, img, y, timelineX, DISPLAY_SIZE);
      }
    });

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
  }, [dimensions, events, transform, imagesLoaded, currentTime, START_TIME, END_TIME]);

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
          if (modalOpen && onCanvasClick && Math.abs(clickX - timelineX) < 40) {
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
            console.log('Timeline click detected:', { clickX, timelineX, clickY, unixSeconds, modalOpen, transform, timelineHeight });
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
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
    };
  }, [START_TIME, END_TIME, FUTURE_HORIZON_TIME]);

  return (
    <div ref={containerRef} className="w-full h-full bg-gray-900">
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-crosshair"
      />
    </div>
  );
};

export default TimelineCanvas;
