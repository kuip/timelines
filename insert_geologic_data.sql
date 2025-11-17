-- Insert geologic events and relationships
-- From geologic time scale

BEGIN;

-- Insert all events
INSERT INTO events (id, title, description, event_date, "timestamp", category_id, image_url, sources, created_at, updated_at) VALUES
('hadean-eon-start', 'Beginning of Hadean Eon', 'Formation of Earth marked the beginning of the Hadean Eon, characterized by extreme heat, frequent asteroid impacts, and the gradual formation of Earth''s first crust from molten rock.', '4600000000 years ago', '1572-05-24 04:26:40+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Artist%E2%80%99s_impression_of_the_Earth_during_the_Late_Heavy_Bombardment_%28around_3.9_billion_years_ago%29.jpg/800px-Artist%E2%80%99s_impression_of_the_Earth_during_the_Late_Heavy_Bombardment_%28around_3.9_billion_years_ago%29.jpg', ARRAY['https://en.wikipedia.org/wiki/Hadean', 'https://www.britannica.com/science/Hadean-Eon'], NOW(), NOW()),

('hadean-eon-end', 'End of Hadean Eon', 'The Hadean Eon ended as Earth''s crust stabilized and the Late Heavy Bombardment concluded, transitioning into the Archean Eon when the first solid rocks and possible early life emerged.', '4000000000 years ago', '1574-07-04 21:20:00+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Artist%E2%80%99s_impression_of_the_Earth_during_the_Late_Heavy_Bombardment_%28around_3.9_billion_years_ago%29.jpg/800px-Artist%E2%80%99s_impression_of_the_Earth_during_the_Late_Heavy_Bombardment_%28around_3.9_billion_years_ago%29.jpg', ARRAY['https://en.wikipedia.org/wiki/Hadean'], NOW(), NOW()),

('archean-eon-start', 'Beginning of Archean Eon', 'The Archean Eon began with Earth''s crust stabilizing and oceans forming. First stromatolites appeared, oxygen-producing cyanobacteria evolved, and the earliest continents started to form from volcanic activity.', '4000000000 years ago', '1574-07-04 21:20:00+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Stromatolites_in_Sharkbay.jpg/800px-Stromatolites_in_Sharkbay.jpg', ARRAY['https://en.wikipedia.org/wiki/Archean', 'https://www.britannica.com/science/Archean-Eon'], NOW(), NOW()),

('archean-eon-end', 'End of Archean Eon', 'The Archean Eon concluded as oxygen levels rose significantly from photosynthetic organisms, continental masses grew larger, and Earth''s atmosphere underwent the Great Oxidation Event preparation.', '2500000000 years ago', '1528-10-16 07:20:00+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Stromatolites_in_Sharkbay.jpg/800px-Stromatolites_in_Sharkbay.jpg', ARRAY['https://en.wikipedia.org/wiki/Archean'], NOW(), NOW()),

('proterozoic-eon-start', 'Beginning of Proterozoic Eon', 'The Proterozoic Eon began with the Great Oxidation Event transforming Earth''s atmosphere. Eukaryotic cells evolved, continents formed stable cratons, and the first supercontinent Columbia assembled.', '2500000000 years ago', '1528-10-16 07:20:00+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Ozone-oxygen_cycle.svg/800px-Ozone-oxygen_cycle.svg.png', ARRAY['https://en.wikipedia.org/wiki/Proterozoic', 'https://www.britannica.com/science/Proterozoic-Eon'], NOW(), NOW()),

('proterozoic-eon-end', 'End of Proterozoic Eon', 'The Proterozoic Eon ended after the Ediacaran Period when complex multicellular life proliferated and the Cambrian explosion was imminent, marking the transition to the Phanerozoic Eon.', '541000000 years ago', '0542-11-21 19:46:24+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Dickinsonia_costata_2.jpg/800px-Dickinsonia_costata_2.jpg', ARRAY['https://en.wikipedia.org/wiki/Proterozoic', 'https://en.wikipedia.org/wiki/Ediacaran'], NOW(), NOW()),

