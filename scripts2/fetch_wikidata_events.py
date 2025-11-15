#!/usr/bin/env python3
"""
Fetch authoritative historical events from Wikidata.
This script queries Wikidata for significant historical events and prepares them for ingestion.
"""

import requests
import json
import logging
from typing import List, Dict, Optional
from datetime import datetime
import time

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

WIKIDATA_SPARQL_ENDPOINT = "https://query.wikidata.org/sparql"

# Category mapping from Wikidata classes to our categories
WIKIDATA_TO_CATEGORY = {
    'Q178561': 'battle',  # battle
    'Q1190554': 'war_major',  # occurrence (war)
    'Q198': 'war_major',  # war
    'Q7318': 'genetics_dna',  # scientific discovery
    'Q42848': 'medicine_breakthrough',  # medical discovery
    'Q11862829': 'astronomy_observation',  # astronomical event
    'Q10931': 'revolution_uprising',  # revolution
    'Q8686': 'government_system',  # election
    'Q18450455': 'treaty_diplomacy',  # treaty
    'Q179289': 'independence',  # independence
    'Q1656682': 'disaster',  # disaster
    'Q7944': 'economics',  # economy
    'Q40218': 'space_exploration',  # space mission
}


def query_wikidata(sparql_query: str, limit: int = 1000) -> List[Dict]:
    """Execute a SPARQL query against Wikidata."""
    headers = {
        'User-Agent': 'HistoricalTimelineBot/1.0 (https://github.com/timeline; contact@timeline.org)',
        'Accept': 'application/sparql-results+json'
    }

    params = {
        'query': sparql_query,
        'format': 'json'
    }

    try:
        response = requests.get(WIKIDATA_SPARQL_ENDPOINT, params=params, headers=headers, timeout=60)
        response.raise_for_status()
        data = response.json()
        return data.get('results', {}).get('bindings', [])
    except Exception as e:
        logger.error(f"Error querying Wikidata: {e}")
        return []


def build_historical_events_query(offset: int = 0, limit: int = 1000) -> str:
    """
    Build SPARQL query to fetch significant historical events.
    Focuses on events with:
    - Point in time (date)
    - Coordinates (location)
    - Description
    - Image (if available)
    """
    return f"""
    SELECT DISTINCT ?event ?eventLabel ?eventDescription ?pointInTime ?coord ?image ?instanceOf
    WHERE {{
      # Get events that are instances of historical events
      ?event wdt:P31/wdt:P279* wd:Q1190554.  # occurrence/event

      # Must have a point in time
      ?event wdt:P585 ?pointInTime.

      # Must have coordinates
      ?event wdt:P625 ?coord.

      # Get optional image
      OPTIONAL {{ ?event wdt:P18 ?image. }}

      # Get instance type
      OPTIONAL {{ ?event wdt:P31 ?instanceOf. }}

      # Get labels and descriptions in English
      SERVICE wikibase:label {{
        bd:serviceParam wikibase:language "en".
        ?event rdfs:label ?eventLabel.
        ?event schema:description ?eventDescription.
      }}

      # Filter out events without descriptions
      FILTER(BOUND(?eventDescription))
      FILTER(LANG(?eventDescription) = "en")
    }}
    ORDER BY DESC(?pointInTime)
    LIMIT {limit}
    OFFSET {offset}
    """


def build_wars_query(offset: int = 0, limit: int = 1000) -> str:
    """Build SPARQL query specifically for wars and battles."""
    return f"""
    SELECT DISTINCT ?event ?eventLabel ?eventDescription ?startTime ?endTime ?coord ?image ?casualties
    WHERE {{
      # Wars and battles
      {{ ?event wdt:P31 wd:Q198. }}  # war
      UNION
      {{ ?event wdt:P31 wd:Q178561. }}  # battle

      # Must have start time
      ?event wdt:P580 ?startTime.

      # Optional end time
      OPTIONAL {{ ?event wdt:P582 ?endTime. }}

      # Must have coordinates
      ?event wdt:P625 ?coord.

      # Optional casualties
      OPTIONAL {{ ?event wdt:P1120 ?casualties. }}

      # Optional image
      OPTIONAL {{ ?event wdt:P18 ?image. }}

      SERVICE wikibase:label {{
        bd:serviceParam wikibase:language "en".
        ?event rdfs:label ?eventLabel.
        ?event schema:description ?eventDescription.
      }}

      FILTER(BOUND(?eventDescription))
    }}
    ORDER BY DESC(?startTime)
    LIMIT {limit}
    OFFSET {offset}
    """


