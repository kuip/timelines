-- Row Level Security (RLS) Policies for Timeline App
-- This allows public read/write access via Supabase anon key
-- Run this in your Supabase SQL editor or via psql

-- ============================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoom_presets ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DROP EXISTING POLICIES (if any)
-- ============================================

DROP POLICY IF EXISTS "Enable read access for all users" ON events;
DROP POLICY IF EXISTS "Enable insert for all users" ON events;
DROP POLICY IF EXISTS "Enable update for all users" ON events;
DROP POLICY IF EXISTS "Enable delete for all users" ON events;

DROP POLICY IF EXISTS "Enable read access for all users" ON event_sources;
DROP POLICY IF EXISTS "Enable insert for all users" ON event_sources;
DROP POLICY IF EXISTS "Enable update for all users" ON event_sources;
DROP POLICY IF EXISTS "Enable delete for all users" ON event_sources;

DROP POLICY IF EXISTS "Enable read access for all users" ON event_relationships;
DROP POLICY IF EXISTS "Enable insert for all users" ON event_relationships;
DROP POLICY IF EXISTS "Enable delete for all users" ON event_relationships;

DROP POLICY IF EXISTS "Enable read access for all users" ON event_locations;
DROP POLICY IF EXISTS "Enable insert for all users" ON event_locations;
DROP POLICY IF EXISTS "Enable update for all users" ON event_locations;
DROP POLICY IF EXISTS "Enable delete for all users" ON event_locations;

DROP POLICY IF EXISTS "Enable read access for all users" ON categories;
DROP POLICY IF EXISTS "Enable read access for all users" ON zoom_presets;

-- ============================================
-- EVENTS TABLE POLICIES
-- ============================================

-- Allow everyone to read events
CREATE POLICY "Enable read access for all users"
ON events FOR SELECT
USING (true);

-- Allow everyone to insert events
CREATE POLICY "Enable insert for all users"
ON events FOR INSERT
WITH CHECK (true);

-- Allow everyone to update events
CREATE POLICY "Enable update for all users"
ON events FOR UPDATE
USING (true);

-- Allow everyone to delete events
CREATE POLICY "Enable delete for all users"
ON events FOR DELETE
USING (true);

-- ============================================
-- EVENT_SOURCES TABLE POLICIES
-- ============================================

CREATE POLICY "Enable read access for all users"
ON event_sources FOR SELECT
USING (true);

CREATE POLICY "Enable insert for all users"
ON event_sources FOR INSERT
WITH CHECK (true);

CREATE POLICY "Enable update for all users"
ON event_sources FOR UPDATE
USING (true);

CREATE POLICY "Enable delete for all users"
ON event_sources FOR DELETE
USING (true);

-- ============================================
-- EVENT_RELATIONSHIPS TABLE POLICIES
-- ============================================

CREATE POLICY "Enable read access for all users"
ON event_relationships FOR SELECT
USING (true);

CREATE POLICY "Enable insert for all users"
ON event_relationships FOR INSERT
WITH CHECK (true);

CREATE POLICY "Enable delete for all users"
ON event_relationships FOR DELETE
USING (true);

-- ============================================
-- EVENT_LOCATIONS TABLE POLICIES
-- ============================================

CREATE POLICY "Enable read access for all users"
ON event_locations FOR SELECT
USING (true);

CREATE POLICY "Enable insert for all users"
ON event_locations FOR INSERT
WITH CHECK (true);

CREATE POLICY "Enable update for all users"
ON event_locations FOR UPDATE
USING (true);

CREATE POLICY "Enable delete for all users"
ON event_locations FOR DELETE
USING (true);

-- ============================================
-- CATEGORIES TABLE POLICIES (Read-only)
-- ============================================

CREATE POLICY "Enable read access for all users"
ON categories FOR SELECT
USING (true);

-- ============================================
-- ZOOM_PRESETS TABLE POLICIES (Read-only)
-- ============================================

CREATE POLICY "Enable read access for all users"
ON zoom_presets FOR SELECT
USING (true);

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('events', 'event_sources', 'event_relationships', 'event_locations', 'categories', 'zoom_presets');

-- List all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