('phanerozoic-eon-start', 'Beginning of Phanerozoic Eon', 'The Phanerozoic Eon began with the Cambrian explosion, a rapid diversification of multicellular life forms including the first animals with hard shells, complex eyes, and diverse body plans.', '541000000 years ago', '0542-11-21 19:46:24+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Trilobite_Asaphus_kowalewskii.jpg/800px-Trilobite_Asaphus_kowalewskii.jpg', ARRAY['https://en.wikipedia.org/wiki/Phanerozoic', 'https://www.britannica.com/science/Phanerozoic-Eon'], NOW(), NOW()),

('paleozoic-era-start', 'Beginning of Paleozoic Era', 'The Paleozoic Era started with the Cambrian Period''s explosion of life, witnessing the evolution of fish, amphibians, insects, land plants, and the formation of the supercontinent Pangaea.', '541000000 years ago', '0542-11-21 19:46:24+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Trilobite_Asaphus_kowalewskii.jpg/800px-Trilobite_Asaphus_kowalewskii.jpg', ARRAY['https://en.wikipedia.org/wiki/Paleozoic', 'https://www.britannica.com/science/Paleozoic-Era'], NOW(), NOW()),

('cambrian-period-start', 'Beginning of Cambrian Period', 'The Cambrian Period began with an explosive diversification of life known as the Cambrian explosion. Trilobites, brachiopods, and the first vertebrates appeared in warm shallow seas.', '541000000 years ago', '0542-11-21 19:46:24+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Trilobite_Asaphus_kowalewskii.jpg/800px-Trilobite_Asaphus_kowalewskii.jpg', ARRAY['https://en.wikipedia.org/wiki/Cambrian', 'https://www.britannica.com/science/Cambrian-Period'], NOW(), NOW()),

('cambrian-period-end', 'End of Cambrian Period', 'The Cambrian Period ended with extinctions of many trilobite families and archaeocyathids, transitioning to the Ordovician Period as marine life continued diversifying and continents drifted.', '485400000 years ago', '0486-05-09 14:24:00+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Trilobite_Asaphus_kowalewskii.jpg/800px-Trilobite_Asaphus_kowalewskii.jpg', ARRAY['https://en.wikipedia.org/wiki/Cambrian'], NOW(), NOW()),

('ordovician-period-start', 'Beginning of Ordovician Period', 'The Ordovician Period began with diversification of marine invertebrates, the first coral reefs, nautiloids dominating as predators, and the colonization of land by early plants and arthropods.', '485400000 years ago', '0486-05-09 14:24:00+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Orthoceras_fossil.jpg/800px-Orthoceras_fossil.jpg', ARRAY['https://en.wikipedia.org/wiki/Ordovician', 'https://www.britannica.com/science/Ordovician-Period'], NOW(), NOW()),

('ordovician-period-end', 'End of Ordovician Period', 'The Ordovician Period ended with the Ordovician-Silurian extinction events, caused by glaciation and sea level changes, eliminating about 85% of marine species including many brachiopods and trilobites.', '443800000 years ago', '0444-10-19 14:24:00+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Orthoceras_fossil.jpg/800px-Orthoceras_fossil.jpg', ARRAY['https://en.wikipedia.org/wiki/Ordovician', 'https://en.wikipedia.org/wiki/Ordovician%E2%80%93Silurian_extinction_events'], NOW(), NOW()),

('silurian-period-start', 'Beginning of Silurian Period', 'The Silurian Period began after the ice age with recovering marine ecosystems. Vascular plants colonized land, jawed fish evolved, and the first millipedes and arachnids appeared on land.', '443800000 years ago', '0444-10-19 14:24:00+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Cooksonia_pertoni.png/800px-Cooksonia_pertoni.png', ARRAY['https://en.wikipedia.org/wiki/Silurian', 'https://www.britannica.com/science/Silurian-Period'], NOW(), NOW()),

('silurian-period-end', 'End of Silurian Period', 'The Silurian Period concluded with minor extinction events and climate changes, transitioning to the Devonian as land plants developed more complex root systems and fish continued evolving.', '419200000 years ago', '0420-03-05 19:12:00+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Cooksonia_pertoni.png/800px-Cooksonia_pertoni.png', ARRAY['https://en.wikipedia.org/wiki/Silurian'], NOW(), NOW()),

