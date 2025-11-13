'use client';

import React, { useState, useEffect } from 'react';
import { EventResponse } from '@/types';
import { eventsApi } from '@/lib/api';

interface CategoryChild {
  id: string;
  name: string;
  description: string;
  color: string;
  icon?: string;
}

interface CategoryGroup {
  id: string;
  name: string;
  description: string;
  color: string;
  icon?: string;
  children: CategoryChild[];
}

let CATEGORY_TREE: CategoryGroup[] = [];
let CATEGORY_MAP: Record<string, CategoryChild> = {};

// Load categories tree from API on client side
if (typeof window !== 'undefined') {
  (async () => {
    try {
      const response = await fetch('http://localhost:8080/api/categories/tree');
      if (response.ok) {
        const data = await response.json();
        CATEGORY_TREE = data.categories;
        // Build flat map for quick lookups
        data.categories.forEach((group: CategoryGroup) => {
          group.children.forEach((child: CategoryChild) => {
            CATEGORY_MAP[child.id] = child;
          });
        });
      }
    } catch (err) {
      console.warn('Failed to load categories tree:', err);
      // Fallback - load from local public categories.json
      try {
        const response = await fetch('/categories.json');
        if (response.ok) {
          const data = await response.json();
          CATEGORY_TREE = data.categories;
          data.categories.forEach((group: CategoryGroup) => {
            group.children.forEach((child: CategoryChild) => {
              CATEGORY_MAP[child.id] = child;
            });
          });
        }
      } catch (e) {
        console.warn('Failed to load categories from fallback:', e);
      }
    }
  })();
}

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
  related_event_ids: string[];
}

export interface EventDetailModalHandle {
  updateUnixSeconds: (unixSeconds: number) => void;
}

