package models

import (
	"time"

	"github.com/timeline/backend/internal/utils"
)

// Event represents a timeline event
type Event struct {
	ID       string `json:"id" db:"id"`

	// Time representation (Big Bang-relative for backward compat, will migrate to Unix Epoch)
	TimelineSeconds  string  `json:"timeline_seconds" db:"timeline_seconds"`
	UnixSeconds      int64   `json:"unix_seconds" db:"unix_seconds"`
	UnixNanos        int32   `json:"unix_nanos" db:"unix_nanos"`
	PrecisionLevel   utils.PrecisionLevel `json:"precision_level" db:"precision_level"`
	UncertaintyRange *string `json:"uncertainty_range,omitempty" db:"uncertainty_range"`

	// Event data
	Title       string  `json:"title" db:"title"`
	Description *string `json:"description,omitempty" db:"description"`
	Category    *string `json:"category,omitempty" db:"category"`
	ImageURL    *string `json:"image_url,omitempty" db:"image_url"`

	ImportanceScore int `json:"importance_score" db:"importance_score"`

	// Relationships
	RelatedEventID *string `json:"related_event_id,omitempty" db:"related_event_id"`

	// Metadata
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at" db:"updated_at"`
	CreatedByUserID *string  `json:"created_by_user_id,omitempty" db:"created_by_user_id"`
}

// CreateEventRequest represents the request to create a new event
type CreateEventRequest struct {
	UnixSeconds      int64                 `json:"unix_seconds" binding:"required"`
	UnixNanos        int32                 `json:"unix_nanos" binding:"omitempty"`
	PrecisionLevel   utils.PrecisionLevel  `json:"precision_level" binding:"required"`
	UncertaintyRange *int64                `json:"uncertainty_range,omitempty"`
	Title            string                `json:"title" binding:"required,max=500"`
	Description      *string               `json:"description,omitempty"`
	Category         *string               `json:"category,omitempty"`
	ImageURL         *string               `json:"image_url,omitempty"`
}

// UpdateEventRequest represents the request to update an event
type UpdateEventRequest struct {
	UnixSeconds      *int64                `json:"unix_seconds,omitempty"`
	UnixNanos        *int32                `json:"unix_nanos,omitempty"`
	PrecisionLevel   *utils.PrecisionLevel `json:"precision_level,omitempty"`
	UncertaintyRange *int64                `json:"uncertainty_range,omitempty"`
	Title            *string               `json:"title,omitempty" binding:"omitempty,max=500"`
	Description      *string               `json:"description,omitempty"`
	Category         *string               `json:"category,omitempty"`
	ImageURL         *string               `json:"image_url,omitempty"`
}

// EventQueryParams represents query parameters for listing events
type EventQueryParams struct {
	// Time range filtering (Unix seconds since 1970)
	StartSeconds *int64 `form:"start"`
	EndSeconds   *int64 `form:"end"`

	// Filtering
	Category        *string `form:"category"`
	MinImportance   *int    `form:"min_importance"`

	// Pagination
	Limit  int `form:"limit" binding:"omitempty,min=1,max=100000"`
	Offset int `form:"offset" binding:"omitempty,min=0"`

	// Search
	Search *string `form:"search"`
}

// EventResponse represents an event with computed fields
type EventResponse struct {
	Event

	// Computed fields
	FormattedTime string `json:"formatted_time"`
	VoteStats     *VoteStats `json:"vote_stats,omitempty"`
	SourceCount   int `json:"source_count"`
	DiscussionCount int `json:"discussion_count"`
	Sources       []*EventSource `json:"sources,omitempty"`
}

// VoteStats represents aggregated vote statistics
type VoteStats struct {
	ImportanceUp   int `json:"importance_up"`
	ImportanceDown int `json:"importance_down"`
	AccuracyUp     int `json:"accuracy_up"`
	AccuracyDown   int `json:"accuracy_down"`
	DatingUp       int `json:"dating_up"`
	DatingDown     int `json:"dating_down"`
}

