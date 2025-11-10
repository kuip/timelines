'use client';

import React, { useState, useEffect, useRef } from 'react';
import { EventResponse } from '@/types';
import ReactMarkdown from 'react-markdown';

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
}

const EventPanel: React.FC<EventPanelProps> = ({ selectedEvent, events, visibleEvents, transform = { y: 0, k: 1 } }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showDescription, setShowDescription] = useState(false);
  const [dimensions, setDimensions] = useState({ height: 0 });
  const contentRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Track panel height for coordinate calculations
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

  // Calculate if we have room to show description
  useEffect(() => {
    if (!contentRef.current || !selectedEvent) {
      setShowDescription(false);
      return;
    }

    // Approximate line height in pixels
    const lineHeight = 24;
    const availableHeight = contentRef.current.clientHeight;

    // Estimate: title (1-2 lines) + timeline box (4 lines) + min content
    // If remaining space > 2 lines, show description
    const minimumHeightForDescription = lineHeight * 8;

    setShowDescription(availableHeight > minimumHeightForDescription);
  }, [selectedEvent]);

  const formatTime = (date: Date) => {
    return date.toISOString().split('T')[0] + ' ' + date.toISOString().split('T')[1].slice(0, 8) + ' GMT';
  };

  // Helper function to calculate Y position for an event based on transform
  // This matches the canvas coordinate system EXACTLY, but positioned within content area
  const getEventY = (unixSeconds: number): number => {
    const START_TIME = -435494878264400000;
    const END_TIME = 435457000000000000;
    const margin = 20;
    const timelineHeight = dimensions.height - margin * 2; // MUST match TimelineCanvas
    const timelineTop = margin;

    const numSeconds = typeof unixSeconds === 'number' ? unixSeconds : parseInt(unixSeconds as any);
    // Calculate in canvas coordinate space (with margin offset from top)
    const canvasY = timelineTop + ((END_TIME - numSeconds) / (END_TIME - START_TIME)) * timelineHeight * transform.k + transform.y;

    // Convert to content-area-relative coordinates
    // The canvas starts at timelineTop (margin=20), so we subtract that to get position within content area
    return canvasY - timelineTop;
  };

  // Determine which visible events can be displayed with their titles (collision detection)
  const getDisplayableEvents = (): EventResponse[] => {
    if (visibleEvents.length <= 1) return [];

    const minSpacing = 32; // Minimum pixels between title labels
    const positions = visibleEvents.map((event) => ({
      event,
      y: getEventY(event.unix_seconds),
    })).sort((a, b) => a.y - b.y);

    const displayable: EventResponse[] = [];
    let lastY = -Infinity;

    for (const { event, y } of positions) {
      if (y - lastY >= minSpacing) {
        displayable.push(event);
        lastY = y;
      }
    }

    return displayable;
  };

  const displayableEvents = getDisplayableEvents();

  return (
    <div ref={panelRef} className="h-full bg-gray-900 text-gray-100 flex flex-col relative" style={{ fontFamily: '"Roboto Condensed", sans-serif' }}>
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-700 bg-gray-800">
        <div className="text-sm text-gray-400 font-bold">
          Now: {formatTime(currentTime)}
        </div>
      </div>

      {/* Content - Synchronized visible events with vertical alignment */}
      <div ref={contentRef} className="flex-1 relative overflow-y-auto px-6">
        {visibleEvents.length > 0 ? (
          <div className="relative" style={{ height: '100%' }}>
            {visibleEvents
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

              return (
                <div
                  key={event.id}
                  style={{
                    position: 'absolute',
                    top: `${eventY}px`,
                    left: 0,
                    right: 0,
                    transform: 'translateY(-50%)',
                  }}
                  className="w-full"
                >
                  <div className="p-3 bg-gray-800 rounded border border-gray-700 hover:border-blue-500 cursor-pointer transition">
                    {/* Event Title */}
                    <h3 className="text-sm font-bold text-white mb-1">
                      {event.title}
                    </h3>

                    {/* Event Time */}
                    <div className="text-xs text-blue-400 font-bold mb-2">
                      {event.formatted_time}
                    </div>

                    {/* Category */}
                    {event.category && (
                      <span
                        className="inline-block px-1 py-0.5 text-xs font-bold rounded"
                        style={{
                          backgroundColor: CATEGORY_COLORS[event.category]?.bg || '#3b82f6',
                          color: CATEGORY_COLORS[event.category]?.text || '#eff6ff'
                        }}
                      >
                        {event.category.toUpperCase()}
                      </span>
                    )}
                  </div>
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

      {/* Footer */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-gray-700 bg-gray-800">
        <div className="text-xs text-gray-500">
          Big Bang
        </div>
      </div>
    </div>
  );
};

export default EventPanel;
