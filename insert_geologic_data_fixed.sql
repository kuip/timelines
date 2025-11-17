-- Insert geologic events and relationships
-- Geologic time scale data

BEGIN;

-- Helper: Convert years ago to unix seconds
-- unix_seconds = -(years_ago * 365.25 * 24 * 3600)
-- timeline_seconds is same for our purposes

INSERT INTO events (id, title, description, timeline_seconds, unix_seconds, precision_level, image_url) VALUES
-- Hadean Eon (4.6-4.0 Ga)
('hadean-eon-start', 'Beginning of Hadean Eon', 'Formation of Earth marked the beginning of the Hadean Eon, characterized by extreme heat, frequent asteroid impacts, and the gradual formation of Earth''s first crust from molten rock.', -145136160000, -145136160000, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Artist%E2%80%99s_impression_of_the_Earth_during_the_Late_Heavy_Bombardment_%28around_3.9_billion_years_ago%29.jpg/800px-Artist%E2%80%99s_impression_of_the_Earth_during_the_Late_Heavy_Bombardment_%28around_3.9_billion_years_ago%29.jpg'),

('hadean-eon-end', 'End of Hadean Eon', 'The Hadean Eon ended as Earth''s crust stabilized and the Late Heavy Bombardment concluded, transitioning into the Archean Eon when the first solid rocks and possible early life emerged.', -126230400000, -126230400000, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Artist%E2%80%99s_impression_of_the_Earth_during_the_Late_Heavy_Bombardment_%28around_3.9_billion_years_ago%29.jpg/800px-Artist%E2%80%99s_impression_of_the_Earth_during_the_Late_Heavy_Bombardment_%28around_3.9_billion_years_ago%29.jpg'),

-- Archean Eon (4.0-2.5 Ga)
('archean-eon-start', 'Beginning of Archean Eon', 'The Archean Eon began with Earth''s crust stabilizing and oceans forming. First stromatolites appeared, oxygen-producing cyanobacteria evolved, and the earliest continents started to form from volcanic activity.', -126230400000, -126230400000, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Stromatolites_in_Sharkbay.jpg/800px-Stromatolites_in_Sharkbay.jpg'),

('archean-eon-end', 'End of Archean Eon', 'The Archean Eon concluded as oxygen levels rose significantly from photosynthetic organisms, continental masses grew larger, and Earth''s atmosphere underwent the Great Oxidation Event preparation.', -78894000000, -78894000000, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Stromatolites_in_Sharkbay.jpg/800px-Stromatolites_in_Sharkbay.jpg'),

-- Proterozoic Eon (2.5 Ga - 541 Ma)
('proterozoic-eon-start', 'Beginning of Proterozoic Eon', 'The Proterozoic Eon began with the Great Oxidation Event transforming Earth''s atmosphere. Eukaryotic cells evolved, continents formed stable cratons, and the first supercontinent Columbia assembled.', -78894000000, -78894000000, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Ozone-oxygen_cycle.svg/800px-Ozone-oxygen_cycle.svg.png'),

('proterozoic-eon-end', 'End of Proterozoic Eon', 'The Proterozoic Eon ended after the Ediacaran Period when complex multicellular life proliferated and the Cambrian explosion was imminent, marking the transition to the Phanerozoic Eon.', -17073456000, -17073456000, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Dickinsonia_costata_2.jpg/800px-Dickinsonia_costata_2.jpg'),

-- Phanerozoic Eon / Paleozoic Era (541 Ma - present)
('phanerozoic-eon-start', 'Beginning of Phanerozoic Eon', 'The Phanerozoic Eon began with the Cambrian explosion, a rapid diversification of multicellular life forms including the first animals with hard shells, complex eyes, and diverse body plans.', -17073456000, -17073456000, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Trilobite_Asaphus_kowalewskii.jpg/800px-Trilobite_Asaphus_kowalewskii.jpg'),

('paleozoic-era-start', 'Beginning of Paleozoic Era', 'The Paleozoic Era started with the Cambrian Period''s explosion of life, witnessing the evolution of fish, amphibians, insects, land plants, and the formation of the supercontinent Pangaea.', -17073456000, -17073456000, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Trilobite_Asaphus_kowalewskii.jpg/800px-Trilobite_Asaphus_kowalewskii.jpg'),

-- Cambrian Period (541-485.4 Ma)
('cambrian-period-start', 'Beginning of Cambrian Period', 'The Cambrian Period began with an explosive diversification of life known as the Cambrian explosion. Trilobites, brachiopods, and the first vertebrates appeared in warm shallow seas.', -17073456000, -17073456000, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Trilobite_Asaphus_kowalewskii.jpg/800px-Trilobite_Asaphus_kowalewskii.jpg'),

('cambrian-period-end', 'End of Cambrian Period', 'The Cambrian Period ended with extinctions of many trilobite families and archaeocyathids, transitioning to the Ordovician Period as marine life continued diversifying and continents drifted.', -15321494400, -15321494400, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Trilobite_Asaphus_kowalewskii.jpg/800px-Trilobite_Asaphus_kowalewskii.jpg'),

-- Ordovician Period (485.4-443.8 Ma)
('ordovician-period-start', 'Beginning of Ordovician Period', 'The Ordovician Period began with diversification of marine invertebrates, the first coral reefs, nautiloids dominating as predators, and the colonization of land by early plants and arthropods.', -15321494400, -15321494400, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Orthoceras_fossil.jpg/800px-Orthoceras_fossil.jpg'),

('ordovician-period-end', 'End of Ordovician Period', 'The Ordovician Period ended with the Ordovician-Silurian extinction events, caused by glaciation and sea level changes, eliminating about 85% of marine species including many brachiopods and trilobites.', -14008742400, -14008742400, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Orthoceras_fossil.jpg/800px-Orthoceras_fossil.jpg'),

-- Silurian Period (443.8-419.2 Ma)
('silurian-period-start', 'Beginning of Silurian Period', 'The Silurian Period began after the ice age with recovering marine ecosystems. Vascular plants colonized land, jawed fish evolved, and the first millipedes and arachnids appeared on land.', -14008742400, -14008742400, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Cooksonia_pertoni.png/800px-Cooksonia_pertoni.png'),

('silurian-period-end', 'End of Silurian Period', 'The Silurian Period concluded with minor extinction events and climate changes, transitioning to the Devonian as land plants developed more complex root systems and fish continued evolving.', -13234195200, -13234195200, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Cooksonia_pertoni.png/800px-Cooksonia_pertoni.png'),

-- Devonian Period (419.2-358.9 Ma)
('devonian-period-start', 'Beginning of Devonian Period', 'The Devonian Period, known as the Age of Fishes, saw armored fish, sharks, and lobe-finned fish proliferate. First forests appeared, insects diversified, and tetrapods began land colonization.', -13234195200, -13234195200, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Dunkleosteus_interm2DB.jpg/800px-Dunkleosteus_interm2DB.jpg'),

('devonian-period-end', 'End of Devonian Period', 'The Devonian Period ended with the Late Devonian extinction, eliminating many marine species especially reef-building organisms, caused by anoxic ocean conditions and climate fluctuations.', -11331086400, -11331086400, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Dunkleosteus_interm2DB.jpg/800px-Dunkleosteus_interm2DB.jpg'),

-- Carboniferous Period (358.9-298.9 Ma)
('carboniferous-period-start', 'Beginning of Carboniferous Period', 'The Carboniferous Period began with vast swamp forests producing coal deposits. Giant insects evolved in oxygen-rich atmosphere, amphibians dominated wetlands, and first reptiles appeared.', -11331086400, -11331086400, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Meganeura_monyi_au_Museum_de_Toulouse.jpg/800px-Meganeura_monyi_au_Museum_de_Toulouse.jpg'),

('carboniferous-period-end', 'End of Carboniferous Period', 'The Carboniferous Period ended as climate became drier, rainforests collapsed, and Pangaea''s assembly completed. Reptiles adapted to drier conditions, replacing amphibians as dominant land vertebrates.', -9435950400, -9435950400, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Meganeura_monyi_au_Museum_de_Toulouse.jpg/800px-Meganeura_monyi_au_Museum_de_Toulouse.jpg'),

-- Permian Period (298.9-251.902 Ma)
('permian-period-start', 'Beginning of Permian Period', 'The Permian Period began with Pangaea fully formed and arid climates expanding. Synapsids (mammal ancestors) dominated, therapsids evolved, and conifers spread across dry landscapes.', -9435950400, -9435950400, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Dimetrodon_grandis.jpg/800px-Dimetrodon_grandis.jpg'),

('permian-period-end', 'End of Permian Period', 'The Permian Period ended with Earth''s largest mass extinction, the Great Dying, eliminating 96% of marine species and 70% of land vertebrates from massive volcanism and climate catastrophe.', -7951999968, -7951999968, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Extinction_intensity.svg/800px-Extinction_intensity.svg.png'),

('paleozoic-era-end', 'End of Paleozoic Era', 'The Paleozoic Era concluded with the catastrophic Permian-Triassic extinction, clearing ecological niches for dinosaurs and mammals to evolve during the following Mesozoic Era.', -7951999968, -7951999968, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Extinction_intensity.svg/800px-Extinction_intensity.svg.png'),

-- Mesozoic Era (251.902-66 Ma)
('mesozoic-era-start', 'Beginning of Mesozoic Era', 'The Mesozoic Era, Age of Reptiles, began after the Great Dying with Earth''s ecosystems recovering. Dinosaurs would evolve and dominate, flowering plants appeared, and mammals remained small.', -7951999968, -7951999968, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Tyrannosaurus_rex_mmartyniuk.png/800px-Tyrannosaurus_rex_mmartyniuk.png'),

-- Triassic Period (251.902-201.3 Ma)
('triassic-period-start', 'Beginning of Triassic Period', 'The Triassic Period began with sparse ecosystems recovering from extinction. First dinosaurs, pterosaurs, and marine reptiles evolved as Pangaea remained intact under hot dry climates.', -7951999968, -7951999968, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Coelophysis_bauri_QM.jpg/800px-Coelophysis_bauri_QM.jpg'),

('triassic-period-end', 'End of Triassic Period', 'The Triassic Period ended with another major extinction event eliminating many archosaur groups and allowing dinosaurs to become dominant in the Jurassic, likely caused by volcanic activity.', -6355027200, -6355027200, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Coelophysis_bauri_QM.jpg/800px-Coelophysis_bauri_QM.jpg'),

-- Jurassic Period (201.3-145 Ma)
('jurassic-period-start', 'Beginning of Jurassic Period', 'The Jurassic Period began with dinosaurs dominating terrestrial ecosystems. Sauropods reached enormous sizes, pterosaurs ruled skies, and first birds evolved from theropod dinosaurs.', -6355027200, -6355027200, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Archaeopteryx_lithographica_%28Berlin_specimen%29.jpg/800px-Archaeopteryx_lithographica_%28Berlin_specimen%29.jpg'),

('jurassic-period-end', 'End of Jurassic Period', 'The Jurassic Period concluded with minor extinctions as Pangaea continued fragmenting. Flowering plants began appearing, and ecological niches diversified entering the Cretaceous Period.', -4577280000, -4577280000, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Archaeopteryx_lithographica_%28Berlin_specimen%29.jpg/800px-Archaeopteryx_lithographica_%28Berlin_specimen%29.jpg'),

-- Cretaceous Period (145-66 Ma)
('cretaceous-period-start', 'Beginning of Cretaceous Period', 'The Cretaceous Period began with dinosaurs at peak diversity. Flowering plants revolutionized ecosystems, Tyrannosaurus and Triceratops evolved, and seas teemed with mosasaurs and ammonites.', -4577280000, -4577280000, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Tyrannosaurus_rex_mmartyniuk.png/800px-Tyrannosaurus_rex_mmartyniuk.png'),

('cretaceous-period-end', 'End of Cretaceous Period', 'The Cretaceous Period ended catastrophically when a massive asteroid struck Chicxulub, Mexico, causing global wildfires, tsunamis, and climate change that killed all non-avian dinosaurs.', -2083104000, -2083104000, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Chicxulub_crater_-_Yucatan%2C_Mexico.jpg/800px-Chicxulub_crater_-_Yucatan%2C_Mexico.jpg'),

('mesozoic-era-end', 'End of Mesozoic Era', 'The Mesozoic Era ended with the Chicxulub asteroid impact, terminating the age of dinosaurs and opening ecological opportunities for mammals to diversify and eventually dominate.', -2083104000, -2083104000, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Chicxulub_crater_-_Yucatan%2C_Mexico.jpg/800px-Chicxulub_crater_-_Yucatan%2C_Mexico.jpg'),

-- Cenozoic Era (66 Ma - present)
('cenozoic-era-start', 'Beginning of Cenozoic Era', 'The Cenozoic Era, Age of Mammals, began after dinosaurs'' extinction. Mammals rapidly diversified into numerous forms, birds flourished, and flowering plants dominated terrestrial vegetation.', -2083104000, -2083104000, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Smilodon_californicus_saber-toothed_cat_%28Upper_Pleistocene%3B_Rancho_La_Brea_asphalt_seeps%2C_California%2C_USA%29_1_%2849292495307%29.jpg/800px-Smilodon_californicus_saber-toothed_cat_%28Upper_Pleistocene%3B_Rancho_La_Brea_asphalt_seeps%2C_California%2C_USA%29_1_%2849292495307%29.jpg'),

-- Paleogene Period (66-23.03 Ma)
('paleogene-period-start', 'Beginning of Paleogene Period', 'The Paleogene Period began with mammals filling ecological niches left by dinosaurs. Primates, whales, and modern bird groups evolved during this time of recovery and diversification.', -2083104000, -2083104000, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Basilosaurus_skeleton.jpg/800px-Basilosaurus_skeleton.jpg'),

('paleocene-epoch-start', 'Beginning of Paleocene Epoch', 'The Paleocene Epoch began immediately after the asteroid impact with sparse ecosystems. Small mammals diversified rapidly, early primates appeared, and forests recovered from devastation.', -2083104000, -2083104000, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Plesiadapis_tricuspidens.jpg/800px-Plesiadapis_tricuspidens.jpg'),

('paleocene-epoch-end', 'End of Paleocene Epoch', 'The Paleocene Epoch ended with the Paleocene-Eocene Thermal Maximum, a rapid global warming event that dramatically altered ecosystems and led to further mammalian diversification.', -1767744000, -1767744000, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Plesiadapis_tricuspidens.jpg/800px-Plesiadapis_tricuspidens.jpg'),

('eocene-epoch-start', 'Beginning of Eocene Epoch', 'The Eocene Epoch began during peak global warmth with tropical forests near poles. Modern mammal orders emerged including horses, bats, whales transitioning to ocean life.', -1767744000, -1767744000, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Basilosaurus_skeleton.jpg/800px-Basilosaurus_skeleton.jpg'),

('eocene-epoch-end', 'End of Eocene Epoch', 'The Eocene Epoch ended with global cooling and the Grande Coupure extinction in Europe. Ice sheets formed in Antarctica, and tropical forests retreated toward the equator.', -1070697600, -1070697600, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Basilosaurus_skeleton.jpg/800px-Basilosaurus_skeleton.jpg'),

('oligocene-epoch-start', 'Beginning of Oligocene Epoch', 'The Oligocene Epoch began with cooler climates and grasslands spreading. Large mammals evolved, including early elephants, rhinoceroses, and cats, while Antarctica became fully glaciated.', -1070697600, -1070697600, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Indricotherium11.jpg/800px-Indricotherium11.jpg'),

('oligocene-epoch-end', 'End of Oligocene Epoch', 'The Oligocene Epoch concluded with continued cooling and drying trends. Grasslands expanded further, setting the stage for the evolution of grazing mammals in the Miocene.', -727146720, -727146720, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Indricotherium11.jpg/800px-Indricotherium11.jpg'),

('paleogene-period-end', 'End of Paleogene Period', 'The Paleogene Period ended transitioning to the Neogene as grasslands continued expanding, climate continued cooling, and mammals adapted to new open-environment ecological niches.', -727146720, -727146720, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Indricotherium11.jpg/800px-Indricotherium11.jpg'),

-- Neogene Period (23.03-2.58 Ma)
('neogene-period-start', 'Beginning of Neogene Period', 'The Neogene Period began with grasslands dominating and grazing mammals flourishing. Great apes evolved in Africa, kelp forests appeared, and modern marine ecosystems developed.', -727146720, -727146720, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Australopithecus_afarensis.jpg/800px-Australopithecus_afarensis.jpg'),

('miocene-epoch-start', 'Beginning of Miocene Epoch', 'The Miocene Epoch began with moderate climates and grassland expansion supporting diverse grazing herds. Apes diversified in Africa and Eurasia, and great white sharks appeared.', -727146720, -727146720, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Australopithecus_afarensis.jpg/800px-Australopithecus_afarensis.jpg'),

('miocene-epoch-end', 'End of Miocene Epoch', 'The Miocene Epoch ended with climate cooling and drying. Early hominids emerged in Africa as forests fragmented, and the Mediterranean Sea briefly dried up completely.', -168310752, -168310752, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Australopithecus_afarensis.jpg/800px-Australopithecus_afarensis.jpg'),

('pliocene-epoch-start', 'Beginning of Pliocene Epoch', 'The Pliocene Epoch began with continued cooling leading to ice age cycles. Australopithecus and early Homo species evolved in Africa, and the Isthmus of Panama formed.', -168310752, -168310752, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Australopithecus_afarensis.jpg/800px-Australopithecus_afarensis.jpg'),

('pliocene-epoch-end', 'End of Pliocene Epoch', 'The Pliocene Epoch ended as ice ages intensified with glacial cycles establishing. Homo habilis evolved, and many large mammal species migrated between continents via land bridges.', -81423072, -81423072, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Australopithecus_afarensis.jpg/800px-Australopithecus_afarensis.jpg'),

('neogene-period-end', 'End of Neogene Period', 'The Neogene Period ended transitioning into the Quaternary Period characterized by recurring ice ages, human evolution accelerating, and megafauna dominating most continents.', -81423072, -81423072, 'million_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Australopithecus_afarensis.jpg/800px-Australopithecus_afarensis.jpg'),

-- Quaternary Period (2.58 Ma - present)
('quaternary-period-start', 'Beginning of Quaternary Period', 'The Quaternary Period began with glacial-interglacial cycles dominating. Homo erectus spread worldwide, megafauna thrived, and human ancestors developed stone tools and controlled fire.', -81423072, -81423072, 'thousand_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Smilodon_californicus_saber-toothed_cat_%28Upper_Pleistocene%3B_Rancho_La_Brea_asphalt_seeps%2C_California%2C_USA%29_1_%2849292495307%29.jpg/800px-Smilodon_californicus_saber-toothed_cat_%28Upper_Pleistocene%3B_Rancho_La_Brea_asphalt_seeps%2C_California%2C_USA%29_1_%2849292495307%29.jpg'),

('pleistocene-epoch-start', 'Beginning of Pleistocene Epoch', 'The Pleistocene Epoch, the Ice Age, began with multiple glacial periods. Mammoths, saber-toothed cats roamed, and Homo sapiens evolved from earlier hominids in Africa.', -81423072, -81423072, 'thousand_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Smilodon_californicus_saber-toothed_cat_%28Upper_Pleistocene%3B_Rancho_La_Brea_asphalt_seeps%2C_California%2C_USA%29_1_%2849292495307%29.jpg/800px-Smilodon_californicus_saber-toothed_cat_%28Upper_Pleistocene%3B_Rancho_La_Brea_asphalt_seeps%2C_California%2C_USA%29_1_%2849292495307%29.jpg'),

('pleistocene-epoch-end', 'End of Pleistocene Epoch', 'The Pleistocene Epoch ended as the last ice age concluded around 11,700 years ago. Most megafauna went extinct, and humans transitioned from hunter-gatherers to agriculture.', -369144000, -369144000, 'thousand_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Smilodon_californicus_saber-toothed_cat_%28Upper_Pleistocene%3B_Rancho_La_Brea_asphalt_seeps%2C_California%2C_USA%29_1_%2849292495307%29.jpg/800px-Smilodon_californicus_saber-toothed_cat_%28Upper_Pleistocene%3B_Rancho_La_Brea_asphalt_seeps%2C_California%2C_USA%29_1_%2849292495307%29.jpg'),

('holocene-epoch-start', 'Beginning of Holocene Epoch', 'The Holocene Epoch began as glaciers retreated and Earth warmed. Humans developed agriculture, built cities, invented writing, and fundamentally transformed the planet''s ecosystems.', -369144000, -369144000, 'thousand_years', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Skara_Brae_12.jpg/800px-Skara_Brae_12.jpg')
ON CONFLICT (id) DO NOTHING;

-- Insert category assignments
INSERT INTO event_categories (event_id, category_id, is_primary) VALUES
('hadean-eon-start', 'geological_eras', true),
('hadean-eon-end', 'geological_eras', true),
('archean-eon-start', 'geological_eras', true),
('archean-eon-end', 'geological_eras', true),
('proterozoic-eon-start', 'geological_eras', true),
('proterozoic-eon-end', 'geological_eras', true),
('phanerozoic-eon-start', 'geological_eras', true),
('paleozoic-era-start', 'geological_eras', true),
('cambrian-period-start', 'geological_eras', true),
('cambrian-period-end', 'geological_eras', true),
('ordovician-period-start', 'geological_eras', true),
('ordovician-period-end', 'geological_eras', true),
('silurian-period-start', 'geological_eras', true),
('silurian-period-end', 'geological_eras', true),
('devonian-period-start', 'geological_eras', true),
('devonian-period-end', 'geological_eras', true),
('carboniferous-period-start', 'geological_eras', true),
('carboniferous-period-end', 'geological_eras', true),
('permian-period-start', 'geological_eras', true),
('permian-period-end', 'geological_eras', true),
('paleozoic-era-end', 'geological_eras', true),
('mesozoic-era-start', 'geological_eras', true),
('triassic-period-start', 'geological_eras', true),
('triassic-period-end', 'geological_eras', true),
('jurassic-period-start', 'geological_eras', true),
('jurassic-period-end', 'geological_eras', true),
('cretaceous-period-start', 'geological_eras', true),
('cretaceous-period-end', 'geological_eras', true),
('mesozoic-era-end', 'geological_eras', true),
('cenozoic-era-start', 'geological_eras', true),
('paleogene-period-start', 'geological_eras', true),
('paleocene-epoch-start', 'geological_eras', true),
('paleocene-epoch-end', 'geological_eras', true),
('eocene-epoch-start', 'geological_eras', true),
('eocene-epoch-end', 'geological_eras', true),
('oligocene-epoch-start', 'geological_eras', true),
('oligocene-epoch-end', 'geological_eras', true),
('paleogene-period-end', 'geological_eras', true),
('neogene-period-start', 'geological_eras', true),
('miocene-epoch-start', 'geological_eras', true),
('miocene-epoch-end', 'geological_eras', true),
('pliocene-epoch-start', 'geological_eras', true),
('pliocene-epoch-end', 'geological_eras', true),
('neogene-period-end', 'geological_eras', true),
('quaternary-period-start', 'geological_eras', true),
('pleistocene-epoch-start', 'geological_eras', true),
('pleistocene-epoch-end', 'geological_eras', true),
('holocene-epoch-start', 'geological_eras', true)
ON CONFLICT DO NOTHING;

-- Insert sources
INSERT INTO event_sources (event_id, source_type, url) VALUES
('hadean-eon-start', 'wikipedia', 'https://en.wikipedia.org/wiki/Hadean'),
('hadean-eon-start', 'other', 'https://www.britannica.com/science/Hadean-Eon'),
('hadean-eon-end', 'wikipedia', 'https://en.wikipedia.org/wiki/Hadean'),
('archean-eon-start', 'wikipedia', 'https://en.wikipedia.org/wiki/Archean'),
('archean-eon-start', 'other', 'https://www.britannica.com/science/Archean-Eon'),
('archean-eon-end', 'wikipedia', 'https://en.wikipedia.org/wiki/Archean'),
('proterozoic-eon-start', 'wikipedia', 'https://en.wikipedia.org/wiki/Proterozoic'),
('proterozoic-eon-start', 'other', 'https://www.britannica.com/science/Proterozoic-Eon'),
('proterozoic-eon-end', 'wikipedia', 'https://en.wikipedia.org/wiki/Proterozoic'),
('proterozoic-eon-end', 'wikipedia', 'https://en.wikipedia.org/wiki/Ediacaran'),
('phanerozoic-eon-start', 'wikipedia', 'https://en.wikipedia.org/wiki/Phanerozoic'),
('phanerozoic-eon-start', 'other', 'https://www.britannica.com/science/Phanerozoic-Eon'),
('paleozoic-era-start', 'wikipedia', 'https://en.wikipedia.org/wiki/Paleozoic'),
('paleozoic-era-start', 'other', 'https://www.britannica.com/science/Paleozoic-Era'),
('cambrian-period-start', 'wikipedia', 'https://en.wikipedia.org/wiki/Cambrian'),
('cambrian-period-start', 'other', 'https://www.britannica.com/science/Cambrian-Period'),
('cambrian-period-end', 'wikipedia', 'https://en.wikipedia.org/wiki/Cambrian'),
('ordovician-period-start', 'wikipedia', 'https://en.wikipedia.org/wiki/Ordovician'),
('ordovician-period-start', 'other', 'https://www.britannica.com/science/Ordovician-Period'),
('ordovician-period-end', 'wikipedia', 'https://en.wikipedia.org/wiki/Ordovician'),
('ordovician-period-end', 'wikipedia', 'https://en.wikipedia.org/wiki/Ordovician%E2%80%93Silurian_extinction_events'),
('silurian-period-start', 'wikipedia', 'https://en.wikipedia.org/wiki/Silurian'),
('silurian-period-start', 'other', 'https://www.britannica.com/science/Silurian-Period'),
('silurian-period-end', 'wikipedia', 'https://en.wikipedia.org/wiki/Silurian'),
('devonian-period-start', 'wikipedia', 'https://en.wikipedia.org/wiki/Devonian'),
('devonian-period-start', 'other', 'https://www.britannica.com/science/Devonian-Period'),
('devonian-period-end', 'wikipedia', 'https://en.wikipedia.org/wiki/Devonian'),
('devonian-period-end', 'wikipedia', 'https://en.wikipedia.org/wiki/Late_Devonian_extinction'),
('carboniferous-period-start', 'wikipedia', 'https://en.wikipedia.org/wiki/Carboniferous'),
('carboniferous-period-start', 'other', 'https://www.britannica.com/science/Carboniferous-Period'),
('carboniferous-period-end', 'wikipedia', 'https://en.wikipedia.org/wiki/Carboniferous'),
('permian-period-start', 'wikipedia', 'https://en.wikipedia.org/wiki/Permian'),
('permian-period-start', 'other', 'https://www.britannica.com/science/Permian-Period'),
('permian-period-end', 'wikipedia', 'https://en.wikipedia.org/wiki/Permian'),
('permian-period-end', 'wikipedia', 'https://en.wikipedia.org/wiki/Permian%E2%80%93Triassic_extinction_event'),
('paleozoic-era-end', 'wikipedia', 'https://en.wikipedia.org/wiki/Paleozoic'),
('mesozoic-era-start', 'wikipedia', 'https://en.wikipedia.org/wiki/Mesozoic'),
('mesozoic-era-start', 'other', 'https://www.britannica.com/science/Mesozoic-Era'),
('triassic-period-start', 'wikipedia', 'https://en.wikipedia.org/wiki/Triassic'),
('triassic-period-start', 'other', 'https://www.britannica.com/science/Triassic-Period'),
('triassic-period-end', 'wikipedia', 'https://en.wikipedia.org/wiki/Triassic'),
('triassic-period-end', 'wikipedia', 'https://en.wikipedia.org/wiki/Triassic%E2%80%93Jurassic_extinction_event'),
('jurassic-period-start', 'wikipedia', 'https://en.wikipedia.org/wiki/Jurassic'),
('jurassic-period-start', 'other', 'https://www.britannica.com/science/Jurassic-Period'),
('jurassic-period-end', 'wikipedia', 'https://en.wikipedia.org/wiki/Jurassic'),
('cretaceous-period-start', 'wikipedia', 'https://en.wikipedia.org/wiki/Cretaceous'),
('cretaceous-period-start', 'other', 'https://www.britannica.com/science/Cretaceous-Period'),
('cretaceous-period-end', 'wikipedia', 'https://en.wikipedia.org/wiki/Cretaceous'),
('cretaceous-period-end', 'wikipedia', 'https://en.wikipedia.org/wiki/Cretaceous%E2%80%93Paleogene_extinction_event'),
('mesozoic-era-end', 'wikipedia', 'https://en.wikipedia.org/wiki/Mesozoic'),
('cenozoic-era-start', 'wikipedia', 'https://en.wikipedia.org/wiki/Cenozoic'),
('cenozoic-era-start', 'other', 'https://www.britannica.com/science/Cenozoic-Era'),
('paleogene-period-start', 'wikipedia', 'https://en.wikipedia.org/wiki/Paleogene'),
('paleogene-period-start', 'other', 'https://www.britannica.com/science/Paleogene-Period'),
('paleocene-epoch-start', 'wikipedia', 'https://en.wikipedia.org/wiki/Paleocene'),
('paleocene-epoch-start', 'other', 'https://www.britannica.com/science/Paleocene-Epoch'),
('paleocene-epoch-end', 'wikipedia', 'https://en.wikipedia.org/wiki/Paleocene'),
('eocene-epoch-start', 'wikipedia', 'https://en.wikipedia.org/wiki/Eocene'),
('eocene-epoch-start', 'other', 'https://www.britannica.com/science/Eocene-Epoch'),
('eocene-epoch-end', 'wikipedia', 'https://en.wikipedia.org/wiki/Eocene'),
('oligocene-epoch-start', 'wikipedia', 'https://en.wikipedia.org/wiki/Oligocene'),
('oligocene-epoch-start', 'other', 'https://www.britannica.com/science/Oligocene-Epoch'),
('oligocene-epoch-end', 'wikipedia', 'https://en.wikipedia.org/wiki/Oligocene'),
('paleogene-period-end', 'wikipedia', 'https://en.wikipedia.org/wiki/Paleogene'),
('neogene-period-start', 'wikipedia', 'https://en.wikipedia.org/wiki/Neogene'),
('neogene-period-start', 'other', 'https://www.britannica.com/science/Neogene-Period'),
('miocene-epoch-start', 'wikipedia', 'https://en.wikipedia.org/wiki/Miocene'),
('miocene-epoch-start', 'other', 'https://www.britannica.com/science/Miocene-Epoch'),
('miocene-epoch-end', 'wikipedia', 'https://en.wikipedia.org/wiki/Miocene'),
('pliocene-epoch-start', 'wikipedia', 'https://en.wikipedia.org/wiki/Pliocene'),
('pliocene-epoch-start', 'other', 'https://www.britannica.com/science/Pliocene-Epoch'),
('pliocene-epoch-end', 'wikipedia', 'https://en.wikipedia.org/wiki/Pliocene'),
('neogene-period-end', 'wikipedia', 'https://en.wikipedia.org/wiki/Neogene'),
('quaternary-period-start', 'wikipedia', 'https://en.wikipedia.org/wiki/Quaternary'),
('quaternary-period-start', 'other', 'https://www.britannica.com/science/Quaternary'),
('pleistocene-epoch-start', 'wikipedia', 'https://en.wikipedia.org/wiki/Pleistocene'),
('pleistocene-epoch-start', 'other', 'https://www.britannica.com/science/Pleistocene-Epoch'),
('pleistocene-epoch-end', 'wikipedia', 'https://en.wikipedia.org/wiki/Pleistocene'),
('holocene-epoch-start', 'wikipedia', 'https://en.wikipedia.org/wiki/Holocene'),
('holocene-epoch-start', 'other', 'https://www.britannica.com/science/Holocene-Epoch')
ON CONFLICT DO NOTHING;

-- Insert locations for events with specific geographic points
INSERT INTO event_locations (event_id, location_name, location_type, location_point, is_primary) VALUES
('proterozoic-eon-end', 'Ediacara Hills, Australia', 'discovery_site', ST_SetSRID(ST_MakePoint(138.6, -31.3), 4326), true),
('permian-period-end', 'Siberian Traps, Russia', 'extinction_cause', ST_SetSRID(ST_MakePoint(100, 60), 4326), true),
('cretaceous-period-end', 'Chicxulub Crater, Mexico', 'impact_site', ST_SetSRID(ST_MakePoint(-89.5, 21.3), 4326), true),
('mesozoic-era-end', 'Chicxulub Crater, Mexico', 'impact_site', ST_SetSRID(ST_MakePoint(-89.5, 21.3), 4326), true)
ON CONFLICT DO NOTHING;

-- Insert relationships
INSERT INTO event_relationships (event_id_a, event_id_b, relationship_type, weight) VALUES
('hadean-eon-start', 'hadean-eon-end', 'span', 100),
('hadean-eon-end', 'archean-eon-start', 'precedes', 100),
('archean-eon-start', 'archean-eon-end', 'span', 100),
('archean-eon-end', 'proterozoic-eon-start', 'precedes', 100),
('proterozoic-eon-start', 'proterozoic-eon-end', 'span', 100),
('proterozoic-eon-end', 'phanerozoic-eon-start', 'precedes', 100),
('phanerozoic-eon-start', 'paleozoic-era-start', 'contains', 100),
('paleozoic-era-start', 'paleozoic-era-end', 'span', 100),
('paleozoic-era-start', 'cambrian-period-start', 'contains', 100),
('cambrian-period-start', 'cambrian-period-end', 'span', 100),
('cambrian-period-end', 'ordovician-period-start', 'precedes', 100),
('ordovician-period-start', 'ordovician-period-end', 'span', 100),
('ordovician-period-end', 'silurian-period-start', 'precedes', 100),
('silurian-period-start', 'silurian-period-end', 'span', 100),
('silurian-period-end', 'devonian-period-start', 'precedes', 100),
('devonian-period-start', 'devonian-period-end', 'span', 100),
('devonian-period-end', 'carboniferous-period-start', 'precedes', 100),
('carboniferous-period-start', 'carboniferous-period-end', 'span', 100),
('carboniferous-period-end', 'permian-period-start', 'precedes', 100),
('permian-period-start', 'permian-period-end', 'span', 100),
('permian-period-end', 'paleozoic-era-end', 'causes', 100),
('paleozoic-era-end', 'mesozoic-era-start', 'precedes', 100),
('mesozoic-era-start', 'mesozoic-era-end', 'span', 100),
('mesozoic-era-start', 'triassic-period-start', 'contains', 100),
('triassic-period-start', 'triassic-period-end', 'span', 100),
('triassic-period-end', 'jurassic-period-start', 'precedes', 100),
('jurassic-period-start', 'jurassic-period-end', 'span', 100),
('jurassic-period-end', 'cretaceous-period-start', 'precedes', 100),
('cretaceous-period-start', 'cretaceous-period-end', 'span', 100),
('cretaceous-period-end', 'mesozoic-era-end', 'causes', 100),
('mesozoic-era-end', 'cenozoic-era-start', 'precedes', 100),
('cenozoic-era-start', 'paleogene-period-start', 'contains', 100),
('paleogene-period-start', 'paleogene-period-end', 'span', 100),
('paleogene-period-start', 'paleocene-epoch-start', 'contains', 100),
('paleocene-epoch-start', 'paleocene-epoch-end', 'span', 100),
('paleocene-epoch-end', 'eocene-epoch-start', 'precedes', 100),
('eocene-epoch-start', 'eocene-epoch-end', 'span', 100),
('eocene-epoch-end', 'oligocene-epoch-start', 'precedes', 100),
('oligocene-epoch-start', 'oligocene-epoch-end', 'span', 100),
('oligocene-epoch-end', 'paleogene-period-end', 'causes', 100),
('paleogene-period-end', 'neogene-period-start', 'precedes', 100),
('neogene-period-start', 'neogene-period-end', 'span', 100),
('neogene-period-start', 'miocene-epoch-start', 'contains', 100),
('miocene-epoch-start', 'miocene-epoch-end', 'span', 100),
('miocene-epoch-end', 'pliocene-epoch-start', 'precedes', 100),
('pliocene-epoch-start', 'pliocene-epoch-end', 'span', 100),
('pliocene-epoch-end', 'neogene-period-end', 'causes', 100),
('neogene-period-end', 'quaternary-period-start', 'precedes', 100),
('quaternary-period-start', 'pleistocene-epoch-start', 'contains', 100),
('pleistocene-epoch-start', 'pleistocene-epoch-end', 'span', 100),
('pleistocene-epoch-end', 'holocene-epoch-start', 'precedes', 100)
ON CONFLICT DO NOTHING;

COMMIT;
