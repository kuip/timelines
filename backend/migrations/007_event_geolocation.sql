-- Event Geolocation Table
-- Stores geographic data for events (points and polygons)
-- Compatible with PostGIS, OpenLayers, and OSM

-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create event_locations table for storing geographic data
CREATE TABLE IF NOT EXISTS event_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Link to event
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

    -- Location name/description
    location_name VARCHAR(500) NOT NULL,
    location_type VARCHAR(100) NOT NULL,
    -- Types: point (city/battle site), city, region, country, battlefield, border, route, sea_area, continent, etc.

    -- Geographic coordinates using PostGIS
    -- Point geometry (latitude, longitude) in WGS84 (EPSG:4326)
    location_point GEOMETRY(Point, 4326),

    -- Polygon geometry for larger areas (regions, countries, seas, etc.)
    -- WGS84 projection for OpenLayers/Leaflet compatibility
    location_polygon GEOMETRY(Polygon, 4326),

    -- Bounding box for quick spatial queries
    -- Format: minLat, minLon, maxLat, maxLon
    bbox_min_lat DECIMAL(10, 8),
    bbox_min_lon DECIMAL(11, 8),
    bbox_max_lat DECIMAL(10, 8),
    bbox_max_lon DECIMAL(11, 8),

    -- Alternative: GeoJSON for easy serialization to frontend
    geojson JSONB,

    -- Confidence/accuracy of location
    accuracy_meters INT,  -- Estimated accuracy radius in meters
    confidence_score INT DEFAULT 50 CHECK (confidence_score >= 0 AND confidence_score <= 100),

    -- Whether this is primary location for the event
    is_primary BOOLEAN DEFAULT FALSE,

    -- Source of geolocation data
    source_id VARCHAR(255),  -- e.g., "wikidata:Q123", "geonames:123", "manual"

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Prevent duplicate locations for same event
    UNIQUE(event_id, location_name, location_type)
);

-- Create spatial indexes for fast geographic queries
CREATE INDEX idx_event_locations_point ON event_locations USING GIST (location_point);
CREATE INDEX idx_event_locations_polygon ON event_locations USING GIST (location_polygon);
CREATE INDEX idx_event_locations_bbox ON event_locations (bbox_min_lat, bbox_min_lon, bbox_max_lat, bbox_max_lon);
CREATE INDEX idx_event_locations_event ON event_locations(event_id);
CREATE INDEX idx_event_locations_primary ON event_locations(is_primary);

-- Create table for event routes (line strings - for migrations, voyages, campaigns)
CREATE TABLE IF NOT EXISTS event_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Link to event
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

    -- Route description
    route_name VARCHAR(500),
    route_type VARCHAR(100),
    -- Types: migration, voyage, military_campaign, trade_route, march, flight, etc.

    -- LineString geometry for routes (sequence of points)
    route_line GEOMETRY(LineString, 4326),

    -- Start and end locations
    start_location VARCHAR(500),
    end_location VARCHAR(500),

    -- Optional: intermediate waypoints as GeoJSON
    waypoints JSONB,

    -- Distance in kilometers
    distance_km DECIMAL(12, 2),

    -- Source
    source_id VARCHAR(255),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create spatial index for routes
CREATE INDEX idx_event_routes_line ON event_routes USING GIST (route_line);
CREATE INDEX idx_event_routes_event ON event_routes(event_id);

-- Create table for geographic regions/polygons (reusable boundaries)
CREATE TABLE IF NOT EXISTS geographic_regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Region information
    region_name VARCHAR(500) NOT NULL UNIQUE,
    region_type VARCHAR(100) NOT NULL,
    -- Types: country, state, province, city, empire, sea, continent, historical_region, etc.

    -- Polygon boundary in WGS84
    boundary GEOMETRY(Polygon, 4326) NOT NULL,

    -- GeoJSON representation
    geojson JSONB,

    -- Bounding box
    bbox_min_lat DECIMAL(10, 8),
    bbox_min_lon DECIMAL(11, 8),
    bbox_max_lat DECIMAL(10, 8),
    bbox_max_lon DECIMAL(11, 8),

    -- Historical period this region applies to
    valid_from BIGINT,  -- unix_seconds
    valid_until BIGINT,  -- unix_seconds (NULL for current)

    -- ISO codes
    iso_country_code VARCHAR(2),
    iso_subdivision_code VARCHAR(10),

    -- Source
    source_id VARCHAR(255),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create spatial index for regions
