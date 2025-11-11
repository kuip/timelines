'use client';

import React, { useState, useEffect } from 'react';
import { EventResponse } from '@/types';
import { eventsApi } from '@/lib/api';

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  cosmic: { bg: '#8b5cf6', text: '#f5e6ff' },
  geological: { bg: '#f59e0b', text: '#1f2937' },
  biological: { bg: '#10b981', text: '#f0fdf4' },
  historical: { bg: '#ef4444', text: '#fef2f2' },
  political: { bg: '#3b82f6', text: '#eff6ff' },
  technological: { bg: '#06b6d4', text: '#f0f9fa' },
  contemporary: { bg: '#ec4899', text: '#fdf2f8' },
};

const CATEGORY_OPTIONS = Object.keys(CATEGORY_COLORS);

interface EventDetailModalProps {
  event: EventResponse | null;
  events: EventResponse[];
  isOpen: boolean;
  onClose: () => void;
  onEventUpdate?: (updatedEvent: EventResponse) => void;
  onTimelineClick?: (unixSeconds: number) => void;
}

interface FormData {
  title: string;
  description: string;
  category: string;
  unix_seconds: number;
  precision_level: string;
  image_url: string;
  related_event_ids: string[]; // Changed to array to support multiple related events
}

export interface EventDetailModalHandle {
  updateUnixSeconds: (unixSeconds: number) => void;
}

