#!/bin/bash

echo "🧪 Testing Dan's Directional Bias"
echo "📍 Birth: July 24, 1973, 2:30 PM ET, Bryn Mawr, PA"
echo "📍 Relocation: Panama City, FL (30°10'N, 85°40'W)"
echo "📅 Transit Window: Oct 31 – Nov 1, 2025"
echo "---"
echo ""

RESPONSE=$(curl -s -X POST http://localhost:3000/api/astrology-mathbrain \
  -H "Content-Type: application/json" \
  -d @- << 'EOF'
{
  "person_a": {
    "name": "Dan",
    "birth_date": "1973-07-24",
    "birth_time": "14:30",
    "timezone": "US/Eastern",
    "latitude": 40.0196,
    "longitude": -75.3167,
    "city": "Bryn Mawr",
    "nation": "USA"
  },
  "report_type": "balance",
  "transit_start_date": "2025-10-31",
  "transit_end_date": "2025-11-01",
  "house_system": "placidus",
  "relocation": {
    "latitude": 30.1667,
    "longitude": -85.6667,
    "city": "Panama City",
    "state": "FL",
    "timezone": "US/Central"
  }
}
EOF
)

# Check if success
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ API Response Success"
  echo ""
  
  # Extract seismograph summary
  echo "📊 Balance Meter Summary:"
  echo "$RESPONSE" | grep -o '"seismograph_summary":{[^}]*}' | head -1
  echo ""
  
  # Extract transit dates
  echo "📅 Transit Data by Date:"
  echo "$RESPONSE" | grep -o '"[0-9-]*":\[{' | sort | uniq
  echo ""
  
  # Extract provenance
  echo "🔍 Provenance:"
  echo "$RESPONSE" | grep -o '"math_brain_version":"[^"]*"'
  echo "$RESPONSE" | grep -o '"house_system":"[^"]*"'
  echo "$RESPONSE" | grep -o '"orbs_profile":"[^"]*"'
  echo ""
  
  echo "✨ Test completed successfully!"
  echo ""
  echo "📋 Full Response (first 1000 chars):"
  echo "$RESPONSE" | head -c 1000
  echo "..."
else
  echo "❌ API returned error or unsuccessful response"
  echo "$RESPONSE" | head -c 500
fi
