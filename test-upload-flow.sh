#!/bin/bash

# Test script for Mirror + Symbolic Weather upload auto-execution flow
# This simulates what the React client does when a user uploads a report

set -e

REPORT_FILE="/Users/dancross/Documents/GitHub/WovenWebApp/reports/Mirror+SymbolicWeather_Weather_Dashboard_dan_2025-11-06_to_2025-11-06 (1).json"
API_URL="http://localhost:3000/api/raven"

echo "================================================"
echo "Testing Mirror + Symbolic Weather Upload Flow"
echo "================================================"
echo ""
echo "Report file: $REPORT_FILE"
echo "API endpoint: $API_URL"
echo ""

# Check if the report file exists
if [ ! -f "$REPORT_FILE" ]; then
    echo "❌ Error: Report file not found!"
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "❌ Error: jq is required but not installed."
    echo "Install with: brew install jq"
    exit 1
fi

echo "📦 Reading report file..."
REPORT_CONTENT=$(cat "$REPORT_FILE" | jq -Rs '.')

echo "📤 Sending POST request to /api/raven..."
echo ""

# Create the payload and send the request
curl -X POST "$API_URL" \
  -H 'Content-Type: application/json' \
  -H 'X-Request-Id: test-upload-flow' \
  -d @- <<EOF | jq '.'
{
  "input": "",
  "options": {
    "reportContexts": [
      {
        "id": "test-context-$(date +%s)",
        "type": "mirror",
        "name": "Mirror + Symbolic Weather Test",
        "summary": "Testing auto-execution with Mirror+SymbolicWeather bundle",
        "content": $REPORT_CONTENT
      }
    ]
  }
}
EOF

echo ""
echo "================================================"
echo "Test complete!"
echo "================================================"
echo ""
echo "Expected successful response contains:"
echo "  - ok: true"
echo "  - intent: 'report' or 'conversation'"
echo "  - draft: { picture, feeling, container, option, next_step }"
echo "  - sessionId: '<uuid>'"
echo "  - probe: { id, question }"
echo ""
echo "If you see a guard message instead, check:"
echo "  - Is the report format correct?"
echo "  - Does it have both natal geometry AND weather data?"
echo "  - Are the required fields present?"
echo ""
