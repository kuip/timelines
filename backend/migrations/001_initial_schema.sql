-- Timeline Application - Initial Database Schema
-- Migration: 001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Authentication
    x_user_id VARCHAR(100) UNIQUE,
    username VARCHAR(100),
    display_name VARCHAR(200),

    -- Profile
    avatar_url TEXT,
    bio TEXT,

    -- Permissions
    role VARCHAR(20) DEFAULT 'user',

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT valid_role CHECK (
        role IN ('user', 'moderator', 'admin')
    )
);

CREATE UNIQUE INDEX idx_users_x_user ON users(x_user_id);
CREATE INDEX idx_users_username ON users(username);

-- ============================================================================
-- EVENTS TABLE
-- ============================================================================
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Time representation
    timeline_seconds NUMERIC(30, 9) NOT NULL,
    precision_level VARCHAR(20) NOT NULL,
    uncertainty_range NUMERIC(30, 9),

    -- Event data
    title VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100),

    importance_score INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by_user_id UUID REFERENCES users(id),

    -- Full-text search
    search_vector tsvector,

    CONSTRAINT valid_precision CHECK (
        precision_level IN (
            'nanosecond', 'microsecond', 'millisecond', 'second',
            'minute', 'hour', 'day', 'year', 'thousand_years',
            'million_years', 'billion_years'
        )
    )
);

-- Indexes for events
CREATE INDEX idx_events_timeline ON events(timeline_seconds);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_importance ON events(importance_score DESC);
CREATE INDEX idx_events_search ON events USING GIN(search_vector);
CREATE INDEX idx_events_created_by ON events(created_by_user_id);

-- Trigger to update search_vector
CREATE OR REPLACE FUNCTION events_search_vector_update() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_search_vector_trigger
    BEFORE INSERT OR UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION events_search_vector_update();

-- ============================================================================
-- X_MESSAGES TABLE
-- ============================================================================
CREATE TABLE x_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- X.com message data
    x_message_id VARCHAR(100) UNIQUE NOT NULL,
    x_user_id VARCHAR(100) NOT NULL,
    x_username VARCHAR(100),
    x_display_name VARCHAR(200),
    x_avatar_url TEXT,

    -- Message content
    message_text TEXT NOT NULL,
    message_html TEXT,

    posted_at TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Thread information
    parent_message_id VARCHAR(100),
    thread_root_id VARCHAR(100),

    -- Metadata
    cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Metrics
    likes_count INTEGER DEFAULT 0,
    retweets_count INTEGER DEFAULT 0,
    replies_count INTEGER DEFAULT 0,

    -- Moderation
    is_visible BOOLEAN DEFAULT TRUE,
    moderation_notes TEXT
);

-- Indexes for x_messages
CREATE INDEX idx_x_messages_x_id ON x_messages(x_message_id);
CREATE INDEX idx_x_messages_user ON x_messages(x_user_id);
CREATE INDEX idx_x_messages_thread ON x_messages(thread_root_id);
CREATE INDEX idx_x_messages_parent ON x_messages(parent_message_id);
CREATE INDEX idx_x_messages_posted ON x_messages(posted_at DESC);

-- ============================================================================
-- EVENT_DISCUSSIONS TABLE
-- ============================================================================
CREATE TABLE event_discussions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

    root_x_message_id VARCHAR(100) NOT NULL,

    discussion_type VARCHAR(50) DEFAULT 'general',

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    message_count INTEGER DEFAULT 0,
    last_activity_at TIMESTAMP WITH TIME ZONE,

    -- Moderation
    is_active BOOLEAN DEFAULT TRUE,
    pinned BOOLEAN DEFAULT FALSE,

    CONSTRAINT valid_discussion_type CHECK (
        discussion_type IN ('general', 'debate', 'verification', 'dating_dispute')
    )
);

-- Indexes for event_discussions
CREATE INDEX idx_event_discussions_event ON event_discussions(event_id);
CREATE INDEX idx_event_discussions_root ON event_discussions(root_x_message_id);
CREATE INDEX idx_event_discussions_activity ON event_discussions(last_activity_at DESC);
CREATE INDEX idx_event_discussions_pinned ON event_discussions(pinned DESC, last_activity_at DESC);

-- ============================================================================
-- VOTES TABLE
-- ============================================================================
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    vote_type VARCHAR(20) NOT NULL,
    vote_value INTEGER NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_user_vote UNIQUE(event_id, user_id, vote_type),
    CONSTRAINT valid_vote_type CHECK (
        vote_type IN ('importance', 'accuracy', 'dating')
    )
);

