'use client';

import React, { useEffect, useRef, useState } from 'react';
import { EventResponse } from '@/types';
import { getEventImageUrl, calculateImageDimensions } from '@/lib/imageHelper';

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
  { quantity: 1, unit: 'ms', seconds: 0.001 },
  { quantity: 1, unit: 'μs', seconds: 0.000001 },
  { quantity: 1, unit: 'ns', seconds: 0.000000001 },
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
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const [imagesLoaded, setImagesLoaded] = useState(0); // Trigger re-render when images load

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

    // Performance guard: if zoom causes visible range to be unreasonably small, skip unit rendering
    const visibleRangeCheck = (END_TIME - START_TIME) / transform.k;
    if (visibleRangeCheck < 1e-12) {
      // Range smaller than 1 picosecond - skip rendering units to prevent browser hang
      return;
    }

    const margin = 20;
    const timelineX = dimensions.width / 2;
    const timelineHeight = dimensions.height - margin * 2;
    const timelineTop = margin;
    const imageMargin = 120; // Extra space beyond timeline for images to overflow

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

    // Helper function to format tick labels based on the currently displayed unit
    const formatDateLabel = (unixSeconds: number): string => {
      // Safely create Date, clamping to valid range
      const MAX_DATE_MS = 8.64e15;
      const dateMs = Math.max(-MAX_DATE_MS, Math.min(MAX_DATE_MS, unixSeconds * 1000));

      let date: Date | null = null;
      try {
        date = new Date(dateMs);
        if (isNaN(date.getTime())) date = null;
      } catch {
        date = null;
      }

      if (!date) {
        // Fallback for out-of-range dates
        return Math.round(unixSeconds).toString();
      }

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      // Format based on the currently displayed unit
      if (unitToDisplay.unit === 'day') {
        // Show day of month: "01", "02", etc.
        return date.getUTCDate().toString().padStart(2, '0');
      } else if (unitToDisplay.unit === 'month') {
        // Show 3-letter month abbreviation
        return monthNames[date.getUTCMonth()];
      } else if (unitToDisplay.unit === 'hour') {
        // Show hour: "00h", "01h", etc.
        return date.getUTCHours().toString().padStart(2, '0') + 'h';
      } else if (unitToDisplay.unit === 'min') {
        // Show hour:minute
        return date.getUTCHours().toString().padStart(2, '0') + ':' +
               date.getUTCMinutes().toString().padStart(2, '0');
      } else if (unitToDisplay.unit === 'sec') {
        // Show hour:minute:second
        return date.getUTCHours().toString().padStart(2, '0') + ':' +
               date.getUTCMinutes().toString().padStart(2, '0') + ':' +
               date.getUTCSeconds().toString().padStart(2, '0');
      } else if (unitToDisplay.unit === 'ms') {
        // Show milliseconds
        return date.getUTCMilliseconds().toString().padStart(3, '0');
      } else if (unitToDisplay.unit === 'μs' || unitToDisplay.unit === 'ns') {
        // For microseconds and nanoseconds, show full ISO
        return date.toISOString();
      } else {
        // For year and larger units, show just the year
        return date.getUTCFullYear().toString();
      }
    };

    // Determine which unit to display based on spacing
    // Find the largest unit that still has at least 24px spacing between ticks (one text line)
    const minSpacingForUnit = 24;
    let unitToDisplay: typeof TIME_UNITS[0] | null = null;
    let unitIndexToDisplay = -1;

    for (let i = TIME_UNITS.length - 1; i >= 0; i--) {
      const unit = TIME_UNITS[i];
      const pixelsPerUnit = (unit.seconds / visibleRange) * timelineHeight;

      if (pixelsPerUnit >= minSpacingForUnit) {
        unitToDisplay = unit;
        unitIndexToDisplay = i;
        break;
      }
    }

    // If no unit fits minimum spacing, use the largest unit
    if (!unitToDisplay) {
      unitToDisplay = TIME_UNITS[0];
      unitIndexToDisplay = 0;
    }

    // Draw ticks for the selected unit
    const pixelsPerUnit = (unitToDisplay.seconds / visibleRange) * timelineHeight;

    // Calculate range to cover entire visible area plus some margin
    const topSeconds = END_TIME - (Math.abs(transform.y) / timelineHeight) * visibleRange + timelineHeight * visibleRange / timelineHeight;
    const bottomSeconds = END_TIME - (Math.abs(transform.y) + timelineHeight) / timelineHeight * visibleRange - timelineHeight * visibleRange / timelineHeight;

    const startUnit = Math.floor(bottomSeconds / unitToDisplay.seconds);
    const endUnit = Math.ceil(topSeconds / unitToDisplay.seconds);

    // Only render ticks if they're actually visible with minimum spacing
    if (pixelsPerUnit > 4) {
      for (let i = startUnit; i <= endUnit; i++) {
        const seconds = i * unitToDisplay.seconds;
        const y = yScale(seconds);

        // Skip if outside viewport
        if (y < timelineTop - 50 || y > timelineTop + timelineHeight + 50) continue;

        // Draw tick
        ctx.strokeStyle = 'rgba(209, 213, 219, 0.8)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(timelineX - 10, y);
        ctx.lineTo(timelineX + 2, y);
        ctx.stroke();

        // Draw label only if spacing is sufficient
        if (pixelsPerUnit > 24) {
          ctx.fillStyle = '#9ca3af';
          const label = formatDateLabel(seconds);
          ctx.fillText(label, timelineX - 12, y + 4);
        }
      }
    }

    // Draw larger unit label at extremities (top and bottom only, no ticks)
    if (unitIndexToDisplay > 0) {
      const largerUnitIndex = unitIndexToDisplay - 1;
      const largerUnit = TIME_UNITS[largerUnitIndex];

      // Only show larger units if they're significantly larger
      if (largerUnit.seconds > unitToDisplay.seconds * 2) {
        // Reverse colors: white text on dark background
        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 28px "Roboto Condensed", sans-serif';
        ctx.textAlign = 'right';

        // Get the visible time range at the extremities
        const visibleTopTime = END_TIME - (Math.abs(transform.y) / timelineHeight) * visibleRange;
        const visibleBottomTime = END_TIME - (Math.abs(transform.y) + timelineHeight) / timelineHeight * visibleRange;

        // Format the larger unit appropriately
        // Safely create Date objects - clamp to valid range for JavaScript Date
        const MAX_DATE_MS = 8.64e15; // Max valid milliseconds for Date
        const topDateMs = Math.max(-MAX_DATE_MS, Math.min(MAX_DATE_MS, visibleTopTime * 1000));
        const bottomDateMs = Math.max(-MAX_DATE_MS, Math.min(MAX_DATE_MS, visibleBottomTime * 1000));

        let topDate: Date | null = null;
        let bottomDate: Date | null = null;

        try {
          topDate = new Date(topDateMs);
          if (isNaN(topDate.getTime())) topDate = null;
        } catch {
          topDate = null;
        }

        try {
          bottomDate = new Date(bottomDateMs);
          if (isNaN(bottomDate.getTime())) bottomDate = null;
        } catch {
          bottomDate = null;
        }

        let topLabel: string;
        let bottomLabel: string;

        // Format based on the larger unit type
        if (topDate && bottomDate) {
          if (largerUnit.unit === 'year' || largerUnit.unit === 'years') {
            topLabel = topDate.getUTCFullYear().toString();
            bottomLabel = bottomDate.getUTCFullYear().toString();
          } else if (largerUnit.unit === 'month') {
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const topMonth = monthNames[topDate.getUTCMonth()];
            const topYear = topDate.getUTCFullYear();
            topLabel = `${topYear} ${topMonth}`;
            const bottomMonth = monthNames[bottomDate.getUTCMonth()];
            const bottomYear = bottomDate.getUTCFullYear();
            bottomLabel = `${bottomYear} ${bottomMonth}`;
          } else if (largerUnit.unit === 'day') {
            topLabel = topDate.toISOString().split('T')[0];
            bottomLabel = bottomDate.toISOString().split('T')[0];
          } else if (largerUnit.unit === 'hour') {
            topLabel = topDate.toISOString().split('T')[0] + ' ' +
                      topDate.getUTCHours().toString().padStart(2, '0') + 'h';
            bottomLabel = bottomDate.toISOString().split('T')[0] + ' ' +
                         bottomDate.getUTCHours().toString().padStart(2, '0') + 'h';
          } else if (largerUnit.unit === 'min') {
            topLabel = topDate.toISOString().split('T')[0] + ' ' +
                      topDate.getUTCHours().toString().padStart(2, '0') + ':' +
                      topDate.getUTCMinutes().toString().padStart(2, '0');
            bottomLabel = bottomDate.toISOString().split('T')[0] + ' ' +
                         bottomDate.getUTCHours().toString().padStart(2, '0') + ':' +
                         bottomDate.getUTCMinutes().toString().padStart(2, '0');
          } else if (largerUnit.unit === 'sec') {
            topLabel = topDate.toISOString().split('Z')[0];
            bottomLabel = bottomDate.toISOString().split('Z')[0];
          } else {
            // For ms, μs, ns - show full timestamp
            topLabel = topDate.toISOString();
            bottomLabel = bottomDate.toISOString();
          }
        } else {
          // Fallback for out-of-range dates - show numeric time
          topLabel = visibleTopTime.toFixed(0);
          bottomLabel = visibleBottomTime.toFixed(0);
        }

        // Show larger unit label ONLY at absolute top with background
        ctx.fillStyle = '#e5e7eb';
        ctx.globalAlpha = 0.7;
        ctx.fillRect(timelineX - 140, timelineTop + 2, 130, 24);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#111827';
        ctx.textAlign = 'left';
        ctx.fillText(topLabel, timelineX - 135, timelineTop + 20);
        ctx.textAlign = 'center';

        // Show larger unit label ONLY at absolute bottom with background
        ctx.fillStyle = '#e5e7eb';
        ctx.globalAlpha = 0.7;
        ctx.fillRect(timelineX - 140, timelineTop + timelineHeight - 26, 130, 24);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#111827';
        ctx.textAlign = 'left';
        ctx.fillText(bottomLabel, timelineX - 135, timelineTop + timelineHeight - 8);
        ctx.textAlign = 'center';
      }
    }

    // Track image positions for collision detection
    const renderedImageBounds: Array<{ y: number; height: number }> = [];

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

    // Draw event images on canvas with zoom support
    events.forEach((event) => {
      const unixSeconds = typeof event.unix_seconds === 'number' ? event.unix_seconds : parseInt(event.unix_seconds as any);
      const y = yScale(unixSeconds);

      if (y >= timelineTop && y <= timelineTop + timelineHeight) {
        const imageUrl = getEventImageUrl(event);

        if (imageUrl) {
          // Try to get cached image or load it
          let img = imageCache.current.get(imageUrl);

          if (!img) {
            // Load image asynchronously and cache it
            const newImg = new Image();
            newImg.crossOrigin = 'anonymous';
            newImg.onload = () => {
              imageCache.current.set(imageUrl, newImg);
              // Trigger re-render when image loads
              setImagesLoaded(prev => prev + 1);
            };
            newImg.onerror = () => {
              console.warn(`Failed to load image: ${imageUrl}`);
            };
            newImg.src = imageUrl;
          } else {
            // Image is loaded, render it
            const baseImageSize = 40; // Base image size at zoom 1.0
            const scaledSize = baseImageSize * transform.k; // Grow with zoom level
            const MIN_DISPLAY_SIZE = 24; // Hide if smaller than 24x24
            const MAX_DISPLAY_SIZE = 100; // Cap at 100px maximum

            // Only render if large enough
            if (scaledSize >= MIN_DISPLAY_SIZE) {
              const displaySize = Math.min(scaledSize, MAX_DISPLAY_SIZE);
              const imgX = timelineX + 15; // Offset from event circle (circle radius 5 + padding)
              const imgY = y - displaySize / 2; // Center vertically on event

              // Check collision with other images first
              let collides = false;
              for (const bounds of renderedImageBounds) {
                if (imgY < bounds.y + bounds.height && imgY + displaySize > bounds.y) {
                  collides = true;
                  break;
                }
              }

              if (!collides) {
                // Check if image will be clipped by canvas edge, and shift position if needed
                let finalImgY = imgY;
                const canvasBottom = dimensions.height;
                const canvasTop = 0;
                const imageMargin = 30; // Margin from canvas edges

                // If image extends beyond canvas bottom, shift it up
                if (finalImgY + displaySize > canvasBottom - imageMargin) {
                  finalImgY = canvasBottom - displaySize - imageMargin;
                }
                // If image extends beyond canvas top, shift it down
                if (finalImgY < canvasTop + imageMargin) {
                  finalImgY = canvasTop + imageMargin;
                }

                // Re-check collisions with shifted position
                collides = false;
                for (const bounds of renderedImageBounds) {
                  if (finalImgY < bounds.y + bounds.height && finalImgY + displaySize > bounds.y) {
                    collides = true;
                    break;
                  }
                }

                if (!collides) {
                  // Draw image with padding
                  const padding = 2;
                  const drawX = imgX + padding;
                  const drawY = finalImgY + padding;
                  const drawWidth = displaySize - padding * 2;
                  const drawHeight = displaySize - padding * 2;

                  // Draw background rectangle
                  ctx.fillStyle = '#1f2937';
                  ctx.fillRect(imgX, finalImgY, displaySize, displaySize);
                  ctx.strokeStyle = '#374151';
                  ctx.lineWidth = 1;
                  ctx.strokeRect(imgX, finalImgY, displaySize, displaySize);

                  // Draw image
                  try {
                    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
                  } catch (e) {
                    // Image not ready yet, will be drawn next frame
                  }

                  // Track this image's bounds for collision detection
                  renderedImageBounds.push({ y: finalImgY, height: displaySize });
                }
              }
            }
          }
        }
      }
    });

  }, [dimensions, events, transform, imagesLoaded]);

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
      // Allow zooming much deeper - up to 1,000,000,000,000,000,000x (1 billion trillion) for picosecond precision
      const newK = Math.max(1, Math.min(1e18, transform.k * delta));

      // Zoom towards mouse position
      // Calculate the world position at mouse Y before zoom
      const margin = 20;
      const timelineHeight = dimensions.height - margin * 2;
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
