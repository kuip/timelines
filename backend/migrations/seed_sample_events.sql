-- Sample Events for Timeline Application
-- This file seeds the database with interesting events across cosmic history

-- Note: timeline_seconds calculation:
-- Big Bang = 0
-- 1 year = 31,557,600 seconds
-- Unix Epoch (1970) ≈ 435,456,000,000,000,000 seconds

-- ============================================================================
-- COSMIC EVENTS
-- ============================================================================

-- Big Bang (0 seconds)
INSERT INTO events (timeline_seconds, precision_level, uncertainty_range, title, description, category, importance_score)
VALUES
(0, 'billion_years', 631152000000000, 'Big Bang', 'The beginning of the universe approximately 13.8 billion years ago', 'cosmic', 100);

-- Formation of first atoms (380,000 years after Big Bang)
INSERT INTO events (timeline_seconds, precision_level, title, description, category, importance_score)
VALUES
(11991888000000, 'million_years', 'Recombination Era', 'First atoms form, universe becomes transparent to light (Cosmic Microwave Background)', 'cosmic', 95);

-- First stars (~100-200 million years)
INSERT INTO events (timeline_seconds, precision_level, title, description, category, importance_score)
VALUES
(4733640000000000, 'million_years', 'First Stars Form', 'The first generation of stars (Population III) ignite in the early universe', 'cosmic', 90);

-- Formation of Milky Way (~13.5 billion years ago = 0.3B years after Big Bang)
INSERT INTO events (timeline_seconds, precision_level, title, description, category, importance_score)
VALUES
(9467280000000000, 'million_years', 'Formation of Milky Way', 'Our home galaxy begins to form from primordial gas clouds', 'cosmic', 85);

-- ============================================================================
-- SOLAR SYSTEM EVENTS
-- ============================================================================

-- Formation of Solar System (4.6 billion years ago)
INSERT INTO events (timeline_seconds, precision_level, uncertainty_range, title, description, category, importance_score)
VALUES
(290364480000000000, 'million_years', 3155760000000000, 'Formation of Solar System', 'The solar nebula collapses to form the Sun and planetary system', 'cosmic', 90);

-- Formation of Earth (4.54 billion years ago)
INSERT INTO events (timeline_seconds, precision_level, uncertainty_range, title, description, category, importance_score)
VALUES
(292257984000000000, 'million_years', 1577880000000000, 'Formation of Earth', 'Earth forms from the accretion of planetesimals in the solar nebula', 'geological', 95);

-- Formation of Moon (4.5 billion years ago) - Giant Impact
INSERT INTO events (timeline_seconds, precision_level, title, description, category, importance_score)
VALUES
(293835600000000000, 'million_years', 'Formation of Moon', 'Giant impact between Earth and Mars-sized body "Theia" creates the Moon', 'geological', 85);

-- ============================================================================
-- EARLY EARTH
-- ============================================================================

-- Oldest minerals (4.4 billion years ago)
INSERT INTO events (timeline_seconds, precision_level, title, description, category, importance_score)
VALUES
(297887040000000000, 'million_years', 'Oldest Known Minerals', 'Zircon crystals in Western Australia - oldest known Earth materials', 'geological', 75);

-- First life (3.8-4.0 billion years ago)
INSERT INTO events (timeline_seconds, precision_level, uncertainty_range, title, description, category, importance_score)
VALUES
(310104960000000000, 'million_years', 6311520000000000, 'First Life on Earth', 'Earliest evidence of life - simple prokaryotic cells', 'biological', 100);

-- Great Oxidation Event (2.4 billion years ago)
INSERT INTO events (timeline_seconds, precision_level, title, description, category, importance_score)
VALUES
(354373920000000000, 'million_years', 'Great Oxidation Event', 'Cyanobacteria produce oxygen, fundamentally changing Earth''s atmosphere', 'biological', 95);

-- ============================================================================
-- COMPLEX LIFE
-- ============================================================================

-- First multicellular life (1.2 billion years ago)
INSERT INTO events (timeline_seconds, precision_level, title, description, category, importance_score)
VALUES
(392525760000000000, 'million_years', 'First Multicellular Organisms', 'Evolution of the first multicellular eukaryotes', 'biological', 90);

-- Cambrian Explosion (541 million years ago)
INSERT INTO events (timeline_seconds, precision_level, title, description, category, importance_score)
VALUES
(418389753600000000, 'million_years', 'Cambrian Explosion', 'Rapid diversification of life forms - most major animal phyla appear', 'biological', 95);

-- First land plants (470 million years ago)
INSERT INTO events (timeline_seconds, precision_level, title, description, category, importance_score)
VALUES
(420629088000000000, 'million_years', 'Plants Colonize Land', 'First land plants evolve, beginning the greening of continents', 'biological', 85);

