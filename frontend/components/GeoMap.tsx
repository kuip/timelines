'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { EventResponse } from '@/types';

interface EventLocation {
  id: string;
  event_id: string;
  event_title: string;
  location_name: string;
  location_type: string;
  geojson: GeoJSON.Feature;
  confidence_score: number;
  is_primary: boolean;
}

interface GeoMapProps {
  events: EventResponse[];
  selectedEvent: EventResponse | null;
  visibleEventIds?: Set<string>;
  onEventClick?: (event: EventResponse) => void;
}

export default function GeoMap({ events, selectedEvent, onEventClick }: GeoMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [locations, setLocations] = useState<EventLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const fetchedEventIdsRef = useRef<Set<string>>(new Set()); // Track what we've already fetched

  // Memoize event IDs as a string to detect actual content changes
  // Using a string instead of array prevents re-triggering useEffect when array reference changes
  const memoizedEventIdsStr = useMemo(() => {
    if (!events || !Array.isArray(events) || events.length === 0) {
      return '';
    }
    return events.map(e => e.id).join(',');
  }, [events]);

  // Fetch locations ONLY for displayed card events with memoization
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);

        // If no events, clear locations and cache, then return
        if (memoizedEventIdsStr.length === 0) {
          setLocations([]);
          fetchedEventIdsRef.current.clear();
          setError(null);
          return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

        // Parse event IDs from the memoized string
        const eventIds = memoizedEventIdsStr.split(',');

        // Only fetch for NEW events we haven't seen before
        const newEventIds = eventIds.filter(id => !fetchedEventIdsRef.current.has(id));

        if (newEventIds.length === 0) {
          // No new events to fetch, don't make any API calls
          setLoading(false);
          return;
        }

        // Fetch locations only for the NEW events
        const allLocations: EventLocation[] = [];

        for (const eventId of newEventIds) {
          try {
            const response = await fetch(`${apiUrl}/api/events/${eventId}/locations`);
            if (!response.ok) continue;

            const data = await response.json();
            if (data.locations && Array.isArray(data.locations)) {
              for (const item of data.locations) {
                // The API returns a flat object with geojson as geometry, not a GeoJSON Feature
                allLocations.push({
                  id: item.id,
                  event_id: item.event_id,
                  event_title: item.event_title,
                  location_name: item.location_name,
                  location_type: item.location_type,
                  // Create a proper GeoJSON Feature from the response
                  geojson: {
                    type: 'Feature',
                    geometry: item.geojson,
                    properties: {
                      event_id: item.event_id,
                      event_title: item.event_title,
                      location_name: item.location_name,
                      location_type: item.location_type,
                      confidence_score: item.confidence_score,
                      is_primary: item.is_primary,
                    }
                  },
                  confidence_score: item.confidence_score || 0,
                  is_primary: item.is_primary || false,
                });
              }
            }
            // Mark this event as fetched
            fetchedEventIdsRef.current.add(eventId);
          } catch (err) {
            console.warn(`Failed to fetch locations for event ${eventId}:`, err);
            // Still mark as attempted to avoid retrying failed events
            fetchedEventIdsRef.current.add(eventId);
            continue;
          }
        }

        // Only keep locations for currently visible events
        // This prevents accumulating locations for events no longer in view
        const visibleEventIds = new Set(eventIds);
        setLocations(prev => {
          const filteredPrev = prev.filter(loc => visibleEventIds.has(loc.event_id));
          return [...filteredPrev, ...allLocations];
        });
        setError(null);
      } catch (err) {
        console.error('Error fetching locations:', err);
        setError(`Failed to load geolocation data: ${err}`);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, [memoizedEventIdsStr]);

  // Initialize map on component mount
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    // Import Leaflet CSS dynamically
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
    document.head.appendChild(link);

    // Import Leaflet only on client-side
    import('leaflet').then((leafletModule) => {
      const L = leafletModule.default;

      // Skip if map already initialized (can happen during React strict mode in dev)
      if (mapRef.current || !mapContainer.current) return;

      try {
        // Configure Leaflet default icon paths
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });

        // Initialize map
        const map = L.map(mapContainer.current).setView([20, 0], 2);
        mapRef.current = map;

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        console.log('Map initialized successfully');
      } catch (err) {
        console.error('Error initializing map:', err);
        setError('Failed to initialize map');
      }
    }).catch((err) => {
      console.error('Error importing Leaflet:', err);
      setError('Failed to initialize map');
    });

    return () => {
      // Cleanup: remove markers and destroy map
      if (mapRef.current) {
        markersRef.current.forEach((marker) => {
          mapRef.current.removeLayer(marker);
        });
        markersRef.current.clear();
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Add markers when locations or memoized event IDs change
  useEffect(() => {
    if (!mapRef.current || locations.length === 0) return;

    // Create a set of visible event IDs for faster lookup
    const visibleEventIds = new Set(memoizedEventIdsStr ? memoizedEventIdsStr.split(',') : []);

    // Log detailed information for debugging

    import('leaflet').then((leafletModule) => {
      const L = leafletModule.default;

      try {
        // Clear existing markers - ALWAYS do this
        const existingMarkersCount = markersRef.current.size;
        markersRef.current.forEach((marker) => {
          try {
            mapRef.current.removeLayer(marker);
          } catch (err) {
            console.warn('Error removing marker:', err);
          }
        });
        markersRef.current.clear();

        // If no visible events, we're done - don't add any markers
        if (visibleEventIds.size === 0) {
          return;
        }

        let addedCount = 0;
        let skippedCount = 0;
        let noGeometryCount = 0;

        // Add markers only for visible events
        locations.forEach((location) => {
          // Only show markers for events that are currently visible
          // Debug: log what we're checking
          if (!visibleEventIds.has(location.event_id)) {
            skippedCount++;
            return;
          }

          const feature = location.geojson;
          if (!feature.geometry) {
            noGeometryCount++;
            return;
          }

          const geometry = feature.geometry as any;
          if (geometry.type === 'Point') {
            const [lng, lat] = geometry.coordinates;

            const marker = L.marker([lat, lng], {
              title: location.event_title,
            }).addTo(mapRef.current);

            // Add click handler to open event details modal
            marker.on('click', () => {
              const event = events.find(e => e.id === location.event_id);
              if (event && onEventClick) {
                onEventClick(event);
              }
            });

            // Use location ID as key to handle multiple locations per event
            markersRef.current.set(location.id, marker);
            addedCount++;
          }
        });
      } catch (err) {
        console.error('Error adding markers:', err);
      }
    });
  }, [locations, memoizedEventIdsStr]);

  // Handle selected event highlighting
  useEffect(() => {
    if (!selectedEvent || !mapRef.current) return;

    // Reset all markers to default color
    markersRef.current.forEach((marker) => {
      const iconElement = marker.getElement();
      if (iconElement) {
        iconElement.style.filter = 'drop-shadow(0 0 0 rgba(0,0,0,0.2))';
      }
    });

    // Highlight selected event's marker
    const selectedMarker = markersRef.current.get(selectedEvent.id);
    if (selectedMarker) {
      const iconElement = selectedMarker.getElement();
      if (iconElement) {
        iconElement.style.filter = 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.8))';
      }
      // Pan to the marker
      mapRef.current.setView(selectedMarker.getLatLng(), mapRef.current.getZoom());
    }
  }, [selectedEvent]);

  return (
    <div className="h-full flex flex-col bg-gray-800 border-l border-gray-700">
      <div className="bg-gray-700 px-4 py-2 border-b border-gray-600">
        <h2 className="text-sm font-semibold">Geolocation Map</h2>
        {loading && <p className="text-xs text-gray-400">Loading locations...</p>}
        {error && <p className="text-xs text-red-400">{error}</p>}
        {!loading && !error && (
          <p className="text-xs text-gray-400">{locations.length} location{locations.length !== 1 ? 's' : ''}</p>
        )}
      </div>

      <div
        ref={mapContainer}
        className="flex-1"
        style={{ minHeight: 0 }}
      />
    </div>
  );
}
