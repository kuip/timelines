-- Timeline Application - Migrate time representation from Big Bang to Unix Epoch
-- Migration: 003_migrate_to_unix_epoch.sql
-- Adds unix_seconds and unix_nanos columns for modern time representation
-- Keeps timeline_seconds for backward compatibility during transition

-- Add new columns for Unix epoch time representation (if they don't exist)
ALTER TABLE events ADD COLUMN IF NOT EXISTS unix_seconds BIGINT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS unix_nanos INTEGER DEFAULT 0;

-- Constants for conversion
-- Big Bang to Unix Epoch = (13.8 billion - 55 years) * 31536000 seconds/year
-- Calculation: (13800000000 - 55) * 365.25 * 86400 = 435,494,878,264,400,000
-- Using exact calculation from utils/time.go

-- Convert existing timeline_seconds to unix_seconds
-- Formula: unix_seconds = timeline_seconds - big_bang_to_epoch_offset
UPDATE events
SET unix_seconds = CAST((timeline_seconds - 435494878264400000) AS BIGINT),
    unix_nanos = 0
WHERE unix_seconds IS NULL AND timeline_seconds IS NOT NULL;

-- Create index on new unix_seconds column for fast timeline queries
CREATE INDEX IF NOT EXISTS idx_events_unix_seconds ON events(unix_seconds);

-- Note: We keep timeline_seconds for now to maintain backward compatibility
-- Future migration can drop it after confirming all code uses unix_seconds
