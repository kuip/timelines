'use client';

import { useEffect, useState, useRef } from 'react';
import { EventResponse } from '@/types';

interface Relationship {
  id: string;
  event_id_a: string;
  event_id_b: string;
  relationship_type: string;
  weight: number;
  description?: string;
}

interface RelationshipsPanelProps {
  selectedEvent: EventResponse | null;
  events: EventResponse[];
  displayedCardEvents: EventResponse[];
  onEventClick?: (event: EventResponse) => void;
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  causes: 'Caused',
  caused_by: 'Was caused by',
  precedes: 'Preceded',
  follows: 'Followed',
  related_to: 'Related to',
  influences: 'Influenced',
  influenced_by: 'Was influenced by',
  part_of: 'Part of',
  contains: 'Contains',
  contemporary_with: 'Contemporary with',
  conflicts_with: 'Conflicted with',
  cooperates_with: 'Cooperated with',
};

export default function RelationshipsPanel({
  selectedEvent,
  events,
  displayedCardEvents,
  onEventClick,
}: RelationshipsPanelProps) {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedEventIdsRef = useRef<Set<string>>(new Set()); // Cache what we've fetched

  // Fetch relationships for selected event - only if it's one of the displayed card events
  useEffect(() => {
    if (!selectedEvent) {
      setRelationships([]);
      return;
    }

    // Only fetch relationships if the selected event is in the displayed card events
    const isDisplayed = displayedCardEvents.some(e => e.id === selectedEvent.id);
    if (!isDisplayed) {
      setRelationships([]);
      return;
    }

    // Skip fetching if event has no relationships (count is 0)
    if (selectedEvent.relationship_count === 0) {
      setRelationships([]);
      return;
    }

    // If we've already fetched relationships for this event, don't fetch again
    if (fetchedEventIdsRef.current.has(selectedEvent.id)) {
      return;
    }

    const fetchRelationships = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/events/${selectedEvent.id}/relationships`);
        if (!response.ok) {
          throw new Error('Failed to fetch relationships');
        }
        const data = await response.json();
        setRelationships(data.relationships || []);
        setError(null);
        // Mark this event as fetched
        fetchedEventIdsRef.current.add(selectedEvent.id);
      } catch (err) {
        console.error('Error fetching relationships:', err);
        setError('Failed to load relationships');
        setRelationships([]);
        // Still mark as attempted to avoid retrying
        fetchedEventIdsRef.current.add(selectedEvent.id);
      } finally {
        setLoading(false);
      }
    };

    fetchRelationships();
  }, [selectedEvent?.id, displayedCardEvents.length]);

  if (!selectedEvent) {
    return (
      <div className="p-4 text-gray-400 text-sm">
        Select an event to view related events
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <h3 className="font-semibold mb-3 text-sm">Related Events</h3>

      {loading && <p className="text-xs text-gray-400">Loading relationships...</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}

      {!loading && !error && relationships.length === 0 && (
        <p className="text-xs text-gray-400">No related events found</p>
      )}

      <div className="space-y-2">
        {relationships.map((rel) => {
          // Determine which event ID to look up (the other one)
          const relatedEventId = rel.event_id_a === selectedEvent.id ? rel.event_id_b : rel.event_id_a;
          const relatedEvent = events.find((e) => e.id === relatedEventId);

          if (!relatedEvent) return null;

          const relationshipLabel =
            RELATIONSHIP_LABELS[rel.relationship_type] || rel.relationship_type;

          // Determine direction based on which event is A and which is B
          const isForward = rel.event_id_a === selectedEvent.id;
          const displayLabel = isForward ? relationshipLabel : relationshipLabel;

          return (
            <div
              key={rel.id}
              className="bg-gray-700 rounded p-3 cursor-pointer hover:bg-gray-600 transition-colors"
              onClick={() => onEventClick?.(relatedEvent)}
            >
              <p className="text-xs font-semibold text-blue-300 mb-1">{displayLabel}</p>
              <p className="text-sm font-semibold truncate">{relatedEvent.title}</p>
              {relatedEvent.unix_seconds && (
                <p className="text-xs text-gray-400">
                  {new Date(relatedEvent.unix_seconds * 1000).toLocaleDateString()}
                </p>
              )}
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded">
                  Strength: {rel.weight}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
