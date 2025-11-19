-- Add has_location column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS has_location BOOLEAN DEFAULT FALSE;

-- Populate has_location for existing events
UPDATE events e
SET has_location = EXISTS (
    SELECT 1 FROM event_locations el WHERE el.event_id = e.id
);

-- Create function to update has_location when event_locations change
CREATE OR REPLACE FUNCTION update_event_has_location()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE events SET has_location = TRUE WHERE id = NEW.event_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE events
        SET has_location = EXISTS (
            SELECT 1 FROM event_locations WHERE event_id = OLD.event_id
        )
        WHERE id = OLD.event_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT on event_locations
DROP TRIGGER IF EXISTS event_location_insert_trigger ON event_locations;
CREATE TRIGGER event_location_insert_trigger
AFTER INSERT ON event_locations
FOR EACH ROW
EXECUTE FUNCTION update_event_has_location();

-- Create trigger for DELETE on event_locations
DROP TRIGGER IF EXISTS event_location_delete_trigger ON event_locations;
CREATE TRIGGER event_location_delete_trigger
AFTER DELETE ON event_locations
FOR EACH ROW
EXECUTE FUNCTION update_event_has_location();

-- Verify the update
SELECT
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE has_location = TRUE) as events_with_locations,
    COUNT(*) FILTER (WHERE has_location = FALSE) as events_without_locations
FROM events;
