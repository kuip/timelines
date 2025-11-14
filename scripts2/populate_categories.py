#!/usr/bin/env python3
"""
Populate categories table from categories.json
"""

import json
import psycopg2
import sys

def load_categories():
    """Load categories from JSON file"""
    with open('../frontend/public/categories.json', 'r') as f:
        data = json.load(f)
    return data['categories']

def flatten_categories(categories, parent_id=None):
    """Recursively flatten the hierarchical categories"""
    flat = []
    for cat in categories:
        # Add this category
        flat.append({
            'id': cat['id'],
            'name': cat['name'],
            'description': cat.get('description', ''),
            'color': cat['color'],
            'icon': cat.get('icon'),
            'parent_id': parent_id
        })

        # Add children recursively
        if 'children' in cat:
            flat.extend(flatten_categories(cat['children'], parent_id=cat['id']))

    return flat

def main():
    # Load categories
    categories = load_categories()
    flat_categories = flatten_categories(categories)

    print(f"Loaded {len(flat_categories)} categories from JSON")

    # Connect to database
    conn = psycopg2.connect(
        host='localhost',
        port=5432,
        database='timeline',
        user='postgres'
    )

    try:
        cur = conn.cursor()

        # Insert categories
        for cat in flat_categories:
            cur.execute("""
                INSERT INTO categories (id, name, description, color, icon, parent_id)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    color = EXCLUDED.color,
                    icon = EXCLUDED.icon,
                    parent_id = EXCLUDED.parent_id
            """, (
                cat['id'],
                cat['name'],
                cat['description'],
                cat['color'],
                cat['icon'],
                cat['parent_id']
            ))

        conn.commit()
        print(f"✓ Inserted/updated {len(flat_categories)} categories")

        # Show category count
        cur.execute("SELECT COUNT(*) FROM categories")
        count = cur.fetchone()[0]
        print(f"Total categories in database: {count}")

    except Exception as e:
        conn.rollback()
        print(f"ERROR: {e}")
        sys.exit(1)
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    main()
