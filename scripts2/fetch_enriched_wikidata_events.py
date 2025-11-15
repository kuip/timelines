#!/usr/bin/env python3
"""
Fetch authoritative historical events from Wikidata and enrich with Wikipedia content.
This script queries Wikidata for significant historical events and enriches them with
proper descriptions from Wikipedia to meet CLAUDE.md requirements.
"""

import requests
import json
import logging
from typing import List, Dict, Optional
from datetime import datetime
import time
import re

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

WIKIDATA_SPARQL_ENDPOINT = "https://query.wikidata.org/sparql"
WIKIPEDIA_API_ENDPOINT = "https://en.wikipedia.org/w/api.php"

# Category mapping from Wikidata classes to our categories
WIKIDATA_TO_CATEGORY = {
    'Q178561': 'battle',  # battle
    'Q1190554': 'war_major',  # occurrence (war)
    'Q198': 'war_major',  # war
    'Q180684': 'conflict',  # conflict
    'Q124757': 'revolution_uprising',  # revolution
    'Q7318': 'science',  # scientific discovery
    'Q42848': 'medicine_breakthrough',  # medical discovery
    'Q11862829': 'astronomy_observation',  # astronomical event
    'Q10931': 'revolution_uprising',  # revolution
    'Q8686': 'government_system',  # election
    'Q18450455': 'treaty_diplomacy',  # treaty
    'Q179289': 'independence',  # independence
    'Q1656682': 'environment',  # disaster
    'Q7944': 'economics',  # economy
    'Q40218': 'space_exploration',  # space mission
    'Q8434': 'education',  # education
    'Q7278': 'government_system',  # political party
    'Q5': 'culture',  # human (for biographies)
}