CREATE INDEX idx_geographic_regions_boundary ON geographic_regions USING GIST (boundary);
CREATE INDEX idx_geographic_regions_type ON geographic_regions(region_type);
CREATE INDEX idx_geographic_regions_valid ON geographic_regions(valid_from, valid_until);

-- Create table to link events to geographic regions
CREATE TABLE IF NOT EXISTS event_region_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    region_id UUID NOT NULL REFERENCES geographic_regions(id) ON DELETE CASCADE,

    -- Role of region in the event
    region_role VARCHAR(100),
    -- Examples: occurred_in, affected_area, origin, destination, border_dispute, etc.

    confidence_score INT DEFAULT 50 CHECK (confidence_score >= 0 AND confidence_score <= 100),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(event_id, region_id, region_role)
);

CREATE INDEX idx_event_region_links_event ON event_region_links(event_id);
CREATE INDEX idx_event_region_links_region ON event_region_links(region_id);

-- Create GeoJSON helper view for OpenLayers/Leaflet integration
CREATE OR REPLACE VIEW event_locations_geojson AS
SELECT
    el.id,
    el.event_id,
    e.title as event_title,
    e.unix_seconds,
    el.location_name,
    el.location_type,
    el.location_point,
    el.location_polygon,
    COALESCE(el.geojson, ST_AsGeoJSON(COALESCE(el.location_point, el.location_polygon))::jsonb) as geojson,
    el.confidence_score,
    el.is_primary,
    el.source_id
FROM event_locations el
JOIN events e ON el.event_id = e.id
WHERE el.location_point IS NOT NULL OR el.location_polygon IS NOT NULL;

-- Create view for event routes as GeoJSON
CREATE OR REPLACE VIEW event_routes_geojson AS
SELECT
    er.id,
    er.event_id,
    e.title as event_title,
    e.unix_seconds,
    er.route_name,
    er.route_type,
    er.route_line,
    er.start_location,
    er.end_location,
    ST_AsGeoJSON(er.route_line)::jsonb as geojson,
    er.distance_km,
    er.source_id
FROM event_routes er
JOIN events e ON er.event_id = e.id;

-- Add helper function to convert decimal degrees to OpenLayers coordinates
CREATE OR REPLACE FUNCTION point_to_ol_coords(point GEOMETRY(Point, 4326))
RETURNS jsonb AS $$
BEGIN
    RETURN jsonb_build_object(
        'lon', ST_X(point),
        'lat', ST_Y(point),
        'epsg', '4326'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add helper function to create bounding boxes from geometries
CREATE OR REPLACE FUNCTION get_bbox(geom GEOMETRY)
RETURNS jsonb AS $$
DECLARE
    bbox_array NUMERIC[];
BEGIN
    bbox_array := ARRAY[
        ST_YMin(ST_Envelope(geom)),
        ST_XMin(ST_Envelope(geom)),
        ST_YMax(ST_Envelope(geom)),
        ST_XMax(ST_Envelope(geom))
    ];
    RETURN jsonb_build_object(
        'min_lat', bbox_array[1],
        'min_lon', bbox_array[2],
        'max_lat', bbox_array[3],
        'max_lon', bbox_array[4]
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add helper function to calculate distance between two points in km
CREATE OR REPLACE FUNCTION point_distance_km(point1 GEOMETRY(Point, 4326), point2 GEOMETRY(Point, 4326))
RETURNS NUMERIC AS $$
BEGIN
    RETURN ST_DistanceSphere(point1, point2) / 1000;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