('devonian-period-start', 'Beginning of Devonian Period', 'The Devonian Period, known as the Age of Fishes, saw armored fish, sharks, and lobe-finned fish proliferate. First forests appeared, insects diversified, and tetrapods began land colonization.', '419200000 years ago', '0420-03-05 19:12:00+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Dunkleosteus_interm2DB.jpg/800px-Dunkleosteus_interm2DB.jpg', ARRAY['https://en.wikipedia.org/wiki/Devonian', 'https://www.britannica.com/science/Devonian-Period'], NOW(), NOW()),

('devonian-period-end', 'End of Devonian Period', 'The Devonian Period ended with the Late Devonian extinction, eliminating many marine species especially reef-building organisms, caused by anoxic ocean conditions and climate fluctuations.', '358900000 years ago', '0359-11-25 14:24:00+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Dunkleosteus_interm2DB.jpg/800px-Dunkleosteus_interm2DB.jpg', ARRAY['https://en.wikipedia.org/wiki/Devonian', 'https://en.wikipedia.org/wiki/Late_Devonian_extinction'], NOW(), NOW()),

('carboniferous-period-start', 'Beginning of Carboniferous Period', 'The Carboniferous Period began with vast swamp forests producing coal deposits. Giant insects evolved in oxygen-rich atmosphere, amphibians dominated wetlands, and first reptiles appeared.', '358900000 years ago', '0359-11-25 14:24:00+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Meganeura_monyi_au_Museum_de_Toulouse.jpg/800px-Meganeura_monyi_au_Museum_de_Toulouse.jpg', ARRAY['https://en.wikipedia.org/wiki/Carboniferous', 'https://www.britannica.com/science/Carboniferous-Period'], NOW(), NOW()),

('carboniferous-period-end', 'End of Carboniferous Period', 'The Carboniferous Period ended as climate became drier, rainforests collapsed, and Pangaea''s assembly completed. Reptiles adapted to drier conditions, replacing amphibians as dominant land vertebrates.', '298900000 years ago', '0299-11-25 14:24:00+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Meganeura_monyi_au_Museum_de_Toulouse.jpg/800px-Meganeura_monyi_au_Museum_de_Toulouse.jpg', ARRAY['https://en.wikipedia.org/wiki/Carboniferous'], NOW(), NOW()),

('permian-period-start', 'Beginning of Permian Period', 'The Permian Period began with Pangaea fully formed and arid climates expanding. Synapsids (mammal ancestors) dominated, therapsids evolved, and conifers spread across dry landscapes.', '298900000 years ago', '0299-11-25 14:24:00+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Dimetrodon_grandis.jpg/800px-Dimetrodon_grandis.jpg', ARRAY['https://en.wikipedia.org/wiki/Permian', 'https://www.britannica.com/science/Permian-Period'], NOW(), NOW()),

('permian-period-end', 'End of Permian Period', 'The Permian Period ended with Earth''s largest mass extinction, the Great Dying, eliminating 96% of marine species and 70% of land vertebrates from massive volcanism and climate catastrophe.', '251902000 years ago', '0252-11-25 08:46:08+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Extinction_intensity.svg/800px-Extinction_intensity.svg.png', ARRAY['https://en.wikipedia.org/wiki/Permian', 'https://en.wikipedia.org/wiki/Permian%E2%80%93Triassic_extinction_event'], NOW(), NOW()),

('paleozoic-era-end', 'End of Paleozoic Era', 'The Paleozoic Era concluded with the catastrophic Permian-Triassic extinction, clearing ecological niches for dinosaurs and mammals to evolve during the following Mesozoic Era.', '251902000 years ago', '0252-11-25 08:46:08+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Extinction_intensity.svg/800px-Extinction_intensity.svg.png', ARRAY['https://en.wikipedia.org/wiki/Paleozoic'], NOW(), NOW()),

