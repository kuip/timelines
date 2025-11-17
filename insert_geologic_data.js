const fs = require('fs');

const API_URL = 'http://localhost:8080';

// Read the JSON files
const events = JSON.parse(fs.readFileSync('./geologic_events.json', 'utf8'));
const relationships = JSON.parse(fs.readFileSync('./geologic_relationships.json', 'utf8'));

// Helper to convert unix_seconds to ISO timestamp
function unixSecondsToISO(unixSeconds) {
  // Convert to milliseconds and create Date
  const date = new Date(unixSeconds / 1000);
  return date.toISOString();
}

// Insert events
async function insertEvents() {
  console.log(`\n=== Inserting ${events.length} events ===\n`);

  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    // Prepare the event payload
    const payload = {
      id: event.id,
      title: event.title,
      description: event.description,
      event_date: event.event_date,
      timestamp: unixSecondsToISO(event.unix_seconds),
      category_id: event.category_id,
      image_url: event.image_url,
      sources: event.sources
    };

    try {
      const response = await fetch(`${API_URL}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✓ [${i+1}/${events.length}] Created: ${event.title}`);

        // Add location if provided
        if (event.location) {
          const locationPayload = {
            event_id: result.id,
            location_type: 'primary',
            coordinates: event.location
          };

          const locResponse = await fetch(`${API_URL}/api/events/${result.id}/locations`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(locationPayload)
          });

          if (locResponse.ok) {
            console.log(`  ✓ Added location`);
          }
        }
      } else {
        const error = await response.text();
        console.error(`✗ [${i+1}/${events.length}] Failed to create ${event.title}: ${error}`);
      }
    } catch (error) {
      console.error(`✗ [${i+1}/${events.length}] Error creating ${event.title}:`, error.message);
    }

    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Insert relationships
async function insertRelationships() {
  console.log(`\n=== Inserting ${relationships.length} relationships ===\n`);

  for (let i = 0; i < relationships.length; i++) {
    const rel = relationships[i];

    try {
      const response = await fetch(`${API_URL}/api/events/${rel.event_id_a}/relationships`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id_b: rel.event_id_b,
          relationship_type: rel.relationship_type,
          weight: rel.weight
        })
      });

      if (response.ok) {
        console.log(`✓ [${i+1}/${relationships.length}] Created: ${rel.event_id_a} -> ${rel.event_id_b} (${rel.relationship_type})`);
      } else {
        const error = await response.text();
        console.error(`✗ [${i+1}/${relationships.length}] Failed: ${error}`);
      }
    } catch (error) {
      console.error(`✗ [${i+1}/${relationships.length}] Error:`, error.message);
    }

    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

// Main execution
async function main() {
  console.log('Starting geologic data insertion...');
  console.log(`API URL: ${API_URL}`);

  await insertEvents();
  await insertRelationships();

  console.log('\n=== Complete! ===\n');
}

main().catch(console.error);
