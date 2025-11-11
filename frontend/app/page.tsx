'use client';

import { useEffect, useState, useRef } from 'react';
import TimelineCanvas from '@/components/TimelineCanvas';
import EventPanel from '@/components/EventPanel';
import EventDetailModal, { type EventDetailModalHandle } from '@/components/EventDetailModal';
import { EventResponse } from '@/types';
import { eventsApi } from '@/lib/api';

export default function Home() {
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventResponse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [transform, setTransform] = useState({ y: 0, k: 1 });
  const [visibleEvents, setVisibleEvents] = useState<EventResponse[]>([]);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const modalRef = useRef<EventDetailModalHandle>(null);

  // Load transform from URL on mount or set initial state with Big Bang at middle of screen
  useEffect(() => {
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
    // Update the events list with the updated event
    setEvents((prevEvents) =>
      prevEvents.map((e) => (e.id === updatedEvent.id ? updatedEvent : e))
    );
    // Update the selected event to reflect changes
    setSelectedEvent(updatedEvent);
  };

  const handleTimelineClickForModal = (unixSeconds: number) => {
    // This will be called from the TimelineCanvas when modal is open
    // We need to pass this to the modal somehow
    // For now, we'll log it to show the concept
    console.log('Timeline clicked at unix_seconds:', unixSeconds);
  };

  // Handle timeline transform - just update transform and URL, don't update selection
  const handleTimelineTransform = (newTransform: { y: number; k: number }) => {
    // Update local state immediately
    setTransform(newTransform);

    // Debounce URL updates to prevent throttling warnings
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      params.set('y', newTransform.y.toFixed(2));
      params.set('k', newTransform.k.toFixed(2));
      window.history.replaceState({}, '', `?${params.toString()}`);
    }, 300); // Update URL after 300ms of inactivity
  };

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

  const handleCanvasClick = (unixSeconds: number) => {
    // When modal is open, update the unix_seconds in the modal
    console.log('handleCanvasClick called:', { unixSeconds, modalOpen, hasRef: !!modalRef.current });
    if (modalOpen && modalRef.current) {
      console.log('Updating unix_seconds to:', unixSeconds);
      modalRef.current.updateUnixSeconds(unixSeconds);
    }
  };

  return (
    <main className="relative h-screen w-screen bg-gray-900 text-white flex" style={{ fontFamily: '"Roboto Condensed", sans-serif' }}>
      {/* Canvas Timeline - 300px fixed width */}
      <div className="h-full flex-shrink-0" style={{ width: '300px' }}>
        <TimelineCanvas events={events} onEventClick={handleEventClick} onTransformChange={handleTimelineTransform} onVisibleEventsChange={setVisibleEvents} initialTransform={transform} onCanvasClick={handleCanvasClick} modalOpen={modalOpen} />
      </div>

      {/* Event Panel - Remaining width */}
      <div className="flex-1 h-full">
        <EventPanel selectedEvent={selectedEvent} events={events} visibleEvents={visibleEvents} transform={transform} onEventClick={handleEventClick} />
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
