# Timeline Application - Setup Guide

## Prerequisites

- **PostgreSQL** 14+ installed and running
- **Go** 1.21+ installed
- **Node.js** 18+ and npm installed
- **Git** for version control

## Quick Start

### 1. Database Setup

```bash
# Create .env file from example
cp .env.example .env

# Edit .env and set your database credentials
# Then run the database setup script
cd backend/migrations
./setup.sh

# Or manually:
# createdb timeline
# psql -d timeline -f 001_initial_schema.sql
```

### 2. Backend Setup

```bash
cd backend

# Install Go dependencies
go mod download

# Run the server
go run cmd/server/main.go

# Or build and run
go build -o server cmd/server/main.go
./server
```

The backend will start on `http://localhost:8080`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

The frontend will start on `http://localhost:3000`

## Verifying Installation

### Test Backend

```bash
# Health check
curl http://localhost:8080/health

# Should return: {"status":"healthy"}
```

### Test API

```bash
# Get zoom presets (should return 8 presets)
curl http://localhost:8080/api/zoom-presets

# Get events (empty initially)
curl http://localhost:8080/api/events
```

### Create Test Events

```bash
# Create Big Bang event (timeline_seconds = 0)
curl -X POST http://localhost:8080/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "timeline_seconds": "0",
    "precision_level": "billion_years",
    "title": "Big Bang",
    "description": "The beginning of the universe",
    "category": "cosmic",
    "uncertainty_range": "31557600000000000"
  }'

# Create Earth formation event (~283 quadrillion seconds)
curl -X POST http://localhost:8080/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "timeline_seconds": "283046400000000000",
    "precision_level": "million_years",
    "title": "Formation of Earth",
    "description": "Earth formed from the solar nebula",
    "category": "geological"
  }'

# Create a recent event (convert Unix timestamp to timeline)
# For 2020-01-01: Unix timestamp is 1577836800
# Timeline seconds ≈ 435456000000000000 + 1577836800
curl -X POST http://localhost:8080/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "timeline_seconds": "435456001577836800",
    "precision_level": "day",
    "title": "Start of 2020s",
    "description": "Beginning of the 2020s decade",
    "category": "historical"
  }'
```

## Development

### Backend Development

```bash
cd backend

# Run with auto-reload (install air first)
go install github.com/cosmtrek/air@latest
air

# Run tests
go test ./...

# Format code
go fmt ./...
```

### Frontend Development

```bash
cd frontend

# Development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL=postgresql://postgres@localhost:5432/timeline
DB_NAME=timeline
DB_USER=postgres
DB_HOST=localhost
DB_PORT=5432

# Server
GIN_MODE=debug
PORT=8080
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## Project Structure

```
timeline/
├── backend/
│   ├── cmd/
│   │   └── server/          # Main application entry point
│   ├── internal/
│   │   ├── api/            # HTTP handlers
│   │   ├── db/             # Database layer
│   │   ├── models/         # Data models
│   │   └── utils/          # Utility functions (time conversion)
│   ├── migrations/         # Database migrations
│   └── go.mod
├── frontend/
│   ├── app/                # Next.js app directory
│   ├── components/         # React components
│   ├── lib/                # Utilities (API client)
│   ├── types/              # TypeScript types
│   └── package.json
├── PLAN.md                 # Technical plan
├── README.md               # Project overview
└── SETUP.md               # This file
```

## Time Conversion Helpers

### Timeline Seconds Calculation

The timeline uses seconds since the Big Bang (0):

- **Big Bang**: 0
- **Unix Epoch (1970-01-01)**: ~435,456,000,000,000,000 seconds
- **Current time**: Unix Epoch + current Unix timestamp

### Converting Dates

**From years ago:**
```
Years ago = 13.8B - years
Timeline seconds = Years * 365.25 * 24 * 3600
```

**From Unix timestamp:**
```
Timeline seconds = 435456000000000000 + unix_timestamp
```

**Examples:**
- 13.8 billion years ago (Big Bang): 0
- 4.5 billion years ago (Earth): ~283,046,400,000,000,000
- January 1, 2000: 435,456,000,946,684,800
- Now: 435,456,000,000,000,000 + current Unix time

## Troubleshooting

### Database Connection Error

```bash
# Check if PostgreSQL is running
pg_isready

# Check database exists
psql -l | grep timeline

# Recreate database if needed
dropdb timeline
createdb timeline
cd backend/migrations && ./setup.sh
```

### Backend Won't Start

```bash
# Check port 8080 is available
lsof -i :8080

# Check Go version
go version  # Should be 1.21+

# Clean and rebuild
cd backend
go clean
go mod tidy
go build cmd/server/main.go
```

### Frontend Won't Start

```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules .next
npm install
npm run dev
```

### CORS Issues

If the frontend can't connect to the backend, check that:
1. Backend is running on port 8080
2. Frontend URL (localhost:3000) is in CORS allow list
3. Both services are running

## Next Steps

1. Add sample events to populate the timeline
2. Explore the D3 visualization with zoom/pan
3. Implement X.com message caching (see PLAN.md Phase 3)
4. Add user authentication
5. Build discussion features

See **PLAN.md** for the complete implementation roadmap.
