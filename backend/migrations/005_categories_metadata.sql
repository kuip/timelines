-- Create categories table for metadata
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7),
    parent_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id)
);

-- Add category_metadata column to events for storing color/icon info
ALTER TABLE events ADD COLUMN IF NOT EXISTS category_color VARCHAR(7);

-- Create index for faster category lookups
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);

-- Insert all categories
INSERT INTO categories (id, name, description, color, parent_id) VALUES
-- Cosmology & Astrophysics
('cosmology', 'Cosmology & Astrophysics', 'Universe, stars, galaxies', '#1a1a2e', NULL),
('cosmic_formation', 'Cosmic Formation', 'Big Bang, universe expansion, early cosmos', '#16213e', 'cosmology'),
('star_formation', 'Star Formation', 'Stars, supernovae, stellar evolution', '#0f3460', 'cosmology'),
('galaxy_formation', 'Galaxy Formation', 'Galaxies, galactic structures, collisions', '#533483', 'cosmology'),
('exoplanet', 'Exoplanet Discovery', 'Exoplanet discovery, habitable zones', '#9d4edd', 'cosmology'),

-- Planetary Science & Geology
('planetary_science', 'Planetary Science & Geology', 'Earth, planets, rocks, minerals', '#8b5a3c', NULL),
('planetary_formation', 'Planetary Formation', 'Solar system birth, planetary formation', '#a0826d', 'planetary_science'),
('earth_formation', 'Earth Formation', 'Earth formation, early atmosphere', '#9d7568', 'planetary_science'),
('plate_tectonics', 'Plate Tectonics', 'Plate movement, seafloor spreading, continents', '#c9a97a', 'planetary_science'),
('mineral_geology', 'Mineral & Geology', 'Mineral discovery, ore formation', '#d4a574', 'planetary_science'),
('volcano', 'Volcanic Activity', 'Volcanic eruptions, impact events', '#d97706', 'planetary_science'),
('earthquake', 'Seismic Events', 'Earthquakes, tectonic activity', '#dc2626', 'planetary_science'),
('climate_paleoclimate', 'Paleoclimate', 'Ice ages, ancient climate shifts', '#60a5fa', 'planetary_science'),

-- Evolution & Paleontology
('life_evolution', 'Evolution & Paleontology', 'Life, evolution, species', '#065f46', NULL),
('evolution_theory', 'Evolution Theory', 'Darwinism, evolutionary concepts', '#10b981', 'life_evolution'),
('species_emergence', 'Species Emergence', 'Speciation events, new species', '#34d399', 'life_evolution'),
('extinction_event', 'Extinction Events', 'Mass extinctions, species loss', '#6ee7b7', 'life_evolution'),
('fossil_record', 'Fossil Record', 'Fossil discoveries, paleontology', '#a7f3d0', 'life_evolution'),
('human_evolution', 'Human Evolution', 'Hominids, Homo sapiens, ancestors', '#d1fae5', 'life_evolution'),

-- Medicine & Biological Sciences
('medicine_biology', 'Medicine & Biological Sciences', 'Health, disease, genetics, physiology', '#7c2d12', NULL),
('disease_epidemic', 'Disease & Epidemics', 'Plagues, pandemics, disease outbreaks', '#ea580c', 'medicine_biology'),
('medicine_breakthrough', 'Medical Breakthroughs', 'Surgery, vaccines, antibiotics, drugs', '#fb923c', 'medicine_biology'),
('genetics_dna', 'Genetics & DNA', 'DNA discovery, genetic mapping, CRISPR', '#fdba74', 'medicine_biology'),
('neuroscience', 'Neuroscience', 'Brain discoveries, neurology research', '#fed7aa', 'medicine_biology'),
('immunology', 'Immunology', 'Immune system discoveries', '#fecaca', 'medicine_biology'),
('physiology', 'Physiology', 'Organ function, anatomy discoveries', '#fca5a5', 'medicine_biology'),

