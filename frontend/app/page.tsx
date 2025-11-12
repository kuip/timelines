'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import TimelineCanvas from '@/components/TimelineCanvas';
import EventPanel from '@/components/EventPanel';
import EventDetailModal, { type EventDetailModalHandle } from '@/components/EventDetailModal';
import { EventResponse } from '@/types';
import { eventsApi } from '@/lib/api';
import { constrainTransform, type Transform } from '@/lib/canvasInteraction';
import { getFutureHorizonTime } from '@/lib/coordinateHelper';

export default function Home() {
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventResponse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [transform, setTransform] = useState({ y: 0, k: 1 });
  const [visibleEvents, setVisibleEvents] = useState<EventResponse[]>([]);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 200, height: 0 });
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const modalRef = useRef<EventDetailModalHandle>(null);

  // Constants for timeline
  const START_TIME = -435494878264400000;
  const END_TIME = 435457000000000000;
  const FUTURE_HORIZON_TIME = getFutureHorizonTime();

  // Load transform from URL on mount or set initial state with Big Bang at middle of screen
  useEffect(() => {
    // Initialize canvas dimensions on client side
    setCanvasDimensions({ width: 200, height: window.innerHeight });

    const params = new URLSearchParams(window.location.search);
    const y = parseFloat(params.get('y') || '');
    const k = parseFloat(params.get('k') || '');

    if (!isNaN(y) && !isNaN(k)) {
      // Clamp zoom to reasonable range to prevent performance issues
      const clampedK = Math.max(1, Math.min(1e18, k));
      setTransform({ y, k: clampedK });
    } else {
      // Default: Big Bang at middle of screen
      // Big Bang Y = window.innerHeight * k + y
      // We want Big Bang at middle: window.innerHeight / 2
      // So: window.innerHeight * 1 + y = window.innerHeight / 2
      // y = window.innerHeight / 2 - window.innerHeight = -window.innerHeight / 2
      setTransform({ y: -window.innerHeight / 2, k: 1 });
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
      params.set('y', constrainedTransform.y.toFixed(2));
      params.set('k', constrainedTransform.k.toFixed(2));
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

  return (
    <main className="relative h-screen w-screen bg-gray-900 text-white flex" style={{ fontFamily: '"Roboto Condensed", sans-serif' }}>
      {/* Canvas Timeline */}
      <div className="h-full flex-shrink-0" style={{ width: '100px' }}>
        <TimelineCanvas events={events} onEventClick={handleEventClick} onTransformChange={handleTimelineTransform} onVisibleEventsChange={setVisibleEvents} initialTransform={transform} transform={transform} onCanvasClick={handleCanvasClick} onShiftClick={handleShiftClick} onDimensionsChange={handleCanvasDimensionsChange} modalOpen={modalOpen} />
      </div>

      {/* Event Panel - Remaining width */}
      <div className="flex-1 h-full">
        <EventPanel selectedEvent={selectedEvent} events={events} visibleEvents={visibleEvents} transform={transform} onEventClick={handleEventClick} onTransformChange={handleTimelineTransform} />
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
