package db

import (
	"database/sql"
	"fmt"
	"strings"

	"github.com/shopspring/decimal"
	"github.com/timeline/backend/internal/models"
)

// EventRepository handles event database operations
type EventRepository struct {
	db *DB
}

// NewEventRepository creates a new event repository
func NewEventRepository(db *DB) *EventRepository {
	return &EventRepository{db: db}
}

// Create inserts a new event
func (r *EventRepository) Create(req models.CreateEventRequest, userID *string) (*models.Event, error) {
	query := `
		INSERT INTO events (
			unix_seconds, unix_nanos, precision_level, uncertainty_range,
			title, description, category, created_by_user_id
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, timeline_seconds, unix_seconds, unix_nanos, precision_level, uncertainty_range,
		          title, description, category, importance_score, related_event_id,
		          created_at, updated_at, created_by_user_id
	`

	event := &models.Event{}
	err := r.db.QueryRow(
		query,
		req.UnixSeconds,
		req.UnixNanos,
		req.PrecisionLevel,
		req.UncertaintyRange,
		req.Title,
		req.Description,
		req.Category,
		userID,
	).Scan(
		&event.ID,
		&event.TimelineSeconds,
		&event.UnixSeconds,
		&event.UnixNanos,
		&event.PrecisionLevel,
		&event.UncertaintyRange,
		&event.Title,
		&event.Description,
		&event.Category,
		&event.ImportanceScore,
		&event.RelatedEventID,
		&event.CreatedAt,
		&event.UpdatedAt,
		&event.CreatedByUserID,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create event: %w", err)
	}

	return event, nil
}

// GetByID retrieves an event by ID
func (r *EventRepository) GetByID(id string) (*models.Event, error) {
	query := `
		SELECT id, timeline_seconds, unix_seconds, unix_nanos, precision_level, uncertainty_range,
		       title, description, category, importance_score, related_event_id,
		       created_at, updated_at, created_by_user_id
		FROM events
		WHERE id = $1
	`

	event := &models.Event{}
	err := r.db.QueryRow(query, id).Scan(
		&event.ID,
		&event.TimelineSeconds,
		&event.UnixSeconds,
		&event.UnixNanos,
		&event.PrecisionLevel,
		&event.UncertaintyRange,
		&event.Title,
		&event.Description,
		&event.Category,
		&event.ImportanceScore,
		&event.RelatedEventID,
		&event.CreatedAt,
		&event.UpdatedAt,
		&event.CreatedByUserID,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("event not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get event: %w", err)
	}

	return event, nil
}

// List retrieves events based on query parameters
func (r *EventRepository) List(params models.EventQueryParams) ([]models.Event, error) {
	// Build query
	query := `
		SELECT id, timeline_seconds, unix_seconds, unix_nanos, precision_level, uncertainty_range,
		       title, description, category, importance_score, related_event_id,
		       created_at, updated_at, created_by_user_id
		FROM public.events
		WHERE 1=1
	`

	args := []interface{}{}
	argCount := 1

	// Add filters
	if params.StartSeconds != nil {
		query += fmt.Sprintf(" AND unix_seconds >= $%d", argCount)
		args = append(args, params.StartSeconds)
		argCount++
	}

	if params.EndSeconds != nil {
		query += fmt.Sprintf(" AND unix_seconds <= $%d", argCount)
		args = append(args, params.EndSeconds)
		argCount++
	}

	if params.Category != nil {
		query += fmt.Sprintf(" AND category = $%d", argCount)
		args = append(args, *params.Category)
		argCount++
	}

	if params.MinImportance != nil {
		query += fmt.Sprintf(" AND importance_score >= $%d", argCount)
		args = append(args, *params.MinImportance)
		argCount++
	}

	if params.Search != nil && *params.Search != "" {
		query += fmt.Sprintf(" AND search_vector @@ plainto_tsquery('english', $%d)", argCount)
		args = append(args, *params.Search)
		argCount++
	}

	// Order by unix_seconds for proper chronological ordering
	query += " ORDER BY unix_seconds ASC"

	// Add pagination
	if params.Limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", argCount)
		args = append(args, params.Limit)
		argCount++
	} else {
		query += fmt.Sprintf(" LIMIT $%d", argCount)
		args = append(args, 1000) // Default limit
		argCount++
	}

	if params.Offset > 0 {
		query += fmt.Sprintf(" OFFSET $%d", argCount)
		args = append(args, params.Offset)
		argCount++
	}

	// Execute query
	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list events: %w", err)
	}
	defer rows.Close()

	events := []models.Event{}
	for rows.Next() {
		event := models.Event{}
		err := rows.Scan(
			&event.ID,
			&event.TimelineSeconds,
			&event.UnixSeconds,
			&event.UnixNanos,
			&event.PrecisionLevel,
			&event.UncertaintyRange,
			&event.Title,
			&event.Description,
			&event.Category,
			&event.ImportanceScore,
			&event.RelatedEventID,
			&event.CreatedAt,
			&event.UpdatedAt,
			&event.CreatedByUserID,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan event: %w", err)
		}
		events = append(events, event)
	}

	return events, nil
}