const EventDetailModal = React.forwardRef<EventDetailModalHandle, EventDetailModalProps>(
  ({ event, events, isOpen, onClose, onEventUpdate, onTimelineClick }, ref) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [formData, setFormData] = useState<FormData>({
      title: '',
      description: '',
      category: '',
      unix_seconds: 0,
      precision_level: 'second',
      image_url: '',
      related_event_ids: [],
    });

    // Expose method to update unix_seconds from timeline clicks
    React.useImperativeHandle(ref, () => ({
      updateUnixSeconds: (unixSeconds: number) => {
        setFormData((prev) => ({
          ...prev,
          unix_seconds: unixSeconds,
        }));
      },
    }));

  // Initialize form data when event changes
  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title || '',
        description: event.description || '',
        category: event.category || 'contemporary',
        unix_seconds: event.unix_seconds || 0,
        precision_level: event.precision_level || 'second',
        image_url: event.image_url || '',
        related_event_ids: event.related_event_id ? [event.related_event_id] : [],
      });
      setIsEditing(false);
    }
  }, [event]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditing) {
          setIsEditing(false);
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, isEditing, onClose]);

  if (!isOpen || !event) {
    return null;
  }

  // Get the current event data from the events array to ensure we always show the latest
  const currentEvent = events.find((e) => e.id === event.id) || event;

  // Get related events (events that this event is related to)
  const getRelatedEvents = () => {
    if (!currentEvent.related_event_id) return [];
    return events.filter((e) => e.id === currentEvent.related_event_id);
  };

  // Deduplicate related events
  const relatedEvents = Array.from(
    new Map(getRelatedEvents().map((e) => [e.id, e])).values()
  );

  const handleSave = async () => {
    if (!event) return;

    try {
      setIsSaving(true);
      setSaveError(null);

      // Call the API to update the event
      const updatedEvent = await eventsApi.updateEvent(event.id, {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        unix_seconds: formData.unix_seconds,
        precision_level: formData.precision_level,
        image_url: formData.image_url,
        related_event_ids: formData.related_event_ids,
      });

      // Notify parent component of the update
      onEventUpdate?.(updatedEvent);

      // Exit edit mode
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save event:', error);
      setSaveError('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original event values
    if (event) {
      setFormData({
        title: event.title || '',
        description: event.description || '',
        category: event.category || 'contemporary',
        unix_seconds: event.unix_seconds || 0,
        precision_level: event.precision_level || 'second',
        image_url: event.image_url || '',
        related_event_ids: event.related_event_id ? [event.related_event_id] : [],
      });
    }
    setIsEditing(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: isOpen ? 50 : -1, pointerEvents: isOpen ? 'auto' : 'none' }}>
      {/* Backdrop - non-blocking, only on modal itself */}
      <div
        style={{ pointerEvents: 'none' }}
      />

      {/* Modal */}
      <div
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800 rounded-lg shadow-2xl z-50 max-w-2xl w-full mx-4"
        style={{ pointerEvents: 'auto' }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">
            {isEditing ? 'Edit Event' : currentEvent.title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition text-2xl leading-none"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          {isEditing ? (
            // Edit Mode - Form
            <div className="space-y-4">
              {/* Title Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  placeholder="Event title"
                />
              </div>

              {/* Category Select */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description Textarea */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  placeholder="Event description"
                  rows={5}
                />
              </div>

              {/* Unix Seconds (Time) */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Unix Seconds (Time)
                </label>
                <input
                  type="number"
                  value={formData.unix_seconds}
                  onChange={(e) =>
                    setFormData({ ...formData, unix_seconds: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  placeholder="Unix timestamp in seconds"
                />
              </div>

              {/* Precision Level */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Precision Level
                </label>
                <select
                  value={formData.precision_level}
                  onChange={(e) =>
                    setFormData({ ...formData, precision_level: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="nanosecond">Nanosecond</option>
                  <option value="microsecond">Microsecond</option>
                  <option value="millisecond">Millisecond</option>
                  <option value="second">Second</option>
                  <option value="minute">Minute</option>
                  <option value="hour">Hour</option>
                  <option value="day">Day</option>
                  <option value="year">Year</option>
                  <option value="thousand_years">Thousand Years</option>
                  <option value="million_years">Million Years</option>
                  <option value="billion_years">Billion Years</option>
                </select>
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Image URL
                </label>
                <input
                  type="text"
                  value={formData.image_url}
                  onChange={(e) =>
                    setFormData({ ...formData, image_url: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              {/* Related Event IDs */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Related Event IDs (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.related_event_ids.join(', ')}
                  onChange={(e) => {
                    const ids = e.target.value
                      .split(',')
                      .map((id) => id.trim())
                      .filter((id) => id.length > 0);
                    setFormData({ ...formData, related_event_ids: ids });
                  }}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  placeholder="ID1, ID2, ID3 (optional)"
                />
              </div>
            </div>
          ) : (
            // View Mode - Read-only content
            <div className="space-y-4">
              {/* Time */}
              <div>
                <h3 className="text-sm font-semibold text-gray-400">Time</h3>
                <p className="text-blue-400 font-mono">{currentEvent.formatted_time}</p>
              </div>

              {/* Category */}
              {currentEvent.category && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400">
                    Category
                  </h3>
                  <span
                    className="inline-block px-3 py-1 text-sm font-bold rounded"
                    style={{
                      backgroundColor: CATEGORY_COLORS[currentEvent.category]?.bg || '#3b82f6',
                      color: CATEGORY_COLORS[currentEvent.category]?.text || '#eff6ff',
                    }}
                  >
                    {currentEvent.category.toUpperCase()}
                  </span>
                </div>
              )}

              {/* Description */}
              {currentEvent.description && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400">
                    Description
                  </h3>
                  <p className="text-gray-300">{currentEvent.description}</p>
                </div>
              )}

              {/* Importance Score */}
              <div>
                <h3 className="text-sm font-semibold text-gray-400">
                  Importance
                </h3>
                <p className="text-gray-300">
                  {currentEvent.importance_score.toFixed(2)}
                </p>
              </div>

              {/* Vote Stats */}
              {currentEvent.vote_stats && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400">Votes</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Importance</p>
                      <p className="text-green-400">
                        +{currentEvent.vote_stats.importance_up}
                      </p>
                      <p className="text-red-400">
                        -{currentEvent.vote_stats.importance_down}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Accuracy</p>
                      <p className="text-green-400">
                        +{currentEvent.vote_stats.accuracy_up}
                      </p>
                      <p className="text-red-400">
                        -{currentEvent.vote_stats.accuracy_down}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Dating</p>
                      <p className="text-green-400">
                        +{currentEvent.vote_stats.dating_up}
                      </p>
                      <p className="text-red-400">
                        -{currentEvent.vote_stats.dating_down}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Source and Discussion Count */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Sources</p>
                  <p className="text-gray-300">{currentEvent.source_count}</p>
                </div>
                <div>
                  <p className="text-gray-500">Discussions</p>
                  <p className="text-gray-300">{currentEvent.discussion_count}</p>
                </div>
              </div>

              {/* Related Events */}
              {relatedEvents.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">
                    Related Events
                  </h3>
                  <div className="space-y-2">
                    {relatedEvents.map((related) => (
                      <div
                        key={related.id}
                        className="p-2 bg-gray-700 rounded text-sm text-gray-300"
                      >
                        <p className="font-medium text-white">{related.title}</p>
                        <p className="text-xs text-blue-400">
                          {related.formatted_time}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error message */}
        {saveError && (
          <div className="px-6 py-2 bg-red-900 text-red-200 text-sm">
            {saveError}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
          {isEditing ? (
            <div style={{ display: 'contents' }}>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
  }
);

EventDetailModal.displayName = 'EventDetailModal';

export default EventDetailModal;
