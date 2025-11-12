import axios from 'axios';
import { EventResponse, EventQueryParams, ZoomPreset } from '@/types';

// Dynamically determine API URL based on current location
const getApiUrl = (): string => {
  if (typeof window === 'undefined') {
    // Server-side: use environment variable or default
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  }

  // Client-side: use current host but with port 8080 for backend
  const host = window.location.hostname;
  const protocol = window.location.protocol;
  return `${protocol}//${host}:8080`;
};

const API_URL = getApiUrl();

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const eventsApi = {
  // Get all events with optional filters
  getEvents: async (params?: EventQueryParams): Promise<{ events: EventResponse[]; count: number }> => {
    const response = await api.get('/events', { params });
    return response.data;
  },

  // Get a single event by ID
  getEvent: async (id: string): Promise<EventResponse> => {
    const response = await api.get(`/events/${id}`);
    return response.data;
  },

  // Create a new event
  createEvent: async (data: any): Promise<EventResponse> => {
    const response = await api.post('/events', data);
    return response.data;
  },

  // Update an event
  updateEvent: async (id: string, data: any): Promise<EventResponse> => {
    const response = await api.put(`/events/${id}`, data);
    return response.data;
  },

  // Delete an event
  deleteEvent: async (id: string): Promise<void> => {
    await api.delete(`/events/${id}`);
  },
};

export const zoomApi = {
  // Get all zoom presets
  getPresets: async (): Promise<{ presets: ZoomPreset[]; count: number }> => {
    const response = await api.get('/zoom-presets');
    return response.data;
  },
};

export default api;