('mesozoic-era-start', 'Beginning of Mesozoic Era', 'The Mesozoic Era, Age of Reptiles, began after the Great Dying with Earth''s ecosystems recovering. Dinosaurs would evolve and dominate, flowering plants appeared, and mammals remained small.', '251902000 years ago', '0252-11-25 08:46:08+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Tyrannosaurus_rex_mmartyniuk.png/800px-Tyrannosaurus_rex_mmartyniuk.png', ARRAY['https://en.wikipedia.org/wiki/Mesozoic', 'https://www.britannica.com/science/Mesozoic-Era'], NOW(), NOW()),

('triassic-period-start', 'Beginning of Triassic Period', 'The Triassic Period began with sparse ecosystems recovering from extinction. First dinosaurs, pterosaurs, and marine reptiles evolved as Pangaea remained intact under hot dry climates.', '251902000 years ago', '0252-11-25 08:46:08+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Coelophysis_bauri_QM.jpg/800px-Coelophysis_bauri_QM.jpg', ARRAY['https://en.wikipedia.org/wiki/Triassic', 'https://www.britannica.com/science/Triassic-Period'], NOW(), NOW()),

('triassic-period-end', 'End of Triassic Period', 'The Triassic Period ended with another major extinction event eliminating many archosaur groups and allowing dinosaurs to become dominant in the Jurassic, likely caused by volcanic activity.', '201300000 years ago', '0202-04-23 14:24:00+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Coelophysis_bauri_QM.jpg/800px-Coelophysis_bauri_QM.jpg', ARRAY['https://en.wikipedia.org/wiki/Triassic', 'https://en.wikipedia.org/wiki/Triassic%E2%80%93Jurassic_extinction_event'], NOW(), NOW()),

('jurassic-period-start', 'Beginning of Jurassic Period', 'The Jurassic Period began with dinosaurs dominating terrestrial ecosystems. Sauropods reached enormous sizes, pterosaurs ruled skies, and first birds evolved from theropod dinosaurs.', '201300000 years ago', '0202-04-23 14:24:00+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Archaeopteryx_lithographica_%28Berlin_specimen%29.jpg/800px-Archaeopteryx_lithographica_%28Berlin_specimen%29.jpg', ARRAY['https://en.wikipedia.org/wiki/Jurassic', 'https://www.britannica.com/science/Jurassic-Period'], NOW(), NOW()),

('jurassic-period-end', 'End of Jurassic Period', 'The Jurassic Period concluded with minor extinctions as Pangaea continued fragmenting. Flowering plants began appearing, and ecological niches diversified entering the Cretaceous Period.', '145000000 years ago', '0146-01-01 00:00:00+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Archaeopteryx_lithographica_%28Berlin_specimen%29.jpg/800px-Archaeopteryx_lithographica_%28Berlin_specimen%29.jpg', ARRAY['https://en.wikipedia.org/wiki/Jurassic'], NOW(), NOW()),

('cretaceous-period-start', 'Beginning of Cretaceous Period', 'The Cretaceous Period began with dinosaurs at peak diversity. Flowering plants revolutionized ecosystems, Tyrannosaurus and Triceratops evolved, and seas teemed with mosasaurs and ammonites.', '145000000 years ago', '0146-01-01 00:00:00+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Tyrannosaurus_rex_mmartyniuk.png/800px-Tyrannosaurus_rex_mmartyniuk.png', ARRAY['https://en.wikipedia.org/wiki/Cretaceous', 'https://www.britannica.com/science/Cretaceous-Period'], NOW(), NOW()),

('cretaceous-period-end', 'End of Cretaceous Period', 'The Cretaceous Period ended catastrophically when a massive asteroid struck Chicxulub, Mexico, causing global wildfires, tsunamis, and climate change that killed all non-avian dinosaurs.', '66000000 years ago', '0067-01-01 00:00:00+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Chicxulub_crater_-_Yucatan%2C_Mexico.jpg/800px-Chicxulub_crater_-_Yucatan%2C_Mexico.jpg', ARRAY['https://en.wikipedia.org/wiki/Cretaceous', 'https://en.wikipedia.org/wiki/Cretaceous%E2%80%93Paleogene_extinction_event'], NOW(), NOW()),

