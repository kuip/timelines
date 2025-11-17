#!/usr/bin/env python3
import json

# Load the mapping
with open('/Users/christiantzurcanu/Documents/dev/timeline/geologic_id_mapping.json') as f:
    id_mapping = json.load(f)

# Load events
with open('/Users/christiantzurcanu/Documents/dev/timeline/geologic_events.json') as f:
    events = json.load(f)

# Load relationships
with open('/Users/christiantzurcanu/Documents/dev/timeline/geologic_relationships.json') as f:
    relationships = json.load(f)

print("BEGIN;")
print()
print("-- Insert geologic events")
print("INSERT INTO events (id, title, description, timeline_seconds, unix_seconds, precision_level, image_url) VALUES")

event_values = []
for event in events:
    old_id = event['id']
    new_id = id_mapping[old_id]
    title = event['title'].replace("'", "''")
    description = event['description'].replace("'", "''")
    unix_seconds = event['unix_seconds']
    timeline_seconds = unix_seconds  # Same value
    image_url = event['image_url'].replace("'", "''")

    # Determine precision based on time scale
    if abs(unix_seconds) > 100000000000:  # > ~3 million years
        precision = 'million_years'
    elif abs(unix_seconds) > 100000000:  # > ~3 years
        precision = 'thousand_years'
    else:
        precision = 'year'

    event_values.append(f"('{new_id}', '{title}', '{description}', {timeline_seconds}, {unix_seconds}, '{precision}', '{image_url}')")

print(",\n".join(event_values))
print("ON CONFLICT (id) DO NOTHING;")
print()

# Category assignments
print("-- Insert category assignments")
print("INSERT INTO event_categories (event_id, category_id, is_primary) VALUES")
category_values = []
for event in events:
    new_id = id_mapping[event['id']]
    category_values.append(f"('{new_id}', 'geological_eras', true)")
print(",\n".join(category_values))
print("ON CONFLICT DO NOTHING;")
print()

# Sources
print("-- Insert sources")
print("INSERT INTO event_sources (event_id, source_type, url) VALUES")
source_values = []
for event in events:
    new_id = id_mapping[event['id']]
    for source_url in event.get('sources', []):
        source_url_clean = source_url.replace("'", "''")
        if 'wikipedia.org' in source_url:
            source_type = 'wikipedia'
        else:
            source_type = 'other'
        source_values.append(f"('{new_id}', '{source_type}', '{source_url_clean}')")
print(",\n".join(source_values))
print("ON CONFLICT DO NOTHING;")
print()

# Locations
print("-- Insert locations for events with specific geographic points")
print("INSERT INTO event_locations (event_id, location_name, location_type, location_point, is_primary) VALUES")
location_entries = [
    ('proterozoic-eon-end', 'Ediacara Hills, Australia', 'discovery_site', 138.6, -31.3),
    ('permian-period-end', 'Siberian Traps, Russia', 'extinction_cause', 100, 60),
    ('cretaceous-period-end', 'Chicxulub Crater, Mexico', 'impact_site', -89.5, 21.3),
    ('mesozoic-era-end', 'Chicxulub Crater, Mexico', 'impact_site', -89.5, 21.3)
]
location_values = []
for old_id, name, loc_type, lon, lat in location_entries:
    if old_id in id_mapping:
        new_id = id_mapping[old_id]
        location_values.append(f"('{new_id}', '{name}', '{loc_type}', ST_SetSRID(ST_MakePoint({lon}, {lat}), 4326), true)")
print(",\n".join(location_values))
print("ON CONFLICT DO NOTHING;")
print()

# Relationships
print("-- Insert relationships")
print("INSERT INTO event_relationships (event_id_a, event_id_b, relationship_type, weight) VALUES")
rel_values = []
for rel in relationships:
    old_id_a = rel['event_id_a']
    old_id_b = rel['event_id_b']
    if old_id_a in id_mapping and old_id_b in id_mapping:
        new_id_a = id_mapping[old_id_a]
        new_id_b = id_mapping[old_id_b]
        rel_type = rel['relationship_type']
        weight = rel['weight']
        rel_values.append(f"('{new_id_a}', '{new_id_b}', '{rel_type}', {weight})")
print(",\n".join(rel_values))
print("ON CONFLICT DO NOTHING;")
print()

print("COMMIT;")
