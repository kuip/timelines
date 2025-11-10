'use client';

import React, { useEffect, useRef, useState } from 'react';
import { EventResponse } from '@/types';

interface TimelineCanvasProps {
  events: EventResponse[];
  onEventClick?: (event: EventResponse) => void;
  onTransformChange?: (transform: { y: number; k: number }) => void;
  onVisibleEventsChange?: (visibleEvents: EventResponse[]) => void;
  initialTransform?: { y: number; k: number };
}

const TIME_UNITS = [
  { quantity: 1, unit: 'M years', seconds: 1e6 * 31536000 },
  { quantity: 100, unit: 'years', seconds: 100 * 31536000 },
  { quantity: 10, unit: 'years', seconds: 10 * 31536000 },
  { quantity: 1, unit: 'year', seconds: 31536000 },
  { quantity: 1, unit: 'month', seconds: 31536000 / 12 },
  { quantity: 1, unit: 'day', seconds: 86400 },
  { quantity: 1, unit: 'hour', seconds: 3600 },
  { quantity: 1, unit: 'min', seconds: 60 },
  { quantity: 1, unit: 'sec', seconds: 1 },
];

const CATEGORY_COLORS: Record<string, string> = {
  cosmic: '#8b5cf6',      // purple
  geological: '#f59e0b',  // amber
  biological: '#10b981',  // emerald
  historical: '#ef4444',  // red
  political: '#3b82f6',   // blue
  technological: '#06b6d4', // cyan
  contemporary: '#ec4899', // pink
};

