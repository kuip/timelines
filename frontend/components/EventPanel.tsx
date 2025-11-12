'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EventResponse } from '@/types';
import { calculateEventY, getDisplayableEvents } from '@/lib/coordinateHelper';
import { getEventImageUrl } from '@/lib/imageHelper';

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  cosmic: { bg: '#8b5cf6', text: '#f5e6ff' },
  geological: { bg: '#f59e0b', text: '#1f2937' },
  biological: { bg: '#10b981', text: '#f0fdf4' },
  historical: { bg: '#ef4444', text: '#fef2f2' },
  political: { bg: '#3b82f6', text: '#eff6ff' },
  technological: { bg: '#06b6d4', text: '#f0f9fa' },
  contemporary: { bg: '#ec4899', text: '#fdf2f8' },
};

interface EventPanelProps {
  selectedEvent: EventResponse | null;
  events: EventResponse[];
  visibleEvents: EventResponse[];
  transform?: { y: number; k: number };
  onEventClick?: (event: EventResponse) => void;
  onTransformChange?: (transform: { y: number; k: number }) => void;
}

const EventPanel: React.FC<EventPanelProps> = ({ selectedEvent, events, visibleEvents, transform = { y: 0, k: 1 }, onEventClick, onTransformChange }) => {
  const [dimensions, setDimensions] = useState({ height: 0 });
  const [currentTime, setCurrentTime] = useState(Date.now() / 1000); // Current time in Unix seconds
  const contentRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Track dragging state using ref to avoid closure issues
  const dragStateRef = useRef({ isDragging: false, lastY: 0 });

  // Combined setup for mouse gestures
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || !onTransformChange) return;

    // Handler for wheel zoom
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const rect = panel.getBoundingClientRect();
      const mouseY = e.clientY - rect.top;

      // Same zoom sensitivity as canvas
      const delta = e.deltaY > 0 ? 1.033 : 0.967;
      const newK = Math.max(1, Math.min(1e18, transform.k * delta));

      const oldWorldY = (transform.y - mouseY) / transform.k;

      const newTransform = {
        y: oldWorldY * newK + mouseY,
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
      const newTransform = {
        ...transform,
        y: transform.y + deltaY
      };

      onTransformChange(newTransform);
      dragStateRef.current.lastY = e.clientY;
    };

    // Handler for mouse up to stop drag
    const handleMouseUp = () => {
      dragStateRef.current.isDragging = false;
    };

    // Register all listeners
    panel.addEventListener('wheel', handleWheel, { passive: false });
    panel.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Cleanup
    return () => {
      panel.removeEventListener('wheel', handleWheel);
      panel.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [transform, onTransformChange]);

  // Track panel height for coordinate calculations (full panel height)
  useEffect(() => {
    const updateDimensions = () => {
      if (panelRef.current) {
        setDimensions({
          height: panelRef.current.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Update current time every 100ms for smooth updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now() / 1000);
    }, 100);

    return () => clearInterval(interval);
  }, []);



  // Use shared coordinate helper for Y positioning
  const getEventY = (unixSeconds: number): number => {
    const margin = 0; // No margin - timeline spans full height
    const timelineHeight = dimensions.height - margin * 2;
    return calculateEventY(unixSeconds, timelineHeight, transform);
  };

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
    image_url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="45" fill="%23ec4899" stroke="%23ffffff" stroke-width="2"/%3E%3Cline x1="50" y1="15" x2="50" y2="30" stroke="%23ffffff" stroke-width="3" stroke-linecap="round"/%3E%3Cline x1="50" y1="70" x2="50" y2="85" stroke="%23ffffff" stroke-width="3" stroke-linecap="round"/%3E%3Cline x1="15" y1="50" x2="30" y2="50" stroke="%23ffffff" stroke-width="3" stroke-linecap="round"/%3E%3Cline x1="70" y1="50" x2="85" y2="50" stroke="%23ffffff" stroke-width="3" stroke-linecap="round"/%3E%3Cline x1="50" y1="50" x2="50" y2="65" stroke="%23ffffff" stroke-width="2"/%3E%3Cline x1="50" y1="50" x2="65" y2="50" stroke="%23ffffff" stroke-width="2"/%3E%3C/svg%3E',
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

  // Determine which visible events can be displayed with their titles (collision detection)
  // Use the shared collision detection function for consistency with canvas images
  const displayableEvents = (() => {
    const START_TIME = -435494878264400000;

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

    if (allVisibleEvents.length === 0) return [];

    const positions = allVisibleEvents.map((event) => ({
      event,
      y: getEventY(event.unix_seconds || 0),
    })).sort((a, b) => a.y - b.y);

    const displayableIds = getDisplayableEvents(positions, dimensions.height);
    return positions.filter(({ event }) => displayableIds.has(event.id)).map(({ event }) => event);
  })();

  return (
    <div
      ref={panelRef}
      className="h-full bg-gray-900 text-gray-100 flex flex-col relative"
      style={{ fontFamily: '"Roboto Condensed", sans-serif' }}
    >
      {/* Content - Synchronized visible events with vertical alignment */}
      <div ref={contentRef} className="h-full relative">
        {displayableEvents.length > 0 ? (
          <div className="relative" style={{ height: '100%' }}>
            {displayableEvents
              .map((event) => {
                const unixSeconds = typeof event.unix_seconds === 'number' ? event.unix_seconds : parseInt(event.unix_seconds as any);
                const eventY = getEventY(unixSeconds);
                return { event, eventY };
              })
              .sort((a, b) => a.eventY - b.eventY)
              .map(({ event, eventY }, index, sorted) => {
                // Calculate available vertical space to next event
                let availableSpace: number;
                if (index < sorted.length - 1) {
                  availableSpace = sorted[index + 1].eventY - eventY;
                } else {
                  // For last event, use remaining space to bottom
                  availableSpace = (dimensions.height - 40) - eventY; // 40 = margin*2
                }

                // Minimum height needed to show at least one line of text (~24px)
                const minHeightNeeded = 24;

                // Hide if not enough space
                if (availableSpace < minHeightNeeded) {
                  return null;
                }

              // Fixed card height of 100px
              const cardHeight = 100;

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
                      className="p-2 bg-gray-800 rounded border border-gray-700 cursor-pointer transition overflow-hidden flex flex-row gap-2"
                      style={{
                        height: '100%',
                        borderLeft: `6px solid ${event.category && CATEGORY_COLORS[event.category]?.bg ? CATEGORY_COLORS[event.category].bg : '#3b82f6'}`
                      }}
                    >
                      {/* Event Image - Square container on left */}
                      {(() => {
                        const imageUrl = event.image_url;
                        return imageUrl ? (
                          <div className="w-20 h-20 bg-gray-900 rounded flex-shrink-0 border border-gray-600 overflow-hidden">
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
                          {/* Event Time - All resolutions */}
                          <div className="text-xs text-blue-400 font-bold whitespace-nowrap">
                            {event.formatted_time}
                          </div>

                          {/* Category Tag */}
                          {event.category && (
                            <span
                              className="inline-block px-1 py-0.5 text-xs font-bold rounded flex-shrink-0 w-fit"
                              style={{
                                backgroundColor: CATEGORY_COLORS[event.category]?.bg || '#3b82f6',
                                color: CATEGORY_COLORS[event.category]?.text || '#eff6ff'
                              }}
                            >
                              {event.category.toUpperCase()}
                            </span>
                          )}
                        </div>

                        {/* Event Title */}
                        <h3 className="text-xs font-bold text-white flex-shrink-0">
                          {event.title}
                        </h3>

                        {/* Event Description */}
                        {event.description && (
                          <p className="text-xs text-gray-300 overflow-hidden line-clamp-1">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    // Regular event card - image on left, content on right
                    <div
                      className="p-2 bg-gray-800 rounded border border-gray-700 transition overflow-hidden flex flex-row gap-2"
                      style={{
                        height: '100%',
                        borderLeft: `6px solid ${event.category && CATEGORY_COLORS[event.category]?.bg ? CATEGORY_COLORS[event.category].bg : '#3b82f6'}`
                      }}
                    >
                      {/* Event Image - Square container on left */}
                      {(() => {
                        const imageUrl = getEventImageUrl(event);
                        return imageUrl ? (
                          <div
                            onClick={() => onEventClick?.(event)}
                            className="w-20 h-20 bg-gray-900 rounded flex-shrink-0 border border-gray-600 overflow-hidden hover:border-blue-500 cursor-pointer transition"
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
                          {/* Event Time - Year, Month, Day, Time */}
                          <div className="text-xs text-blue-400 font-bold whitespace-nowrap">
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

                          {/* Category Tag */}
                          {event.category && (
                            <span
                              className="inline-block px-1 py-0.5 text-xs font-bold rounded flex-shrink-0 w-fit"
                              style={{
                                backgroundColor: CATEGORY_COLORS[event.category]?.bg || '#3b82f6',
                                color: CATEGORY_COLORS[event.category]?.text || '#eff6ff'
                              }}
                            >
                              {event.category.toUpperCase()}
                            </span>
                          )}
                        </div>

                        {/* Event Title */}
                        <h3 className="text-xs font-bold text-white flex-shrink-0">
                          {event.title}
                        </h3>

                        {/* Event Description */}
                        {event.description && (
                          <p className="text-xs text-gray-300 overflow-hidden line-clamp-1">
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
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-gray-600 text-lg mb-2">← No events visible at this zoom level</div>
              <div className="text-gray-500 text-sm">
                {events.length} total events loaded
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default EventPanel;