-- Indexes for votes
CREATE INDEX idx_votes_event ON votes(event_id);
CREATE INDEX idx_votes_user ON votes(user_id);

-- ============================================================================
-- EVENT_SOURCES TABLE
-- ============================================================================
CREATE TABLE event_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

    source_type VARCHAR(50) NOT NULL,

    title VARCHAR(500),
    url TEXT,
    citation TEXT,

    credibility_score INTEGER DEFAULT 0,

    added_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_source_type CHECK (
        source_type IN (
            'scientific_paper', 'book', 'article', 'database',
            'expert_consensus', 'other'
        )
    )
);

-- Indexes for event_sources
CREATE INDEX idx_sources_event ON event_sources(event_id);
CREATE INDEX idx_sources_type ON event_sources(source_type);

-- ============================================================================
-- ZOOM_PRESETS TABLE
-- ============================================================================
CREATE TABLE zoom_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) NOT NULL UNIQUE,

    start_seconds NUMERIC(30, 9) NOT NULL,
    end_seconds NUMERIC(30, 9) NOT NULL,

    min_importance_threshold INTEGER DEFAULT 0,

    description TEXT,
    display_order INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for zoom_presets
CREATE INDEX idx_zoom_presets_order ON zoom_presets(display_order);

-- ============================================================================
-- INSERT INITIAL ZOOM PRESETS
-- ============================================================================

-- Note: 1 year ≈ 31,557,600 seconds (365.25 days)
-- Big Bang = 0
-- Unix Epoch ≈ 13,800,000,000 years * 31,557,600 = 435,456,000,000,000,000

INSERT INTO zoom_presets (name, start_seconds, end_seconds, min_importance_threshold, description, display_order) VALUES
    ('cosmic_overview', 0, 435457000000000000, 90, 'Entire timeline from Big Bang to present', 1),
    ('early_universe', 0, 10000000000000000, 70, 'First ~300 million years after Big Bang', 2),
    ('life_on_earth', 283046400000000000, 435457000000000000, 60, 'From Earth formation to present (~4.5B years)', 3),
    ('complex_life', 410000000000000000, 435457000000000000, 50, 'Last ~800 million years (complex life era)', 4),
    ('human_history', 435450000000000000, 435457000000000000, 30, 'Last ~200,000 years (human history)', 5),
    ('recorded_history', 435456800000000000, 435457000000000000, 20, 'Last ~6,000 years (recorded history)', 6),
    ('modern_era', 435456990000000000, 435457000000000000, 10, 'Last ~300 years (modern era)', 7),
    ('recent_history', 435456999000000000, 435457000000000000, 0, 'Last ~30 years (recent history)', 8);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to convert Unix timestamp to timeline seconds
CREATE OR REPLACE FUNCTION unix_to_timeline(unix_seconds BIGINT) RETURNS NUMERIC AS $$
DECLARE
    unix_epoch_in_timeline CONSTANT NUMERIC := 435456000000000000;
BEGIN
    RETURN unix_epoch_in_timeline + unix_seconds;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to convert timeline seconds to Unix timestamp (if in range)
CREATE OR REPLACE FUNCTION timeline_to_unix(timeline_secs NUMERIC) RETURNS BIGINT AS $$
DECLARE
    unix_epoch_in_timeline CONSTANT NUMERIC := 435456000000000000;
    result BIGINT;
BEGIN
    result := (timeline_secs - unix_epoch_in_timeline)::BIGINT;
    IF result < -2147483648 OR result > 2147483647 THEN
        RAISE EXCEPTION 'Timeline value % is outside Unix timestamp range', timeline_secs;
    END IF;
    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE events IS 'Core timeline events from Big Bang to present';
COMMENT ON COLUMN events.timeline_seconds IS 'Seconds since Big Bang (0) with nanosecond precision';
COMMENT ON COLUMN events.precision_level IS 'Indicates the precision of the timestamp';
COMMENT ON COLUMN events.uncertainty_range IS 'Plus/minus range in seconds for uncertain dates';

COMMENT ON TABLE x_messages IS 'Cached X.com messages from various accounts';
COMMENT ON TABLE event_discussions IS 'Links events to X.com discussion threads';
COMMENT ON TABLE votes IS 'User votes on event importance, accuracy, and dating';
COMMENT ON TABLE event_sources IS 'Citations and references for events';
COMMENT ON TABLE zoom_presets IS 'Predefined zoom levels for timeline visualization';
