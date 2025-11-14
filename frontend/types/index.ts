// Timeline types

export type PrecisionLevel =
  | 'nanosecond'
  | 'microsecond'
  | 'millisecond'
  | 'second'
  | 'minute'
  | 'hour'
  | 'day'
  | 'year'
  | 'thousand_years'
  | 'million_years'
  | 'billion_years';

export interface Event {
  id: string;
  timeline_seconds: string; // Decimal string from backend
  unix_seconds?: number; // Unix epoch seconds
  unix_nanos?: number; // Nanosecond component
  precision_level: PrecisionLevel;
  uncertainty_range?: string;
  title: string;
  description?: string;
  category?: string;
  importance_score: number;
  related_event_id?: string; // Links to another event with an arc
  created_at: string;
  updated_at: string;
  created_by_user_id?: string;
  image_url?: string;
}

export interface EventSource {
  id: string;
  event_id: string;
  source_type: string;
  title?: string;
  url?: string;
  citation?: string;
  credibility_score: number;
  added_by_user_id?: string;
  created_at: string;
}

export interface EventResponse extends Event {
  formatted_time: string;
  vote_stats?: VoteStats;
  source_count: number;
  discussion_count: number;
  sources?: EventSource[];
}

export interface VoteStats {
  importance_up: number;
  importance_down: number;
  accuracy_up: number;
  accuracy_down: number;
  dating_up: number;
  dating_down: number;
}

export interface ZoomPreset {
  id: string;
  name: string;
  start_seconds: string;
  end_seconds: string;
  min_importance_threshold: number;
  description?: string;
  display_order: number;
  created_at: string;
}

export interface EventQueryParams {
  start?: string;
  end?: string;
  category?: string;
  min_importance?: number;
  limit?: number;
  offset?: number;
  search?: string;
}

export interface TimelineRange {
  start: number;
  end: number;
}

export interface TimelineViewport {
  range: TimelineRange;
  zoom: number;
  centerY: number;
}
