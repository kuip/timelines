#!/usr/bin/env python3
"""
Timeline Data Ingestion Script with Sources

This script ingests timeline events with their sources into the database.
Supports multiple input formats: JSON, CSV, and direct Python dictionaries.

Features:
- Creates events with complete metadata
- Associates multiple sources per event
- Tracks event creator (user_id)
- Validates data and handles errors gracefully
- Bulk operations for performance
- Dry-run mode for testing

Usage:
    # Ingest from JSON file
    python3 ingest_timeline_with_sources.py --file events_with_sources.json --format json

    # Ingest from CSV
    python3 ingest_timeline_with_sources.py --file events.csv --format csv

    # Dry run (no database changes)
    python3 ingest_timeline_with_sources.py --file events.json --dry-run

    # Set creator user
    python3 ingest_timeline_with_sources.py --file events.json --user-id <uuid>

    # Bulk import with batch size
    python3 ingest_timeline_with_sources.py --file events.json --batch-size 50
"""

import json
import csv
import sys
import argparse
import logging
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from pathlib import Path
import psycopg2
from psycopg2.extras import execute_values
import uuid
import requests
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class TimelineDataIngester:
    """Handles ingestion of timeline events and their sources into PostgreSQL."""

    # Valid source types
    VALID_SOURCE_TYPES = [
        'scientific_paper',
        'book',
        'article',
        'database',
        'expert_consensus',
        'wikipedia',
        'wikidata',
        'other'
    ]

    # Precision levels supported
    PRECISION_LEVELS = [
        'nanosecond',
        'microsecond',
        'millisecond',
        'second',
        'minute',
        'hour',
        'day',
        'week',
        'month',
        'year',
        'decade',
        'century',
        'thousand_years',
        'million_years',
        'billion_years'
    ]

    def __init__(self, db_config: Dict[str, str], dry_run: bool = False):
        """
        Initialize the ingester.

        Args:
            db_config: Database connection config with keys:
                      host, port, database, user, password
            dry_run: If True, don't actually write to database
        """
        self.db_config = db_config
        self.dry_run = dry_run
        self.conn = None
        self.stats = {
            'events_created': 0,
            'sources_created': 0,
            'events_skipped': 0,
            'image_urls_replaced': 0,
            'errors': []
        }
        # Load categories for fallback icons
        self.category_icons = self._load_category_icons()

    def connect(self) -> bool:
        """Connect to the database."""
        try:
            self.conn = psycopg2.connect(
                host=self.db_config['host'],
                port=self.db_config['port'],
                database=self.db_config['database'],
                user=self.db_config['user'],
                password=self.db_config['password']
            )
            logger.info("Connected to database successfully")
            return True
        except psycopg2.Error as e:
            logger.error(f"Failed to connect to database: {e}")
            return False

    def disconnect(self):
        """Close database connection."""
        if self.conn:
            self.conn.close()
            logger.info("Disconnected from database")

    def _load_category_icons(self) -> Dict[str, str]:
        """Load category to icon file mapping from the filesystem."""
        icons = {}
        # Try to find the icons directory relative to this script
        script_dir = Path(__file__).parent.parent
        icon_dir = script_dir / "frontend" / "public" / "images" / "categories"

        if icon_dir.exists():
            for icon_file in icon_dir.glob("*.svg"):
                category = icon_file.stem  # filename without .svg
                # Store as relative URL path
                icons[category] = f"/images/categories/{icon_file.name}"
            logger.info(f"Loaded {len(icons)} category icons")
        else:
            logger.warning(f"Category icon directory not found: {icon_dir}")

        return icons

    def _check_image_url(self, url: str) -> bool:
        """Check if an image URL is accessible."""
        if not url:
            return False

        try:
            # Use browser-like headers to avoid 403 from services like Wikimedia
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            # Quick HEAD request to check if URL exists
            response = requests.head(url, headers=headers, timeout=5, allow_redirects=True)
            return response.status_code == 200
        except Exception as e:
            logger.debug(f"Image URL check failed for {url}: {e}")
            return False

    def _get_fallback_image(self, category: str) -> Optional[str]:
        """Get fallback SVG icon path for a category."""
        if not category:
            return None

        # Try exact match first
        if category in self.category_icons:
            return self.category_icons[category]

        # Try parent category (e.g., "space_exploration.moon_landing" -> "space_exploration")
        if '.' in category:
            parent = category.split('.')[0]
            if parent in self.category_icons:
                return self.category_icons[parent]

        return None

    def validate_event(self, event: Dict) -> Tuple[bool, str]:
        """
        Validate event data.

        Required fields: title, unix_seconds, precision_level, latitude, longitude, category
        Optional fields: description, importance_score, image_url, sources

        Returns:
            Tuple of (is_valid, error_message)
        """
        if not isinstance(event, dict):
            return False, "Event must be a dictionary"

        # Check required fields
        if 'title' not in event or not event['title']:
            return False, "Missing required field: title"

        if 'unix_seconds' not in event:
            return False, "Missing required field: unix_seconds"

        if 'precision_level' not in event:
            return False, "Missing required field: precision_level"

        # REQUIRE geo coordinates
        if 'latitude' not in event or event['latitude'] is None:
            return False, "Missing required field: latitude (all events must have geo point)"

        if 'longitude' not in event or event['longitude'] is None:
            return False, "Missing required field: longitude (all events must have geo point)"

        # REQUIRE single category (must be a leaf category)
        if 'category' not in event:
            return False, "Missing required field: category (must be a leaf category)"

        if not isinstance(event['category'], str):
            return False, "category must be a string"

        # Validate latitude/longitude ranges
        try:
            lat = float(event['latitude'])
            if lat < -90 or lat > 90:
                return False, "latitude must be between -90 and 90"
        except (TypeError, ValueError):
            return False, "latitude must be numeric"

        try:
            lon = float(event['longitude'])
            if lon < -180 or lon > 180:
                return False, "longitude must be between -180 and 180"
        except (TypeError, ValueError):
            return False, "longitude must be numeric"

        # Validate precision level
        if event['precision_level'] not in self.PRECISION_LEVELS:
            return False, f"Invalid precision_level: {event['precision_level']}"

        # Validate unix_seconds is numeric
        try:
            int(event['unix_seconds'])
        except (TypeError, ValueError):
            return False, "unix_seconds must be numeric"

        # Validate importance_score if present
        if 'importance_score' in event:
            try:
                score = int(event['importance_score'])
                if score < 0 or score > 100:
                    return False, "importance_score must be between 0 and 100"
            except (TypeError, ValueError):
                return False, "importance_score must be numeric"

        # Validate sources if present
        if 'sources' in event:
            if not isinstance(event['sources'], list):
                return False, "sources must be a list"

            for i, source in enumerate(event['sources']):
                valid, msg = self.validate_source(source, f"sources[{i}]")
                if not valid:
                    return False, msg

        return True, ""

    def validate_source(self, source: Dict, context: str = "source") -> Tuple[bool, str]:
        """
        Validate source data.

        Required fields: url or title
        Optional fields: source_type, citation, credibility_score

        Returns:
            Tuple of (is_valid, error_message)
        """
        if not isinstance(source, dict):
            return False, f"{context} must be a dictionary"

        # At least URL or title required
        if 'url' not in source and 'title' not in source:
            return False, f"{context}: must have 'url' or 'title'"

        # Validate source_type if present
        if 'source_type' in source:
            if source['source_type'] not in self.VALID_SOURCE_TYPES:
                return False, f"{context}: invalid source_type: {source['source_type']}"

        # Validate credibility_score if present
        if 'credibility_score' in source:
            try:
                score = int(source['credibility_score'])
                if score < 0 or score > 100:
                    return False, f"{context}: credibility_score must be 0-100"
            except (TypeError, ValueError):
                return False, f"{context}: credibility_score must be numeric"

        return True, ""

    def ingest_event_with_sources(
        self,
        event: Dict,
        user_id: Optional[str] = None
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Ingest a single event and its sources.

        Args:
            event: Event dictionary with optional 'sources' list
            user_id: UUID of user creating the event

        Returns:
            Tuple of (success, message, event_id)
        """
        # Validate event
        valid, msg = self.validate_event(event)
        if not valid:
            self.stats['events_skipped'] += 1
            return False, f"Event validation failed: {msg}", None

        if self.dry_run:
            logger.info(f"[DRY RUN] Would create event: {event['title']}")
            return True, "Dry run - not written to database", str(uuid.uuid4())

        try:
            cursor = self.conn.cursor()
            event_id = str(uuid.uuid4())

            # Extract sources, category, and location data before creating event
            sources = event.pop('sources', [])
            category = event.pop('category', None)
            latitude = event.pop('latitude', None)
            longitude = event.pop('longitude', None)
            location_name = event.pop('location_name', None)

            # Verify category exists in database
            cursor.execute("SELECT id FROM categories WHERE id = %s", (category,))
            if not cursor.fetchone():
                self.stats['events_skipped'] += 1
                return False, f"Category '{category}' not found in database", None

            # Check and fix image_url (use category for fallback)
            image_url = event.get('image_url')
            primary_category = category

            if image_url:
                # Skip image URL check - trust the source data
                pass
            else:
                # No image_url provided, try to use category icon
                fallback = self._get_fallback_image(primary_category)
                if fallback:
                    logger.info(f"No image_url provided, using category icon: {fallback}")
                    image_url = fallback
                    self.stats['image_urls_replaced'] += 1

            # Prepare event data (category field stores primary category for backward compat)
            unix_seconds = int(event['unix_seconds'])
            event_data = {
                'id': event_id,
                'title': event['title'],
                'timeline_seconds': unix_seconds,
                'unix_seconds': unix_seconds,
                'unix_nanos': int(event.get('unix_nanos', 0)),
                'precision_level': event['precision_level'],
                'description': event.get('description'),
                'category': primary_category,  # Store primary category in events table
                'image_url': image_url,
                'importance_score': int(event.get('importance_score', 50)),
                'uncertainty_range': event.get('uncertainty_range'),
                'created_by_user_id': user_id,
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat(),
            }

            # Insert event
            insert_event_sql = """
                INSERT INTO events (
                    id, title, timeline_seconds, unix_seconds, unix_nanos, precision_level,
                    description, category, image_url, importance_score,
                    uncertainty_range, created_by_user_id, created_at, updated_at
                ) VALUES (
                    %(id)s, %(title)s, %(timeline_seconds)s, %(unix_seconds)s, %(unix_nanos)s,
                    %(precision_level)s, %(description)s, %(category)s,
                    %(image_url)s, %(importance_score)s, %(uncertainty_range)s,
                    %(created_by_user_id)s, %(created_at)s, %(updated_at)s
                )
            """

            cursor.execute(insert_event_sql, event_data)
            self.stats['events_created'] += 1
            logger.info(f"Created event: {event['title']} (ID: {event_id})")

            # Insert sources
            source_ids = []
            for source in sources:
                source_valid, source_msg = self.validate_source(source)
                if not source_valid:
                    logger.warning(f"Skipping invalid source for {event['title']}: {source_msg}")
                    continue

                source_id = str(uuid.uuid4())
                source_data = {
                    'id': source_id,
                    'event_id': event_id,
                    'source_type': source.get('source_type', 'other'),
                    'title': source.get('title'),
                    'url': source.get('url'),
                    'citation': source.get('citation'),
                    'credibility_score': int(source.get('credibility_score', 50)),
                    'added_by_user_id': user_id,
                    'created_at': datetime.utcnow().isoformat(),
                }

                insert_source_sql = """
                    INSERT INTO event_sources (
                        id, event_id, source_type, title, url, citation,
                        credibility_score, added_by_user_id, created_at
                    ) VALUES (
                        %(id)s, %(event_id)s, %(source_type)s, %(title)s,
                        %(url)s, %(citation)s, %(credibility_score)s,
                        %(added_by_user_id)s, %(created_at)s
                    )
                """

                cursor.execute(insert_source_sql, source_data)
                source_ids.append(source_id)
                self.stats['sources_created'] += 1

            logger.info(f"Created {len(source_ids)} sources for event {event_id}")

            # Insert location if provided
            if latitude is not None and longitude is not None:
                location_id = str(uuid.uuid4())

                # Create GeoJSON for the point
                geojson_point = json.dumps({
                    "type": "Point",
                    "coordinates": [longitude, latitude]  # GeoJSON uses [lon, lat] order
                })

                location_data = {
                    'id': location_id,
                    'event_id': event_id,
                    'location_name': location_name or 'Unknown',
                    'location_type': 'primary',
                    'lat': latitude,
                    'lon': longitude,
                    'geojson': geojson_point,
                    'created_at': datetime.utcnow().isoformat(),
                }

                insert_location_sql = """
                    INSERT INTO event_locations (
                        id, event_id, location_name, location_type, location_point, geojson, is_primary, created_at
                    ) VALUES (
                        %(id)s, %(event_id)s, %(location_name)s, %(location_type)s,
                        ST_SetSRID(ST_MakePoint(%(lon)s, %(lat)s), 4326),
                        %(geojson)s, TRUE, %(created_at)s
                    )
                """

                cursor.execute(insert_location_sql, location_data)
                logger.info(f"Created location for event {event_id}: {location_name} ({latitude}, {longitude})")

            self.conn.commit()
            return True, f"Created event with {len(source_ids)} sources", event_id

        except psycopg2.Error as e:
            self.conn.rollback()
            self.stats['events_skipped'] += 1
            error_msg = f"Database error: {e}"
            self.stats['errors'].append(error_msg)
            logger.error(error_msg)
            return False, error_msg, None
        finally:
            cursor.close()

    def ingest_batch(
        self,
        events: List[Dict],
        user_id: Optional[str] = None
    ) -> Dict:
        """
        Ingest multiple events.

        Args:
            events: List of event dictionaries
            user_id: UUID of user creating the events

        Returns:
            Statistics dictionary
        """
        logger.info(f"Starting batch ingestion of {len(events)} events")

        for i, event in enumerate(events, 1):
            success, msg, event_id = self.ingest_event_with_sources(event, user_id)
            if not success:
                logger.warning(f"Event {i}/{len(events)}: {msg}")
            else:
                logger.info(f"Event {i}/{len(events)}: {msg}")

        return self.stats

    def ingest_from_json_file(
        self,
        file_path: str,
        user_id: Optional[str] = None
    ) -> Dict:
        """
        Load events from JSON file and ingest.

        Expected JSON format:
        {
            "events": [
                {
                    "title": "Event Name",
                    "unix_seconds": 1234567890,
                    "precision_level": "day",
                    "description": "...",
                    "importance_score": 75,
                    "sources": [
                        {
                            "url": "https://...",
                            "title": "Source Title",
                            "source_type": "wikipedia",
                            "credibility_score": 85
                        }
                    ]
                }
            ]
        }
        Or just an array of events:
        [
            { event data }
        ]
        """
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)

            # Handle both formats
            if isinstance(data, dict) and 'events' in data:
                events = data['events']
            elif isinstance(data, list):
                events = data
            else:
                logger.error("Invalid JSON format. Expected 'events' key or array")
                return self.stats

            logger.info(f"Loaded {len(events)} events from {file_path}")
            return self.ingest_batch(events, user_id)

        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON file: {e}")
            self.stats['errors'].append(str(e))
            return self.stats
        except FileNotFoundError:
            logger.error(f"File not found: {file_path}")
            self.stats['errors'].append(f"File not found: {file_path}")
            return self.stats

    def ingest_from_csv_file(
        self,
        file_path: str,
        user_id: Optional[str] = None
    ) -> Dict:
        """
        Load events from CSV file and ingest.

        Expected CSV columns:
        title, unix_seconds, precision_level, description, category,
        importance_score, image_url, uncertainty_range,
        source_url, source_title, source_type, source_citation, credibility_score

        Multiple rows with same title are treated as multiple sources for that event.
        """
        try:
            events_dict = {}

            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)

                for row in reader:
                    title = row.get('title', '').strip()
                    if not title:
                        logger.warning("Skipping row with empty title")
                        continue

                    # Create event if first time seeing this title
                    if title not in events_dict:
                        event = {
                            'title': title,
                            'unix_seconds': row.get('unix_seconds', '0'),
                            'precision_level': row.get('precision_level', 'day'),
                            'description': row.get('description', '').strip() or None,
                            'category': row.get('category', '').strip() or None,
                            'importance_score': row.get('importance_score', '50'),
                            'image_url': row.get('image_url', '').strip() or None,
                            'uncertainty_range': row.get('uncertainty_range', '').strip() or None,
                            'sources': []
                        }
                        events_dict[title] = event

                    # Add source if data provided
                    if row.get('source_url', '').strip() or row.get('source_title', '').strip():
                        source = {
                            'url': row.get('source_url', '').strip() or None,
                            'title': row.get('source_title', '').strip() or None,
                            'source_type': row.get('source_type', 'other').strip(),
                            'citation': row.get('source_citation', '').strip() or None,
                            'credibility_score': row.get('credibility_score', '50'),
                        }
                        events_dict[title]['sources'].append(source)

            events = list(events_dict.values())
            logger.info(f"Loaded {len(events)} events from CSV {file_path}")
            return self.ingest_batch(events, user_id)

        except FileNotFoundError:
            logger.error(f"File not found: {file_path}")
            self.stats['errors'].append(f"File not found: {file_path}")
            return self.stats
        except Exception as e:
            logger.error(f"CSV parsing error: {e}")
            self.stats['errors'].append(str(e))
            return self.stats

    def print_stats(self):
        """Print ingestion statistics."""
        print("\n" + "="*60)
        print("INGESTION STATISTICS")
        print("="*60)
        print(f"Events created:      {self.stats['events_created']}")
        print(f"Sources created:     {self.stats['sources_created']}")
        print(f"Events skipped:      {self.stats['events_skipped']}")
        print(f"Image URLs replaced: {self.stats['image_urls_replaced']}")
        print(f"Errors:              {len(self.stats['errors'])}")

        if self.stats['errors']:
            print("\nErrors encountered:")
            for error in self.stats['errors'][:10]:  # Show first 10 errors
                print(f"  - {error}")
            if len(self.stats['errors']) > 10:
                print(f"  ... and {len(self.stats['errors']) - 10} more")

        print("="*60 + "\n")


def get_db_config() -> Dict[str, str]:
    """Get database configuration from environment or defaults."""
    import os

    return {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': os.getenv('DB_PORT', '5432'),
        'database': os.getenv('DB_NAME', 'timeline'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', ''),
    }


def main():
    parser = argparse.ArgumentParser(
        description='Ingest timeline events with sources into the database'
    )
    parser.add_argument(
        '--file', '-f',
        required=True,
        help='Path to input file (JSON or CSV)'
    )
    parser.add_argument(
        '--format',
        choices=['json', 'csv', 'auto'],
        default='auto',
        help='Input file format (default: auto-detect)'
    )
    parser.add_argument(
        '--user-id', '-u',
        help='UUID of user creating events (optional)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Run without writing to database'
    )
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Verbose logging'
    )
    parser.add_argument(
        '--host',
        help='Database host'
    )
    parser.add_argument(
        '--port',
        help='Database port'
    )
    parser.add_argument(
        '--database',
        help='Database name'
    )
    parser.add_argument(
        '--user',
        help='Database user'
    )

    args = parser.parse_args()

    if args.verbose:
        logger.setLevel(logging.DEBUG)

    # Get database config
    db_config = get_db_config()
    if args.host:
        db_config['host'] = args.host
    if args.port:
        db_config['port'] = args.port
    if args.database:
        db_config['database'] = args.database
    if args.user:
        db_config['user'] = args.user

    # Auto-detect format if needed
    file_format = args.format
    if file_format == 'auto':
        if args.file.endswith('.json'):
            file_format = 'json'
        elif args.file.endswith('.csv'):
            file_format = 'csv'
        else:
            logger.error("Cannot auto-detect format. Please specify --format")
            return 1

    # Create ingester
    ingester = TimelineDataIngester(db_config, dry_run=args.dry_run)

    if not args.dry_run:
        if not ingester.connect():
            return 1

    try:
        # Ingest based on format
        if file_format == 'json':
            stats = ingester.ingest_from_json_file(args.file, args.user_id)
        else:
            stats = ingester.ingest_from_csv_file(args.file, args.user_id)

        ingester.print_stats()

        return 0 if len(stats['errors']) == 0 else 1

    finally:
        if not args.dry_run:
            ingester.disconnect()


if __name__ == '__main__':
    sys.exit(main())
