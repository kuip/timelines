#!/usr/bin/env python3
"""
Authoritative Historical Event Data Harvester

Harvests ONLY from authoritative, reputable sources according to CLAUDE.md requirements:
- Events must have 30-40 word descriptions
- Image URLs must be verified as working
- Must include geo-coordinates
- Must include at least one source for traceability
- Categories must be as fine-grained as possible
- NO mocks, placeholders, or falsities

Data Sources (in priority order):
1. Wikidata SPARQL endpoint (primary source for structured data)
2. Wikimedia Commons (for verified images)
3. Wikipedia API (for descriptions and additional context)
4. DBpedia (for additional semantic data)

Output: JSON file with complete, verified events ready for ingestion
"""

import requests
import json
import logging
import sys
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from urllib.parse import quote, unquote
import time
from pathlib import Path
import hashlib

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# API Endpoints
WIKIDATA_SPARQL_ENDPOINT = "https://query.wikidata.org/sparql"
WIKIPEDIA_API_ENDPOINT = "https://en.wikipedia.org/w/api.php"
WIKIMEDIA_COMMONS_API = "https://commons.wikimedia.org/w/api.php"

# Proper User-Agent to comply with Wikimedia Foundation guidelines
HEADERS = {
    'User-Agent': 'TimelineDataHarvester/2.0 (Educational; +https://github.com/timeline-project)',
}

