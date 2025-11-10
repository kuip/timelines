# Timeline Application - Technical Plan

## Project Overview
A full-stack timeline application that visualizes events from the beginning of the universe (~13.8 billion years ago) to the present, with social discussion features powered by cached X.com messages from different accounts.

**Tech Stack:**
- Backend: Go (Gin framework)
- Frontend: Next.js
- Visualization: D3.js
- Database: PostgreSQL
- Discussion: X.com messages (cached locally, from various accounts)

**Primary Display:**
- Vertical orientation in a div sized for common phone aspect ratio
- Target aspect ratio: ~9:19.5 (modern smartphones like iPhone 14/15)
- Alternative common ratios: 9:16 (older phones), 9:18 (Android)

---

## 1. Time Format Strategy

### Challenge
The application needs to represent an enormous time range:
- **Start**: Big Bang (~13.8 billion years ago)
- **End**: Present day
- **Precision**: From nanoseconds to billions of years

### Proposed Solution: NUMERIC Storage

#### Storage Format
Use **PostgreSQL NUMERIC(30, 9)** to store `timeline_seconds` - seconds since Big Bang with nanosecond decimal precision.

**Reasoning:**
- BIGINT cannot handle the full range (13.8B years = ~4.35 × 10^17 seconds, but with nanoseconds = 4.35 × 10^26)
- NUMERIC(30, 9) provides:
  - 21 digits before decimal (handles 4.35 × 10^17 seconds easily)
  - 9 digits after decimal (nanosecond precision)
  - Efficient arithmetic operations
  - No overflow concerns

#### Time Representation

```sql
timeline_seconds NUMERIC(30, 9)
-- Stores seconds since Big Bang (Big Bang = 0)
-- Example: 435,456,000,000,000,000.123456789
--          (13.8B years in seconds + nanosecond precision)
```

**Additional fields for context:**
1. `precision_level` (VARCHAR): Indicates data precision ('ns', 'us', 'ms', 's', 'min', 'hour', 'day', 'year', 'million_years', 'billion_years')
2. `uncertainty_range` (NUMERIC): ± range in seconds for uncertain dates

---

## 2. Database Schema

### Tables Structure

#### 2.1 `events` Table
Core table for timeline events.

```sql
CREATE TABLE events (
    -- Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Time representation
    timeline_seconds NUMERIC(30, 9) NOT NULL,
    -- Seconds since Big Bang with nanosecond precision
    -- Big Bang = 0, Unix Epoch (1970) ≈ 435,456,000,000,000,000

    precision_level VARCHAR(20) NOT NULL,
    -- 'nanosecond', 'microsecond', 'millisecond', 'second',
    -- 'minute', 'hour', 'day', 'year', 'thousand_years',
    -- 'million_years', 'billion_years'

    uncertainty_range NUMERIC(30, 9),
    -- ± range in seconds for uncertain dates

    -- Event data
    title VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    -- e.g., 'cosmic', 'geological', 'biological', 'historical', 'technological'

    importance_score INTEGER DEFAULT 0,
    -- User-voted importance for display prioritization

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by_user_id UUID REFERENCES users(id),

    -- Indexing
    search_vector tsvector,
    -- For full-text search

    -- Constraints
    CONSTRAINT valid_precision CHECK (
        precision_level IN (
            'nanosecond', 'microsecond', 'millisecond', 'second',
            'minute', 'hour', 'day', 'year', 'thousand_years',
            'million_years', 'billion_years'
        )
    )
);

-- Indexes
CREATE INDEX idx_events_timeline ON events(timeline_seconds);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_importance ON events(importance_score DESC);
CREATE INDEX idx_events_search ON events USING GIN(search_vector);
```

#### 2.2 `x_messages` Table
Cached X.com messages from various accounts discussing events.

```sql
CREATE TABLE x_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- X.com message data (cached locally)
    x_message_id VARCHAR(100) UNIQUE NOT NULL,
    -- Original X.com message ID

    x_user_id VARCHAR(100) NOT NULL,
    -- X.com user who posted the message

    x_username VARCHAR(100),
    x_display_name VARCHAR(200),
    x_avatar_url TEXT,

    -- Message content
    message_text TEXT NOT NULL,
    message_html TEXT,
    -- Processed/sanitized HTML version

    posted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    -- Original posting time on X.com

    -- Thread information
    parent_message_id VARCHAR(100),
    -- If this is a reply, ID of parent message

    thread_root_id VARCHAR(100),
    -- Root message of the thread

    -- Metadata
    cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Metrics (cached)
    likes_count INTEGER DEFAULT 0,
    retweets_count INTEGER DEFAULT 0,
    replies_count INTEGER DEFAULT 0,

    -- Moderation
    is_visible BOOLEAN DEFAULT TRUE,
    moderation_notes TEXT
);

-- Indexes
CREATE INDEX idx_x_messages_x_id ON x_messages(x_message_id);
CREATE INDEX idx_x_messages_user ON x_messages(x_user_id);
CREATE INDEX idx_x_messages_thread ON x_messages(thread_root_id);
CREATE INDEX idx_x_messages_parent ON x_messages(parent_message_id);
CREATE INDEX idx_x_messages_posted ON x_messages(posted_at DESC);
```

