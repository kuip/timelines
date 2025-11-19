import { supabase } from './supabase';
import { EventResponse, EventQueryParams, ZoomPreset } from '@/types';

// Format unix timestamp to human-readable string
const formatTime = (unixSeconds: number, precisionLevel: string): string => {
  // Handle extreme dates (geological time)
  const absSeconds = Math.abs(unixSeconds);
  const isBC = unixSeconds < -62135596800; // Before year 0

  // For geological time scales
  if (precisionLevel === 'billion_years') {
    const billionYears = unixSeconds / (1e9 * 365.25 * 24 * 60 * 60);
    return `${Math.abs(billionYears).toFixed(2)} billion years ${billionYears < 0 ? 'ago' : 'from now'}`;
  }
  if (precisionLevel === 'million_years') {
    const millionYears = unixSeconds / (1e6 * 365.25 * 24 * 60 * 60);
    return `${Math.abs(millionYears).toFixed(2)} million years ${millionYears < 0 ? 'ago' : 'from now'}`;
  }
  if (precisionLevel === 'thousand_years') {
    const year = 1970 + unixSeconds / (365.25 * 24 * 60 * 60);
    return `~${Math.floor(year / 1000) * 1000}`;
  }

  // For historical dates
  const date = new Date(unixSeconds * 1000);

  // Check if date is valid
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }

  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const seconds = date.getUTCSeconds();
  const milliseconds = date.getUTCMilliseconds();

  switch (precisionLevel) {
    case 'year':
      return `${year}`;
    case 'day':
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    case 'hour':
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hours).padStart(2, '0')}:00:00.000`;
    case 'minute':
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00.000`;
    case 'second':
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.000`;
    case 'millisecond':
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
    case 'microsecond':
    case 'nanosecond':
    default:
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
  }
};

// Add formatted_time to event response
const enhanceEvent = (event: any): EventResponse => {
  return {
    ...event,
    formatted_time: formatTime(event.unix_seconds || 0, event.precision_level || 'second'),
  } as EventResponse;
};

export const eventsApi = {
  // Get all events with optional filters
  getEvents: async (params?: EventQueryParams): Promise<{ events: EventResponse[]; count: number }> => {
    let query = supabase
      .from('events')
      .select('*, sources:event_sources(*)', { count: 'exact' });

    // Apply filters
    if (params?.start) {
      query = query.gte('timeline_seconds', params.start);
    }
    if (params?.end) {
      query = query.lte('timeline_seconds', params.end);
    }
    if (params?.category) {
      query = query.eq('category', params.category);
    }
    if (params?.min_importance !== undefined) {
      query = query.gte('importance_score', params.min_importance);
    }
    if (params?.search) {
      query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`);
    }

    // Apply pagination
    if (params?.limit) {
      query = query.limit(params.limit);
    }
    if (params?.offset) {
      query = query.range(params.offset, (params.offset + (params.limit || 100)) - 1);
    }

    // Order by timeline_seconds
    query = query.order('timeline_seconds', { ascending: true });

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Failed to fetch events: ${error.message}`);
    }

    return {
      events: (data || []).map(enhanceEvent),
      count: count || 0,
    };
  },

  // Get a single event by ID
  getEvent: async (id: string): Promise<EventResponse> => {
    const { data, error } = await supabase
      .from('events')
      .select('*, sources:event_sources(*)')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch event: ${error.message}`);
    }

    return enhanceEvent(data);
  },

  // Create a new event
  createEvent: async (eventData: any): Promise<EventResponse> => {
    const { data, error } = await supabase
      .from('events')
      .insert([eventData])
      .select('*, sources:event_sources(*)')
      .single();

    if (error) {
      throw new Error(`Failed to create event: ${error.message}`);
    }

    return enhanceEvent(data);
  },

  // Update an event
  updateEvent: async (id: string, eventData: any): Promise<EventResponse> => {
    // Handle relationships separately if provided
    const { related_event_ids, ...updateData } = eventData;

    // Update the event
    const { data, error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', id)
      .select('*, sources:event_sources(*)')
      .single();

    if (error) {
      throw new Error(`Failed to update event: ${error.message}`);
    }

    // Handle relationships if provided
    if (related_event_ids && Array.isArray(related_event_ids)) {
      // First, delete existing relationships for this event
      await supabase
        .from('event_relationships')
        .delete()
        .or(`event_id_a.eq.${id},event_id_b.eq.${id}`);

      // Then insert new relationships
      if (related_event_ids.length > 0) {
        const relationships = related_event_ids.map((relatedId: string) => ({
          event_id_a: id,
          event_id_b: relatedId,
          relationship_type: 'related',
        }));

        await supabase
          .from('event_relationships')
          .insert(relationships);
      }
    }

    return enhanceEvent(data);
  },

  // Delete an event
  deleteEvent: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete event: ${error.message}`);
    }
  },
};

export const zoomApi = {
  // Get all zoom presets
  getPresets: async (): Promise<{ presets: ZoomPreset[]; count: number }> => {
    const { data, error, count } = await supabase
      .from('zoom_presets')
      .select('*', { count: 'exact' })
      .order('display_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch zoom presets: ${error.message}`);
    }

    return {
      presets: (data || []) as ZoomPreset[],
      count: count || 0,
    };
  },
};

// Helper functions for relationships and locations
export const relationshipsApi = {
  getRelationships: async (eventId: string) => {
    const { data, error } = await supabase
      .from('event_relationships')
      .select('*')
      .or(`event_id_a.eq.${eventId},event_id_b.eq.${eventId}`);

    if (error) {
      throw new Error(`Failed to fetch relationships: ${error.message}`);
    }

    return { relationships: data || [] };
  },
};

export const locationsApi = {
  getLocations: async (eventId: string) => {
    const { data, error } = await supabase
      .from('event_locations')
      .select('*')
      .eq('event_id', eventId);

    if (error) {
      throw new Error(`Failed to fetch locations: ${error.message}`);
    }

    return { locations: data || [] };
  },

  updatePrimaryLocation: async (eventId: string, location: { latitude: number; longitude: number; location_name?: string }) => {
    // First, check if a primary location exists
    const { data: existing } = await supabase
      .from('event_locations')
      .select('id')
      .eq('event_id', eventId)
      .eq('is_primary', true)
      .single();

    const geojson = {
      type: 'Point',
      coordinates: [location.longitude, location.latitude],
    };

    if (existing) {
      // Update existing primary location
      const { data, error } = await supabase
        .from('event_locations')
        .update({
          geojson,
          location_name: location.location_name || '',
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update location: ${error.message}`);
      }

      return data;
    } else {
      // Create new primary location
      const { data, error } = await supabase
        .from('event_locations')
        .insert([{
          event_id: eventId,
          geojson,
          location_name: location.location_name || '',
          is_primary: true,
        }])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create location: ${error.message}`);
      }

      return data;
    }
  },
};

export const categoriesApi = {
  getCategoriesTree: async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('parent_id', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }

    // Transform flat list into tree structure
    const categories = data || [];
    const parentCategories = categories.filter(c => !c.parent_id);
    const childCategories = categories.filter(c => c.parent_id);

    const tree = parentCategories.map(parent => ({
      ...parent,
      children: childCategories.filter(child => child.parent_id === parent.id),
    }));

    return { categories: tree };
  },
};
