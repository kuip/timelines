#!/usr/bin/env python3
"""
Check all image URLs in the database and replace broken ones with category fallback icons.
"""

import psycopg2
import requests
import logging
import os
from typing import Optional

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Database connection parameters
DB_CONFIG = {
    'dbname': os.getenv('DB_NAME', 'timeline'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', ''),
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432')
}

# Category icon mapping - load from frontend directory
CATEGORY_ICONS_DIR = '../frontend/public/images/categories'


def load_category_icons():
    """Load available category icons from filesystem."""
    icons = {}
    if os.path.exists(CATEGORY_ICONS_DIR):
        for filename in os.listdir(CATEGORY_ICONS_DIR):
            if filename.endswith('.svg'):
                category_id = filename.replace('.svg', '')
                icons[category_id] = f'/images/categories/{filename}'
    logger.info(f"Loaded {len(icons)} category icons")
    return icons


def check_image_url(url: str) -> bool:
    """Check if an image URL is accessible."""
    if not url or url.startswith('/images/categories/'):
        # Already using category icon
        return True

    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
        response = requests.head(url, headers=headers, timeout=5, allow_redirects=True)
        return response.status_code == 200
    except Exception as e:
        logger.debug(f"Image check failed for {url}: {e}")
        return False


def get_fallback_image(category: str, category_icons: dict) -> Optional[str]:
    """Get fallback SVG icon path for a category."""
    if not category:
        return None

    # Try exact match first
    if category in category_icons:
        return category_icons[category]

    # Try parent category if dot-separated
    if '.' in category:
        parent = category.split('.')[0]
        if parent in category_icons:
            return category_icons[parent]

    # Default fallback
    if 'culture' in category_icons:
        return category_icons['culture']

    return None


def fix_broken_images():
    """Check all event images and fix broken ones."""
    category_icons = load_category_icons()

    # Connect to database
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    try:
        # Get all events with image URLs
        cursor.execute("""
            SELECT id, title, image_url, category
            FROM events
            WHERE image_url IS NOT NULL
            ORDER BY created_at DESC
        """)

        events = cursor.fetchall()
        total = len(events)
        logger.info(f"Checking {total} events with image URLs...")

        checked = 0
        fixed = 0
        already_fallback = 0

        for event_id, title, image_url, category in events:
            checked += 1

            # Skip if already using category icon
            if image_url.startswith('/images/categories/'):
                already_fallback += 1
                if checked % 100 == 0:
                    logger.info(f"Progress: {checked}/{total} checked, {fixed} fixed, {already_fallback} already using fallback")
                continue

            # Check if image URL works
            if not check_image_url(image_url):
                logger.warning(f"Broken image for '{title}': {image_url}")

                # Get fallback icon
                fallback = get_fallback_image(category, category_icons)

                if fallback:
                    # Update database
                    cursor.execute("""
                        UPDATE events
                        SET image_url = %s
                        WHERE id = %s
                    """, (fallback, event_id))

                    fixed += 1
                    logger.info(f"Fixed '{title}': {image_url} -> {fallback}")
                else:
                    logger.warning(f"No fallback icon found for category '{category}' (event: {title})")

            if checked % 100 == 0:
                logger.info(f"Progress: {checked}/{total} checked, {fixed} fixed, {already_fallback} already using fallback")
                conn.commit()  # Commit periodically

        # Final commit
        conn.commit()

        logger.info("=" * 60)
        logger.info(f"SUMMARY")
        logger.info("=" * 60)
        logger.info(f"Total events checked:        {checked}")
        logger.info(f"Already using fallback:      {already_fallback}")
        logger.info(f"Broken images fixed:         {fixed}")
        logger.info(f"Working external images:     {checked - already_fallback - fixed}")
        logger.info("=" * 60)

    finally:
        cursor.close()
        conn.close()


if __name__ == '__main__':
    fix_broken_images()
