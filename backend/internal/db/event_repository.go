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
	// Convert unix_seconds to timeline_seconds
	// Formula: timeline_seconds = unix_seconds + 435494878264400000 (Big Bang offset)
	const BIG_BANG_TO_EPOCH int64 = 435494878264400000
	timelineSecondsDec, _ := decimal.NewFromString(fmt.Sprintf("%d", req.UnixSeconds + BIG_BANG_TO_EPOCH))
	timelineSeconds := timelineSecondsDec

	query := `
		INSERT INTO events (
			timeline_seconds, unix_seconds, unix_nanos, precision_level, uncertainty_range,
			title, description, category, created_by_user_id, image_url
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, timeline_seconds, unix_seconds, unix_nanos, precision_level, uncertainty_range,
		          title, description, category, importance_score, related_event_id, relationship_count,
		          location_count, created_at, updated_at, created_by_user_id, image_url
	`

	event := &models.Event{}
	err := r.db.QueryRow(
		query,
		timelineSeconds,
		req.UnixSeconds,
		req.UnixNanos,
		req.PrecisionLevel,
		req.UncertaintyRange,
		req.Title,
		req.Description,
		req.Category,
		userID,
		req.ImageURL,
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
		&event.RelationshipCount,
		&event.LocationCount,
		&event.CreatedAt,
		&event.UpdatedAt,
		&event.CreatedByUserID,
		&event.ImageURL,
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
		       title, description, category, importance_score, related_event_id, relationship_count,
		       location_count, created_at, updated_at, created_by_user_id, image_url
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
		&event.RelationshipCount,
		&event.LocationCount,
		&event.CreatedAt,
		&event.UpdatedAt,
		&event.CreatedByUserID,
		&event.ImageURL,
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
		       title, description, category, importance_score, related_event_id, relationship_count,
		       location_count, created_at, updated_at, created_by_user_id, image_url
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
			&event.RelationshipCount,
			&event.LocationCount,
			&event.CreatedAt,
			&event.UpdatedAt,
			&event.CreatedByUserID,
			&event.ImageURL,
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

	if req.ImageURL != nil {
		updates = append(updates, fmt.Sprintf("image_url = $%d", argCount))
		args = append(args, req.ImageURL)
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
		          title, description, category, importance_score, related_event_id, relationship_count,
		          location_count, created_at, updated_at, created_by_user_id, image_url
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
		&event.RelationshipCount,
		&event.LocationCount,
		&event.CreatedAt,
		&event.UpdatedAt,
		&event.CreatedByUserID,
		&event.ImageURL,
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

// GetSourcesByEventID retrieves all sources for a specific event
func (r *EventRepository) GetSourcesByEventID(eventID string) ([]*models.EventSource, error) {
	query := `
		SELECT id, event_id, source_type, title, url, citation, credibility_score, added_by_user_id, created_at
		FROM event_sources
		WHERE event_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(query, eventID)
	if err != nil {
		return nil, fmt.Errorf("failed to get event sources: %w", err)
	}
	defer rows.Close()

	var sources []*models.EventSource
	for rows.Next() {
		source := &models.EventSource{}
		err := rows.Scan(
			&source.ID,
			&source.EventID,
			&source.SourceType,
			&source.Title,
			&source.URL,
			&source.Citation,
			&source.CredibilityScore,
			&source.AddedByUserID,
			&source.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan event source: %w", err)
		}
		sources = append(sources, source)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating event sources: %w", err)
	}

	return sources, nil
}

// GetSourcesByEventIDs retrieves sources for multiple events in a single query (batch optimization)
func (r *EventRepository) GetSourcesByEventIDs(eventIDs []string) (map[string][]*models.EventSource, error) {
	if len(eventIDs) == 0 {
		return make(map[string][]*models.EventSource), nil
	}

	// Build placeholders for IN clause
	placeholders := make([]string, len(eventIDs))
	args := make([]interface{}, len(eventIDs))
	for i, id := range eventIDs {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}

	query := fmt.Sprintf(`
		SELECT id, event_id, source_type, title, url, citation, credibility_score, added_by_user_id, created_at
		FROM event_sources
		WHERE event_id IN (%s)
		ORDER BY event_id, created_at DESC
	`, strings.Join(placeholders, ", "))

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get event sources: %w", err)
	}
	defer rows.Close()

	// Group sources by event_id
	sourcesMap := make(map[string][]*models.EventSource)
	for rows.Next() {
		source := &models.EventSource{}
		err := rows.Scan(
			&source.ID,
			&source.EventID,
			&source.SourceType,
			&source.Title,
			&source.URL,
			&source.Citation,
			&source.CredibilityScore,
			&source.AddedByUserID,
			&source.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan event source: %w", err)
		}
		sourcesMap[source.EventID] = append(sourcesMap[source.EventID], source)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating event sources: %w", err)
	}

	return sourcesMap, nil
}

// GetRelationshipsByEventIDs retrieves relationships for multiple events in a single query (batch optimization)
func (r *EventRepository) GetRelationshipsByEventIDs(eventIDs []string) (map[string][]*models.EventRelationship, error) {
	if len(eventIDs) == 0 {
		return make(map[string][]*models.EventRelationship), nil
	}

	// Build placeholders for IN clause
	placeholders := make([]string, len(eventIDs))
	args := make([]interface{}, len(eventIDs))
	for i, id := range eventIDs {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}

	query := fmt.Sprintf(`
		SELECT id, event_id_a, event_id_b, relationship_type, weight, relationship_description
		FROM event_relationships
		WHERE event_id_a IN (%s) OR event_id_b IN (%s)
		ORDER BY weight DESC
	`, strings.Join(placeholders, ", "), strings.Join(placeholders, ", "))

	// Duplicate args for the second IN clause
	args = append(args, args...)

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get event relationships: %w", err)
	}
	defer rows.Close()

	// Group relationships by event_id
	relationshipsMap := make(map[string][]*models.EventRelationship)
	for rows.Next() {
		rel := &models.EventRelationship{}
		err := rows.Scan(
			&rel.ID,
			&rel.EventIDA,
			&rel.EventIDB,
			&rel.RelationshipType,
			&rel.Weight,
			&rel.Description,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan event relationship: %w", err)
		}

		// Add to both event IDs' lists
		relationshipsMap[rel.EventIDA] = append(relationshipsMap[rel.EventIDA], rel)
		relationshipsMap[rel.EventIDB] = append(relationshipsMap[rel.EventIDB], rel)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating event relationships: %w", err)
	}

	return relationshipsMap, nil
}