-- First vertebrates on land (365 million years ago)
INSERT INTO events (timeline_seconds, precision_level, title, description, category, importance_score)
VALUES
(423942960000000000, 'million_years', 'Vertebrates Move to Land', 'Tetrapods evolve from lobe-finned fish, colonizing land', 'biological', 85);

-- First dinosaurs (230 million years ago)
INSERT INTO events (timeline_seconds, precision_level, title, description, category, importance_score)
VALUES
(428198352000000000, 'million_years', 'First Dinosaurs', 'Dinosaurs evolve during the Triassic period', 'biological', 80);

-- Dinosaur extinction (66 million years ago)
INSERT INTO events (timeline_seconds, precision_level, title, description, category, importance_score)
VALUES
(433373798400000000, 'million_years', 'Dinosaur Extinction', 'Asteroid impact causes mass extinction, ending the age of dinosaurs', 'biological', 90);

-- ============================================================================
-- MAMMALS AND HUMANS
-- ============================================================================

-- First primates (55 million years ago)
INSERT INTO events (timeline_seconds, precision_level, title, description, category, importance_score)
VALUES
(433720668000000000, 'million_years', 'First Primates', 'Early primates evolve in tropical forests', 'biological', 75);

-- First hominins (7 million years ago)
INSERT INTO events (timeline_seconds, precision_level, title, description, category, importance_score)
VALUES
(434234908800000000, 'thousand_years', 'First Hominins', 'Human lineage splits from chimpanzees', 'biological', 90);

-- Homo sapiens (300,000 years ago)
INSERT INTO events (timeline_seconds, precision_level, title, description, category, importance_score)
VALUES
(435446532800000000, 'thousand_years', 'Homo Sapiens Emerge', 'Anatomically modern humans evolve in Africa', 'biological', 100);

-- ============================================================================
-- HUMAN HISTORY
-- ============================================================================

-- Agricultural Revolution (10,000 BCE)
INSERT INTO events (timeline_seconds, precision_level, title, description, category, importance_score)
VALUES
(435455621836800000, 'year', 'Agricultural Revolution', 'Humans begin domesticating plants and animals, enabling settled civilization', 'historical', 95);

-- First cities - Uruk (4000 BCE)
INSERT INTO events (timeline_seconds, precision_level, title, description, category, importance_score)
VALUES
(435455810963200000, 'year', 'First Cities', 'Uruk and other Sumerian cities mark the beginning of urban civilization', 'historical', 90);

-- Invention of writing (3200 BCE)
INSERT INTO events (timeline_seconds, precision_level, title, description, category, importance_score)
VALUES
(435455836204800000, 'year', 'Invention of Writing', 'Cuneiform writing system developed in Mesopotamia', 'historical', 95);

-- ============================================================================
-- MODERN ERA
-- ============================================================================

-- Scientific Revolution (1543 CE)
INSERT INTO events (timeline_seconds, precision_level, title, description, category, importance_score)
VALUES
(435455999551030400, 'year', 'Scientific Revolution Begins', 'Copernicus publishes heliocentric model, marking the start of modern science', 'historical', 90);

-- Industrial Revolution (1760 CE)
INSERT INTO events (timeline_seconds, precision_level, title, description, category, importance_score)
VALUES
(435456000013401600, 'year', 'Industrial Revolution', 'Beginning of mechanization and industrial manufacturing in Britain', 'historical', 90);

-- First powered flight (1903)
INSERT INTO events (timeline_seconds, precision_level, title, description, category, importance_score)
VALUES
(435456000018077952, 'day', 'First Powered Flight', 'Wright Brothers achieve first controlled, powered airplane flight', 'technological', 85);

-- Moon landing (July 20, 1969)
INSERT INTO events (timeline_seconds, precision_level, title, description, category, importance_score)
VALUES
(435456000020164224, 'second', 'First Moon Landing', 'Apollo 11: Neil Armstrong and Buzz Aldrin become first humans on the Moon', 'technological', 95);

-- World Wide Web (1991)
INSERT INTO events (timeline_seconds, precision_level, title, description, category, importance_score)
VALUES
(435456000020857920, 'day', 'World Wide Web Launched', 'Tim Berners-Lee releases the World Wide Web to the public', 'technological', 90);

-- Current moment (approximately now - adjust as needed)
-- This is roughly November 2024
INSERT INTO events (timeline_seconds, precision_level, title, description, category, importance_score)
VALUES
(435456001731024000, 'second', 'Present Day', 'The current moment in timeline', 'contemporary', 50);

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- This seed file creates ~35 key events spanning from the Big Bang to present
-- Events are distributed across:
-- - Cosmic events (early universe, galaxy formation)
-- - Solar system formation
-- - Geological events (Earth formation)
-- - Biological evolution (first life → humans)
-- - Human history (agriculture → modern technology)