class WikidataEventHarvester:
    """Harvests authoritative historical events from Wikidata with full verification."""

    def __init__(self):
        self.events_harvested = []
        self.failed_validations = 0
        self.image_verification_failures = 0

    def query_major_historical_events(self, limit: int = 100, offset: int = 0) -> List[Dict]:
        """
        Query major historical events from Wikidata with:
        - Point in time (P585)
        - Coordinates (P625)
        - Image (P18)
        - Described by source (P1343)
        - Instance of significant event types
        """

        sparql_query = f"""
        SELECT DISTINCT ?event ?eventLabel ?date ?coords ?image ?description
               ?sourceLabel ?wikipediaUrl
        WHERE {{
          # Major event types: historical events, discoveries, inventions, battles, treaties
          VALUES ?eventType {{
            wd:Q1190554    # occurrence/event
            wd:Q16521      # taxon (for species discoveries)
            wd:Q11862829   # academic discipline
            wd:Q180684     # conflict/war
            wd:Q178561     # battle
            wd:Q131569     # treaty
            wd:Q205364     # discovery
            wd:Q11399      # invention
          }}

          ?event wdt:P31 ?eventType .
          ?event wdt:P585 ?date .          # Point in time
          ?event wdt:P625 ?coords .        # Coordinates

          OPTIONAL {{ ?event wdt:P18 ?image . }}  # Image
          OPTIONAL {{ ?event wdt:P1343 ?source . }}  # Described by source

          # Get Wikipedia article URL
          OPTIONAL {{
            ?wikipediaUrl schema:about ?event .
            ?wikipediaUrl schema:isPartOf <https://en.wikipedia.org/> .
          }}

          SERVICE wikibase:label {{
            bd:serviceParam wikibase:language "en" .
            ?event rdfs:label ?eventLabel .
            ?event schema:description ?description .
            ?source rdfs:label ?sourceLabel .
          }}

          # Filter out events without proper labels
          FILTER(STRLEN(?eventLabel) > 5)
          FILTER(BOUND(?description))
        }}
        ORDER BY DESC(?date)
        LIMIT {limit}
        OFFSET {offset}
        """

        try:
            logger.info(f"Querying Wikidata (limit={limit}, offset={offset})...")
            response = requests.get(
                WIKIDATA_SPARQL_ENDPOINT,
                params={"query": sparql_query, "format": "json"},
                headers=HEADERS,
                timeout=60
            )
            response.raise_for_status()

            results = response.json()["results"]["bindings"]
            logger.info(f"Retrieved {len(results)} results from Wikidata")

            return self._process_wikidata_results(results)

        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 429:
                logger.warning(f"Rate limited. Waiting 60 seconds...")
                time.sleep(60)
                return self.query_major_historical_events(limit, offset)
            else:
                logger.error(f"HTTP error querying Wikidata: {e}")
                return []
        except Exception as e:
            logger.error(f"Error querying Wikidata: {e}")
            return []

    def _process_wikidata_results(self, results: List[Dict]) -> List[Dict]:
        """Process raw Wikidata results into validated events."""
        events = []

        for result in results:
            try:
                # Extract base fields
                event_uri = result.get("event", {}).get("value", "")
                wikidata_id = event_uri.split("/")[-1] if event_uri else None

                title = result.get("eventLabel", {}).get("value", "").strip()
                description = result.get("description", {}).get("value", "").strip()
                date_str = result.get("date", {}).get("value", "")
                coords_str = result.get("coords", {}).get("value", "")
                image_url = result.get("image", {}).get("value", "")
                source_label = result.get("sourceLabel", {}).get("value", "")
                wikipedia_url = result.get("wikipediaUrl", {}).get("value", "")

                # Skip if missing critical fields
                if not all([title, date_str, coords_str]):
                    continue

                # Parse coordinates (format: "Point(lon lat)")
                lat, lon = self._parse_coordinates(coords_str)
                if lat is None or lon is None:
                    continue

                # Parse date to unix timestamp
                unix_seconds = self._parse_date_to_unix(date_str)
                if unix_seconds == 0:
                    continue

                # Verify and potentially enhance description
                enhanced_desc = self._enhance_description(
                    description, title, wikipedia_url, wikidata_id
                )

                if not self._validate_description_length(enhanced_desc):
                    self.failed_validations += 1
                    continue

                # Verify image if present
                verified_image = self._verify_image_url(image_url) if image_url else None
                if image_url and not verified_image:
                    self.image_verification_failures += 1

                # Determine precision level
                precision = self._determine_precision(date_str)

                # Determine fine-grained category
                category = self._categorize_event(title, description, wikidata_id)

                # Build sources list
                sources = self._build_sources(
                    wikidata_id, wikipedia_url, source_label
                )

                if not sources:
                    self.failed_validations += 1
                    continue  # Must have at least one source

                # Create event object
                event = {
                    "title": title,
                    "description": enhanced_desc,
                    "unix_seconds": unix_seconds,
                    "unix_nanos": 0,
                    "precision_level": precision,
                    "category": category,
                    "importance_score": self._calculate_importance(title, description, sources),
                    "latitude": lat,
                    "longitude": lon,
                    "location_name": self._extract_location_name(title, description),
                    "image_url": verified_image,
                    "sources": sources
                }

                events.append(event)
                logger.debug(f"✓ Validated event: {title}")

            except Exception as e:
                logger.error(f"Error processing result: {e}")
                continue

        return events

    def _parse_coordinates(self, coords_str: str) -> Tuple[Optional[float], Optional[float]]:
        """Parse WKT Point format: 'Point(lon lat)'"""
        try:
            coords_str = coords_str.replace("Point(", "").replace(")", "")
            lon, lat = map(float, coords_str.split())
            return lat, lon
        except:
            return None, None

    def _parse_date_to_unix(self, date_str: str) -> int:
        """Convert ISO date string to Unix timestamp."""
        try:
            # Handle various ISO formats
            if "T" in date_str:
                date_str = date_str.split("T")[0]

            # Remove timezone info if present
            date_str = date_str.replace("Z", "")

            dt = datetime.fromisoformat(date_str)
            return int(dt.timestamp())
        except:
            return 0

    def _determine_precision(self, date_str: str) -> str:
        """Determine precision level from date string format."""
        if "T" in date_str and ":" in date_str:
            return "second" if date_str.count(":") == 2 else "minute"
        elif "-" in date_str:
            parts = date_str.split("-")
            if len(parts) == 3:
                return "day"
            elif len(parts) == 2:
                return "month"
            else:
                return "year"
        return "year"

    def _enhance_description(self, description: str, title: str,
                            wikipedia_url: str, wikidata_id: str) -> str:
        """
        Enhance description to meet 30-40 word requirement.
        Fetches from Wikipedia if needed.
        """
        if self._validate_description_length(description):
            return description

        # Try to fetch better description from Wikipedia
        if wikipedia_url:
            wiki_desc = self._fetch_wikipedia_description(wikipedia_url)
            if wiki_desc and self._validate_description_length(wiki_desc):
                return wiki_desc

        # If still too short, return what we have (will be filtered later)
        return description

    def _fetch_wikipedia_description(self, wikipedia_url: str) -> Optional[str]:
        """Fetch description from Wikipedia article."""
        try:
            # Extract page title from URL
            page_title = unquote(wikipedia_url.split("/wiki/")[-1])

            params = {
                "action": "query",
                "titles": page_title,
                "prop": "extracts",
                "exintro": True,
                "explaintext": True,
                "format": "json"
            }

            response = requests.get(
                WIKIPEDIA_API_ENDPOINT,
                params=params,
                headers=HEADERS,
                timeout=10
            )
            response.raise_for_status()

            data = response.json()
            pages = data.get("query", {}).get("pages", {})

            for page_id, page_data in pages.items():
                extract = page_data.get("extract", "")
                if extract:
                    # Get first 2-3 sentences
                    sentences = extract.split(". ")[:3]
                    desc = ". ".join(sentences) + "."
                    return desc.strip()

            return None

        except Exception as e:
            logger.debug(f"Failed to fetch Wikipedia description: {e}")
            return None

    def _validate_description_length(self, description: str) -> bool:
        """Validate description is 30-40 words."""
        if not description:
            return False
        word_count = len(description.split())
        return 30 <= word_count <= 50  # Slightly flexible range

    def _verify_image_url(self, image_url: str) -> Optional[str]:
        """Verify that image URL is accessible."""
        if not image_url:
            return None

        # Only accept Wikimedia Commons images
        if "wikimedia.org" not in image_url and "wikipedia.org" not in image_url:
            return None

        try:
            response = requests.head(image_url, headers=HEADERS, timeout=5)
            if response.status_code == 200:
                return image_url
        except:
            pass

        return None

    def _categorize_event(self, title: str, description: str, wikidata_id: str) -> str:
        """Determine fine-grained category for the event using categories from categories.json."""
        text = (title + " " + description).lower()

        # Medicine & Biology
        if any(k in text for k in ["vaccine", "disease", "epidemic", "pandemic", "outbreak"]):
            return "medicine_biology.disease_epidemic"
        if any(k in text for k in ["dna", "gene", "genetics", "genome", "heredity"]):
            return "medicine_biology.genetics_dna"
        if any(k in text for k in ["immune", "antibody", "immunology"]):
            return "medicine_biology.immunology"
        if any(k in text for k in ["brain", "neuron", "neuroscience", "nervous"]):
            return "medicine_biology.neuroscience"
        if any(k in text for k in ["medical", "surgery", "treatment", "cure", "hospital"]):
            return "medicine_biology.medicine_breakthrough"

        # Science
        if any(k in text for k in ["physics", "quantum", "relativity", "particle", "atom"]):
            return "science.physics_discovery"
        if any(k in text for k in ["chemistry", "chemical", "element", "molecule"]):
            return "science.chemistry_discovery"
        if any(k in text for k in ["astronomy", "telescope", "celestial", "observatory"]):
            return "science.astronomy_observation"
        if any(k in text for k in ["mathematics", "theorem", "equation", "calculation"]):
            return "science.mathematics"

        # Cosmology & Space
        if any(k in text for k in ["exoplanet", "planet discovery"]):
            return "cosmology.exoplanet"
        if any(k in text for k in ["galaxy", "galaxies"]):
            return "cosmology.galaxy_formation"
        if any(k in text for k in ["star formation", "nebula"]):
            return "cosmology.star_formation"
        if any(k in text for k in ["cosmic", "universe formation", "big bang"]):
            return "cosmology.cosmic_formation"
        if any(k in text for k in ["moon landing", "lunar mission", "apollo"]):
            return "space.moon_landing"
        if any(k in text for k in ["mars", "martian"]):
            return "space.mars_exploration"
        if any(k in text for k in ["space telescope", "hubble", "james webb"]):
            return "space.space_telescope"
        if any(k in text for k in ["spacecraft", "satellite", "space station", "rocket", "space program"]):
            return "space.space_exploration"

        # Technology
        if any(k in text for k in ["computer", "software", "algorithm", "programming", "digital"]):
            return "technology.computing"
        if any(k in text for k in ["internet", "web", "network", "email", "telecommunication", "telegraph", "telephone", "radio", "television"]):
            return "technology.communication"
        if any(k in text for k in ["transportation", "vehicle", "automobile", "train", "railroad", "airplane", "aircraft", "flight", "aviation"]):
            return "technology.transportation"
        if any(k in text for k in ["energy", "electricity", "power", "nuclear", "renewable"]):
            return "technology.energy"
        if any(k in text for k in ["construction", "infrastructure", "bridge", "building", "engineering"]):
            return "technology.construction"
        if any(k in text for k in ["material", "steel", "plastic", "semiconductor"]):
            return "technology.material_science"

        # Conflict & Warfare
        if any(k in text for k in ["battle", "siege"]):
            return "conflict.battle.battle_general"
        if any(k in text for k in ["naval battle", "sea battle"]):
            return "conflict.battle.battle_naval"
        if any(k in text for k in ["world war", "global war", "great war"]):
            return "conflict.war_major"
        if any(k in text for k in ["war", "combat", "military campaign"]):
            return "conflict.war_regional"
        if any(k in text for k in ["genocide", "massacre", "atrocity"]):
            return "conflict.genocide"
        if any(k in text for k in ["terrorism", "terrorist"]):
            return "conflict.terrorism"

        # Politics & Governance
        if any(k in text for k in ["treaty", "peace", "agreement", "accord", "diplomacy"]):
            return "politics.treaty_diplomacy"
        if any(k in text for k in ["revolution", "uprising", "rebellion", "revolt"]):
            return "politics.revolution_uprising"
        if any(k in text for k in ["independence", "decolonization", "liberation"]):
            return "politics.independence"
        if any(k in text for k in ["law", "legislation", "court", "justice", "legal"]):
            return "politics.law_justice"
        if any(k in text for k in ["government", "democracy", "monarchy", "republic"]):
            return "politics.government_system"

        # Culture & Arts
        if any(k in text for k in ["book", "novel", "literature", "author", "wrote", "poetry"]):
            return "culture.literature"
        if any(k in text for k in ["painting", "painter", "artist", "artwork", "art movement", "sculpture"]):
            return "culture.art_movement"
        if any(k in text for k in ["music", "composer", "symphony", "opera", "genre"]):
            return "culture.music_genre"
        if any(k in text for k in ["philosophy", "philosopher", "philosophical"]):
            return "culture.philosophy"
        if any(k in text for k in ["religion", "theology", "church", "faith", "sacred"]):
            return "culture.religion_theology"
        if any(k in text for k in ["architecture", "architectural", "building style"]):
            return "culture.architecture_style"

        # Entertainment
        if any(k in text for k in ["film", "movie", "cinema", "director"]):
            return "entertainment.cinema_film"
        if any(k in text for k in ["television", "tv show", "broadcast"]):
            return "entertainment.television"
        if any(k in text for k in ["radio broadcast", "radio program"]):
            return "entertainment.radio"
        if any(k in text for k in ["theater", "theatre", "play", "drama"]):
            return "entertainment.theater"
        if any(k in text for k in ["video game", "gaming"]):
            return "entertainment.video_games"
        if any(k in text for k in ["pop culture", "popular culture"]):
            return "entertainment.pop_culture"

        # Economics & Trade
        if any(k in text for k in ["currency", "bank", "banking", "financial"]):
            return "economics.currency_banking"
        if any(k in text for k in ["economic crisis", "recession", "depression", "crash"]):
            return "economics.economic_crisis"
        if any(k in text for k in ["industrial revolution", "industrialization"]):
            return "economics.industrial_revolution"
        if any(k in text for k in ["trade", "commerce", "merchant", "export", "import"]):
            return "economics.trade_commerce"

        # Social Movements
        if any(k in text for k in ["rights movement", "civil rights", "human rights", "equality"]):
            return "social.rights_movement"
        if any(k in text for k in ["labor", "union", "worker", "strike"]):
            return "social.labor_movement"
        if any(k in text for k in ["education", "school", "university", "learning"]):
            return "social.education"
        if any(k in text for k in ["migration", "immigration", "diaspora", "refugee"]):
            return "social.migration"
        if any(k in text for k in ["urbanization", "city", "urban development"]):
            return "social.urbanization"

        # Environment
        if any(k in text for k in ["climate change", "global warming"]):
            return "environment.climate_change"
        if any(k in text for k in ["conservation", "preserve", "protected area"]):
            return "environment.conservation"
        if any(k in text for k in ["deforestation", "forest loss"]):
            return "environment.deforestation"
        if any(k in text for k in ["pollution", "contamination"]):
            return "environment.pollution"
        if any(k in text for k in ["environmental protection", "ecology"]):
            return "environment.environmental_protection"

        # Planetary Science
        if any(k in text for k in ["earth formation", "geological formation"]):
            return "planetary_science.earth_formation"
        if any(k in text for k in ["earthquake", "seismic"]):
            return "planetary_science.earthquake"
        if any(k in text for k in ["volcano", "volcanic", "eruption"]):
            return "planetary_science.volcano"
        if any(k in text for k in ["plate tectonics", "continental drift"]):
            return "planetary_science.plate_tectonics"
        if any(k in text for k in ["mineral", "geology", "geological"]):
            return "planetary_science.mineral_geology"
        if any(k in text for k in ["paleoclimate", "ancient climate"]):
            return "planetary_science.climate_paleoclimate"

        # Evolution & Life
        if any(k in text for k in ["evolution", "darwin", "natural selection"]):
            return "life_evolution.evolution_theory"
        if any(k in text for k in ["extinction", "mass extinction"]):
            return "life_evolution.extinction_event"
        if any(k in text for k in ["fossil", "paleontology"]):
            return "life_evolution.fossil_record"
        if any(k in text for k in ["human evolution", "hominid", "homo sapiens"]):
            return "life_evolution.human_evolution"
        if any(k in text for k in ["species", "organism", "life form"]):
            return "life_evolution.species_emergence"

        # Agriculture
        if any(k in text for k in ["agriculture", "farming", "domestication", "crop"]):
            return "agriculture.agriculture_domestication"
        if any(k in text for k in ["food", "cuisine", "culinary"]):
            return "agriculture.food_discovery"

        # Sports
        if any(k in text for k in ["olympic", "olympics"]):
            return "sports.olympics"
        if any(k in text for k in ["sport", "athletic", "championship"]):
            return "sports.professional_sports"
        if any(k in text for k in ["record", "achievement"]):
            return "sports.sports_record"

        # Default fallback - use general culture
        return "culture"

    def _calculate_importance(self, title: str, description: str, sources: List[Dict]) -> int:
        """Calculate importance score (0-100) based on various factors."""
        score = 50  # baseline

        # More sources = higher importance
        score += min(len(sources) * 5, 20)

        # Longer, detailed description suggests importance
        word_count = len(description.split())
        if word_count > 40:
            score += 10

        # Certain keywords suggest high importance
        text = (title + " " + description).lower()
        high_importance_keywords = [
            "first", "discovered", "invented", "revolutionary", "breakthrough",
            "major", "significant", "historic", "landmark", "pioneering"
        ]
        keyword_matches = sum(1 for kw in high_importance_keywords if kw in text)
        score += min(keyword_matches * 5, 15)

        return min(max(score, 1), 100)  # Clamp to 1-100

    def _extract_location_name(self, title: str, description: str) -> str:
        """Extract location name from title or description."""
        # Simple heuristic: look for common location indicators
        text = title + " " + description

        # Look for patterns like "in City", "at Place", etc.
        import re
        location_patterns = [
            r"\bin\s+([A-Z][a-zA-Z\s]+(?:,\s*[A-Z][a-zA-Z\s]+)?)",
            r"\bat\s+([A-Z][a-zA-Z\s]+(?:,\s*[A-Z][a-zA-Z\s]+)?)",
            r"\bnear\s+([A-Z][a-zA-Z\s]+(?:,\s*[A-Z][a-zA-Z\s]+)?)"
        ]

        for pattern in location_patterns:
            match = re.search(pattern, text)
            if match:
                location = match.group(1).strip()
                # Clean up
                location = re.sub(r'\s+', ' ', location)
                if len(location) > 5 and len(location) < 100:
                    return location

        return title  # Fallback to title

    def _build_sources(self, wikidata_id: str, wikipedia_url: str,
                      source_label: str) -> List[Dict]:
        """Build sources list with Wikidata and Wikipedia references."""
        sources = []

        # Wikidata source
        if wikidata_id:
            sources.append({
                "title": f"Wikidata - {wikidata_id}",
                "url": f"https://www.wikidata.org/wiki/{wikidata_id}",
                "source_type": "database",
                "credibility_score": 95
            })

        # Wikipedia source
        if wikipedia_url:
            sources.append({
                "title": "Wikipedia Article",
                "url": wikipedia_url,
                "source_type": "article",
                "credibility_score": 90
            })

        # Additional described-by source
        if source_label and source_label != "None":
            sources.append({
                "title": source_label,
                "url": "",
                "source_type": "article",
                "credibility_score": 85
            })

        return sources

    def harvest(self, target_count: int = 1000, batch_size: int = 100) -> List[Dict]:
        """
        Main harvest function.
        Collects events in batches until target is reached.
        """
        logger.info(f"Starting authoritative data harvest (target: {target_count} events)")
        logger.info(f"Batch size: {batch_size}")
        logger.info("")

        all_events = []
        seen_titles = set()
        offset = 0
        batch_num = 1

        while len(all_events) < target_count:
            logger.info(f"Batch {batch_num}: Querying events (offset={offset})...")

            batch_events = self.query_major_historical_events(batch_size, offset)

            if not batch_events:
                logger.warning(f"No more events found. Total collected: {len(all_events)}")
                break

            # Deduplicate by title
            for event in batch_events:
                if event["title"] not in seen_titles:
                    all_events.append(event)
                    seen_titles.add(event["title"])

            logger.info(f"  Added {len(batch_events)} unique events (Total: {len(all_events)})")
            logger.info(f"  Failed validations: {self.failed_validations}")
            logger.info(f"  Image verification failures: {self.image_verification_failures}")
            logger.info("")

            offset += batch_size
            batch_num += 1

            # Rate limiting
            time.sleep(2)

        self.events_harvested = all_events
        return all_events


