'use client';

import React, { useEffect, useRef, useState } from 'react';
import { EventResponse } from '@/types';
import { calculateEventY, getDisplayableEvents } from '@/lib/coordinateHelper';

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
}

const EventPanel: React.FC<EventPanelProps> = ({ selectedEvent, events, visibleEvents, transform = { y: 0, k: 1 }, onEventClick }) => {
  const [dimensions, setDimensions] = useState({ height: 0 });
  const [currentTime, setCurrentTime] = useState(Date.now() / 1000); // Current time in Unix seconds
  const contentRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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
  } as unknown as EventResponse;

  // Determine which visible events can be displayed with their titles (collision detection)
  // Use the shared collision detection function for consistency with canvas images
  const displayableEvents = (() => {
    const START_TIME = -435494878264400000;
    const now = Math.floor(Date.now() / 1000);
    const FUTURE_HORIZON_TIME = now + (200 * 31536000); // Now + 200 years

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

    if (allVisibleEvents.length === 0) return [];

    const positions = allVisibleEvents.map((event) => ({
      event,
      y: getEventY(event.unix_seconds || 0),
    })).sort((a, b) => a.y - b.y);

    const displayableIds = getDisplayableEvents(positions, dimensions.height);
    return positions.filter(({ event }) => displayableIds.has(event.id)).map(({ event }) => event);
  })();

  return (
    <div ref={panelRef} className="h-full bg-gray-900 text-gray-100 flex flex-col relative" style={{ fontFamily: '"Roboto Condensed", sans-serif' }}>
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

              // Use the same max size as canvas images (100px) for perfect alignment
              const cardHeight = 100;

              // Special rendering for "Now" event - show time in MM:SS format as image
              const isNowEvent = event.id === 'now';
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
                  {isNowEvent ? (
                    // Special card for "Now" event
                    <div className="p-3 bg-gray-900 rounded border-2 border-gray-300 cursor-pointer transition overflow-hidden flex flex-col" style={{ height: '100%' }}>
                      {/* Event Title */}
                      <h3 className="text-base font-bold text-gray-100 mb-2 flex-shrink-0">
                        {event.title}
                      </h3>

                      {/* Event Time - All resolutions */}
                      <div className="text-sm text-gray-200 font-mono font-semibold flex-shrink-0 overflow-hidden">
                        {event.formatted_time}
                      </div>
                    </div>
                  ) : (
                    // Regular event card
                    <div
                      onClick={() => onEventClick?.(event)}
                      className="p-3 bg-gray-800 rounded border border-gray-700 hover:border-blue-500 cursor-pointer transition overflow-hidden flex flex-col" style={{ height: '100%' }}
                    >
                      {/* Event Title */}
                      <h3 className="text-sm font-bold text-white mb-1 flex-shrink-0">
                        {event.title}
                      </h3>

                      {/* Event Time */}
                      <div className="text-xs text-blue-400 font-bold mb-2 flex-shrink-0">
                        {event.formatted_time}
                      </div>

                      {/* Category */}
                      {event.category && (
                        <span
                          className="inline-block px-1 py-0.5 text-xs font-bold rounded flex-shrink-0"
                          style={{
                            backgroundColor: CATEGORY_COLORS[event.category]?.bg || '#3b82f6',
                            color: CATEGORY_COLORS[event.category]?.text || '#eff6ff'
                          }}
                        >
                          {event.category.toUpperCase()}
                        </span>
                      )}

                      {/* Event Description */}
                      {event.description && (
                        <p className="text-xs text-gray-300 mt-2 flex-1 overflow-hidden line-clamp-3">
                          {event.description}
                        </p>
                      )}
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