const TimelineCanvas: React.FC<TimelineCanvasProps> = ({ events, onEventClick, onTransformChange, onVisibleEventsChange, initialTransform }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [transform, setTransform] = useState(initialTransform || { y: 0, k: 1 });

  // START_TIME should be before Big Bang, END_TIME should be far future
  // Unix Epoch Big Bang is approximately -435494878264400000 seconds
  const START_TIME = -435494878264400000; // Big Bang in Unix seconds
  const END_TIME = 435457000000000000; // Far future (same as old timeline_seconds range)

  // Notify parent of transform changes
  useEffect(() => {
    if (onTransformChange) {
      onTransformChange(transform);
    }
  }, [transform, onTransformChange]);

  // Compute and notify parent of visible events
  useEffect(() => {
    if (dimensions.width === 0 || !onVisibleEventsChange) return;

    const margin = 20;
    const timelineHeight = dimensions.height - margin * 2;
    const timelineTop = margin;

    const visibleEvents = events.filter((event) => {
      const unixSeconds = typeof event.unix_seconds === 'number' ? event.unix_seconds : parseInt(event.unix_seconds as any);
      const y = timelineTop + ((END_TIME - unixSeconds) / (END_TIME - START_TIME)) * timelineHeight * transform.k + transform.y;
      return y >= timelineTop && y <= timelineTop + timelineHeight;
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

  // Draw canvas
  useEffect(() => {
    if (!canvasRef.current || dimensions.width === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    canvas.style.width = dimensions.width + 'px';
    canvas.style.height = dimensions.height + 'px';
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    const margin = 20;
    const timelineX = dimensions.width / 2;
    const timelineHeight = dimensions.height - margin * 2;
    const timelineTop = margin;

    // Y scale
    const yScale = (seconds: number): number => {
      return timelineTop + ((END_TIME - seconds) / (END_TIME - START_TIME)) * timelineHeight * transform.k + transform.y;
    };

    // Draw main timeline line
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(timelineX, timelineTop);
    ctx.lineTo(timelineX, timelineTop + timelineHeight);
    ctx.stroke();

    // Draw time unit labels and ticks with hierarchical multi-scale formatting
    const visibleRange = (END_TIME - START_TIME) / transform.k;
    const centerSeconds = END_TIME - (Math.abs(transform.y) / timelineHeight) * visibleRange;

    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px "Roboto Condensed", sans-serif';
    ctx.textAlign = 'right';

    // Helper function to format unix seconds as date
    const formatDateLabel = (unixSeconds: number): string => {
      const date = new Date(unixSeconds * 1000);

      // Determine what level of detail to show based on visible range
      const daysInRange = visibleRange / 86400;

      if (daysInRange < 2) {
        // Show year-month-day-hour for short ranges
        return date.toISOString().split('T')[0] + ' ' +
               date.getUTCHours().toString().padStart(2, '0') + 'h';
      } else if (daysInRange < 90) {
        // Show year-month-day for medium ranges
        return date.toISOString().split('T')[0];
      } else if (daysInRange < 1100) {
        // Show year-month for longer ranges
        const year = date.getUTCFullYear();
        const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
        return `${year}-${month}`;
      } else {
        // Show just year for very long ranges
        return date.getUTCFullYear().toString();
      }
    };

    // Draw multiple scales of ticks - major and minor gridlines
    TIME_UNITS.forEach((unit, unitIndex) => {
      const pixelsPerUnit = (unit.seconds / visibleRange) * timelineHeight;

      // Skip if too small to display
      if (pixelsPerUnit < 3) return;

      const startUnit = Math.floor(centerSeconds / unit.seconds) - 10;
      const endUnit = startUnit + Math.ceil((visibleRange / unit.seconds) * 2);

      // Determine tick size and opacity based on hierarchy
      let tickLength = 4;
      let lineWidth = 0.5;
      let opacity = 0.3;
      let shouldLabel = false;

      // Make every 4th or 5th unit a major tick with labels
      // Find the next larger unit to determine when to label
      let labelInterval = 1;
      if (unitIndex < TIME_UNITS.length - 1) {
        const nextUnitRatio = TIME_UNITS[unitIndex + 1].seconds / unit.seconds;
        labelInterval = Math.ceil(nextUnitRatio);
      }

      for (let i = startUnit; i <= endUnit; i++) {
        const seconds = i * unit.seconds;
        const y = yScale(seconds);

        if (y >= timelineTop && y <= timelineTop + timelineHeight) {
          const isMajor = i % labelInterval === 0;

          // Draw tick
          ctx.strokeStyle = `rgba(209, 213, 219, ${isMajor ? 0.8 : opacity})`;
          ctx.lineWidth = isMajor ? 1 : lineWidth;
          ctx.globalAlpha = isMajor ? 1 : opacity;
          ctx.beginPath();
          ctx.moveTo(timelineX - (isMajor ? 10 : tickLength), y);
          ctx.lineTo(timelineX + (isMajor ? 2 : tickLength), y);
          ctx.stroke();
          ctx.globalAlpha = 1;

          // Draw label only for major ticks
          if (isMajor && pixelsPerUnit > 25) {
            ctx.fillStyle = '#9ca3af';
            const label = formatDateLabel(seconds);
            ctx.fillText(label, timelineX - 12, y + 4);
          }
        }
      }
    });

    // Draw event markers (semantic zoom - circles stay same size)
    events.forEach((event) => {
      // Use unix_seconds for positioning (Unix Epoch), not Big Bang-relative timeline_seconds
      const unixSeconds = typeof event.unix_seconds === 'number' ? event.unix_seconds : parseInt(event.unix_seconds as any);
      const y = yScale(unixSeconds);
      const color = CATEGORY_COLORS[event.category] || '#3b82f6';

      if (y >= timelineTop && y <= timelineTop + timelineHeight) {
        // Draw main event circle
        ctx.fillStyle = color;
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(timelineX, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // If event has uncertainty range, draw range end point
        if (event.uncertainty_range) {
          const uncertaintySeconds = typeof event.uncertainty_range === 'number' ? event.uncertainty_range : parseInt(event.uncertainty_range as any);
          const startY = yScale(unixSeconds - uncertaintySeconds);
          const endY = yScale(unixSeconds + uncertaintySeconds);

          // Draw curved connecting line (bezier curve)
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.7;
          ctx.beginPath();
          ctx.moveTo(timelineX, startY);

          // Control points for cubic bezier curve (creates S-curve)
          const midY = (startY + endY) / 2;
          const curveDistance = Math.min(50, Math.abs(endY - startY) / 4);

          ctx.bezierCurveTo(
            timelineX - curveDistance, startY,
            timelineX - curveDistance, endY,
            timelineX, endY
          );
          ctx.stroke();
          ctx.globalAlpha = 1;

          // Draw start range circle
          if (startY >= timelineTop && startY <= timelineTop + timelineHeight) {
            ctx.fillStyle = color;
            ctx.strokeStyle = '#111827';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.arc(timelineX, startY, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.globalAlpha = 1;
          }

          // Draw end range circle
          if (endY >= timelineTop && endY <= timelineTop + timelineHeight) {
            ctx.fillStyle = color;
            ctx.strokeStyle = '#111827';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.arc(timelineX, endY, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }
    });

  }, [dimensions, events, transform]);

  // Handle zoom/pan with mouse position-based zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      // Get mouse position relative to canvas
      const rect = canvas.getBoundingClientRect();
      const mouseY = e.clientY - rect.top;

      // Calculate zoom factor (less aggressive)
      const delta = e.deltaY > 0 ? 1.05 : 0.95;
      // Allow zooming much deeper - up to 100,000,000,000,000x for nanosecond precision
      const newK = Math.max(1, Math.min(100000000000000, transform.k * delta));

      // Zoom towards mouse position
      // Calculate the world position at mouse Y before zoom
      const timelineHeight = dimensions.height - 40;
      const oldWorldY = (transform.y - mouseY) / transform.k;

      // Apply new zoom
      const newTransform = {
        y: oldWorldY * newK + mouseY,
        k: newK
      };

      setTransform(newTransform);
    };

    const handleMouseDown = (e: MouseEvent) => {
      let startY = e.clientY;
      let startTransformY = transform.y;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaY = moveEvent.clientY - startY;
        setTransform({ ...transform, y: startTransformY + deltaY });
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
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
  }, [transform, dimensions]);

  return (
    <div ref={containerRef} className="w-full h-full bg-gray-900">
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-grab active:cursor-grabbing"
      />
    </div>
  );
};

export default TimelineCanvas;