def build_scientific_discoveries_query(offset: int = 0, limit: int = 1000) -> str:
    """Build SPARQL query for scientific discoveries."""
    return f"""
    SELECT DISTINCT ?event ?eventLabel ?eventDescription ?pointInTime ?coord ?image ?discoverer
    WHERE {{
      # Scientific discoveries
      ?event wdt:P31 wd:Q7318.  # scientific discovery

      # Must have a point in time
      ?event wdt:P585 ?pointInTime.

      # Get location through discoverer or institution
      {{
        ?event wdt:P61 ?discoverer.  # discoverer
        ?discoverer wdt:P937 ?workplace.  # work location
        ?workplace wdt:P625 ?coord.
      }}
      UNION
      {{
        ?event wdt:P276 ?location.  # location
        ?location wdt:P625 ?coord.
      }}

      # Optional image
      OPTIONAL {{ ?event wdt:P18 ?image. }}

      SERVICE wikibase:label {{
        bd:serviceParam wikibase:language "en".
        ?event rdfs:label ?eventLabel.
        ?event schema:description ?eventDescription.
      }}

      FILTER(BOUND(?eventDescription))
    }}
    ORDER BY DESC(?pointInTime)
    LIMIT {limit}
    OFFSET {offset}
    """


def parse_wikidata_date(date_str: str) -> Optional[int]:
    """Convert Wikidata date string to Unix timestamp."""
    try:
        # Handle various Wikidata date formats
        # Format: +YYYY-MM-DDT00:00:00Z
        if date_str.startswith('+') or date_str.startswith('-'):
            date_str = date_str[1:]  # Remove leading + or -

        # Parse ISO format
        dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        return int(dt.timestamp())
    except Exception as e:
        logger.warning(f"Could not parse date: {date_str} - {e}")
        return None


def parse_wikidata_coordinates(coord_str: str) -> Optional[tuple]:
    """Parse Wikidata Point coordinate string."""
    try:
        # Format: Point(longitude latitude)
        coord_str = coord_str.replace('Point(', '').replace(')', '')
        lon, lat = map(float, coord_str.split())
        return (lat, lon)
    except Exception as e:
        logger.warning(f"Could not parse coordinates: {coord_str} - {e}")
        return None


def convert_to_event_format(wikidata_result: Dict) -> Optional[Dict]:
    """Convert Wikidata result to our event format."""
    try:
        event_id = wikidata_result.get('event', {}).get('value', '')
        title = wikidata_result.get('eventLabel', {}).get('value', '')
        description = wikidata_result.get('eventDescription', {}).get('value', '')

        # Get time
        time_field = wikidata_result.get('pointInTime') or wikidata_result.get('startTime')
        if not time_field:
            return None

        unix_seconds = parse_wikidata_date(time_field.get('value', ''))
        if not unix_seconds:
            return None

        # Get coordinates
        coord_str = wikidata_result.get('coord', {}).get('value', '')
        coords = parse_wikidata_coordinates(coord_str)
        if not coords:
            return None

        lat, lon = coords

        # Get image if available
        image_url = wikidata_result.get('image', {}).get('value')

        # Build event
        event = {
            'title': title,
            'description': description,
            'unix_seconds': unix_seconds,
            'unix_nanos': 0,
            'precision_level': 'day',
            'importance_score': 50,  # Default, can be refined
            'latitude': lat,
            'longitude': lon,
            'location_name': 'Unknown',  # Will be geocoded later
            'category': 'history',  # Default category
            'sources': [
                {
                    'title': f'Wikidata - {event_id.split("/")[-1]}',
                    'url': event_id,
                    'source_type': 'database',
                    'credibility_score': 95
                }
            ]
        }

        if image_url:
            event['image_url'] = image_url

        return event
    except Exception as e:
        logger.error(f"Error converting event: {e}")
        return None


def fetch_events_batch(batch_size: int = 1000, max_batches: int = 1000) -> List[Dict]:
    """Fetch events in batches from Wikidata."""
    all_events = []

    for batch_num in range(max_batches):
        offset = batch_num * batch_size
        logger.info(f"Fetching batch {batch_num + 1}/{max_batches} (offset: {offset})...")

        # Try different query types
        queries = [
            build_wars_query(offset, batch_size),
            build_scientific_discoveries_query(offset, batch_size),
            build_historical_events_query(offset, batch_size),
        ]

        for query in queries:
            results = query_wikidata(query, batch_size)

            for result in results:
                event = convert_to_event_format(result)
                if event:
                    all_events.append(event)

            logger.info(f"Fetched {len(results)} results, converted {len([e for e in all_events if e])} events")

            # Rate limiting
            time.sleep(2)

        if len(all_events) >= 10000:  # Safety limit for testing
            logger.info(f"Reached {len(all_events)} events, stopping...")
            break

    return all_events


def main():
    logger.info("Starting Wikidata event fetch...")

    # Fetch events
    events = fetch_events_batch(batch_size=100, max_batches=10)

    logger.info(f"Fetched {len(events)} total events")

    # Save to JSON
    output_file = 'wikidata_events.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({'events': events}, f, indent=2, ensure_ascii=False)

    logger.info(f"Saved events to {output_file}")


if __name__ == '__main__':
    main()
