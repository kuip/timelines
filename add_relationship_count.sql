-- Add relationship_count column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS relationship_count INTEGER DEFAULT 0;

-- Update existing events with their relationship counts
UPDATE events e
SET relationship_count = (
    SELECT COUNT(*)
    FROM event_relationships r
    WHERE r.event_id_a = e.id OR r.event_id_b = e.id
);

-- Create function to update relationship count
CREATE OR REPLACE FUNCTION update_event_relationship_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update count for event_id_a
    UPDATE events
    SET relationship_count = (
        SELECT COUNT(*)
        FROM event_relationships
        WHERE event_id_a = NEW.event_id_a OR event_id_b = NEW.event_id_a
    )
    WHERE id = NEW.event_id_a;

    -- Update count for event_id_b
    UPDATE events
    SET relationship_count = (
        SELECT COUNT(*)
        FROM event_relationships
        WHERE event_id_a = NEW.event_id_b OR event_id_b = NEW.event_id_b
    )
    WHERE id = NEW.event_id_b;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to update relationship count on delete
CREATE OR REPLACE FUNCTION update_event_relationship_count_on_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Update count for event_id_a
    UPDATE events
    SET relationship_count = (
        SELECT COUNT(*)
        FROM event_relationships
        WHERE event_id_a = OLD.event_id_a OR event_id_b = OLD.event_id_a
    )
    WHERE id = OLD.event_id_a;

    -- Update count for event_id_b
    UPDATE events
    SET relationship_count = (
        SELECT COUNT(*)
        FROM event_relationships
        WHERE event_id_a = OLD.event_id_b OR event_id_b = OLD.event_id_b
    )
    WHERE id = OLD.event_id_b;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS event_relationship_insert_trigger ON event_relationships;
DROP TRIGGER IF EXISTS event_relationship_delete_trigger ON event_relationships;

-- Create triggers
CREATE TRIGGER event_relationship_insert_trigger
AFTER INSERT ON event_relationships
FOR EACH ROW
EXECUTE FUNCTION update_event_relationship_count();

CREATE TRIGGER event_relationship_delete_trigger
AFTER DELETE ON event_relationships
FOR EACH ROW
EXECUTE FUNCTION update_event_relationship_count_on_delete();

-- Verify the counts
SELECT COUNT(*) as events_with_relationships
FROM events
WHERE relationship_count > 0;
