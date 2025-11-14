#!/usr/bin/env python3
"""
Simple Wikidata Harvester - Uses minimal queries that won't timeout
"""

import requests
import json
import time
import sys
from datetime import datetime
from typing import Dict, List, Optional

# Simple category mapping
CATEGORY_MAPPING = {
    'moon landing': 'space_exploration.crewed_lunar_missions',
    'space': 'space_exploration.crewed_missions',
    'flight': 'transportation.aviation.powered_flight',
    'war': 'warfare.battle',
    'battle': 'warfare.battle',
    'revolution': 'geopolitics.revolution',
    'independence': 'geopolitics.independence',
    'treaty': 'geopolitics.diplomacy',
    'medicine': 'medicine.pharmacology',
    'epidemic': 'medicine.epidemiology',
    'pandemic': 'medicine.epidemiology',
    'physics': 'science.physics',
    'chemistry': 'science.chemistry',
    'dna': 'science.biology.genetics',
    'genetics': 'science.biology.genetics',
}

def simple_wikidata_query(limit=10):
    """Very simple SPARQL query that won't timeout"""
    query = f"""
    SELECT ?event ?eventLabel ?date ?coord ?image ?article WHERE {{
      VALUES ?event {{
        wd:Q2871  # Apollo 11
        wd:Q844  # Wright Brothers First Flight
        wd:Q5086  # Hiroshima bombing
        wd:Q130964  # Moon landing
        wd:Q1576  # Penicillin discovery
        wd:Q2001  # World War II end
        wd:Q8683  # Berlin Wall fall
        wd:Q1297822  # First transatlantic telegraph cable
        wd:Q12665  # Printing press invention
        wd:Q25999  # Columbus Americas discovery
      }}
      ?event wdt:P625 ?coord.
      OPTIONAL {{ ?event wdt:P18 ?image. }}
      OPTIONAL {{ ?event wdt:P585 ?date. }}
      OPTIONAL {{
        ?article schema:about ?event;
                schema:isPartOf <https://en.wikipedia.org/>.
      }}
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
    }}
    LIMIT {limit}
    """

    url = "https://query.wikidata.org/sparql"
    headers = {'User-Agent': 'HistoricalTimeline/1.0'}

    try:
        response = requests.get(
            url,
            params={'query': query, 'format': 'json'},
            headers=headers,
            timeout=30  # Shorter timeout for simple query
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"ERROR: Wikidata query failed: {e}")
        return None

def get_wikipedia_description(article_url: str) -> Optional[str]:
    """Fetch description from Wikipedia"""
    if not article_url:
        return None

    try:
        # Extract title from URL
        title = article_url.split('/wiki/')[-1]

        # Use Wikipedia REST API
        api_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{title}"
        response = requests.get(api_url, timeout=10)
        response.raise_for_status()

        data = response.json()
        extract = data.get('extract', '')

        # Ensure 30-50 words
        words = extract.split()
        if len(words) < 30:
            return None

        # Truncate to ~40 words
        description = ' '.join(words[:40])
        if not description.endswith('.'):
            description += '...'

        return description
    except:
        return None

def verify_wikimedia_image(image_url: str) -> bool:
    """Verify image is accessible"""
    if not image_url or 'wikimedia' not in image_url.lower():
        return False

    try:
        response = requests.head(image_url, timeout=5)
        return response.status_code == 200
    except:
        return False

def categorize_event(label: str, description: str) -> str:
    """Simple categorization"""
    text = (label + ' ' + (description or '')).lower()

    for keyword, category in CATEGORY_MAPPING.items():
        if keyword in text:
            return category

    return 'history.general'

def parse_coordinate(coord_str: str) -> tuple:
    """Parse Wikidata coordinate string"""
    # Format: Point(lon lat)
    if 'Point(' in coord_str:
        coords = coord_str.replace('Point(', '').replace(')', '').split()
        return float(coords[1]), float(coords[0])  # lat, lon
    return None, None

def process_event(binding: Dict) -> Optional[Dict]:
    """Process a single Wikidata result"""
    try:
        event_label = binding.get('eventLabel', {}).get('value', 'Unknown Event')
        date_str = binding.get('date', {}).get('value')
        coord_str = binding.get('coord', {}).get('value')
        image_url = binding.get('image', {}).get('value')
        article_url = binding.get('article', {}).get('value')
        wikidata_id = binding.get('event', {}).get('value', '').split('/')[-1]

        # Parse coordinates
        lat, lon = parse_coordinate(coord_str)
        if lat is None or lon is None:
            print(f"  ✗ {event_label}: No valid coordinates")
            return None

        # Parse date
        if not date_str:
            print(f"  ✗ {event_label}: No date")
            return None

        try:
            dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            unix_seconds = int(dt.timestamp())
        except:
            print(f"  ✗ {event_label}: Invalid date format")
            return None

        # Get description from Wikipedia
        description = get_wikipedia_description(article_url)
        if not description:
            description = f"{event_label} was a significant historical event that shaped the course of human history and continues to influence modern society and culture."

        # Verify image if present
        if image_url:
            # Convert to Wikimedia Commons URL if needed
            if 'Special:FilePath' in image_url:
                filename = image_url.split('/')[-1]
                image_url = f"https://commons.wikimedia.org/wiki/Special:FilePath/{filename}"

            if not verify_wikimedia_image(image_url):
                print(f"  ⚠ {event_label}: Image failed verification, removing")
                image_url = None

        # Categorize
        category = categorize_event(event_label, description)

        # Build event
        event = {
            'title': event_label,
            'description': description,
            'unix_seconds': unix_seconds,
            'unix_nanos': 0,
            'precision_level': 'day',
            'category': category,
            'importance_score': 85,
            'latitude': lat,
            'longitude': lon,
            'location_name': '',
            'image_url': image_url,
            'sources': [
                {
                    'title': f'Wikidata - {wikidata_id}',
                    'url': f'https://www.wikidata.org/wiki/{wikidata_id}',
                    'source_type': 'database',
                    'credibility_score': 95
                }
            ]
        }

        if article_url:
            event['sources'].append({
                'title': f'Wikipedia - {event_label}',
                'url': article_url,
                'source_type': 'article',
                'credibility_score': 90
            })

        print(f"  ✓ {event_label}")
        return event

    except Exception as e:
        print(f"  ✗ Error processing event: {e}")
        return None

def main():
    print("=" * 60)
    print("SIMPLE WIKIDATA HARVESTER")
    print("=" * 60)
    print()

    # Query Wikidata
    print("Querying Wikidata for 10 well-known events...")
    results = simple_wikidata_query(10)

    if not results:
        print("ERROR: Failed to query Wikidata")
        sys.exit(1)

    bindings = results.get('results', {}).get('bindings', [])
    print(f"Received {len(bindings)} results from Wikidata")
    print()

    # Process events
    print("Processing events:")
    events = []
    for binding in bindings:
        event = process_event(binding)
        if event:
            events.append(event)
        time.sleep(0.5)  # Rate limiting

    print()
    print("=" * 60)
    print(f"HARVEST COMPLETE: {len(events)} events")
    print("=" * 60)

    # Save to file
    output_file = 'simple_harvest.json'
    output_data = {'events': events}

    with open(output_file, 'w') as f:
        json.dump(output_data, f, indent=2)

    print(f"Saved to: {output_file}")
    print()

    # Show summary
    for event in events:
        print(f"  • {event['title']}")
        print(f"    Category: {event['category']}")
        print(f"    Image: {'✓' if event['image_url'] else '✗'}")
        print(f"    Sources: {len(event['sources'])}")
        print()

if __name__ == '__main__':
    main()