-- Technology & Innovation
('technology', 'Technology & Innovation', 'Tools, machines, infrastructure', '#1e3a8a', NULL),
('transportation', 'Transportation', 'Wheels, ships, trains, cars, aviation, rockets', '#3b82f6', 'technology'),
('communication', 'Communication', 'Writing, printing, telegraph, telephone, internet', '#60a5fa', 'technology'),
('energy', 'Energy', 'Fire, coal, steam, electricity, nuclear, renewable', '#93c5fd', 'technology'),
('computing', 'Computing', 'Computers, software, AI, semiconductors', '#bfdbfe', 'technology'),
('material_science', 'Materials Science', 'Metals, plastics, composites, nanotechnology', '#dbeafe', 'technology'),
('construction', 'Construction & Infrastructure', 'Buildings, bridges, roads, infrastructure', '#eff6ff', 'technology'),

-- Science & Physics
('science', 'Science & Physics', 'Discoveries, theories, observations', '#4c0519', NULL),
('physics_discovery', 'Physics', 'Gravity, relativity, quantum mechanics', '#ec4899', 'science'),
('chemistry_discovery', 'Chemistry', 'Elements, periodic table, chemical bonds', '#f472b6', 'science'),
('astronomy_observation', 'Astronomy', 'Telescopes, celestial mapping, observations', '#fbcfe8', 'science'),
('mathematics', 'Mathematics', 'Mathematical concepts, algorithms', '#fce7f3', 'science'),

-- Agriculture & Food
('agriculture', 'Agriculture & Food', 'Farming, crops, food', '#713f12', NULL),
('agriculture_domestication', 'Agriculture & Domestication', 'Farming, crop domestication, selective breeding', '#b45309', 'agriculture'),
('food_discovery', 'Food & Trade', 'Spice trade, new crops, cooking innovations', '#d97706', 'agriculture'),

-- War & Conflict
('conflict', 'War & Conflict', 'Wars, battles, violence', '#7f1d1d', NULL),
('war_major', 'Major Wars', 'World wars, major conflicts, battles', '#dc2626', 'conflict'),
('war_regional', 'Regional Conflicts', 'Regional conflicts, civil wars', '#ef4444', 'conflict'),
('genocide', 'Genocide & Atrocities', 'Genocides, human rights atrocities', '#f87171', 'conflict'),
('terrorism', 'Terrorism', 'Terrorist attacks, terrorism emergence', '#fca5a5', 'conflict'),

-- Politics & Governance
('politics', 'Politics & Governance', 'Governments, laws, diplomacy', '#1f2937', NULL),
('government_system', 'Government Systems', 'Democracy, monarchy, dictatorship emergence', '#374151', 'politics'),
('revolution_uprising', 'Revolutions & Uprisings', 'Revolutions, uprisings, coups', '#6b7280', 'politics'),
('treaty_diplomacy', 'Treaties & Diplomacy', 'Treaties, alliances, international agreements', '#9ca3af', 'politics'),
('independence', 'Independence & Decolonization', 'National independence, decolonization', '#d1d5db', 'politics'),
('law_justice', 'Law & Justice', 'Laws, courts, justice system emergence', '#f3f4f6', 'politics'),

-- Economics & Trade
('economics', 'Economics & Trade', 'Markets, trade, finance, industry', '#365314', NULL),
('trade_commerce', 'Trade & Commerce', 'Trade routes, commerce, markets', '#65a30d', 'economics'),
('currency_banking', 'Currency & Banking', 'Currency, banks, financial systems', '#84cc16', 'economics'),
('industrial_revolution', 'Industrial Revolution', 'Industry, manufacturing, factories', '#bfef45', 'economics'),
('economic_crisis', 'Economic Crises', 'Recessions, depressions, market crashes', '#dcfce7', 'economics'),