('mesozoic-era-end', 'End of Mesozoic Era', 'The Mesozoic Era ended with the Chicxulub asteroid impact, terminating the age of dinosaurs and opening ecological opportunities for mammals to diversify and eventually dominate.', '66000000 years ago', '0067-01-01 00:00:00+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Chicxulub_crater_-_Yucatan%2C_Mexico.jpg/800px-Chicxulub_crater_-_Yucatan%2C_Mexico.jpg', ARRAY['https://en.wikipedia.org/wiki/Mesozoic'], NOW(), NOW()),

('cenozoic-era-start', 'Beginning of Cenozoic Era', 'The Cenozoic Era, Age of Mammals, began after dinosaurs'' extinction. Mammals rapidly diversified into numerous forms, birds flourished, and flowering plants dominated terrestrial vegetation.', '66000000 years ago', '0067-01-01 00:00:00+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Smilodon_californicus_saber-toothed_cat_%28Upper_Pleistocene%3B_Rancho_La_Brea_asphalt_seeps%2C_California%2C_USA%29_1_%2849292495307%29.jpg/800px-Smilodon_californicus_saber-toothed_cat_%28Upper_Pleistocene%3B_Rancho_La_Brea_asphalt_seeps%2C_California%2C_USA%29_1_%2849292495307%29.jpg', ARRAY['https://en.wikipedia.org/wiki/Cenozoic', 'https://www.britannica.com/science/Cenozoic-Era'], NOW(), NOW()),

('paleogene-period-start', 'Beginning of Paleogene Period', 'The Paleogene Period began with mammals filling ecological niches left by dinosaurs. Primates, whales, and modern bird groups evolved during this time of recovery and diversification.', '66000000 years ago', '0067-01-01 00:00:00+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Basilosaurus_skeleton.jpg/800px-Basilosaurus_skeleton.jpg', ARRAY['https://en.wikipedia.org/wiki/Paleogene', 'https://www.britannica.com/science/Paleogene-Period'], NOW(), NOW()),

('paleocene-epoch-start', 'Beginning of Paleocene Epoch', 'The Paleocene Epoch began immediately after the asteroid impact with sparse ecosystems. Small mammals diversified rapidly, early primates appeared, and forests recovered from devastation.', '66000000 years ago', '0067-01-01 00:00:00+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Plesiadapis_tricuspidens.jpg/800px-Plesiadapis_tricuspidens.jpg', ARRAY['https://en.wikipedia.org/wiki/Paleocene', 'https://www.britannica.com/science/Paleocene-Epoch'], NOW(), NOW()),

('paleocene-epoch-end', 'End of Paleocene Epoch', 'The Paleocene Epoch ended with the Paleocene-Eocene Thermal Maximum, a rapid global warming event that dramatically altered ecosystems and led to further mammalian diversification.', '56000000 years ago', '0057-01-01 00:00:00+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Plesiadapis_tricuspidens.jpg/800px-Plesiadapis_tricuspidens.jpg', ARRAY['https://en.wikipedia.org/wiki/Paleocene'], NOW(), NOW()),

('eocene-epoch-start', 'Beginning of Eocene Epoch', 'The Eocene Epoch began during peak global warmth with tropical forests near poles. Modern mammal orders emerged including horses, bats, whales transitioning to ocean life.', '56000000 years ago', '0057-01-01 00:00:00+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Basilosaurus_skeleton.jpg/800px-Basilosaurus_skeleton.jpg', ARRAY['https://en.wikipedia.org/wiki/Eocene', 'https://www.britannica.com/science/Eocene-Epoch'], NOW(), NOW()),

('eocene-epoch-end', 'End of Eocene Epoch', 'The Eocene Epoch ended with global cooling and the Grande Coupure extinction in Europe. Ice sheets formed in Antarctica, and tropical forests retreated toward the equator.', '33900000 years ago', '0034-11-25 14:24:00+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Basilosaurus_skeleton.jpg/800px-Basilosaurus_skeleton.jpg', ARRAY['https://en.wikipedia.org/wiki/Eocene'], NOW(), NOW()),

