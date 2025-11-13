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
            // Skip special events that don't have database entries
            if (eventId === 'now' || eventId === 'future-horizon') {
              fetchedEventIdsRef.current.add(eventId);
              continue;
            }

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

          // Deduplicate by location ID to avoid duplicate placemarks
          const seenLocationIds = new Set(filteredPrev.map(loc => loc.id));
          const newUniqueLocations = allLocations.filter(loc => !seenLocationIds.has(loc.id));

          const combined = [...filteredPrev, ...newUniqueLocations];
          // Ensure we only have locations for visible events
          return combined.filter(loc => visibleEventIds.has(loc.event_id));
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

            // Find the event to get category and image
            const event = events.find(e => e.id === location.event_id);

            // Get category color (default to blue if not found)
            let categoryColor = '#3b82f6';
            if (event?.category) {
              // Map categories to their colors from the categories.json
              const categoryColors: Record<string, string> = {
                'cosmic_formation': '#16213e',
                'star_formation': '#0f3460',
                'galaxy_formation': '#533483',
                'exoplanet': '#9d4edd',
                'planetary_formation': '#a0826d',
                'earth_formation': '#9d7568',
                'plate_tectonics': '#c9a97a',
                'mineral_geology': '#d4a574',
                'volcano': '#d97706',
                'earthquake': '#dc2626',
                'climate_paleoclimate': '#60a5fa',
                'evolution_theory': '#10b981',
                'species_emergence': '#34d399',
                'extinction_event': '#6ee7b7',
                'fossil_record': '#a7f3d0',
                'human_evolution': '#d1fae5',
                'disease_epidemic': '#ea580c',
                'medicine_breakthrough': '#fb923c',
                'genetics_dna': '#fdba74',
                'neuroscience': '#fed7aa',
                'immunology': '#fecaca',
                'physiology': '#fca5a5',
                'transportation': '#3b82f6',
                'communication': '#60a5fa',
                'energy': '#93c5fd',
                'computing': '#bfdbfe',
                'material_science': '#dbeafe',
                'construction': '#eff6ff',
                'physics_discovery': '#ec4899',
                'chemistry_discovery': '#f472b6',
                'astronomy_observation': '#fbcfe8',
                'mathematics': '#fce7f3',
                'agriculture_domestication': '#b45309',
                'food_discovery': '#d97706',
                'war_major': '#dc2626',
                'war_regional': '#ef4444',
                'genocide': '#f87171',
                'terrorism': '#fca5a5',
                'government_system': '#374151',
                'revolution_uprising': '#6b7280',
                'treaty_diplomacy': '#9ca3af',
                'independence': '#d1d5db',
                'law_justice': '#f3f4f6',
                'trade_commerce': '#65a30d',
                'currency_banking': '#84cc16',
                'industrial_revolution': '#bfef45',
                'economic_crisis': '#dcfce7',
                'rights_movement': '#be185d',
                'labor_movement': '#ec4899',
                'migration': '#f472b6',
                'urbanization': '#fbcfe8',
                'education': '#fce7f3',
                'art_movement': '#6d28d9',
                'music_genre': '#7c3aed',
                'literature': '#8b5cf6',
                'philosophy': '#a78bfa',
                'religion_theology': '#c4b5fd',
                'architecture_style': '#ddd6fe',
                'cinema_film': '#dc2626',
                'theater': '#ef4444',
                'television': '#f87171',
                'radio': '#fca5a5',
                'video_games': '#fecaca',
                'pop_culture': '#fee2e2',
                'olympics': '#06b6d4',
                'professional_sports': '#22d3ee',
                'sports_record': '#67e8f9',
                'conservation': '#16a34a',
                'pollution': '#4ade80',
                'deforestation': '#86efac',
                'climate_change': '#bbf7d0',
                'environmental_protection': '#dcfce7',
                'space_exploration': '#0284c7',
                'moon_landing': '#38bdf8',
                'mars_exploration': '#7dd3fc',
                'space_telescope': '#bae6fd',
              };
              categoryColor = categoryColors[event.category] || '#3b82f6';
            }

            // Create inverted teardrop icon with category color and optional image
            const createTearDropIcon = (color: string, imageUrl?: string) => {
              const svgString = imageUrl
                ? `
                  <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="25" height="41" viewBox="0 0 25 41">
                    <defs>
                      <clipPath id="circle-clip">
                        <circle cx="12.5" cy="21" r="11"/>
                      </clipPath>
                    </defs>
                    <!-- Exact Leaflet inverted marker path with category color -->
                    <path d="M12.5,41C12.5,41 0,29 0,22 A 12.5 12.5 0 0 1 12.5 9 A 12.5 12.5 0 0 1 25 22 C 25 29 12.5 41 12.5 41 Z" fill="${color}" stroke="white" stroke-width="1.5"/>
                    <!-- Image in the circle -->
                    <image xlink:href="${imageUrl}" x="0.5" y="9.5" width="24" height="24" clip-path="url(#circle-clip)" preserveAspectRatio="xMidYMid slice"/>
                  </svg>
                `
                : `
                  <svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
                    <!-- Exact Leaflet inverted marker path with category color -->
                    <path d="M12.5,41C12.5,41 0,29 0,22 A 12.5 12.5 0 0 1 12.5 9 A 12.5 12.5 0 0 1 25 22 C 25 29 12.5 41 12.5 41 Z" fill="${color}" stroke="white" stroke-width="1.5"/>
                  </svg>
                `;

              return L.divIcon({
                html: svgString,
                iconSize: [25, 41],
                iconAnchor: [12.5, 41],
                popupAnchor: [0, -10],
                className: 'leaflet-marker-teardrop',
              });
            };

            const icon = createTearDropIcon(categoryColor, event?.image_url);
            const marker = L.marker([lat, lng], {
              title: location.event_title,
              icon,
            }).addTo(mapRef.current);

            // Add popup with event info
            const popupContent = `
              <div style="font-size: 12px; width: 150px;">
                <strong>${location.event_title}</strong>
                <br><small>${event?.formatted_time || ''}</small>
              </div>
            `;
            marker.bindPopup(popupContent);

            // Add click handler to open event details modal
            marker.on('click', () => {
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
