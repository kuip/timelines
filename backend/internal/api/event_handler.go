package api

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/timeline/backend/internal/db"
	"github.com/timeline/backend/internal/models"
	"github.com/timeline/backend/internal/utils"
)

// EventHandler handles event-related HTTP requests
type EventHandler struct {
	repo *db.EventRepository
	db   *db.DB
}

// NewEventHandler creates a new event handler
func NewEventHandler(repo *db.EventRepository, database *db.DB) *EventHandler {
	return &EventHandler{repo: repo, db: database}
}

// CreateEvent handles POST /api/events
func (h *EventHandler) CreateEvent(c *gin.Context) {
	var req models.CreateEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate category if provided
	if req.Category != nil && *req.Category != "" {
		if !utils.IsValidCategory(*req.Category) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid category",
				"category": *req.Category,
				"message": "Category does not exist in the valid categories list",
			})
			return
		}
	}

	// TODO: Get user ID from auth context
	var userID *string = nil

	event, err := h.repo.Create(req, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create event", "details": err.Error()})
		return
	}

	// Convert to response with formatted time
	response := models.EventResponse{
		Event:           *event,
		FormattedTime:   utils.FormatTimelineForDisplay(event.UnixSeconds, event.UnixNanos),
		SourceCount:     0,
		DiscussionCount: 0,
	}

	c.JSON(http.StatusCreated, response)
}

// GetEvent handles GET /api/events/:id
func (h *EventHandler) GetEvent(c *gin.Context) {
	id := c.Param("id")

	event, err := h.repo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	// Convert to response with formatted time
	response := models.EventResponse{
		Event:         *event,
		FormattedTime:   utils.FormatTimelineForDisplay(event.UnixSeconds, event.UnixNanos),
		SourceCount:   0,
		DiscussionCount: 0,
	}

	c.JSON(http.StatusOK, response)
}

// ListEvents handles GET /api/events
func (h *EventHandler) ListEvents(c *gin.Context) {
	var params models.EventQueryParams
	if err := c.ShouldBindQuery(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set default limit if not provided
	if params.Limit == 0 {
		params.Limit = 100
	}

	events, err := h.repo.List(params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list events", "details": err.Error()})
		return
	}

	// Convert to response format
	responses := make([]models.EventResponse, len(events))
	for i, event := range events {
			responses[i] = models.EventResponse{
			Event:         event,
			FormattedTime:   utils.FormatTimelineForDisplay(event.UnixSeconds, event.UnixNanos),
			SourceCount:   0,
			DiscussionCount: 0,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"events": responses,
		"count":  len(responses),
	})
}

// UpdateEvent handles PUT /api/events/:id
func (h *EventHandler) UpdateEvent(c *gin.Context) {
	id := c.Param("id")

	var req models.UpdateEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// TODO: Check authorization

	event, err := h.repo.Update(id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update event"})
		return
	}

	// Convert to response with formatted time
	response := models.EventResponse{
		Event:         *event,
		FormattedTime:   utils.FormatTimelineForDisplay(event.UnixSeconds, event.UnixNanos),
		SourceCount:   0,
		DiscussionCount: 0,
	}

	c.JSON(http.StatusOK, response)
}

// DeleteEvent handles DELETE /api/events/:id
func (h *EventHandler) DeleteEvent(c *gin.Context) {
	id := c.Param("id")

	// TODO: Check authorization

	err := h.repo.Delete(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete event"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Event deleted successfully"})
}

// GetZoomPresets handles GET /api/zoom-presets
func (h *EventHandler) GetZoomPresets(c *gin.Context) {
	presets, err := h.repo.GetZoomPresets()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get zoom presets"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"presets": presets,
		"count":   len(presets),
	})
}

// GetEventRelationships handles GET /api/events/:id/relationships
func (h *EventHandler) GetEventRelationships(c *gin.Context) {
	eventID := c.Param("id")

	query := `
	SELECT
		id, event_id_a, event_id_b, relationship_type, weight, relationship_description
	FROM event_relationships
	WHERE event_id_a = $1 OR event_id_b = $1
	ORDER BY weight DESC
	`

	rows, err := h.db.Query(query, eventID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query relationships"})
		return
	}
	defer rows.Close()

	type Relationship struct {
		ID                  string `json:"id"`
		EventIDA            string `json:"event_id_a"`
		EventIDB            string `json:"event_id_b"`
		RelationshipType    string `json:"relationship_type"`
		Weight              int    `json:"weight"`
		RelationshipDesc    string `json:"description,omitempty"`
	}

	relationships := []Relationship{}

	for rows.Next() {
		var (
			id   string
			a    string
			b    string
			rel  string
			w    int
			desc sql.NullString
		)

		if err := rows.Scan(&id, &a, &b, &rel, &w, &desc); err != nil {
			continue
		}

		r := Relationship{
			ID:               id,
			EventIDA:         a,
			EventIDB:         b,
			RelationshipType: rel,
			Weight:           w,
		}

		if desc.Valid {
			r.RelationshipDesc = desc.String
		}

		relationships = append(relationships, r)
	}

	c.JSON(http.StatusOK, gin.H{"relationships": relationships})
}
