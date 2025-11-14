package api

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/timeline/backend/internal/db"
)

// GeolocationHandler handles geolocation-related HTTP requests
type GeolocationHandler struct {
	db *db.DB
}

// NewGeolocationHandler creates a new geolocation handler
func NewGeolocationHandler(database *db.DB) *GeolocationHandler {
	return &GeolocationHandler{db: database}
}

// EventLocation represents a location for an event
type EventLocation struct {
	ID               string          `json:"id"`
	EventID          string          `json:"event_id"`
	EventTitle       string          `json:"event_title"`
	LocationName     string          `json:"location_name"`
	LocationType     string          `json:"location_type"`
	GeoJSON          json.RawMessage `json:"geojson"`
	ConfidenceScore  int             `json:"confidence_score"`
	IsPrimary        bool            `json:"is_primary"`
	SourceID         string          `json:"source_id"`
}

// GeoJSONFeature represents a GeoJSON feature
type GeoJSONFeature struct {
	Type       string                 `json:"type"`
	ID         string                 `json:"id"`
	Properties map[string]interface{} `json:"properties"`
	Geometry   interface{}            `json:"geometry"`
}

// GeoJSONFeatureCollection represents a GeoJSON FeatureCollection
type GeoJSONFeatureCollection struct {
	Type     string           `json:"type"`
	Features []GeoJSONFeature `json:"features"`
}

// GetLocationsGeoJSON returns all event locations as GeoJSON
// GET /api/events/locations/geojson
func (h *GeolocationHandler) GetLocationsGeoJSON(c *gin.Context) {
	query := `
	SELECT
		el.id,
		el.event_id,
		e.title,
		el.location_name,
		el.location_type,
		el.geojson,
		el.confidence_score,
		el.is_primary,
		el.source_id
	FROM event_locations el
	JOIN events e ON el.event_id = e.id
	WHERE el.location_point IS NOT NULL OR el.location_polygon IS NOT NULL
	ORDER BY el.is_primary DESC, el.confidence_score DESC
	`

	rows, err := h.db.Query(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query locations"})
		return
	}
	defer rows.Close()

	features := []GeoJSONFeature{}

	for rows.Next() {
		var (
			id               string
			eventID          string
			eventTitle       string
			locationName     string
			locationType     string
			geojson          sql.NullString
			confidenceScore  int
			isPrimary        bool
			sourceID         sql.NullString
		)

		if err := rows.Scan(&id, &eventID, &eventTitle, &locationName, &locationType,
			&geojson, &confidenceScore, &isPrimary, &sourceID); err != nil {
			continue
		}

		// Parse GeoJSON geometry
		var geometry interface{}
		if geojson.Valid {
			if err := json.Unmarshal([]byte(geojson.String), &geometry); err != nil {
				continue
			}
		}

		// Build properties
		properties := map[string]interface{}{
			"event_id":           eventID,
			"event_title":        eventTitle,
			"location_name":      locationName,
			"location_type":      locationType,
			"confidence_score":   confidenceScore,
			"is_primary":         isPrimary,
		}
		if sourceID.Valid {
			properties["source_id"] = sourceID.String
		}

		feature := GeoJSONFeature{
			Type:       "Feature",
			ID:         id,
			Properties: properties,
			Geometry:   geometry,
		}

		features = append(features, feature)
	}

	// Return as FeatureCollection
	collection := GeoJSONFeatureCollection{
		Type:     "FeatureCollection",
		Features: features,
	}

	c.JSON(http.StatusOK, collection)
}

// GetEventLocations returns locations for a specific event
// GET /api/events/:id/locations
func (h *GeolocationHandler) GetEventLocations(c *gin.Context) {
	eventID := c.Param("id")

	query := `
	SELECT
		el.id,
		el.event_id,
		e.title,
		el.location_name,
		el.location_type,
		el.geojson,
		el.confidence_score,
		el.is_primary,
		el.source_id
	FROM event_locations el
	JOIN events e ON el.event_id = e.id
	WHERE el.event_id = $1 AND (el.location_point IS NOT NULL OR el.location_polygon IS NOT NULL)
	ORDER BY el.is_primary DESC, el.confidence_score DESC
	`

	rows, err := h.db.Query(query, eventID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query locations"})
		return
	}
	defer rows.Close()

	locations := []EventLocation{}

	for rows.Next() {
		var (
			id              string
			eID             string
			eventTitle      string
			locationName    string
			locationType    string
			geojson         sql.NullString
			confidenceScore int
			isPrimary       bool
			sourceID        sql.NullString
		)

		if err := rows.Scan(&id, &eID, &eventTitle, &locationName, &locationType,
			&geojson, &confidenceScore, &isPrimary, &sourceID); err != nil {
			continue
		}

		loc := EventLocation{
			ID:              id,
			EventID:         eID,
			EventTitle:      eventTitle,
			LocationName:    locationName,
			LocationType:    locationType,
			ConfidenceScore: confidenceScore,
			IsPrimary:       isPrimary,
		}

		if geojson.Valid {
			loc.GeoJSON = json.RawMessage(geojson.String)
		}

		if sourceID.Valid {
			loc.SourceID = sourceID.String
		}

		locations = append(locations, loc)
	}

	c.JSON(http.StatusOK, gin.H{"locations": locations})
}

// UpdateEventLocation handles PUT /api/events/:id/locations/primary
// Updates the primary location for an event with coordinates
func (h *GeolocationHandler) UpdateEventLocation(c *gin.Context) {
	eventID := c.Param("id")

	var req struct {
		Latitude  float64 `json:"latitude" binding:"required"`
		Longitude float64 `json:"longitude" binding:"required"`
		Name      string  `json:"location_name"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create GeoJSON Point geometry from coordinates
	geometry := map[string]interface{}{
		"type":        "Point",
		"coordinates": []float64{req.Longitude, req.Latitude}, // GeoJSON uses [lon, lat]
	}

	geojsonStr, _ := json.Marshal(geometry)

	// Check if primary location already exists
	query := `
	SELECT id FROM event_locations
	WHERE event_id = $1 AND is_primary = true
	LIMIT 1
	`

	var locationID sql.NullString
	err := h.db.QueryRow(query, eventID).Scan(&locationID)

	var result interface{}

	if err == nil && locationID.Valid {
		// Update existing primary location
		updateQuery := `
		UPDATE event_locations
		SET geojson = $1, location_name = $2, location_point = ST_PointFromText('POINT(' || $3 || ' ' || $4 || ')')
		WHERE id = $5
		RETURNING id
		`

		err := h.db.QueryRow(updateQuery, geojsonStr, req.Name, req.Longitude, req.Latitude, locationID.String).Scan(&result)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update location"})
			return
		}
	} else {
		// Create new primary location
		insertQuery := `
		INSERT INTO event_locations (id, event_id, location_name, location_type, geojson, location_point, confidence_score, is_primary)
		VALUES (gen_random_uuid(), $1, $2, 'user_edited', $3, ST_PointFromText('POINT(' || $4 || ' ' || $5 || ')'), 100, true)
		RETURNING id
		`

		err := h.db.QueryRow(insertQuery, eventID, req.Name, geojsonStr, req.Longitude, req.Latitude).Scan(&result)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create location", "details": err.Error()})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Location updated successfully", "location_id": result})
}