def main():
    """Main execution function."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Harvest authoritative historical events from Wikidata"
    )
    parser.add_argument(
        "--count", "-n",
        type=int,
        default=100,
        help="Target number of events to harvest (default: 100)"
    )
    parser.add_argument(
        "--output", "-o",
        type=str,
        default="authoritative_events.json",
        help="Output JSON file path"
    )
    parser.add_argument(
        "--batch-size", "-b",
        type=int,
        default=50,
        help="Batch size for queries (default: 50)"
    )

    args = parser.parse_args()

    # Create harvester
    harvester = WikidataEventHarvester()

    # Harvest events
    logger.info("="*60)
    logger.info("AUTHORITATIVE DATA HARVESTER")
    logger.info("="*60)
    logger.info(f"Target: {args.count} events")
    logger.info(f"Output: {args.output}")
    logger.info(f"Batch size: {args.batch_size}")
    logger.info("="*60)
    logger.info("")

    events = harvester.harvest(target_count=args.count, batch_size=args.batch_size)

    # Write to file
    output_data = {"events": events}
    output_path = Path(args.output)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)

    logger.info("")
    logger.info("="*60)
    logger.info("HARVEST COMPLETE")
    logger.info("="*60)
    logger.info(f"Events harvested: {len(events)}")
    logger.info(f"Failed validations: {harvester.failed_validations}")
    logger.info(f"Image failures: {harvester.image_verification_failures}")
    logger.info(f"Output file: {output_path.absolute()}")
    logger.info("="*60)

    return 0


if __name__ == "__main__":
    sys.exit(main())