// Update updates an event
func (r *EventRepository) Update(id string, req models.UpdateEventRequest) (*models.Event, error) {
	// Build update query dynamically
	updates := []string{}
	args := []interface{}{}
	argCount := 1

	if req.UnixSeconds != nil {
		updates = append(updates, fmt.Sprintf("unix_seconds = $%d", argCount))
		args = append(args, req.UnixSeconds)
		argCount++
	}

	if req.UnixNanos != nil {
		updates = append(updates, fmt.Sprintf("unix_nanos = $%d", argCount))
		args = append(args, req.UnixNanos)
		argCount++
	}

	if req.PrecisionLevel != nil {
		updates = append(updates, fmt.Sprintf("precision_level = $%d", argCount))
		args = append(args, req.PrecisionLevel)
		argCount++
	}

	if req.UncertaintyRange != nil {
		updates = append(updates, fmt.Sprintf("uncertainty_range = $%d", argCount))
		args = append(args, req.UncertaintyRange)
		argCount++
	}

	if req.Title != nil {
		updates = append(updates, fmt.Sprintf("title = $%d", argCount))
		args = append(args, req.Title)
		argCount++
	}

	if req.Description != nil {
		updates = append(updates, fmt.Sprintf("description = $%d", argCount))
		args = append(args, req.Description)
		argCount++
	}

	if req.Category != nil {
		updates = append(updates, fmt.Sprintf("category = $%d", argCount))
		args = append(args, req.Category)
		argCount++
	}

	if len(updates) == 0 {
		return r.GetByID(id)
	}

	updates = append(updates, "updated_at = NOW()")
	args = append(args, id)

	query := fmt.Sprintf(`
		UPDATE events
		SET %s
		WHERE id = $%d
		RETURNING id, timeline_seconds, unix_seconds, unix_nanos, precision_level, uncertainty_range,
		          title, description, category, importance_score, related_event_id,
		          created_at, updated_at, created_by_user_id
	`, strings.Join(updates, ", "), argCount)

	event := &models.Event{}
	err := r.db.QueryRow(query, args...).Scan(
		&event.ID,
		&event.TimelineSeconds,
		&event.UnixSeconds,
		&event.UnixNanos,
		&event.PrecisionLevel,
		&event.UncertaintyRange,
		&event.Title,
		&event.Description,
		&event.Category,
		&event.ImportanceScore,
		&event.RelatedEventID,
		&event.CreatedAt,
		&event.UpdatedAt,
		&event.CreatedByUserID,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("event not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update event: %w", err)
	}

	return event, nil
}

// Delete deletes an event
func (r *EventRepository) Delete(id string) error {
	query := `DELETE FROM events WHERE id = $1`

	result, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete event: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("event not found")
	}

	return nil
}

// GetZoomPresets retrieves all zoom presets
func (r *EventRepository) GetZoomPresets() ([]models.ZoomPreset, error) {
	query := `
		SELECT id, name, start_seconds, end_seconds,
		       min_importance_threshold, description, display_order, created_at
		FROM zoom_presets
		ORDER BY display_order ASC
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to get zoom presets: %w", err)
	}
	defer rows.Close()

	presets := []models.ZoomPreset{}
	for rows.Next() {
		preset := models.ZoomPreset{}
		err := rows.Scan(
			&preset.ID,
			&preset.Name,
			&preset.StartSeconds,
			&preset.EndSeconds,
			&preset.MinImportanceThreshold,
			&preset.Description,
			&preset.DisplayOrder,
			&preset.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan zoom preset: %w", err)
		}
		presets = append(presets, preset)
	}

	return presets, nil
}

// CountEventsInRange counts events within a time range
func (r *EventRepository) CountEventsInRange(start, end decimal.Decimal) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM events
		WHERE timeline_seconds >= $1 AND timeline_seconds <= $2
	`

	var count int
	err := r.db.QueryRow(query, start, end).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count events: %w", err)
	}

	return count, nil
}