#### 2.3 `event_discussions` Table
Links events to X.com message threads.

```sql
CREATE TABLE event_discussions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

    -- Link to cached X.com message (thread root)
    root_x_message_id VARCHAR(100) NOT NULL,
    -- References x_messages.x_message_id

    discussion_type VARCHAR(50) DEFAULT 'general',
    -- 'general', 'debate', 'verification', 'dating_dispute'

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    message_count INTEGER DEFAULT 0,
    -- Count of messages in this thread

    last_activity_at TIMESTAMP WITH TIME ZONE,

    -- Moderation
    is_active BOOLEAN DEFAULT TRUE,
    pinned BOOLEAN DEFAULT FALSE,
    -- Pin important discussions to top

    CONSTRAINT valid_discussion_type CHECK (
        discussion_type IN ('general', 'debate', 'verification', 'dating_dispute')
    )
);

-- Indexes
CREATE INDEX idx_event_discussions_event ON event_discussions(event_id);
CREATE INDEX idx_event_discussions_root ON event_discussions(root_x_message_id);
CREATE INDEX idx_event_discussions_activity ON event_discussions(last_activity_at DESC);
CREATE INDEX idx_event_discussions_pinned ON event_discussions(pinned DESC, last_activity_at DESC);
```

#### 2.4 `votes` Table
Track user voting on event importance, accuracy, etc.

```sql
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    vote_type VARCHAR(20) NOT NULL,
    -- 'importance', 'accuracy', 'dating'

    vote_value INTEGER NOT NULL,
    -- Typically -1, 0, or 1 for down/neutral/up

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_user_vote UNIQUE(event_id, user_id, vote_type),
    CONSTRAINT valid_vote_type CHECK (
        vote_type IN ('importance', 'accuracy', 'dating')
    )
);

CREATE INDEX idx_votes_event ON votes(event_id);
CREATE INDEX idx_votes_user ON votes(user_id);
```

#### 2.5 `users` Table
Basic user management.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Authentication
    x_user_id VARCHAR(100) UNIQUE,
    -- X.com user identifier for OAuth

    username VARCHAR(100),
    display_name VARCHAR(200),

    -- Profile
    avatar_url TEXT,
    bio TEXT,

    -- Permissions
    role VARCHAR(20) DEFAULT 'user',
    -- 'user', 'moderator', 'admin'

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT valid_role CHECK (
        role IN ('user', 'moderator', 'admin')
    )
);

CREATE UNIQUE INDEX idx_users_x_user ON users(x_user_id);
CREATE INDEX idx_users_username ON users(username);
```

#### 2.6 `event_sources` Table
Track citations and references for events.

```sql
CREATE TABLE event_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

    source_type VARCHAR(50) NOT NULL,
    -- 'scientific_paper', 'book', 'article', 'database', 'expert_consensus'

    title VARCHAR(500),
    url TEXT,
    citation TEXT,

    credibility_score INTEGER DEFAULT 0,
    -- Community-voted source credibility

    added_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_source_type CHECK (
        source_type IN (
            'scientific_paper', 'book', 'article', 'database',
            'expert_consensus', 'other'
        )
    )
);

CREATE INDEX idx_sources_event ON event_sources(event_id);
CREATE INDEX idx_sources_type ON event_sources(source_type);
```

#### 2.7 `zoom_presets` Table
Store optimized zoom levels for performance.

```sql
CREATE TABLE zoom_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) NOT NULL UNIQUE,
    -- e.g., 'cosmic_overview', 'life_on_earth', 'human_history', 'modern_era'

    start_seconds NUMERIC(30, 9) NOT NULL,
    end_seconds NUMERIC(30, 9) NOT NULL,

    min_importance_threshold INTEGER DEFAULT 0,
    -- Only show events with importance >= threshold at this zoom

    description TEXT,
    display_order INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_zoom_presets_order ON zoom_presets(display_order);
