'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EventResponse } from '@/types';
import { calculateEventY, getDisplayableEvents } from '@/lib/coordinateHelper';
import { getEventImageUrl } from '@/lib/imageHelper';
import { getCategoryHierarchy, getCategoryColor, getCategoryColors } from '@/lib/categoryColors';

interface EventPanelProps {
  selectedEvent: EventResponse | null;
  events: EventResponse[];
  visibleEvents: EventResponse[];
  transform?: { y: number; k: number };
  onEventClick?: (event: EventResponse) => void;
  onShiftClickImage?: (event: EventResponse) => void;
  onTransformChange?: (transform: { y: number; k: number }) => void;
  onDisplayedEventsChange?: (events: EventResponse[]) => void;
  cardHeightPx?: number;
  cardViewportPaddingPx?: number;
  imagePaddingPx?: number;
  onCategoryFilter?: (categoryId: string) => void;
  categoryFilter?: string | null;
  onHorizontalSwipe?: (direction: 'left' | 'right') => void;
}

const constrainEventPanelTransform = (
  newTransform: { y: number; k: number },
  panelHeight: number,
  minY: number,
  maxY: number
): { y: number; k: number } => {
  const constrainedY = Math.max(minY, Math.min(maxY, newTransform.y));
  return { ...newTransform, y: constrainedY };
};

const getTextColorForBg = (bgColor: string): string => {
  // Simple heuristic: dark colors get light text
  const isDark = bgColor.startsWith('#0') || bgColor.startsWith('#1') ||
                 bgColor.startsWith('#2') || bgColor.startsWith('#3') ||
                 bgColor.startsWith('#4') || bgColor.startsWith('#5') ||
                 bgColor.startsWith('#6') || bgColor.startsWith('#7');
  return isDark ? '#f3f4f6' : '#1f2937';
};

