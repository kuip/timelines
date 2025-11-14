#!/usr/bin/env python3
"""
Fix event categories in the database to match categories.json
Maps old incorrect categories to new correct ones from categories.json
"""

import psycopg2
import json

# Mapping from old (incorrect) categories to new (correct) ones
CATEGORY_MAPPING = {
    # Old incorrect categories -> New correct categories from categories.json
    "geopolitics.cold_war_collapse": "politics.treaty_diplomacy",  # or could be war-related
    "geopolitics.independence": "politics.independence",
    "geopolitics.revolution": "politics.revolution_uprising",
    "geopolitics.diplomacy": "politics.treaty_diplomacy",
    "medicine.epidemiology": "medicine_biology.disease_epidemic",
    "medicine.pharmacology": "medicine_biology.medicine_breakthrough",
    "science.biology.genetics": "medicine_biology.genetics_dna",
    "science.physics": "science.physics_discovery",
    "science.chemistry": "science.chemistry_discovery",
    "cosmic.astrophysics": "cosmology",
    "space_exploration.crewed_missions": "space.space_exploration",
    "space_exploration.crewed_lunar_missions": "space.moon_landing",
    "transportation.aviation.powered_flight": "technology.transportation",
    "technology.printing.mechanical_press": "technology",
    "technology.telecommunications": "technology.communication",
    "technology.computing": "technology.computing",
    "warfare.battle": "conflict.battle.battle_general",
    "warfare.world_war": "conflict.war_major",
    "culture.arts.visual": "culture.art_movement",
    "culture.music": "culture.music_genre",
    "entertainment.cinema": "entertainment.cinema_film",
    "historical": "culture",  # default fallback
}

def load_valid_categories():
    """Load all valid category paths from categories.json"""
    import os
    script_dir = os.path.dirname(os.path.abspath(__file__))
    categories_path = os.path.join(script_dir, '..', 'frontend', 'public', 'categories.json')

    with open(categories_path, 'r') as f:
        data = json.load(f)

    def extract_paths(categories, parent_path=""):
        paths = set()
        for cat in categories:
            current_id = cat['id']
            current_path = f"{parent_path}.{current_id}" if parent_path else current_id
            paths.add(current_path)

            if 'children' in cat:
                paths.update(extract_paths(cat['children'], current_path))

        return paths

    return extract_paths(data['categories'])

def main():
    # Load valid categories
    valid_categories = load_valid_categories()
    print(f"Loaded {len(valid_categories)} valid categories from categories.json\n")

    # Connect to database
    conn = psycopg2.connect(
        host='localhost',
        port=5432,
        database='timeline',
        user='postgres'
    )

    try:
        cur = conn.cursor()

        # Get all distinct categories currently in use
        cur.execute("SELECT DISTINCT category FROM events WHERE category IS NOT NULL ORDER BY category")
        current_categories = [row[0] for row in cur.fetchall()]

        print(f"Current categories in database: {len(current_categories)}")
        print("\nChecking which categories need updating:")
        print("-" * 80)

        needs_update = []
        already_valid = []

        for cat in current_categories:
            if cat in valid_categories:
                already_valid.append(cat)
                print(f"✓ {cat:50} -> VALID")
            elif cat in CATEGORY_MAPPING:
                new_cat = CATEGORY_MAPPING[cat]
                needs_update.append((cat, new_cat))
                print(f"→ {cat:50} -> {new_cat}")
            else:
                needs_update.append((cat, "culture"))  # fallback
                print(f"? {cat:50} -> culture (FALLBACK)")

        print("\n" + "=" * 80)
        print(f"Valid categories: {len(already_valid)}")
        print(f"Categories needing update: {len(needs_update)}")
        print("=" * 80)

        if needs_update:
            print("\nUpdating categories...")

            for old_cat, new_cat in needs_update:
                # Count events before update
                cur.execute("SELECT COUNT(*) FROM events WHERE category = %s", (old_cat,))
                count = cur.fetchone()[0]

                # Update the category
                cur.execute(
                    "UPDATE events SET category = %s WHERE category = %s",
                    (new_cat, old_cat)
                )

                print(f"  Updated {count:3d} events: {old_cat} -> {new_cat}")

            conn.commit()
            print("\n✓ All categories updated successfully!")
        else:
            print("\n✓ All categories are already valid!")

        # Show summary
        print("\n" + "=" * 80)
        cur.execute("SELECT category, COUNT(*) FROM events WHERE category IS NOT NULL GROUP BY category ORDER BY COUNT(*) DESC")
        print("Final category distribution:")
        print("-" * 80)
        for cat, count in cur.fetchall():
            valid_marker = "✓" if cat in valid_categories else "✗"
            print(f"{valid_marker} {cat:50} {count:5d} events")

        print("=" * 80)

    except Exception as e:
        conn.rollback()
        print(f"ERROR: {e}")
        return 1
    finally:
        cur.close()
        conn.close()

    return 0

if __name__ == '__main__':
    import sys
    sys.exit(main())