```

---

## 3. Time Calculation Reference

### Key Timestamps (in timeline_seconds since Big Bang = 0)

```
Big Bang (0):                    0
Formation of Earth:              ~283,046,400,000,000,000 (8.97B years)
First life on Earth:             ~314,496,000,000,000,000 (9.97B years)
Dinosaur extinction:             ~427,680,000,000,000,000 (13.56B years)
Unix Epoch (1970-01-01):         ~435,456,000,000,000,000 (13.8B years - 54 years)
Current time (2025-11-10):       ~435,457,734,739,200,000
```

### Conversion Helpers

```go
// Constants
const (
    SecondsPerYear = 365.25 * 24 * 3600
    BigBangYearsAgo = 13_800_000_000
    BigBangSeconds = BigBangYearsAgo * SecondsPerYear
    UnixEpochYearsAfterBigBang = BigBangYearsAgo - 1970
    UnixEpochInTimeline = UnixEpochYearsAfterBigBang * SecondsPerYear
)

// Convert Unix timestamp to timeline seconds
func UnixToTimeline(unixSeconds int64) *big.Float {
    timeline := new(big.Float).SetInt64(unixSeconds)
    epoch := new(big.Float).SetFloat64(UnixEpochInTimeline)
    return timeline.Add(timeline, epoch)
}

// Convert timeline seconds to Unix timestamp (if in range)
func TimelineToUnix(timelineSeconds *big.Float) (int64, error) {
    epoch := new(big.Float).SetFloat64(UnixEpochInTimeline)
    unix := new(big.Float).Sub(timelineSeconds, epoch)
    unixInt, accuracy := unix.Int64()
    if accuracy != big.Exact {
        return 0, errors.New("timeline value out of Unix timestamp range")
    }
    return unixInt, nil
}
```

---

## 4. Frontend Design - Mobile-First Vertical Layout

### Primary Container Dimensions

```css
.timeline-container {
    /* Mobile phone aspect ratio */
    aspect-ratio: 9 / 19.5;  /* Modern smartphone ratio */

    /* Responsive sizing */
    width: 100%;
    max-width: 430px;
    height: auto;

    /* Alternative: fill viewport on mobile */
    @media (max-width: 430px) {
        width: 100vw;
        height: 100vh;
        aspect-ratio: auto; /* Let viewport dictate */
    }

    position: relative;
    overflow: hidden;
}
```

### Vertical Timeline Layout

```
┌─────────────────┐
│   Header/Now    │ ← Current time indicator
├─────────────────┤
│                 │
│                 │
│   ↑ Scroll Up   │
│   = Go Back     │
│   in Time       │
│                 │
│    [Events]     │ ← Events positioned vertically
│    [Markers]    │   by their timeline_seconds
│                 │
│                 │
│   ↓ Scroll Down │
│   = Go Forward  │
│   in Time       │
│                 │
├─────────────────┤
│  Big Bang (0)   │ ← Beginning of time
└─────────────────┘
```

### D3 Zoom Implementation

- **Vertical Zoom**: Scroll/pinch adjusts time scale
- **Pan**: Drag up/down to move through time
- **Current viewport**: Shows ~1% of total timeline at max zoom out
- **Zoom levels**: 20+ levels from nanoseconds to billions of years

---

## 5. X.com Message Caching Strategy

### Message Collection Process

1. **Manual Import**: Admin/moderator provides X.com message URLs
2. **API Fetch**: Backend fetches message data via X.com API
3. **Cache Storage**: Store in `x_messages` table with full thread context
4. **Periodic Updates**: Refresh metrics (likes, retweets) on schedule

### Message Thread Structure

```json
{
  "root_message": {
    "x_message_id": "1234567890",
    "user": "@scientist_jane",
    "text": "New evidence suggests Big Bang occurred 13.787B years ago...",
    "replies": [
      {
        "x_message_id": "1234567891",
        "user": "@physicist_bob",
        "text": "The margin of error is ±0.02B years though..."
      }
    ]
  }
}
```

### API Endpoints for Discussions

```
GET  /api/events/:id/discussions           - Get all discussion threads
GET  /api/discussions/:id/messages         - Get all messages in thread
POST /api/discussions                      - Link new X.com thread (admin)
POST /api/discussions/:id/refresh          - Refresh cached data
```

---

## 6. Implementation Phases

### Phase 1: Core Infrastructure
- [ ] Set up PostgreSQL database
- [ ] Create all tables with indexes
- [ ] Implement time conversion utilities (Go with big.Float)
- [ ] Build basic Gin API endpoints (CRUD for events)
- [ ] Set up Next.js project structure

### Phase 2: Timeline Visualization (Mobile-First)
- [ ] Build D3 vertical timeline component
- [ ] Implement zoom/pan for vertical orientation
- [ ] Design for 9:19.5 aspect ratio (modern phone screens)
- [ ] Implement dark/light theme support
- [ ] Create responsive design (adapts to various aspect ratios)

### Phase 3: X.com Message Caching
- [ ] Build X.com API integration for message fetching
- [ ] Implement message caching system
- [ ] Create admin interface for linking discussions
- [ ] Build thread display UI
- [ ] Add periodic refresh job for metrics

### Phase 4: User Features
- [ ] X.com OAuth integration
- [ ] User authentication/authorization
- [ ] Event creation/editing interface
- [ ] Voting system implementation
- [ ] Discussion browsing and navigation

### Phase 5: Advanced Features
- [ ] Full-text search across events and discussions
- [ ] Source citation management
- [ ] Community moderation tools
- [ ] Export/sharing capabilities
- [ ] Embedding widget for external sites (iframe)

### Phase 6: Optimization & Polish
- [ ] Query optimization for large time range queries
- [ ] Caching strategy (Redis for API responses)
- [ ] Progressive loading for large datasets
- [ ] Performance monitoring
- [ ] User testing and refinement

---

## 7. API Endpoints Design

### Events
- `GET /api/events` - List events (with time range filtering)
- `GET /api/events/:id` - Get single event
- `POST /api/events` - Create event (authenticated)
- `PUT /api/events/:id` - Update event (authenticated)
- `DELETE /api/events/:id` - Delete event (authenticated, owner/admin)

### Discussions (X.com Messages)
- `GET /api/events/:id/discussions` - Get discussion threads for event
- `GET /api/discussions/:id` - Get discussion thread details
- `GET /api/discussions/:id/messages` - Get all messages in thread
- `POST /api/discussions` - Link X.com thread to event (admin/moderator)
- `POST /api/discussions/:id/refresh` - Refresh cached X.com data (admin)

### Messages
- `GET /api/messages/:x_message_id` - Get single cached message
- `POST /api/messages/import` - Import X.com message(s) (admin)

### Votes
- `POST /api/events/:id/vote` - Cast/update vote
- `GET /api/events/:id/votes` - Get vote summary

### User
- `POST /api/auth/x` - X.com OAuth callback
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Utility
- `GET /api/zoom-presets` - Get predefined zoom levels
- `GET /api/timeline/convert` - Time conversion utility
- `GET /api/timeline/range` - Get events in time range (main query)

---

## 8. Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/timeline

# X.com Integration
X_API_KEY=xxx
X_API_SECRET=xxx
X_BEARER_TOKEN=xxx
X_CALLBACK_URL=http://localhost:3000/auth/x/callback

# Server
GIN_MODE=release
PORT=8080

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_X_CLIENT_ID=xxx

# Cache refresh
MESSAGE_REFRESH_INTERVAL=3600  # seconds
```

