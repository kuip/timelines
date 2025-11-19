-- ============================================================================
-- SUPABASE RLS POLICIES - PUBLIC ACCESS
-- ============================================================================
-- This script enables Row Level Security (RLS) on all tables and creates
-- policies that allow public read access to all data.
-- Write operations can be restricted based on your auth requirements.
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoom_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE geographic_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_region_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_routes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PUBLIC READ POLICIES
-- ============================================================================

-- Events: Public read access
CREATE POLICY "events_public_read" ON events
  FOR SELECT
  USING (true);

-- Events: Authenticated users can insert
CREATE POLICY "events_authenticated_insert" ON events
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Events: Authenticated users can update their own events or if they're admins
CREATE POLICY "events_authenticated_update" ON events
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Events: Authenticated users can delete their own events
CREATE POLICY "events_authenticated_delete" ON events
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Users: Public read access
CREATE POLICY "users_public_read" ON users
  FOR SELECT
  USING (true);

-- Users: Authenticated users can update their own profile
CREATE POLICY "users_authenticated_update" ON users
  FOR UPDATE
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

-- X Messages: Public read access
CREATE POLICY "x_messages_public_read" ON x_messages
  FOR SELECT
  USING (true);

-- Event Discussions: Public read access
CREATE POLICY "event_discussions_public_read" ON event_discussions
  FOR SELECT
  USING (true);

-- Votes: Public read access
CREATE POLICY "votes_public_read" ON votes
  FOR SELECT
  USING (true);

-- Votes: Authenticated users can insert/update their votes
CREATE POLICY "votes_authenticated_write" ON votes
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Event Sources: Public read access
CREATE POLICY "event_sources_public_read" ON event_sources
  FOR SELECT
  USING (true);

-- Event Sources: Authenticated users can add sources
CREATE POLICY "event_sources_authenticated_write" ON event_sources
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Zoom Presets: Public read access
CREATE POLICY "zoom_presets_public_read" ON zoom_presets
  FOR SELECT
  USING (true);

-- Categories: Public read access
CREATE POLICY "categories_public_read" ON categories
  FOR SELECT
  USING (true);

-- Event Categories: Public read access
CREATE POLICY "event_categories_public_read" ON event_categories
  FOR SELECT
  USING (true);

-- Event Categories: Authenticated users can manage
CREATE POLICY "event_categories_authenticated_write" ON event_categories
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Event Relationships: Public read access
CREATE POLICY "event_relationships_public_read" ON event_relationships
  FOR SELECT
  USING (true);

-- Event Relationships: Authenticated users can manage
CREATE POLICY "event_relationships_authenticated_write" ON event_relationships
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Event Locations: Public read access
CREATE POLICY "event_locations_public_read" ON event_locations
  FOR SELECT
  USING (true);

-- Event Locations: Authenticated users can manage
CREATE POLICY "event_locations_authenticated_write" ON event_locations
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Geographic Regions: Public read access
CREATE POLICY "geographic_regions_public_read" ON geographic_regions
  FOR SELECT
  USING (true);

-- Event Region Links: Public read access
CREATE POLICY "event_region_links_public_read" ON event_region_links
  FOR SELECT
  USING (true);

-- Event Routes: Public read access
CREATE POLICY "event_routes_public_read" ON event_routes
  FOR SELECT
  USING (true);

-- ============================================================================
-- GRANT PUBLIC ACCESS (anon role)
-- ============================================================================
-- Grant SELECT to anonymous users (public read access)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Grant full access to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- FUTURE GRANTS (for new tables)
-- ============================================================================
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify RLS is enabled and policies are created:

-- Check RLS status:
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;

-- Check policies:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
