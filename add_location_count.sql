-- Drop the has_location column if it exists
ALTER TABLE events DROP COLUMN IF EXISTS has_location;

-- Add location_count column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS location_count INTEGER DEFAULT 0;

-- Populate location_count for existing events
UPDATE events e
SET location_count = (
    SELECT COUNT(*) FROM event_locations el WHERE el.event_id = e.id
);

-- Create function to update location_count when event_locations change
CREATE OR REPLACE FUNCTION update_event_location_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE events
        SET location_count = (
            SELECT COUNT(*) FROM event_locations WHERE event_id = NEW.event_id
        )
        WHERE id = NEW.event_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE events
        SET location_count = (
            SELECT COUNT(*) FROM event_locations WHERE event_id = OLD.event_id
        )
        WHERE id = OLD.event_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop old triggers if they exist
DROP TRIGGER IF EXISTS event_location_insert_trigger ON event_locations;
DROP TRIGGER IF EXISTS event_location_delete_trigger ON event_locations;

-- Create trigger for INSERT on event_locations
CREATE TRIGGER event_location_insert_trigger
AFTER INSERT ON event_locations
FOR EACH ROW
EXECUTE FUNCTION update_event_location_count();

-- Create trigger for DELETE on event_locations
CREATE TRIGGER event_location_delete_trigger
AFTER DELETE ON event_locations
FOR EACH ROW
EXECUTE FUNCTION update_event_location_count();

-- Verify the update
SELECT
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE location_count > 0) as events_with_locations,
    COUNT(*) FILTER (WHERE location_count = 0) as events_without_locations,
    SUM(location_count) as total_locations
FROM events;
