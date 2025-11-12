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