-- Social & Rights Movements
('social', 'Social & Rights Movements', 'Society, rights, equality', '#831843', NULL),
('rights_movement', 'Rights Movements', 'Civil rights, human rights, equality movements', '#be185d', 'social'),
('labor_movement', 'Labor Movement', 'Labor rights, unions, workers movements', '#ec4899', 'social'),
('migration', 'Migration & Diaspora', 'Mass migration, diaspora, displacement', '#f472b6', 'social'),
('urbanization', 'Urbanization', 'City growth, urban development', '#fbcfe8', 'social'),
('education', 'Education', 'Educational systems, universities, literacy', '#fce7f3', 'social'),

-- Culture & Arts
('culture', 'Culture & Arts', 'Art, music, literature, philosophy', '#4c1d95', NULL),
('art_movement', 'Art Movements', 'Art styles, Renaissance, modernism', '#6d28d9', 'culture'),
('music_genre', 'Music & Genres', 'Music styles, musical evolution', '#7c3aed', 'culture'),
('literature', 'Literature', 'Literary movements, famous works', '#8b5cf6', 'culture'),
('philosophy', 'Philosophy', 'Philosophical schools, major thinkers', '#a78bfa', 'culture'),
('religion_theology', 'Religion & Theology', 'Religious movements, theological concepts', '#c4b5fd', 'culture'),
('architecture_style', 'Architecture', 'Architectural movements, famous structures', '#ddd6fe', 'culture'),

-- Entertainment & Media
('entertainment', 'Entertainment & Media', 'Cinema, television, gaming, pop culture', '#991b1b', NULL),
('cinema_film', 'Cinema & Film', 'Film invention, cinema movements, iconic films', '#dc2626', 'entertainment'),
('theater', 'Theater', 'Theater history, dramatic movements', '#ef4444', 'entertainment'),
('television', 'Television', 'TV invention, broadcasting, iconic shows', '#f87171', 'entertainment'),
('radio', 'Radio', 'Radio invention, broadcasting, radio culture', '#fca5a5', 'entertainment'),
('video_games', 'Video Games', 'Gaming history, game milestones', '#fecaca', 'entertainment'),
('pop_culture', 'Pop Culture', 'Celebrities, trends, cultural phenomena', '#fee2e2', 'entertainment'),

-- Sports & Recreation
('sports', 'Sports & Recreation', 'Sports, athletics, games', '#164e63', NULL),
('olympics', 'Olympics', 'Olympic games, records, memorable moments', '#06b6d4', 'sports'),
('professional_sports', 'Professional Sports', 'Sports leagues, championships, iconic events', '#22d3ee', 'sports'),
('sports_record', 'Sports Records', 'World records, athletic achievements', '#67e8f9', 'sports'),

-- Environment & Ecology
('environment', 'Environment & Ecology', 'Conservation, climate, ecology', '#14532d', NULL),
('conservation', 'Conservation', 'Wildlife protection, reserves, endangered species', '#16a34a', 'environment'),
('pollution', 'Pollution', 'Pollution events, environmental damage', '#4ade80', 'environment'),
('deforestation', 'Deforestation', 'Forest loss, habitat destruction', '#86efac', 'environment'),
('climate_change', 'Climate Change', 'Global warming, climate crisis', '#bbf7d0', 'environment'),
('environmental_protection', 'Environmental Protection', 'Environmental laws, green movement', '#dcfce7', 'environment'),

-- Space Exploration
('space', 'Space Exploration', 'Satellites, rockets, space missions', '#0c4a6e', NULL),
('space_exploration', 'Space Programs', 'Satellites, rockets, space missions, space programs', '#0284c7', 'space'),
('moon_landing', 'Moon Exploration', 'Moon missions, lunar exploration, moon bases', '#38bdf8', 'space'),
('mars_exploration', 'Mars Exploration', 'Mars missions, planetary exploration rovers', '#7dd3fc', 'space'),
('space_telescope', 'Space Telescopes', 'Space observatories, Hubble, JWST', '#bae6fd', 'space')
ON CONFLICT (id) DO NOTHING;
