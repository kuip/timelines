'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import TimelineCanvas from '@/components/TimelineCanvas';
import EventPanel from '@/components/EventPanel';
import EventDetailModal, { type EventDetailModalHandle } from '@/components/EventDetailModal';
import { EventResponse } from '@/types';
import { eventsApi } from '@/lib/api';
import { constrainTransform, type Transform } from '@/lib/canvasInteraction';
import { getFutureHorizonTime } from '@/lib/coordinateHelper';

const GeoMap = dynamic(() => import('@/components/GeoMap'), { ssr: false });

interface UIConfig {
  timelineCanvasWidthPx: number;
  mapWidthPercent: number;
  cardHeightPx: number;
  cardViewportPaddingPx: number;
  imagePaddingPx: number;
}

export default function Home() {
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventResponse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [transform, setTransform] = useState({ y: 0, k: 1 });
  const [visibleEvents, setVisibleEvents] = useState<EventResponse[]>([]);
  const [displayedCardEvents, setDisplayedCardEvents] = useState<EventResponse[]>([]);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 200, height: 0 });
  const [uiConfig, setUiConfig] = useState<UIConfig>({
    timelineCanvasWidthPx: 200,
    mapWidthPercent: 45,
    cardHeightPx: 100,
    cardViewportPaddingPx: 0,
    imagePaddingPx: 2,
  });
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const modalRef = useRef<EventDetailModalHandle>(null);
  const prevCardIdsRef = useRef<string>('');

  // Constants for timeline
  const START_TIME = -435494878264400000;
  const END_TIME = 435457000000000000;
  const FUTURE_HORIZON_TIME = getFutureHorizonTime();

  // Load UI config from settings.json
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch('/settings.json');
        if (response.ok) {
          const config = await response.json();
          if (config.ui) {
            setUiConfig(config.ui);
            // Update canvas dimensions with config value
            setCanvasDimensions({ width: config.ui.timelineCanvasWidthPx, height: window.innerHeight });
          }
        }
      } catch (err) {
        console.error('Failed to load UI config:', err);
      }
    };
    loadConfig();
  }, []);

  // Load transform from URL on mount or redirect to default state from config
  useEffect(() => {
    // Initialize canvas dimensions on client side
    const viewportHeight = window.innerHeight;
    setCanvasDimensions({ width: uiConfig.timelineCanvasWidthPx, height: viewportHeight });

    const params = new URLSearchParams(window.location.search);
    const y = parseFloat(params.get('y') || '');
    const k = parseFloat(params.get('k') || '');

    if (!isNaN(y) && !isNaN(k)) {
      // Clamp zoom to reasonable range to prevent performance issues
      const clampedK = Math.max(1, Math.min(1e18, k));
      setTransform({ y, k: clampedK });
    } else {
      // Load default transform from config and calculate y for current viewport height
      const loadDefaultTransform = async () => {
        try {
          const response = await fetch('/settings.json');
          if (response.ok) {
            const config = await response.json();
            if (config.default_transform) {
              const { k: defaultK } = config.default_transform;

              // Constants from coordinateHelper
              const START_TIME = -435494878264400000;
              const END_TIME = 435457000000000000;
              const target2022 = Math.floor(new Date('2022-01-01').getTime() / 1000);

              // Calculate y for current viewport height
              // Formula: y_position = ((END_TIME - unixSeconds) / (END_TIME - START_TIME)) * timelineHeight * k + transform.y
              // At center, we want unixSeconds = target2022
              // centerScreenY = ((END_TIME - target2022) / (END_TIME - START_TIME)) * timelineHeight * k + transform.y
              // transform.y = centerScreenY - ((END_TIME - target2022) / (END_TIME - START_TIME)) * timelineHeight * k

              const centerScreenY = viewportHeight / 2;
              const ratio = (END_TIME - target2022) / (END_TIME - START_TIME);
              const calculatedY = centerScreenY - (ratio * viewportHeight * defaultK);

              const newParams = new URLSearchParams();
              newParams.set('y', calculatedY.toString());
              newParams.set('k', defaultK.toString());
              window.location.replace(`?${newParams.toString()}`);
            }
          }
        } catch (err) {
          console.error('Failed to load default transform from config:', err);
          // Fallback to Big Bang at middle
          const fallbackTransform = { y: -viewportHeight / 2, k: 1 };
          setTransform(fallbackTransform);
        }
      };

      loadDefaultTransform();
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const { events: data } = await eventsApi.getEvents({
        limit: 1000,
        min_importance: 0,
      });
      setEvents(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load events:', err);
      setError('Failed to load timeline events. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (event: EventResponse) => {
    setSelectedEvent(event);
    setModalOpen(true);
  };

  const handleEventUpdate = (updatedEvent: EventResponse) => {
    // Update the events list with the updated event or add it if new
    setEvents((prevEvents) => {
      const existingIndex = prevEvents.findIndex((e) => e.id === updatedEvent.id);
      if (existingIndex >= 0) {
        // Update existing event
        return prevEvents.map((e) => (e.id === updatedEvent.id ? updatedEvent : e));
      } else {
        // Add new event
        return [...prevEvents, updatedEvent];
      }
    });
    // Update the selected event to reflect changes
    setSelectedEvent(updatedEvent);
  };

  const handleShiftClick = (unixSeconds: number) => {
    // Shift-click creates a new event with pre-filled time
    console.log('Shift-click to create new event at unix_seconds:', unixSeconds);
    const newEvent: EventResponse = {
      id: 'new',
      timeline_seconds: unixSeconds.toString(),
      unix_seconds: Math.floor(unixSeconds),
      precision_level: 'day',
      title: 'New Event',
      description: '',
      category: 'contemporary',
      importance_score: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      formatted_time: new Date(unixSeconds * 1000).toISOString(),
      source_count: 0,
      discussion_count: 0,
    };
    setSelectedEvent(newEvent);
    setModalOpen(true);
  };

  // Handle timeline transform - apply constraints to keep Big Bang and Future Horizon within bounds
  const handleTimelineTransform = useCallback((newTransform: Transform) => {
    // Apply constraint logic to ensure canvas rules are respected
    const constrainedTransform = constrainTransform(
      newTransform,
      canvasDimensions,
      START_TIME,
      END_TIME,
      FUTURE_HORIZON_TIME
    );

    // Update local state immediately with constrained transform
    setTransform(constrainedTransform);

    // Debounce URL updates to prevent throttling warnings
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      params.set('y', constrainedTransform.y.toString());
      params.set('k', constrainedTransform.k.toString());
      window.history.replaceState({}, '', `?${params.toString()}`);
    }, 300); // Update URL after 300ms of inactivity
  }, [canvasDimensions, START_TIME, END_TIME, FUTURE_HORIZON_TIME]);

  // Auto-select closest event to viewport center from visible events
  // Only update when visible events change, not on every transform change to avoid loops
  useEffect(() => {
    if (visibleEvents.length > 0) {
      const margin = 0; // No margin - timeline spans full height
      const timelineHeight = window.innerHeight - margin * 2;
      const timelineTop = margin;
      const centerViewportY = timelineTop + timelineHeight / 2;

      const START_TIME = -435494878264400000;
      const END_TIME = 435457000000000000;

      let closestEvent: EventResponse | null = null;
      let closestDistance = Infinity;

      visibleEvents.forEach((event) => {
        const unixSeconds = typeof event.unix_seconds === 'number' ? event.unix_seconds : parseInt(event.unix_seconds as any);
        const eventY = timelineTop + ((END_TIME - unixSeconds) / (END_TIME - START_TIME)) * timelineHeight * transform.k + transform.y;
        const distance = Math.abs(eventY - centerViewportY);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestEvent = event;
        }
      });

      if (closestEvent) {
        setSelectedEvent(closestEvent);
      }
    }
  }, [visibleEvents]);

  // Define callbacks BEFORE any conditional returns (React hook rule)
  const handleCanvasClick = useCallback((unixSeconds: number) => {
    // When modal is open, update the unix_seconds in the modal
    console.log('handleCanvasClick called:', { unixSeconds, modalOpen, hasRef: !!modalRef.current });
    if (modalOpen && modalRef.current) {
      console.log('Updating unix_seconds to:', unixSeconds);
      modalRef.current.updateUnixSeconds(unixSeconds);
    }
  }, [modalOpen]);

  const handleCanvasDimensionsChange = useCallback((dimensions: { width: number; height: number }) => {
    setCanvasDimensions(dimensions);
  }, []);

  // Wrapper to prevent unnecessary updates when card IDs haven't changed
  const handleDisplayedEventsChange = useCallback((newCards: EventResponse[]) => {
    const newCardIds = newCards.map(c => c.id).join(',');
    if (newCardIds !== prevCardIdsRef.current) {
      prevCardIdsRef.current = newCardIds;
      setDisplayedCardEvents(newCards);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg">Loading timeline...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md p-6">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Error</h2>
          <p className="mb-4">{error}</p>
          <button
            onClick={loadEvents}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const handleResetToDefault = () => {
    window.location.href = '/';
  };

  return (
    <main className="relative h-screen w-screen bg-gray-900 text-white flex" style={{ fontFamily: '"Roboto Condensed", sans-serif' }}>
      {/* Reset to Default Button - Matching Now Arrow with Tail */}
      <button
        onClick={handleResetToDefault}
        className="absolute z-50 hover:opacity-80 transition-opacity"
        style={{ top: '8px', left: '8px' }}
        title="Return to default view"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-12 h-12">
          <defs>
            <filter id="roundCorners">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.5"/>
            </filter>
          </defs>
          <polygon points="40,10 22,42 58,42" fill="#d1d5db" stroke="#d1d5db" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" filter="url(#roundCorners)"/>
          <rect x="37" y="42" width="6" height="13" rx="3" fill="#d1d5db"/>
        </svg>
      </button>

      {/* Canvas Timeline */}
      <div className="h-full flex-shrink-0" style={{ width: `${uiConfig.timelineCanvasWidthPx}px` }}>
        <TimelineCanvas events={events} displayedCardEvents={displayedCardEvents} onEventClick={handleEventClick} onTransformChange={handleTimelineTransform} onVisibleEventsChange={setVisibleEvents} initialTransform={transform} transform={transform} onCanvasClick={handleCanvasClick} onShiftClick={handleShiftClick} onDimensionsChange={handleCanvasDimensionsChange} modalOpen={modalOpen} />
      </div>

      {/* Event Panel - Remaining flex space (no relationships panel) */}
      <div className="flex-1 h-full">
        <EventPanel selectedEvent={selectedEvent} events={events} visibleEvents={visibleEvents} transform={transform} onEventClick={handleEventClick} onTransformChange={handleTimelineTransform} onDisplayedEventsChange={handleDisplayedEventsChange} cardHeightPx={uiConfig.cardHeightPx} cardViewportPaddingPx={uiConfig.cardViewportPaddingPx} imagePaddingPx={uiConfig.imagePaddingPx} />
      </div>

      {/* Geolocation Map - Right side full height */}
      <div className="h-full flex-shrink-0 relative" style={{ width: `${uiConfig.mapWidthPercent}%`, zIndex: 1 }}>
        <Suspense fallback={<div className="w-full h-full flex items-center justify-center bg-gray-800"><p>Loading map...</p></div>}>
          <GeoMap events={displayedCardEvents} selectedEvent={selectedEvent} onEventClick={handleEventClick} />
        </Suspense>
      </div>

      {/* Event Detail Modal */}
      <EventDetailModal
        ref={modalRef}
        event={selectedEvent}
        events={events}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onEventUpdate={handleEventUpdate}
      />
    </main>
  );
}
