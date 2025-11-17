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
import { useAuth } from '@/lib/useAuth';
import AuthInfo from '@/components/AuthInfo';
import { categoryMatchesFilter } from '@/lib/categoryColors';

const GeoMap = dynamic(() => import('@/components/GeoMap'), { ssr: false });

interface UIConfig {
  timelineCanvasWidthPx: number;
  timelineSliverWidthPx: number;
  responsiveBreakpointPx: number;
  mapWidthPercent: number;
  cardHeightPx: number;
  cardViewportPaddingPx: number;
  imagePaddingPx: number;
}

export default function Home() {
  // Auth hook for managing user authentication
  const { canEdit } = useAuth();

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
    timelineSliverWidthPx: 32,
    responsiveBreakpointPx: 768,
    mapWidthPercent: 45,
    cardHeightPx: 100,
    cardViewportPaddingPx: 0,
    imagePaddingPx: 2,
  });
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const modalRef = useRef<EventDetailModalHandle>(null);
  const prevCardIdsRef = useRef<string>('');
  const [editingLocationMode, setEditingLocationMode] = useState(false);
  const [editingEventLocation, setEditingEventLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'timeline' | 'list' | 'map'>('list'); // For narrow devices

  // Constants for timeline
  const START_TIME = -435494878264400000;
  const END_TIME = 435457000000000000;
  const FUTURE_HORIZON_TIME = getFutureHorizonTime();

  // Load UI config from settings.json
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch(`/settings.json?t=${Date.now()}`);
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
      // Check if transform is unreasonable (likely corrupted/extreme values)
      // If k is very large (>1e10) or y is extreme, reset to default instead
      const isUnreasonable = k > 1e10 || Math.abs(y) > 1e13;

      if (isUnreasonable) {
        // Reset to default - redirect to clean URL
        window.location.replace('/');
        return;
      }

      // Clamp zoom and y to reasonable ranges to prevent performance issues
      const clampedK = Math.max(1, Math.min(1e12, k));
      // Clamp y to prevent extreme off-screen positions
      const clampedY = Math.max(-1e14, Math.min(1e14, y));

      // If values were clamped, update URL to reflect the clamped values
      if (clampedY !== y || clampedK !== k) {
        const newParams = new URLSearchParams();
        newParams.set('y', clampedY.toString());
        newParams.set('k', clampedK.toString());
        window.history.replaceState({}, '', `?${newParams.toString()}`);
      }

      setTransform({ y: clampedY, k: clampedK });
    } else {
      // Load default transform from config - y is now timestamp, k is seconds per pixel
      const loadDefaultTransform = async () => {
        try {
          const response = await fetch(`/settings.json?t=${Date.now()}`);
          if (response.ok) {
            const config = await response.json();
            if (config.default_transform) {
              const { y: defaultY, k: defaultK } = config.default_transform;

              // Use the configured values directly - y is the center timestamp
              const newParams = new URLSearchParams();
              newParams.set('y', defaultY.toString());
              newParams.set('k', defaultK.toString());
              window.location.replace(`?${newParams.toString()}`);
            }
          }
        } catch (err) {
          console.error('Failed to load default transform from config:', err);
          // Fallback to NOW at center with 3 months per pixel
          const nowTime = Math.floor(Date.now() / 1000);
          const newParams = new URLSearchParams();
          newParams.set('y', nowTime.toString());
          newParams.set('k', '7884000'); // 3 months per pixel
          window.location.replace(`?${newParams.toString()}`);
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
        limit: 10000, // Temporary: fetch all current events (will implement dynamic loading later)
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

      let closestEvent: EventResponse | null = null;
      let closestDistance = Infinity;

      visibleEvents.forEach((event) => {
        const unixSeconds = typeof event.unix_seconds === 'number' ? event.unix_seconds : parseInt(event.unix_seconds as any);
        // Use the same coordinate system as calculateEventY in coordinateHelper.ts
        const referenceY = timelineHeight / 3;
        const timestampOffset = unixSeconds - transform.y;
        const pixelOffset = -timestampOffset / transform.k; // Negative because past is down
        const eventY = referenceY + pixelOffset;
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
  }, [visibleEvents, transform]);

  // Define callbacks BEFORE any conditional returns (React hook rule)
  const handleCanvasClick = useCallback((unixSeconds: number) => {
    // When modal is open, update the unix_seconds in the modal
    console.log('handleCanvasClick called:', { unixSeconds, modalOpen, hasRef: !!modalRef.current });
    if (modalOpen && modalRef.current) {
      console.log('Updating unix_seconds to:', unixSeconds);
      modalRef.current.updateUnixSeconds(unixSeconds);
    }
  }, [modalOpen]);

  const handleShiftClickImage = useCallback((linkedEvent: EventResponse) => {
    // Add linked event to the currently open modal
    if (modalRef.current && selectedEvent) {
      console.log('Adding linked event:', linkedEvent.id);
      modalRef.current.addLinkedEvent(linkedEvent.id);
    }
  }, [selectedEvent]);

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

  const handleMapClick = useCallback((lat: number, lng: number) => {
    // When modal is open and in editing location mode, update the location fields
    if (editingLocationMode && modalRef.current) {
      console.log('Map click: updating location to', { lat, lng });
      modalRef.current.updateLocationCoordinates(lat, lng);
      setEditingEventLocation({ lat, lng });
    }
  }, [editingLocationMode]);

  const handleCategoryFilter = useCallback((categoryId: string) => {
    // Toggle filter: if clicking the same category, clear filter
    setCategoryFilter(prev => prev === categoryId ? null : categoryId);
  }, []);

  // When modal closes, disable editing location mode and clear editing location
  useEffect(() => {
    if (!modalOpen) {
      setEditingLocationMode(false);
      setEditingEventLocation(null);
    }
  }, [modalOpen]);

  // Mobile view swipe navigation disabled for now to prevent issues with timeline interaction

  // When entering edit mode, initialize editing location with selected event's coordinates
  useEffect(() => {
    if (editingLocationMode && selectedEvent && modalRef.current) {
      // Get the current coordinates from the modal's form data
      // We need to call a method on the modal ref to get the location coordinates
      // For now, try to fetch the event's location
      const fetchEventLocation = async () => {
        try {
          // Get API URL from settings first, fallback to environment variable
          let apiUrl = 'http://localhost:8080';
          try {
            const settingsResponse = await fetch('/settings.json?t=' + Date.now());
            if (settingsResponse.ok) {
              const settings = await settingsResponse.json();
              if (settings.api_url) {
                apiUrl = settings.api_url;
              }
            }
          } catch (e) {
            // Fall through to default
          }

          const response = await fetch(`${apiUrl}/api/events/${selectedEvent.id}/locations?t=${Date.now()}`);
          if (response.ok) {
            const data = await response.json();
            if (data.locations && data.locations.length > 0) {
              const primaryLocation = data.locations.find((loc: any) => loc.is_primary) || data.locations[0];
              if (primaryLocation && primaryLocation.geojson?.type === 'Point') {
                const [lng, lat] = primaryLocation.geojson.coordinates;
                console.log('Initializing edit mode with location:', { lat, lng });
                setEditingEventLocation({ lat, lng });
              }
            }
          }
        } catch (err) {
          console.warn('Failed to fetch event location for editing:', err);
          // Fallback to default center coordinates
          setEditingEventLocation({ lat: 0, lng: 0 });
        }
      };
      fetchEventLocation();
    }
  }, [editingLocationMode, selectedEvent]);

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

  const handleHorizontalSwipe = (direction: 'left' | 'right') => {
    const views: Array<'timeline' | 'list' | 'map'> = ['timeline', 'list', 'map'];
    const currentIndex = views.indexOf(mobileView);

    if (direction === 'right') {
      // Swipe right - go to previous view
      const newIndex = currentIndex > 0 ? currentIndex - 1 : views.length - 1;
      setMobileView(views[newIndex]);
    } else {
      // Swipe left - go to next view
      const newIndex = currentIndex < views.length - 1 ? currentIndex + 1 : 0;
      setMobileView(views[newIndex]);
    }
  };

  // Filter events based on category filter
  // Supports filtering by both exact category and parent categories
  const filteredEvents = categoryFilter
    ? events.filter(event => {
        if (!event.category) return false;
        // Check if event's category matches filter (exact match or is a descendant)
        return categoryMatchesFilter(event.category, categoryFilter);
      })
    : events;

  return (
    <main className="relative h-screen w-screen bg-stone-50 dark:bg-gray-900 text-gray-900 dark:text-white flex" style={{ fontFamily: '"Roboto Condensed", sans-serif' }}>
      {/* Auth Info - Top Right */}
      <div className="absolute z-50" style={{ top: '3px', right: '4px' }}>
        <AuthInfo />
      </div>

      {/* Reset to Default Button - Using now.svg icon */}
      <button
        onClick={handleResetToDefault}
        className="absolute z-50 hover:opacity-80 transition-opacity"
        style={{ top: '8px', left: '8px' }}
        title="Return to default view"
      >
        <img src="/images/categories/now.svg" alt="Now" className="w-12 h-12" />
      </button>

      {/* Canvas Timeline - Always on LEFT side */}
      <div
        className="h-full flex-shrink-0 bg-stone-100 dark:bg-gray-800 timeline-container"
        style={{
          ['--timeline-full-width' as any]: `${uiConfig.timelineCanvasWidthPx}px`,
          ['--timeline-sliver-width' as any]: `${uiConfig.timelineSliverWidthPx}px`,
        }}
      >
        <TimelineCanvas events={filteredEvents} displayedCardEvents={displayedCardEvents} onEventClick={handleEventClick} onTransformChange={handleTimelineTransform} onVisibleEventsChange={setVisibleEvents} initialTransform={transform} transform={transform} onCanvasClick={handleCanvasClick} onShiftClick={handleShiftClick} onDimensionsChange={handleCanvasDimensionsChange} modalOpen={modalOpen} />
      </div>

      {/* Event Panel - Always visible */}
      <div className="h-full flex-1">
        <EventPanel selectedEvent={selectedEvent} events={filteredEvents} visibleEvents={visibleEvents} transform={transform} onEventClick={handleEventClick} onShiftClickImage={handleShiftClickImage} onTransformChange={handleTimelineTransform} onDisplayedEventsChange={handleDisplayedEventsChange} cardHeightPx={uiConfig.cardHeightPx} cardViewportPaddingPx={uiConfig.cardViewportPaddingPx} imagePaddingPx={uiConfig.imagePaddingPx} onCategoryFilter={handleCategoryFilter} categoryFilter={categoryFilter} onHorizontalSwipe={handleHorizontalSwipe} />
      </div>

      {/* Geolocation Map - Narrow screens: conditional visibility, Wide screens: always visible */}
      <div
        className={`h-full flex-shrink-0 relative map-container ${
          mobileView === 'map' ? '' : 'hidden'
        }`}
        style={{
          width: `${uiConfig.mapWidthPercent}%`,
          zIndex: 1
        }}
      >
        <Suspense fallback={<div className="w-full h-full flex items-center justify-center bg-gray-800"><p>Loading map...</p></div>}>
          <GeoMap
            events={displayedCardEvents}
            selectedEvent={selectedEvent}
            onEventClick={handleEventClick}
            onMapClick={handleMapClick}
            editingEventLocation={editingEventLocation}
            isEditingLocation={editingLocationMode}
          />
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
        onShiftClickImage={handleShiftClickImage}
        onEditingLocationModeChange={setEditingLocationMode}
        canEdit={canEdit}
      />

      {/* Responsive styles */}
      <style jsx>{`
        /* Wide screens: always show full timeline and map */
        @media (min-width: ${uiConfig.responsiveBreakpointPx}px) {
          .timeline-container {
            width: var(--timeline-full-width) !important;
          }
          .map-container {
            display: block !important;
          }
        }
        /* Narrow screens: full width in timeline view, sliver otherwise */
        @media (max-width: ${uiConfig.responsiveBreakpointPx - 1}px) {
          .timeline-container {
            width: ${mobileView === 'timeline' ? 'var(--timeline-full-width)' : 'var(--timeline-sliver-width)'} !important;
          }
        }
      `}</style>
    </main>
  );
}
