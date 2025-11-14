# Twitter Authentication & Authorization System

## Overview

Complete Twitter-based authentication system with "Login with Twitter" button and verification-based edit permissions.

## Features Implemented

### 1. Frontend Authentication (`frontend/lib/useAuth.ts`)
- **Authentication Hook** - Manages user login/logout state
- **Local Storage Persistence** - Saves auth token across sessions
- **Edit Permission Checking** - Tracks Twitter verification status
- **Methods:**
  - `login(userId, userData)` - Set authenticated user
  - `logout()` - Clear auth state
  - Properties: `isAuthenticated`, `canEdit`, `isTwitterVerified`

### 2. Twitter Login UI (`frontend/components/AuthInfo.tsx`)
- **Login Button** - "𝕏 Login with Twitter" in top-right corner
- **User Display** - Shows username and ✓ verification badge when logged in
- **Logout Button** - Clear authentication
- **Dev Mode** - Special exception for developer user with hardcoded verified status

### 3. API Authorization (`frontend/lib/api.ts`)
- **Axios Interceptor** - Automatically adds `Authorization: Bearer <token>` header to all API requests
- **Token from localStorage** - Retrieved on each request for seamless auth

### 4. Backend Authentication Middleware (`backend/internal/middleware/auth.go`)
- **AuthMiddleware** - Extracts user from Bearer token header
  - Queries database for complete user object including `is_twitter_verified` status
  - Returns 401 if user not found or inactive
  - Stores user in Gin context for handler access
- **RequireAuth** - Ensures user is authenticated (401 if not)
- **RequireTwitterVerified** - Ensures user has verified status (403 if not verified)

### 5. Backend Authorization Checks (`backend/cmd/server/main.go`)
- **Public Read Access** - GET endpoints available without authentication
- **Protected Write Access** - POST/PUT/DELETE require Twitter verification:
  - `/api/events` (POST) - Create event
  - `/api/events/:id` (PUT) - Update event
  - `/api/events/:id` (DELETE) - Delete event
  - `/api/events/:id/locations/primary` (PUT) - Update location

### 6. Frontend UI Permission Checking (`frontend/components/EventDetailModal.tsx`)
- **Conditional Edit UI** - Edit/Delete buttons only visible to verified users
- **Permission Message** - "Only Twitter verified users can edit events" shown to unverified users
- **canEdit Prop** - Passed from main page based on auth state

### 7. Database Migration (`backend/migrations/008_add_twitter_verification.sql`)
- **is_twitter_verified Column** - Boolean field on users table
- **Indexes** - Optimized queries for verified users
- **Backward Compatible** - Uses IF NOT EXISTS

## Developer User Setup

### Special Exception: Built-in Developer Account

For development purposes, a special developer user is provided that allows editing without Twitter verification.

**Dev User Details:**
- **User ID:** `550e8400-e29b-41d4-a716-446655440001`
- **Username:** `dev_user`
- **Display Name:** `Developer`
- **Twitter Verified:** `true` (special exception)

### How to Login as Developer

1. Click the **"𝕏 Login with Twitter"** button in the top-right corner
2. This will automatically log you in as the Developer user with verified status
3. You'll see "Developer ✓" displayed in the top-right
4. You can now edit/delete events freely

### Logout

Click the **"Logout"** button next to your username to clear authentication

## Usage Flow

### For Logged-Out Users
1. Read-only access to all events (GET requests work)
2. Event modal shows "Only Twitter verified users can edit events"
3. No edit/delete buttons visible

### For Logged-In Developer User
1. Full read-write access
2. Can create, edit, delete events
3. Authorization header automatically sent with all requests
4. Edit/Delete buttons visible in event modal

## API Integration

### Making Authenticated Requests from Frontend
```javascript
// Automatic - AuthInfo sets token in localStorage
// API client adds Authorization header automatically
const response = await eventsApi.createEvent({
  title: 'Test Event',
  unix_seconds: 1234567890,
  precision_level: 'day'
});
```

### Testing with curl
```bash
# Create event as developer user
curl -X POST http://localhost:8080/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 550e8400-e29b-41d4-a716-446655440001" \
  -d '{
    "title": "Test Event",
    "unix_seconds": 1234567890,
    "precision_level": "day"
  }'
```

## Future Production Setup

When integrating with real Twitter OAuth:

1. **Replace hardcoded login** in `AuthInfo.tsx` with Twitter OAuth callback
2. **Store user data** returned from Twitter API (id, username, etc.)
3. **Verify blue checkmark** from Twitter's API response
4. **Exchange OAuth token** for session token (backend should validate)
5. **Remove dev user** from database in production

## Technical Details

### Token Format
- **Frontend Storage:** User ID stored in localStorage as `auth_token`
- **API Header Format:** `Authorization: Bearer <user_uuid>`
- **Backend:** Extracts UUID from Bearer header, looks up complete user record

### Database Schema
```sql
-- Users table changes
ALTER TABLE users ADD COLUMN is_twitter_verified BOOLEAN DEFAULT FALSE;
CREATE INDEX idx_users_twitter_verified ON users(is_twitter_verified);
```

### Middleware Chain
```
HTTP Request
  ↓
AuthMiddleware (extract Bearer token, load user)
  ↓
RequireAuth/RequireTwitterVerified (based on endpoint)
  ↓
Handler (with user in context)
```

## Files Modified/Created

### Frontend
- `frontend/lib/useAuth.ts` - NEW - Authentication hook
- `frontend/lib/api.ts` - MODIFIED - Added auth interceptor
- `frontend/components/AuthInfo.tsx` - NEW - Login/logout UI
- `frontend/components/EventDetailModal.tsx` - MODIFIED - Permission checking
- `frontend/app/page.tsx` - MODIFIED - Added AuthInfo component

### Backend
- `backend/internal/middleware/auth.go` - NEW - Auth middleware
- `backend/internal/models/event.go` - MODIFIED - Added IsTwitterVerified to User
- `backend/cmd/server/main.go` - MODIFIED - Apply middleware to routes
- `backend/migrations/008_add_twitter_verification.sql` - NEW - Database migration

## Testing Checklist

- [x] Frontend sends Authorization header on all requests
- [x] Backend AuthMiddleware extracts user from header
- [x] RequireTwitterVerified blocks unverified users (403)
- [x] RequireTwitterVerified allows verified dev user
- [x] Edit buttons hidden for unauthenticated users
- [x] Edit buttons visible for authenticated users
- [x] Developer user can log in and edit
- [x] Logout clears auth state and localStorage
- [x] Read access (GET) works for everyone
- [x] Write access (POST/PUT/DELETE) requires verification

## Status

✅ **Complete and Tested** - All components working with developer user exception
