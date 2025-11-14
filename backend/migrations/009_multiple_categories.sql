-- Migration: 009_multiple_categories.sql
-- Add support for multiple categories per event with proper many-to-many relationship

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    color VARCHAR(7) NOT NULL,  -- hex color
    icon VARCHAR(10),
    parent_id VARCHAR(100) REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_categories_parent ON categories(parent_id);

-- Create event_categories junction table
CREATE TABLE IF NOT EXISTS event_categories (
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    category_id VARCHAR(100) NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,  -- marks the finest-grained category for color
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    PRIMARY KEY (event_id, category_id)
);

CREATE INDEX idx_event_categories_event ON event_categories(event_id);
CREATE INDEX idx_event_categories_category ON event_categories(category_id);
CREATE INDEX idx_event_categories_primary ON event_categories(event_id, is_primary);

-- Migrate existing categories from events.category to event_categories
-- For now, mark all migrated categories as primary
INSERT INTO event_categories (event_id, category_id, is_primary)
SELECT id, category, TRUE
FROM events
WHERE category IS NOT NULL AND category != ''
ON CONFLICT DO NOTHING;

-- Keep the old category column for now (for backward compatibility during transition)
-- We'll remove it in a later migration once all code is updated
-- ALTER TABLE events DROP COLUMN category;