('oligocene-epoch-start', 'Beginning of Oligocene Epoch', 'The Oligocene Epoch began with cooler climates and grasslands spreading. Large mammals evolved, including early elephants, rhinoceroses, and cats, while Antarctica became fully glaciated.', '33900000 years ago', '0034-11-25 14:24:00+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Indricotherium11.jpg/800px-Indricotherium11.jpg', ARRAY['https://en.wikipedia.org/wiki/Oligocene', 'https://www.britannica.com/science/Oligocene-Epoch'], NOW(), NOW()),

('oligocene-epoch-end', 'End of Oligocene Epoch', 'The Oligocene Epoch concluded with continued cooling and drying trends. Grasslands expanded further, setting the stage for the evolution of grazing mammals in the Miocene.', '23030000 years ago', '0024-01-10 14:24:48+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Indricotherium11.jpg/800px-Indricotherium11.jpg', ARRAY['https://en.wikipedia.org/wiki/Oligocene'], NOW(), NOW()),

('paleogene-period-end', 'End of Paleogene Period', 'The Paleogene Period ended transitioning to the Neogene as grasslands continued expanding, climate continued cooling, and mammals adapted to new open-environment ecological niches.', '23030000 years ago', '0024-01-10 14:24:48+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Indricotherium11.jpg/800px-Indricotherium11.jpg', ARRAY['https://en.wikipedia.org/wiki/Paleogene'], NOW(), NOW()),

('neogene-period-start', 'Beginning of Neogene Period', 'The Neogene Period began with grasslands dominating and grazing mammals flourishing. Great apes evolved in Africa, kelp forests appeared, and modern marine ecosystems developed.', '23030000 years ago', '0024-01-10 14:24:48+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Australopithecus_afarensis.jpg/800px-Australopithecus_afarensis.jpg', ARRAY['https://en.wikipedia.org/wiki/Neogene', 'https://www.britannica.com/science/Neogene-Period'], NOW(), NOW()),

('miocene-epoch-start', 'Beginning of Miocene Epoch', 'The Miocene Epoch began with moderate climates and grassland expansion supporting diverse grazing herds. Apes diversified in Africa and Eurasia, and great white sharks appeared.', '23030000 years ago', '0024-01-10 14:24:48+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Australopithecus_afarensis.jpg/800px-Australopithecus_afarensis.jpg', ARRAY['https://en.wikipedia.org/wiki/Miocene', 'https://www.britannica.com/science/Miocene-Epoch'], NOW(), NOW()),

('miocene-epoch-end', 'End of Miocene Epoch', 'The Miocene Epoch ended with climate cooling and drying. Early hominids emerged in Africa as forests fragmented, and the Mediterranean Sea briefly dried up completely.', '5333000 years ago', '0006-04-27 06:33:52+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Australopithecus_afarensis.jpg/800px-Australopithecus_afarensis.jpg', ARRAY['https://en.wikipedia.org/wiki/Miocene'], NOW(), NOW()),

('pliocene-epoch-start', 'Beginning of Pliocene Epoch', 'The Pliocene Epoch began with continued cooling leading to ice age cycles. Australopithecus and early Homo species evolved in Africa, and the Isthmus of Panama formed.', '5333000 years ago', '0006-04-27 06:33:52+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Australopithecus_afarensis.jpg/800px-Australopithecus_afarensis.jpg', ARRAY['https://en.wikipedia.org/wiki/Pliocene', 'https://www.britannica.com/science/Pliocene-Epoch'], NOW(), NOW()),

('pliocene-epoch-end', 'End of Pliocene Epoch', 'The Pliocene Epoch ended as ice ages intensified with glacial cycles establishing. Homo habilis evolved, and many large mammal species migrated between continents via land bridges.', '2580000 years ago', '0003-07-29 06:46:08+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Australopithecus_afarensis.jpg/800px-Australopithecus_afarensis.jpg', ARRAY['https://en.wikipedia.org/wiki/Pliocene'], NOW(), NOW()),