// User represents a user
type User struct {
	ID                  string     `json:"id" db:"id"`
	XUserID             *string    `json:"x_user_id,omitempty" db:"x_user_id"`
	Username            *string    `json:"username,omitempty" db:"username"`
	DisplayName         *string    `json:"display_name,omitempty" db:"display_name"`
	AvatarURL           *string    `json:"avatar_url,omitempty" db:"avatar_url"`
	Bio                 *string    `json:"bio,omitempty" db:"bio"`
	Role                string     `json:"role" db:"role"`
	IsActive            bool       `json:"is_active" db:"is_active"`
	IsTwitterVerified   bool       `json:"is_twitter_verified" db:"is_twitter_verified"`
	CreatedAt           time.Time  `json:"created_at" db:"created_at"`
	LastLoginAt         *time.Time `json:"last_login_at,omitempty" db:"last_login_at"`
}

// XMessage represents a cached X.com message
type XMessage struct {
	ID              string    `json:"id" db:"id"`
	XMessageID      string    `json:"x_message_id" db:"x_message_id"`
	XUserID         string    `json:"x_user_id" db:"x_user_id"`
	XUsername       *string   `json:"x_username,omitempty" db:"x_username"`
	XDisplayName    *string   `json:"x_display_name,omitempty" db:"x_display_name"`
	XAvatarURL      *string   `json:"x_avatar_url,omitempty" db:"x_avatar_url"`
	MessageText     string    `json:"message_text" db:"message_text"`
	MessageHTML     *string   `json:"message_html,omitempty" db:"message_html"`
	PostedAt        time.Time `json:"posted_at" db:"posted_at"`
	ParentMessageID *string   `json:"parent_message_id,omitempty" db:"parent_message_id"`
	ThreadRootID    *string   `json:"thread_root_id,omitempty" db:"thread_root_id"`
	CachedAt        time.Time `json:"cached_at" db:"cached_at"`
	LastUpdatedAt   time.Time `json:"last_updated_at" db:"last_updated_at"`
	LikesCount      int       `json:"likes_count" db:"likes_count"`
	RetweetsCount   int       `json:"retweets_count" db:"retweets_count"`
	RepliesCount    int       `json:"replies_count" db:"replies_count"`
	IsVisible       bool      `json:"is_visible" db:"is_visible"`
	ModerationNotes *string   `json:"moderation_notes,omitempty" db:"moderation_notes"`
}

// EventDiscussion represents a link between an event and a discussion thread
type EventDiscussion struct {
	ID               string     `json:"id" db:"id"`
	EventID          string     `json:"event_id" db:"event_id"`
	RootXMessageID   string     `json:"root_x_message_id" db:"root_x_message_id"`
	DiscussionType   string     `json:"discussion_type" db:"discussion_type"`
	CreatedAt        time.Time  `json:"created_at" db:"created_at"`
	MessageCount     int        `json:"message_count" db:"message_count"`
	LastActivityAt   *time.Time `json:"last_activity_at,omitempty" db:"last_activity_at"`
	IsActive         bool       `json:"is_active" db:"is_active"`
	Pinned           bool       `json:"pinned" db:"pinned"`
}

// Vote represents a user vote on an event
type Vote struct {
	ID        string    `json:"id" db:"id"`
	EventID   string    `json:"event_id" db:"event_id"`
	UserID    string    `json:"user_id" db:"user_id"`
	VoteType  string    `json:"vote_type" db:"vote_type"`
	VoteValue int       `json:"vote_value" db:"vote_value"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// EventSource represents a citation or reference for an event
type EventSource struct {
	ID               string     `json:"id" db:"id"`
	EventID          string     `json:"event_id" db:"event_id"`
	SourceType       string     `json:"source_type" db:"source_type"`
	Title            *string    `json:"title,omitempty" db:"title"`
	URL              *string    `json:"url,omitempty" db:"url"`
	Citation         *string    `json:"citation,omitempty" db:"citation"`
	CredibilityScore int        `json:"credibility_score" db:"credibility_score"`
	AddedByUserID    *string    `json:"added_by_user_id,omitempty" db:"added_by_user_id"`
	CreatedAt        time.Time  `json:"created_at" db:"created_at"`
}

// ZoomPreset represents a predefined zoom level
type ZoomPreset struct {
	ID                     string          `json:"id" db:"id"`
	Name                   string          `json:"name" db:"name"`
	StartSeconds           string `json:"start_seconds" db:"start_seconds"`
	EndSeconds             string `json:"end_seconds" db:"end_seconds"`
	MinImportanceThreshold int             `json:"min_importance_threshold" db:"min_importance_threshold"`
	Description            *string         `json:"description,omitempty" db:"description"`
	DisplayOrder           int             `json:"display_order" db:"display_order"`
	CreatedAt              time.Time       `json:"created_at" db:"created_at"`
}
