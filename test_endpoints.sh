#!/bin/bash

# Base URL
URL="http://localhost:5000/api"

echo "1. Registering User..."
REGISTER_RES=$(curl -s -X POST $URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123", "name": "Test User"}')
echo $REGISTER_RES

echo "\n2. Logging In..."
LOGIN_RES=$(curl -s -X POST $URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}')
echo $LOGIN_RES

# Extract Token (simple grep/sed as we don't have jq guaranteed)
TOKEN=$(echo $LOGIN_RES | sed 's/.*"token":"\([^"]*\)".*/\1/')
echo "\nToken: $TOKEN"

if [ -z "$TOKEN" ] || [ "$TOKEN" == "$LOGIN_RES" ]; then
  echo "Login failed or token not found."
  exit 1
fi

echo "\n3. Starting Session..."
START_RES=$(curl -s -X POST $URL/session/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "vscode",
    "problem": {
      "title": "Two Sum",
      "slug": "two-sum",
      "url": "https://leetcode.com/problems/two-sum",
      "platform": "leetcode",
      "difficulty": "Easy"
    }
  }')
echo $START_RES