---

## 9. Mobile-First Responsive Breakpoints

```css
/* Primary: Vertical phone layout */
@media (max-width: 430px) and (orientation: portrait) {
    /* 390×844 optimized */
}

/* Tablet: Can switch to horizontal */
@media (min-width: 768px) {
    /* Option to rotate timeline horizontally */
}

/* Desktop: Horizontal preferred */
@media (min-width: 1024px) {
    /* Wider horizontal timeline */
}

/* Embedded: Configurable via props */
.timeline-embed {
    /* Respects container dimensions */
}
```

---

## 10. Next Steps

1. ✓ Review and validate this plan
2. Set up development environment (PostgreSQL, Go, Node.js)
3. Initialize PostgreSQL database with schema
4. Create Go backend boilerplate with Gin
5. Create Next.js frontend boilerplate (mobile-first)
6. Implement core time conversion utilities (big.Float)
7. Build minimal viable vertical timeline visualization (D3)
8. Implement X.com API client for message caching
9. Build event-discussion linking system

---

## Notes & Considerations

- **Data Accuracy**: Events far in the past have uncertainty. The `uncertainty_range` field handles this.
- **Performance**: Index strategy is critical for queries spanning billions of years.
- **Scalability**: Consider partitioning `events` table by time ranges if dataset grows very large (>1M events).
- **X.com Caching**:
  - Respect X.com rate limits (450 requests/15min for API v2)
  - Store complete thread context to minimize re-fetching
  - Update metrics periodically but not in real-time
- **Mobile Performance**:
  - Limit rendered events to ~500 max at any zoom level
  - Use D3 virtualization for smooth scrolling
  - Lazy-load discussion threads
- **Embedding**: Frontend must work in iframe with:
  - Configurable dimensions
  - Theme selection (dark/light/auto)
  - Optional controls (zoom buttons, search, etc.)
