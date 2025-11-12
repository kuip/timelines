-- Create event_relationships table for many-to-many relationships between events
-- Each relationship has a type and weight (importance/strength)

CREATE TABLE IF NOT EXISTS event_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- The two events being related
    event_id_a UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    event_id_b UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

    -- Type of relationship (directional: A -> B)
    relationship_type VARCHAR(100) NOT NULL,
    -- Examples: causes, caused_by, precedes, follows, related_to, influences, influenced_by,
    --           part_of, contains, contemporary_with, conflicts_with, cooperates_with, etc.

    -- Weight/strength of relationship (0-100, where 100 is strongest)
    weight INT DEFAULT 50 CHECK (weight >= 0 AND weight <= 100),

    -- Optional explanation of the relationship
    relationship_description TEXT,

    -- Source of relationship information
    source_id VARCHAR(255),  -- e.g., "wikidata:Q123", "manual:user123"

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Prevent duplicate relationships
    UNIQUE(event_id_a, event_id_b, relationship_type)
);

-- Create indexes for efficient querying
CREATE INDEX idx_event_relationships_a ON event_relationships(event_id_a);
CREATE INDEX idx_event_relationships_b ON event_relationships(event_id_b);
CREATE INDEX idx_event_relationships_type ON event_relationships(relationship_type);
CREATE INDEX idx_event_relationships_weight ON event_relationships(weight DESC);

-- Add source_id column to events table if not exists (for event source tracking)
ALTER TABLE events ADD COLUMN IF NOT EXISTS source_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_events_source ON events(source_id);
