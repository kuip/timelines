# Timeline

A full-stack web application that visualizes the complete timeline of the universe from the Big Bang to the present day.

## Tech Stack

- **Backend**: Go with Gin framework
- **Frontend**: Next.js with TypeScript
- **Database**: PostgreSQL
- **Visualization**: D3.js
- **Discussion**: X.com messages (cached locally)

## Features

- **Complete Timeline**: Shows the entire history from the Big Bang (~13.8 billion years ago) to now
- **Vertical Layout**: Optimized for mobile phones with 9:19.5 aspect ratio
- **Zoom & Pan**: Navigate from nanosecond precision to billions of years
- **Dark/Light Themes**: Automatically adapts to system preferences
- **Event Details**: View descriptions, categories, sources, and discussions
- **Embeddable**: Can be embedded in other websites

## Quick Start

```bash
# 1. Setup (database + dependencies)
make setup

# 2. Load sample events (optional)
psql -d timeline -f backend/migrations/seed_sample_events.sql

# 3. Start development
make backend   # In one terminal
make frontend  # In another terminal
```

Then open http://localhost:3000

## Documentation

- **[PLAN.md](PLAN.md)** - Complete technical design and architecture
- **[SETUP.md](SETUP.md)** - Detailed setup and development guide

## Project Status

**Phase 1 - Core Infrastructure**: ✅ Complete
- Database schema and migrations
- Go backend with REST API
- Time conversion utilities
- Next.js frontend with D3 timeline
- Basic event CRUD operations

**Next Steps**:
- X.com message caching and integration
- User authentication
- Voting system
- Discussion features

## Time Format

The application uses a custom time format:
- **Timeline Seconds**: Decimal number representing seconds since the Big Bang (0)
- **Unix Epoch** (1970-01-01): ~435,456,000,000,000,000 seconds
- Supports nanosecond precision with NUMERIC(30,9) in PostgreSQL

## API Endpoints

- `GET /api/events` - List events with filtering
- `GET /api/events/:id` - Get event details
- `POST /api/events` - Create new event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event
- `GET /api/zoom-presets` - Get predefined zoom levels

## License

See LICENSE file for details.