def query_wikidata(sparql_query: str) -> List[Dict]:
    """Execute a SPARQL query against Wikidata."""
    headers = {
        'User-Agent': 'HistoricalTimelineBot/1.0',
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


def build_significant_events_query(offset: int = 0, limit: int = 100) -> str:
    """
    Build SPARQL query to fetch significant historical events with Wikipedia articles.
    Focus on past events only (before 2025).
    """
    return f"""
    SELECT DISTINCT ?event ?eventLabel ?eventDescription ?pointInTime ?coord ?image ?instanceOf ?article
    WHERE {{
      # Get events - focus on specific types more likely to have good data
      {{
        ?event wdt:P31 wd:Q178561.  # battle
      }} UNION {{
        ?event wdt:P31 wd:Q198.  # war
      }} UNION {{
        ?event wdt:P31 wd:Q7318.  # scientific discovery
      }} UNION {{
        ?event wdt:P31 wd:Q40218.  # space mission
      }} UNION {{
        ?event wdt:P31 wd:Q124757.  # revolution
      }} UNION {{
        ?event wdt:P31 wd:Q179289.  # independence
      }} UNION {{
        ?event wdt:P31 wd:Q1656682.  # disaster
      }}

      # Must have a point in time (and be in the past)
      ?event wdt:P585 ?pointInTime.
      FILTER(YEAR(?pointInTime) < 2025)
      FILTER(YEAR(?pointInTime) > 1000)  # Focus on events after year 1000

      # Must have coordinates
      ?event wdt:P625 ?coord.

      # Must have English Wikipedia article
      ?article schema:about ?event;
               schema:isPartOf <https://en.wikipedia.org/>;
               schema:name ?articleTitle.

      # Prefer events with images
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

      # Filter to get more significant events (those with Wikipedia articles)
      FILTER(BOUND(?article))
    }}
    ORDER BY DESC(?pointInTime)
    LIMIT {limit}
    OFFSET {offset}
    """


def get_wikipedia_summary(article_url: str) -> Optional[str]:
    """Fetch Wikipedia article summary (first paragraph)."""
    try:
        # Extract article title from URL
        title = article_url.split('/wiki/')[-1]

        headers = {
            'User-Agent': 'HistoricalTimelineBot/1.0 (https://github.com/timeline; contact@timeline.org)'
        }

        params = {
            'action': 'query',
            'format': 'json',
            'titles': title,
            'prop': 'extracts',
            'exintro': True,
            'explaintext': True,
        }

        response = requests.get(WIKIPEDIA_API_ENDPOINT, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()

        pages = data.get('query', {}).get('pages', {})
        for page_id, page_data in pages.items():
            extract = page_data.get('extract', '')
            if extract:
                # Clean up the extract
                extract = re.sub(r'\s+', ' ', extract).strip()
                # Get first paragraph or up to 100 words
                words = extract.split()
                if len(words) > 0:  # Accept any length
                    # Limit to reasonable size (first 100 words max)
                    description = ' '.join(words[:100])
                    # Make sure it ends with a complete sentence if possible
                    if not description.endswith('.') and '.' in description:
                        # Find last period
                        last_period = description.rfind('.')
                        if last_period > 0:
                            description = description[:last_period + 1]
                    return description

        return None
    except Exception as e:
        logger.warning(f"Error fetching Wikipedia summary for {article_url}: {e}")
        return None


def verify_image_url(url: str) -> bool:
    """Verify that an image URL is accessible."""
    try:
        response = requests.head(url, timeout=5, allow_redirects=True)
        return response.status_code == 200
    except:
        return False


def get_category_from_instance(instance_id: str) -> str:
    """Map Wikidata instance type to our category."""
    if not instance_id:
        return 'culture'

    # Extract Q-ID from full URL
    q_id = instance_id.split('/')[-1]
    return WIKIDATA_TO_CATEGORY.get(q_id, 'culture')


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
    """Convert Wikidata result to our event format with Wikipedia enrichment."""
    try:
        event_id = wikidata_result.get('event', {}).get('value', '')
        title = wikidata_result.get('eventLabel', {}).get('value', '')
        short_description = wikidata_result.get('eventDescription', {}).get('value', '')
        article_url = wikidata_result.get('article', {}).get('value', '')

        # Get enriched description from Wikipedia
        description = get_wikipedia_summary(article_url)
        if not description:
            # Fall back to short description if Wikipedia fetch failed
            if short_description:
                description = short_description
            else:
                logger.warning(f"Skipping {title}: no description available")
                return None

        # Get time
        time_field = wikidata_result.get('pointInTime')
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

        # Get category from instance type
        instance_of = wikidata_result.get('instanceOf', {}).get('value', '')
        category = get_category_from_instance(instance_of)

        # Get image (relaxed - no verification, will use category fallback if none)
        image_url = wikidata_result.get('image', {}).get('value')
        # Note: image_url can be None, ingestion script will use category SVG fallback

        # Build event
        event = {
            'title': title,
            'description': description,
            'unix_seconds': unix_seconds,
            'unix_nanos': 0,
            'precision_level': 'day',
            'importance_score': 70,  # Higher for events with Wikipedia articles
            'latitude': lat,
            'longitude': lon,
            'location_name': 'Unknown',  # Will be geocoded later
            'category': category,
            'sources': [
                {
                    'title': f'Wikidata - {event_id.split("/")[-1]}',
                    'url': event_id,
                    'source_type': 'database',
                    'credibility_score': 95
                },
                {
                    'title': f'Wikipedia - {title}',
                    'url': article_url,
                    'source_type': 'wikipedia',
                    'credibility_score': 90
                }
            ]
        }

        # Add image_url only if available
        if image_url:
            event['image_url'] = image_url

        return event
    except Exception as e:
        logger.error(f"Error converting event: {e}")
        return None


def fetch_events_batch(batch_size: int = 100, max_batches: int = 100) -> List[Dict]:
    """Fetch events in batches from Wikidata with Wikipedia enrichment."""
    all_events = []
    skipped = 0

    for batch_num in range(max_batches):
        offset = batch_num * batch_size
        logger.info(f"Fetching batch {batch_num + 1}/{max_batches} (offset: {offset})...")

        query = build_significant_events_query(offset, batch_size)
        results = query_wikidata(query)

        for result in results:
            event = convert_to_event_format(result)
            if event:
                all_events.append(event)
            else:
                skipped += 1

        logger.info(f"Batch {batch_num + 1}: Fetched {len(results)} results, converted {len(all_events)} valid events (skipped {skipped} total)")

        # Rate limiting - be nice to Wikipedia
        time.sleep(3)

        if len(all_events) >= 10000:  # Safety limit
            logger.info(f"Reached {len(all_events)} events, stopping...")
            break

    return all_events


def main():
    logger.info("Starting enriched Wikidata event fetch...")

    # Fetch events with enrichment
    events = fetch_events_batch(batch_size=50, max_batches=200)  # Will try to get up to 10,000 events

    logger.info(f"Fetched {len(events)} total valid events")

    # Save to JSON
    output_file = 'wikidata_events_enriched.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({'events': events}, f, indent=2, ensure_ascii=False)

    logger.info(f"Saved events to {output_file}")


if __name__ == '__main__':
    main()