const EventPanel: React.FC<EventPanelProps> = ({ selectedEvent, events, visibleEvents, transform = { y: 0, k: 1 }, onEventClick, onShiftClickImage, onTransformChange, onDisplayedEventsChange, cardHeightPx, cardViewportPaddingPx, imagePaddingPx, onCategoryFilter, categoryFilter, onHorizontalSwipe }) => {
  const [dimensions, setDimensions] = useState({ height: 0 });
  const [currentTime, setCurrentTime] = useState(Date.now() / 1000); // Current time in Unix seconds
  const [contentBounds, setContentBounds] = useState({ minY: 0, maxY: 0 });
  const prevDisplayableIdsRef = useRef<string>('');
  const contentRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Track dragging state using ref to avoid closure issues
  const dragStateRef = useRef({ isDragging: false, lastY: 0 });

  // Track touch state for pinch-to-zoom and horizontal swipe
  const touchStateRef = useRef<{
    initialDistance: number | null;
    initialK: number | null;
    centerY: number | null;
    lastY: number | null;
    startX: number | null;
    startY: number | null;
    swipeDetected: boolean;
    hasMoved: boolean;
  }>({
    initialDistance: null,
    initialK: null,
    centerY: null,
    lastY: null,
    startX: null,
    startY: null,
    swipeDetected: false,
    hasMoved: false,
  });

  // Use refs for constraint bounds so they don't trigger effect re-runs
  const boundsRef = useRef({ minY: 0, maxY: 0 });

  // Calculate content bounds - generous bounds to prevent cards from appearing far outside
  useEffect(() => {
    if (dimensions.height === 0) return;
    const minY = -dimensions.height * 10;
    const maxY = dimensions.height * 10;
    boundsRef.current = { minY, maxY };
    setContentBounds({ minY, maxY });
  }, [dimensions.height]);

  // Combined setup for mouse gestures
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || !onTransformChange) return;

    // Handler for wheel zoom
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const rect = panel.getBoundingClientRect();
      const mouseY = e.clientY - rect.top;

      // Calculate the timestamp at the mouse position (before zoom)
      const referenceY = panel.clientHeight / 3;
      const pixelOffset = mouseY - referenceY;
      const timestampAtMouse = transform.y - (pixelOffset * transform.k);

      // Same zoom sensitivity as canvas
      const delta = e.deltaY > 0 ? 1.033 : 0.967;
      const newK = Math.max(1, Math.min(1e18, transform.k * delta));

      // Keep the same timestamp at the mouse position after zoom
      const newReferenceTimestamp = timestampAtMouse + (pixelOffset * newK);

      const newTransform = {
        y: newReferenceTimestamp,
        k: newK
      };

      onTransformChange(newTransform);
    };

    // Handler for mouse down to start drag
    const handleMouseDown = (e: MouseEvent) => {
      if (!(e.target instanceof Node) || !panel.contains(e.target)) return;
      dragStateRef.current = { isDragging: true, lastY: e.clientY };
    };

    // Handler for mouse move during drag
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStateRef.current.isDragging) return;

      const deltaY = e.clientY - dragStateRef.current.lastY;
      // Panning: dragging down pulls timeline down (shows future), dragging up pulls timeline up (shows past)
      const timestampDelta = deltaY * transform.k;

      const newTransform = {
        ...transform,
        y: transform.y + timestampDelta
      };

      onTransformChange(newTransform);
      dragStateRef.current.lastY = e.clientY;
    };

    // Handler for mouse up to stop drag
    const handleMouseUp = () => {
      dragStateRef.current.isDragging = false;
    };

    // Touch gesture handlers for pinch-to-zoom and horizontal swipe
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Two-finger pinch - prevent default for zoom
        e.preventDefault();

        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        const rect = panel.getBoundingClientRect();
        const centerY = ((touch1.clientY + touch2.clientY) / 2) - rect.top;

        touchStateRef.current = {
          initialDistance: distance,
          initialK: transform.k,
          centerY: centerY,
          lastY: null,
          startX: null,
          startY: null,
          swipeDetected: false,
          hasMoved: false,
        };
      } else if (e.touches.length === 1) {
        // Single finger - track for both pan and swipe
        // Don't prevent default yet - allow click events to work
        const rect = panel.getBoundingClientRect();
        const touchX = e.touches[0].clientX - rect.left;
        const touchY = e.touches[0].clientY - rect.top;

        touchStateRef.current.lastY = touchY;
        touchStateRef.current.startX = touchX;
        touchStateRef.current.startY = touchY;
        touchStateRef.current.swipeDetected = false;
        touchStateRef.current.hasMoved = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && touchStateRef.current.initialDistance !== null) {
        // Two-finger pinch zoom - prevent default
        e.preventDefault();
        touchStateRef.current.hasMoved = true;

        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        const rect = panel.getBoundingClientRect();
        const centerY = ((touch1.clientY + touch2.clientY) / 2) - rect.top;

        const scale = distance / touchStateRef.current.initialDistance!;
        // Invert scale: pinching out (scale > 1) should zoom out (increase k)
        // pinching in (scale < 1) should zoom in (decrease k)
        const invertedScale = 1 / scale;
        // Reduce zoom sensitivity on touch devices - apply dampening
        const dampening = 0.3; // Lower = less sensitive
        const adjustedScale = 1 + (invertedScale - 1) * dampening;
        const newK = Math.max(1, Math.min(1e18, touchStateRef.current.initialK! * adjustedScale));

        // Zoom around the CURRENT center point between fingers (not the initial one)
        // This ensures the point between your fingers stays fixed as you zoom
        const panelReferenceY = panel.clientHeight / 3;
        const pixelOffset = centerY - panelReferenceY;
        const timestampAtTouch = transform.y - (pixelOffset * transform.k);
        const newReferenceTimestamp = timestampAtTouch + (pixelOffset * newK);

        const newTransform = {
          y: newReferenceTimestamp,
          k: newK
        };

        onTransformChange(newTransform);
      } else if (e.touches.length === 1 && touchStateRef.current.lastY !== null) {
        // Single finger - check for horizontal swipe first
        const rect = panel.getBoundingClientRect();
        const currentX = e.touches[0].clientX - rect.left;
        const currentY = e.touches[0].clientY - rect.top;

        if (touchStateRef.current.startX !== null && touchStateRef.current.startY !== null && !touchStateRef.current.swipeDetected) {
          const deltaX = currentX - touchStateRef.current.startX;
          const deltaY = currentY - touchStateRef.current.startY;

          // Check if movement is significant enough to be a gesture (not a tap)
          const MOVEMENT_THRESHOLD = 5; // Pixels - anything less is considered a tap
          const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

          if (totalMovement > MOVEMENT_THRESHOLD) {
            // Prevent default once we know it's a gesture
            e.preventDefault();
            touchStateRef.current.hasMoved = true;

            // Detect horizontal swipe: significant horizontal movement with minimal vertical movement
            const MIN_SWIPE_DISTANCE = 80; // Minimum pixels to count as swipe
            const MAX_VERTICAL_DEVIATION = 50; // Maximum vertical movement allowed for horizontal swipe

            if (Math.abs(deltaX) > MIN_SWIPE_DISTANCE && Math.abs(deltaY) < MAX_VERTICAL_DEVIATION) {
              // Horizontal swipe detected
              touchStateRef.current.swipeDetected = true;
              if (onHorizontalSwipe) {
                const direction = deltaX > 0 ? 'right' : 'left';
                onHorizontalSwipe(direction);
              }
              return; // Don't pan after swipe detected
            }

            // If no swipe detected, do normal pan
            if (!touchStateRef.current.swipeDetected) {
              const deltaY = currentY - touchStateRef.current.lastY!;
              // Panning: dragging down pulls timeline down (shows future), dragging up pulls timeline up (shows past)
              const timestampDelta = deltaY * transform.k;

              const newTransform = {
                ...transform,
                y: transform.y + timestampDelta
              };

              onTransformChange(newTransform);
              touchStateRef.current.lastY = currentY;
            }
          }
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        touchStateRef.current.initialDistance = null;
        touchStateRef.current.initialK = null;
        touchStateRef.current.centerY = null;
      }
      if (e.touches.length === 0) {
        touchStateRef.current.lastY = null;
        touchStateRef.current.startX = null;
        touchStateRef.current.startY = null;
        touchStateRef.current.swipeDetected = false;
        touchStateRef.current.hasMoved = false;
      }
    };

    // Register all listeners
    panel.addEventListener('wheel', handleWheel, { passive: false });
    panel.addEventListener('mousedown', handleMouseDown);
    panel.addEventListener('touchstart', handleTouchStart, { passive: false });
    panel.addEventListener('touchmove', handleTouchMove, { passive: false });
    panel.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Cleanup
    return () => {
      panel.removeEventListener('wheel', handleWheel);
      panel.removeEventListener('mousedown', handleMouseDown);
      panel.removeEventListener('touchstart', handleTouchStart);
      panel.removeEventListener('touchmove', handleTouchMove);
      panel.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [transform, onTransformChange, dimensions.height]);

  // Track panel height for coordinate calculations (full panel height)
  useEffect(() => {
    if (!panelRef.current) return;

    const updateDimensions = () => {
      if (!panelRef.current) return;

      const newHeight = panelRef.current.clientHeight;
      console.log('EventPanel: updateDimensions called, clientHeight=', newHeight);
      setDimensions({
        height: newHeight,
      });
    };

    // Use ResizeObserver for more reliable dimension tracking
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    resizeObserver.observe(panelRef.current);

    // Initial update
    updateDimensions();

    // Also update on window resize
    window.addEventListener('resize', updateDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // Update current time every 100ms for smooth updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now() / 1000);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Use shared coordinate helper for Y positioning
  const getEventY = useCallback((unixSeconds: number): number => {
    const margin = 0; // No margin - timeline spans full height
    const actualHeight = dimensions.height || (typeof window !== 'undefined' ? window.innerHeight : 800);
    const timelineHeight = actualHeight - margin * 2;
    return calculateEventY(unixSeconds, timelineHeight, transform);
  }, [dimensions.height, transform]);

  // Create a "Now" event for display
  // Always use real time (Date.now()) not the state currentTime which may be stale
  const realNowSeconds = Date.now() / 1000;
  const getFormattedNowTime = () => {
    const now = new Date(realNowSeconds * 1000); // Convert Unix seconds to milliseconds
    const century = Math.floor(now.getUTCFullYear() / 100) * 100;
    const year = now.getUTCFullYear();
    const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
    const date = now.getUTCDate().toString().padStart(2, '0');
    const hours = now.getUTCHours().toString().padStart(2, '0');
    const minutes = now.getUTCMinutes().toString().padStart(2, '0');
    const seconds = now.getUTCSeconds().toString().padStart(2, '0');
    const milliseconds = Math.floor((realNowSeconds % 1) * 1000).toString().padStart(3, '0');
    const microseconds = Math.floor((realNowSeconds % 1) * 1000000 % 1000).toString().padStart(3, '0');
    const nanoseconds = Math.floor((realNowSeconds % 1) * 1000000000 % 1000).toString().padStart(3, '0');

    return `${century}s | ${year} | ${month}/${date} | ${hours}:${minutes}:${seconds} | ${milliseconds}ms ${microseconds}μs ${nanoseconds}ns`;
  };

  const nowEvent = {
    id: 'now',
    title: 'Now',
    unix_seconds: realNowSeconds,
    formatted_time: getFormattedNowTime(),
    category: 'contemporary' as const,
    image_url: '/images/categories/now.svg',
  } as unknown as EventResponse;

  // Create Future Horizon event
  const now = Math.floor(Date.now() / 1000);
  const FUTURE_HORIZON_TIME = now + (200 * 31536000); // Now + 200 years
  const futureHorizonEvent = {
    id: 'future-horizon',
    title: 'Future Horizon',
    unix_seconds: FUTURE_HORIZON_TIME,
    formatted_time: '200 years from now',
    category: 'contemporary' as const,
    image_url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Cdefs%3E%3ClinearGradient id="grad" x1="0%25" y1="0%25" x2="0%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%23fbbf24;stop-opacity:1" /%3E%3Cstop offset="100%25" style="stop-color:%2306b6d4;stop-opacity:1" /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="100" height="100" fill="url(%23grad)"/%3E%3Cpath d="M 0 60 Q 25 40 50 50 T 100 60 L 100 100 L 0 100 Z" fill="%23ffffff" opacity="0.7"/%3E%3Ccircle cx="50" cy="30" r="15" fill="%23fbbf24" stroke="%23ffffff" stroke-width="2"/%3E%3C/svg%3E',
  } as unknown as EventResponse;

  // Memoize visible event IDs to detect actual content changes (not just array reference)
  const visibleEventIdsStr = useMemo(() => {
    return visibleEvents.map(e => e.id).join(',');
  }, [visibleEvents]);

  // Determine which visible events can be displayed with their titles (collision detection)
  // Use the shared collision detection function for consistency with canvas images
  // Memoize to prevent creating new array references on every render
  // CRITICAL: Only depend on visibleEventIdsStr and dimensions.height - NOT currentTime or transform
  const displayableEvents = useMemo(() => {
    const START_TIME = -435494878264400000;

    console.log('EventPanel: visibleEvents=', visibleEvents.length, 'dimensions.height=', dimensions.height);

    // Filter visible events to exclude those beyond Future Horizon
    const filteredVisibleEvents = visibleEvents.filter((event) => {
      const unixSeconds = typeof event.unix_seconds === 'number' ? event.unix_seconds : parseInt(event.unix_seconds as any);
      return unixSeconds >= START_TIME && unixSeconds <= FUTURE_HORIZON_TIME;
    });

    const allVisibleEvents = [...filteredVisibleEvents];

    // Add Now event if it's within view
    const nowY = getEventY(currentTime);
    if (nowY >= 0 && nowY <= dimensions.height) {
      allVisibleEvents.push(nowEvent);
    }

    // Add Future Horizon event if it's within view
    const futureY = getEventY(FUTURE_HORIZON_TIME);
    if (futureY >= 0 && futureY <= dimensions.height) {
      allVisibleEvents.push(futureHorizonEvent);
    }

    console.log('EventPanel: allVisibleEvents=', allVisibleEvents.length);

    if (allVisibleEvents.length === 0) return [];

    const positions = allVisibleEvents.map((event) => ({
      event,
      y: getEventY(event.unix_seconds || 0),
    })).sort((a, b) => a.y - b.y);

    const displayableIds = getDisplayableEvents(positions, dimensions.height);
    const result = positions.filter(({ event }) => displayableIds.has(event.id)).map(({ event }) => event);
    console.log('EventPanel: displayableEvents=', result.length);
    return result;
  }, [visibleEventIdsStr, dimensions.height]);

  // Calculate which events will actually be rendered (not just displayable)
  const actuallyRenderedEvents = useMemo(() => {
    const cardHeight = cardHeightPx ?? 100;
    const cardPadding = cardViewportPaddingPx ?? 0;

    return displayableEvents
      .map((event) => {
        const unixSeconds = typeof event.unix_seconds === 'number' ? event.unix_seconds : parseInt(event.unix_seconds as any);
        const eventY = getEventY(unixSeconds);
        return { event, eventY };
      })
      .sort((a, b) => a.eventY - b.eventY)
      .filter(({ eventY }, index, sorted) => {
        // Viewport culling - skip cards far outside viewport
        if (eventY < -cardHeight - cardPadding || eventY > (dimensions.height || 800) + cardHeight + cardPadding) {
          return false;
        }

        // Calculate available space
        let availableSpace: number;
        if (index < sorted.length - 1) {
          availableSpace = sorted[index + 1].eventY - eventY;
        } else {
          availableSpace = (dimensions.height - 40) - eventY;
        }

        // Skip if not enough space
        const minHeightNeeded = 24;
        if (availableSpace < minHeightNeeded) {
          return false;
        }

        return true;
      })
      .map(({ event }) => event);
  }, [displayableEvents, dimensions.height, cardHeightPx, cardViewportPaddingPx, getEventY]);

  // Notify parent of ACTUALLY RENDERED events (for GeoMap) - only if the IDs actually changed
  useEffect(() => {
    if (onDisplayedEventsChange) {
      const renderedIds = actuallyRenderedEvents.map(e => e.id).join(',');
      if (renderedIds !== prevDisplayableIdsRef.current) {
        prevDisplayableIdsRef.current = renderedIds;
        onDisplayedEventsChange(actuallyRenderedEvents);
      }
    }
  }, [actuallyRenderedEvents, onDisplayedEventsChange]);

  return (
    <div
      ref={panelRef}
      className="h-full bg-stone-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col relative select-none touch-none overflow-hidden"
      style={{ fontFamily: '"Roboto Condensed", sans-serif' }}
    >
      {/* Content - Synchronized visible events with vertical alignment */}
      <div ref={contentRef} className="h-full relative overflow-hidden">
        {displayableEvents.length > 0 ? (
          <div className="relative overflow-hidden" style={{ height: '100%' }}>
            {displayableEvents
              .map((event) => {
                const unixSeconds = typeof event.unix_seconds === 'number' ? event.unix_seconds : parseInt(event.unix_seconds as any);
                const eventY = getEventY(unixSeconds);
                return { event, eventY };
              })
              .sort((a, b) => a.eventY - b.eventY)
              .map(({ event, eventY }, index, sorted) => {
                // Card height from config
                const cardHeight = cardHeightPx ?? 100;
                const cardPadding = cardViewportPaddingPx ?? 0;

                // Don't filter cards - show all displayable events regardless of position

              // Special rendering for "Now" and "Future Horizon" events
              const isNowEvent = event.id === 'now';
              const isFutureHorizonEvent = event.id === 'future-horizon';
              const isSpecialEvent = isNowEvent || isFutureHorizonEvent;
              const timeDisplay = isNowEvent ? (() => {
                const now = new Date();
                const minutes = now.getUTCMinutes().toString().padStart(2, '0');
                const seconds = now.getUTCSeconds().toString().padStart(2, '0');
                return `${minutes}:${seconds}`;
              })() : null;

              return (
                <div
                  key={event.id}
                  style={{
                    position: 'absolute',
                    top: `${eventY}px`,
                    left: 0,
                    right: 0,
                    height: `${cardHeight}px`,
                    transform: 'translateY(-50%)',
                  }}
                  className="w-full"
                >
                  {isSpecialEvent ? (
                    // Special card for "Now" and "Future Horizon" events - same format as regular events
                    <div
                      className="p-2 bg-stone-200 dark:bg-gray-800 rounded border border-stone-400 dark:border-gray-700 cursor-pointer transition overflow-hidden flex flex-row gap-2 shadow-sm"
                      style={{
                        height: '100%',
                        borderLeft: `6px solid ${getCategoryColor(event.category)}`
                      }}
                    >
                      {/* Event Image - Square container on left */}
                      {(() => {
                        const imageUrl = event.image_url;
                        return imageUrl ? (
                          <div
                            onClick={(e) => {
                              if (e.shiftKey) {
                                onShiftClickImage?.(event);
                              } else {
                                onEventClick?.(event);
                              }
                            }}
                            className="w-20 h-20 bg-stone-300 dark:bg-gray-900 rounded flex-shrink-0 border border-stone-400 dark:border-gray-600 overflow-hidden hover:border-blue-500 cursor-pointer transition"
                            title="Click to view | Shift+Click to link"
                          >
                            <img
                              src={imageUrl}
                              alt={event.title}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        ) : null;
                      })()}

                      {/* Content on right */}
                      <div className="flex flex-col flex-1 overflow-hidden">
                        {/* First line: Time and Category Tag */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* Event Time - All resolutions - exactly 50% */}
                          <div className="text-xs text-blue-400 font-bold whitespace-nowrap overflow-hidden text-ellipsis" style={{ width: '50%', fontFamily: '"Roboto Condensed", sans-serif' }}>
                            {event.formatted_time}
                          </div>

                          {/* Category Tags - Hierarchy - exactly 50% width, no wrap, no overflow */}
                          <div className="flex gap-1 justify-end flex-shrink-0" style={{ width: '50%', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {event.category && getCategoryHierarchy(event.category).map((cat) => (
                              <span
                                key={cat.id}
                                className="inline-block px-1 py-0.5 text-xs font-bold rounded flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                style={{
                                  backgroundColor: cat.color,
                                  color: getTextColorForBg(cat.color),
                                  outline: categoryFilter === cat.id ? '2px solid white' : 'none',
                                  fontFamily: '"Roboto Condensed", sans-serif',
                                  whiteSpace: 'nowrap'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onCategoryFilter) {
                                    onCategoryFilter(cat.id);
                                  }
                                }}
                                title={`Filter by ${cat.name}`}
                              >
                                {cat.name}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Event Title */}
                        <h3 className="text-xs font-bold text-gray-900 dark:text-white flex-shrink-0" style={{ fontFamily: '"Roboto Condensed", sans-serif' }}>
                          {event.title}
                        </h3>

                        {/* Event Description */}
                        {event.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-300 overflow-hidden line-clamp-2" style={{ fontFamily: '"Roboto Condensed", sans-serif' }}>
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    // Regular event card - image on left, content on right
                    <div
                      className="p-2 bg-stone-200 dark:bg-gray-800 rounded border border-stone-400 dark:border-gray-700 transition overflow-hidden flex flex-row gap-2 shadow-sm"
                      style={{
                        height: '100%',
                        borderLeft: `6px solid ${getCategoryColor(event.category)}`
                      }}
                    >
                      {/* Event Image - Square container on left (always rendered for alignment) */}
                      {(() => {
                        const imageUrl = getEventImageUrl(event);
                        return (
                          <div
                            onClick={(e) => {
                              if (imageUrl) {
                                if (e.shiftKey) {
                                  onShiftClickImage?.(event);
                                } else {
                                  onEventClick?.(event);
                                }
                              }
                            }}
                            className={`w-20 h-20 bg-stone-300 dark:bg-gray-900 rounded flex-shrink-0 border border-stone-400 dark:border-gray-600 overflow-hidden ${imageUrl ? 'hover:border-blue-500 cursor-pointer' : ''} transition`}
                            title={imageUrl ? "Click to view | Shift+Click to link" : undefined}
                          >
                            {imageUrl && (
                              <img
                                src={imageUrl}
                                alt={event.title}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            )}
                          </div>
                        );
                      })()}

                      {/* Content on right */}
                      <div className="flex flex-col flex-1 overflow-hidden">
                        {/* First line: Time and Category Tag */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* Event Time - Year, Month, Day, Time - exactly 50% */}
                          <div className="text-xs text-blue-400 font-bold whitespace-nowrap overflow-hidden text-ellipsis" style={{ width: '50%', fontFamily: '"Roboto Condensed", sans-serif' }}>
                            {(() => {
                              if (!event.unix_seconds) return '';

                              // First, calculate years ago/future for any event
                              const now = Date.now() / 1000;
                              const diffSeconds = now - event.unix_seconds;
                              const diffYears = Math.abs(diffSeconds) / 31536000; // seconds per year

                              // For events more than 1000 years old/future, show in BC/AD or year format
                              if (diffYears > 1000) {
                                if (diffYears > 1000000000) {
                                  const billions = (diffYears / 1000000000).toFixed(1);
                                  return diffSeconds > 0 ? `${billions} billion years ago` : `${billions} billion years future`;
                                } else if (diffYears > 1000000) {
                                  const millions = (diffYears / 1000000).toFixed(1);
                                  return diffSeconds > 0 ? `${millions} million years ago` : `${millions} million years future`;
                                } else {
                                  // For thousands of years, show as BC year or century
                                  const dateMs = event.unix_seconds * 1000;
                                  const date = new Date(dateMs);
                                  const year = date.getUTCFullYear();

                                  if (year < 0) {
                                    // BC format: convert negative year to BC notation
                                    const bcYear = Math.abs(year) - 1; // JavaScript negative year = (BC year + 1)
                                    return `${bcYear} BC`;
                                  } else {
                                    // For our era (year 1 onwards), just show the year without "AD"
                                    return `${year}`;
                                  }
                                }
                              }

                              // For recent events, show precise date/time
                              const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                              const dateMs = event.unix_seconds * 1000;
                              const date = new Date(dateMs);

                              // Check if date is valid
                              if (isNaN(date.getTime())) {
                                return 'Ancient/Far future';
                              }

                              const year = date.getUTCFullYear();
                              const month = months[date.getUTCMonth()];
                              const day = String(date.getUTCDate()).padStart(2, '0');
                              const hours = String(date.getUTCHours()).padStart(2, '0');
                              const minutes = String(date.getUTCMinutes()).padStart(2, '0');

                              return `${year} ${month} ${day}\u00A0\u00A0\u00A0${hours}:${minutes}`;
                            })()}
                          </div>

                          {/* Category Tags - Hierarchy - exactly 50% width, no wrap, no overflow */}
                          <div className="flex gap-1 justify-end flex-shrink-0" style={{ width: '50%', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {event.category && getCategoryHierarchy(event.category).map((cat) => (
                              <span
                                key={cat.id}
                                className="inline-block px-1 py-0.5 text-xs font-bold rounded flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                style={{
                                  backgroundColor: cat.color,
                                  color: getTextColorForBg(cat.color),
                                  outline: categoryFilter === cat.id ? '2px solid white' : 'none',
                                  fontFamily: '"Roboto Condensed", sans-serif',
                                  whiteSpace: 'nowrap'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onCategoryFilter) {
                                    onCategoryFilter(cat.id);
                                  }
                                }}
                                title={`Filter by ${cat.name}`}
                              >
                                {cat.name}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Event Title */}
                        <h3 className="text-xs font-bold text-gray-900 dark:text-white flex-shrink-0" style={{ fontFamily: '"Roboto Condensed", sans-serif' }}>
                          {event.title}
                        </h3>

                        {/* Event Description */}
                        {event.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-300 overflow-hidden line-clamp-2" style={{ fontFamily: '"Roboto Condensed", sans-serif' }}>
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

    </div>
  );
};

export default EventPanel;
