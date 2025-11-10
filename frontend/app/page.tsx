'use client';

import { useEffect, useState } from 'react';
import Timeline from '@/components/Timeline';
import { EventResponse } from '@/types';
import { eventsApi } from '@/lib/api';

export default function Home() {
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventResponse | null>(null);

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
  };

  const closeEventDetails = () => {
    setSelectedEvent(null);
  };

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
    <main className="relative min-h-screen">
      {/* Timeline Component */}
      <Timeline events={events} onEventClick={handleEventClick} />

      {/* Event Details Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={closeEventDetails}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold">{selectedEvent.title}</h2>
              <button
                onClick={closeEventDetails}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <span className="font-semibold">Time: </span>
                <span>{selectedEvent.formatted_time}</span>
              </div>

              {selectedEvent.category && (
                <div>
                  <span className="font-semibold">Category: </span>
                  <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded text-sm">
                    {selectedEvent.category}
                  </span>
                </div>
              )}

              {selectedEvent.description && (
                <div>
                  <span className="font-semibold block mb-2">Description:</span>
                  <p className="text-gray-700 dark:text-gray-300">{selectedEvent.description}</p>
                </div>
              )}

              <div>
                <span className="font-semibold">Precision: </span>
                <span>{selectedEvent.precision_level}</span>
              </div>

              {selectedEvent.uncertainty_range && (
                <div>
                  <span className="font-semibold">Uncertainty: </span>
                  <span>±{selectedEvent.uncertainty_range} seconds</span>
                </div>
              )}

              <div>
                <span className="font-semibold">Importance Score: </span>
                <span>{selectedEvent.importance_score}</span>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span>{selectedEvent.source_count} sources</span>
                  <span>{selectedEvent.discussion_count} discussions</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Banner */}
      {events.length === 0 && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
          <h2 className="text-2xl font-bold mb-2">No Events Yet</h2>
          <p className="text-gray-600 dark:text-gray-400">
            The timeline is empty. Add events through the API.
          </p>
        </div>
      )}
    </main>
  );
}
