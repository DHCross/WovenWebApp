#!/bin/bash

# Simplified test script without jq dependency
# This version shows raw JSON response

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

echo "📦 Creating test payload..."

# Create a temporary file with the escaped JSON content
TEMP_PAYLOAD=$(mktemp)
trap "rm -f $TEMP_PAYLOAD" EXIT

# Read the report file and escape it for JSON
python3 -c "
import json
import sys

with open('$REPORT_FILE', 'r') as f:
    report_content = f.read()

payload = {
    'input': '',
    'options': {
        'reportContexts': [
            {
                'id': f'test-context-{int(__import__(\"time\").time())}',
                'type': 'mirror',
                'name': 'Mirror + Symbolic Weather Test',
                'summary': 'Testing auto-execution with Mirror+SymbolicWeather bundle',
                'content': report_content
            }
        ]
    }
}

print(json.dumps(payload, indent=2))
" > "$TEMP_PAYLOAD"

echo "📤 Sending POST request to /api/raven..."
echo ""

# Send the request
curl -X POST "$API_URL" \
  -H 'Content-Type: application/json' \
  -H 'X-Request-Id: test-upload-flow' \
  -d @"$TEMP_PAYLOAD" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "================================================"
echo "Test complete!"
echo "================================================"