('neogene-period-end', 'End of Neogene Period', 'The Neogene Period ended transitioning into the Quaternary Period characterized by recurring ice ages, human evolution accelerating, and megafauna dominating most continents.', '2580000 years ago', '0003-07-29 06:46:08+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Australopithecus_afarensis.jpg/800px-Australopithecus_afarensis.jpg', ARRAY['https://en.wikipedia.org/wiki/Neogene'], NOW(), NOW()),

('quaternary-period-start', 'Beginning of Quaternary Period', 'The Quaternary Period began with glacial-interglacial cycles dominating. Homo erectus spread worldwide, megafauna thrived, and human ancestors developed stone tools and controlled fire.', '2580000 years ago', '0003-07-29 06:46:08+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Smilodon_californicus_saber-toothed_cat_%28Upper_Pleistocene%3B_Rancho_La_Brea_asphalt_seeps%2C_California%2C_USA%29_1_%2849292495307%29.jpg/800px-Smilodon_californicus_saber-toothed_cat_%28Upper_Pleistocene%3B_Rancho_La_Brea_asphalt_seeps%2C_California%2C_USA%29_1_%2849292495307%29.jpg', ARRAY['https://en.wikipedia.org/wiki/Quaternary', 'https://www.britannica.com/science/Quaternary'], NOW(), NOW()),

('pleistocene-epoch-start', 'Beginning of Pleistocene Epoch', 'The Pleistocene Epoch, the Ice Age, began with multiple glacial periods. Mammoths, saber-toothed cats roamed, and Homo sapiens evolved from earlier hominids in Africa.', '2580000 years ago', '0003-07-29 06:46:08+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Smilodon_californicus_saber-toothed_cat_%28Upper_Pleistocene%3B_Rancho_La_Brea_asphalt_seeps%2C_California%2C_USA%29_1_%2849292495307%29.jpg/800px-Smilodon_californicus_saber-toothed_cat_%28Upper_Pleistocene%3B_Rancho_La_Brea_asphalt_seeps%2C_California%2C_USA%29_1_%2849292495307%29.jpg', ARRAY['https://en.wikipedia.org/wiki/Pleistocene', 'https://www.britannica.com/science/Pleistocene-Epoch'], NOW(), NOW()),

('pleistocene-epoch-end', 'End of Pleistocene Epoch', 'The Pleistocene Epoch ended as the last ice age concluded around 11,700 years ago. Most megafauna went extinct, and humans transitioned from hunter-gatherers to agriculture.', '11700 years ago', '9731-01-01 00:00:00+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Smilodon_californicus_saber-toothed_cat_%28Upper_Pleistocene%3B_Rancho_La_Brea_asphalt_seeps%2C_California%2C_USA%29_1_%2849292495307%29.jpg/800px-Smilodon_californicus_saber-toothed_cat_%28Upper_Pleistocene%3B_Rancho_La_Brea_asphalt_seeps%2C_California%2C_USA%29_1_%2849292495307%29.jpg', ARRAY['https://en.wikipedia.org/wiki/Pleistocene'], NOW(), NOW()),

('holocene-epoch-start', 'Beginning of Holocene Epoch', 'The Holocene Epoch began as glaciers retreated and Earth warmed. Humans developed agriculture, built cities, invented writing, and fundamentally transformed the planet''s ecosystems.', '11700 years ago', '9731-01-01 00:00:00+00 BC', 'geological_eras', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Skara_Brae_12.jpg/800px-Skara_Brae_12.jpg', ARRAY['https://en.wikipedia.org/wiki/Holocene', 'https://www.britannica.com/science/Holocene-Epoch'], NOW(), NOW());

-- Insert geolocation for events that have specific coordinates
INSERT INTO event_geolocation (event_id, location_type, location) VALUES
('proterozoic-eon-end', 'primary', ST_SetSRID(ST_MakePoint(138.6, -31.3), 4326)),
('permian-period-end', 'primary', ST_SetSRID(ST_MakePoint(100, 60), 4326)),
('cretaceous-period-end', 'primary', ST_SetSRID(ST_MakePoint(-89.5, 21.3), 4326)),
('mesozoic-era-end', 'primary', ST_SetSRID(ST_MakePoint(-89.5, 21.3), 4326))
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