const EventDetailModal = React.forwardRef<EventDetailModalHandle, EventDetailModalProps>(
  ({ event, events, isOpen, onClose, onEventUpdate }, ref) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
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
        // Auto-enter edit mode for new events
        setIsEditing(event.id === 'new');
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

    const currentEvent = events.find((e) => e.id === event.id) || event;

    const getRelatedEventById = (id: string): EventResponse | undefined => {
      return events.find((e) => e.id === id);
    };

    const handleSave = async () => {
      if (!event) return;

      try {
        setIsSaving(true);
        setSaveError(null);

        let savedEvent: EventResponse;

        // Check if this is a new event (id === 'new') or existing event
        if (event.id === 'new') {
          // Create new event
          savedEvent = await eventsApi.createEvent({
            title: formData.title,
            description: formData.description,
            category: formData.category,
            unix_seconds: formData.unix_seconds,
            precision_level: formData.precision_level,
            image_url: formData.image_url || undefined,
          });
        } else {
          // Update existing event
          savedEvent = await eventsApi.updateEvent(event.id, {
            title: formData.title,
            description: formData.description,
            category: formData.category,
            unix_seconds: formData.unix_seconds,
            precision_level: formData.precision_level,
            image_url: formData.image_url,
            related_event_ids: formData.related_event_ids,
          });
        }

        onEventUpdate?.(savedEvent);
        setIsEditing(false);
      } catch (error) {
        console.error('Failed to save event:', error);
        setSaveError('Failed to save changes. Please try again.');
      } finally {
        setIsSaving(false);
      }
    };

    const handleCancel = () => {
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

    const handleDelete = async () => {
      if (!event || !window.confirm(`Are you sure you want to delete "${event.title}"? This action cannot be undone.`)) {
        return;
      }

      try {
        setIsDeleting(true);
        await eventsApi.deleteEvent(event.id);
        onClose();
        // Trigger a refresh of the events list
        if (onEventUpdate) {
          onEventUpdate({ ...event, id: 'deleted' } as EventResponse);
        }
      } catch (error) {
        console.error('Failed to delete event:', error);
        setSaveError('Failed to delete event. Please try again.');
        setIsDeleting(false);
      }
    };

    const handleAddLinkedEvent = (linkedEventId: string) => {
      if (!formData.related_event_ids.includes(linkedEventId)) {
        setFormData({
          ...formData,
          related_event_ids: [...formData.related_event_ids, linkedEventId],
        });
      }
    };

    const handleRemoveLinkedEvent = (linkedEventId: string) => {
      setFormData({
        ...formData,
        related_event_ids: formData.related_event_ids.filter((id) => id !== linkedEventId),
      });
    };

    // Convert unix timestamp to date and time for display
    const getDateTimeFromUnix = (unixSeconds: number) => {
      const dateMs = unixSeconds * 1000;
      // Validate the timestamp is within JavaScript's range
      if (dateMs < -8.64e15 || dateMs > 8.64e15) {
        // Return current date if invalid
        const now = new Date();
        return {
          date: now.toISOString().split('T')[0],
          time: now.toTimeString().split(' ')[0].substring(0, 5),
        };
      }
      const date = new Date(dateMs);
      if (isNaN(date.getTime())) {
        // Return current date if invalid
        const now = new Date();
        return {
          date: now.toISOString().split('T')[0],
          time: now.toTimeString().split(' ')[0].substring(0, 5),
        };
      }
      return {
        date: date.toISOString().split('T')[0],
        time: date.toTimeString().split(' ')[0].substring(0, 5),
      };
    };

    const dateTime = getDateTimeFromUnix(formData.unix_seconds);

    const handleDateChange = (newDate: string) => {
      const date = new Date(newDate + 'T00:00:00');
      const unixSeconds = Math.floor(date.getTime() / 1000);
      setFormData({ ...formData, unix_seconds: unixSeconds });
    };

    const handleTimeChange = (newTime: string) => {
      const [hours, minutes] = newTime.split(':').map(Number);
      const date = new Date(dateTime.date + 'T' + newTime + ':00');
      const unixSeconds = Math.floor(date.getTime() / 1000);
      setFormData({ ...formData, unix_seconds: unixSeconds });
    };

    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: isOpen ? 50 : -1, pointerEvents: 'none' }}>
        <div style={{ pointerEvents: 'none' }} />

        {/* Modal */}
        <div
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800 rounded-lg shadow-2xl z-50 w-11/12 max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with close button */}
          <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
            <h2 className="text-2xl font-bold text-white">
              {isEditing ? `Edit: ${currentEvent.title}` : currentEvent.title}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition text-2xl leading-none"
              aria-label="Close modal"
            >
              ×
            </button>
          </div>

          {/* Content - scrollable */}
          <div className="overflow-y-auto flex-1">
            {/* Image - shown first at full width */}
            {currentEvent.image_url && (
              <div className="w-full bg-gray-900">
                <img
                  src={currentEvent.image_url}
                  alt={currentEvent.title}
                  className="w-full object-contain"
                />
              </div>
            )}

            {/* Content area */}
            <div className="px-6 py-4">
              {isEditing ? (
                // Edit Mode
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

                  {/* Category Select with Tree */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Category
                    </label>
                    <div className="relative">
                      {/* Dropdown trigger button */}
                      <button
                        type="button"
                        onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-left focus:outline-none focus:border-blue-500 flex justify-between items-center"
                      >
                        <span>
                          {formData.category
                            ? CATEGORY_MAP[formData.category]?.name || formData.category
                            : 'Select a category...'}
                        </span>
                        <span className="text-xs">▼</span>
                      </button>

                      {/* Dropdown menu with category tree */}
                      {showCategoryDropdown && CATEGORY_TREE.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-700 border border-gray-600 rounded shadow-lg z-10 max-h-96 overflow-y-auto">
                          {CATEGORY_TREE.map((group) => (
                            <div key={group.id}>
                              {/* Parent category header - collapsible */}
                              <button
                                type="button"
                                onClick={() => {
                                  setExpandedCategories((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(group.id)) {
                                      next.delete(group.id);
                                    } else {
                                      next.add(group.id);
                                    }
                                    return next;
                                  });
                                }}
                                className="w-full px-4 py-2 text-left hover:bg-gray-600 border-b border-gray-600 flex items-center gap-2 text-white font-medium"
                                style={{ borderLeftColor: group.color, borderLeftWidth: '3px' }}
                              >
                                <span className="text-sm">
                                  {expandedCategories.has(group.id) ? '▼' : '▶'}
                                </span>
                                {group.icon && <span>{group.icon}</span>}
                                <span>{group.name}</span>
                              </button>

                              {/* Child categories - shown when expanded */}
                              {expandedCategories.has(group.id) && (
                                <div className="bg-gray-800">
                                  {group.children.map((child) => (
                                    <button
                                      key={child.id}
                                      type="button"
                                      onClick={() => {
                                        setFormData({ ...formData, category: child.id });
                                        setShowCategoryDropdown(false);
                                      }}
                                      className={`w-full px-6 py-2 text-left text-sm hover:bg-gray-600 transition ${
                                        formData.category === child.id
                                          ? 'bg-blue-900 border-l-2 border-blue-500'
                                          : 'border-l-2'
                                      }`}
                                      style={{
                                        borderLeftColor: formData.category === child.id ? '#3b82f6' : child.color,
                                      }}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="text-white font-medium">{child.name}</p>
                                          <p className="text-xs text-gray-400">{child.description}</p>
                                        </div>
                                        {formData.category === child.id && (
                                          <span className="text-blue-400 ml-2">✓</span>
                                        )}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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
                      rows={4}
                    />
                  </div>

                  {/* Date and Time Picker (instead of unix_seconds input) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Date
                      </label>
                      <input
                        type="date"
                        value={dateTime.date}
                        onChange={(e) => handleDateChange(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Time
                      </label>
                      <input
                        type="time"
                        value={dateTime.time}
                        onChange={(e) => handleTimeChange(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
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

                  {/* Linked Events */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Linked Events
                    </label>

                    {/* Currently linked events */}
                    {formData.related_event_ids.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {formData.related_event_ids.map((linkedId) => {
                          const linkedEvent = getRelatedEventById(linkedId);
                          return linkedEvent ? (
                            <div
                              key={linkedId}
                              className="flex items-center justify-between p-2 bg-gray-700 rounded"
                            >
                              <div className="flex-1">
                                <p className="text-sm text-white font-medium">{linkedEvent.title}</p>
                                <p className="text-xs text-gray-400">{linkedEvent.formatted_time}</p>
                              </div>
                              <button
                                onClick={() => handleRemoveLinkedEvent(linkedId)}
                                className="ml-2 px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded font-bold transition"
                              >
                                −
                              </button>
                            </div>
                          ) : null;
                        })}
                      </div>
                    )}

                    {/* Available events to link */}
                    <p className="text-xs text-gray-400 mb-2">Click to add linked events:</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {events
                        .filter((e) => e.id !== event.id && !formData.related_event_ids.includes(e.id))
                        .map((e) => (
                          <button
                            key={e.id}
                            onClick={() => handleAddLinkedEvent(e.id)}
                            className="w-full p-2 text-left bg-gray-700 hover:bg-gray-600 rounded text-sm transition"
                          >
                            <p className="text-white font-medium">{e.title}</p>
                            <p className="text-xs text-gray-400">{e.formatted_time}</p>
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="space-y-4">
                  {/* Time */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400">Time</h3>
                    <p className="text-blue-400 font-mono">{currentEvent.formatted_time}</p>
                  </div>

                  {/* Category */}
                  {currentEvent.category && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-400">Category</h3>
                      <span
                        className="inline-block px-3 py-1 text-sm font-bold rounded"
                        style={{
                          backgroundColor: CATEGORY_MAP[currentEvent.category]?.color || '#3b82f6',
                          color: '#fff',
                        }}
                      >
                        {CATEGORY_MAP[currentEvent.category]?.name || currentEvent.category}
                      </span>
                    </div>
                  )}

                  {/* Description */}
                  {currentEvent.description && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-400">Description</h3>
                      <p className="text-gray-300">{currentEvent.description}</p>
                    </div>
                  )}

                  {/* Importance Score */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400">Importance</h3>
                    <p className="text-gray-300">{currentEvent.importance_score.toFixed(2)}</p>
                  </div>

                  {/* Vote Stats */}
                  {currentEvent.vote_stats && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-400">Votes</h3>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Importance</p>
                          <p className="text-green-400">+{currentEvent.vote_stats.importance_up}</p>
                          <p className="text-red-400">−{currentEvent.vote_stats.importance_down}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Accuracy</p>
                          <p className="text-green-400">+{currentEvent.vote_stats.accuracy_up}</p>
                          <p className="text-red-400">−{currentEvent.vote_stats.accuracy_down}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Dating</p>
                          <p className="text-green-400">+{currentEvent.vote_stats.dating_up}</p>
                          <p className="text-red-400">−{currentEvent.vote_stats.dating_down}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Linked Events */}
                  {formData.related_event_ids.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-400 mb-2">Linked Events</h3>
                      <div className="space-y-2">
                        {formData.related_event_ids.map((linkedId) => {
                          const linkedEvent = getRelatedEventById(linkedId);
                          return linkedEvent ? (
                            <div
                              key={linkedId}
                              className="p-2 bg-gray-700 rounded text-sm"
                            >
                              <p className="font-medium text-white">{linkedEvent.title}</p>
                              <p className="text-xs text-blue-400">{linkedEvent.formatted_time}</p>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Error message */}
          {saveError && (
            <div className="px-6 py-2 bg-red-900 text-red-200 text-sm flex-shrink-0">
              {saveError}
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-700 flex justify-between gap-3 flex-shrink-0">
            <button
              onClick={handleDelete}
              disabled={isDeleting || isSaving}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
            <div className="flex gap-3">
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
      </div>
    );
  }
);

EventDetailModal.displayName = 'EventDetailModal';

export default EventDetailModal;
