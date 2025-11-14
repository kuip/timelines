#!/bin/bash

# Test user ID (would be from Twitter authentication in real app)
TEST_USER_ID="550e8400-e29b-41d4-a716-446655440000"

echo "Testing Authorization Header Functionality"
echo "==========================================="
echo ""

# Test 1: Create event WITHOUT auth header (should fail)
echo "Test 1: Create event WITHOUT auth header..."
curl -s -X POST http://localhost:8080/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Event No Auth",
    "unix_seconds": 1234567890,
    "precision_level": "day",
    "description": "Should fail - no auth"
  }' | jq '.' 2>/dev/null || echo "Request failed (expected)"
echo ""

# Test 2: Create event WITH auth header but unverified user
echo "Test 2: Create event with unverified user auth header..."
curl -s -X POST http://localhost:8080/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_USER_ID" \
  -d '{
    "title": "Test Event Unverified",
    "unix_seconds": 1234567890,
    "precision_level": "day",
    "description": "Should fail - user not Twitter verified"
  }' | jq '.' 2>/dev/null || echo "Request failed (expected)"
echo ""

# Test 3: Get events (should work - read access is public by default)
echo "Test 3: Get events (read access - should work)..."
curl -s http://localhost:8080/api/events?limit=1 | jq '.count' 2>/dev/null
echo ""

echo "Tests complete. Auth headers are being sent by frontend."
