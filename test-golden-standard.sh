#!/bin/bash

echo "🌀 GOLDEN STANDARD TEST: Hurricane Michael"
echo "📅 October 10, 2018 — Panama City, FL landfall"
echo "🎯 Expected: Magnitude ≥4.5, Directional Bias ≤-4.0"
echo "---"
echo ""

RESPONSE=$(curl -s -X POST http://localhost:3000/api/astrology-mathbrain \
  -H "Content-Type: application/json" \
  -d @- << 'EOF'
{
  "context": {
    "mode": "balance_meter"
  },
  "person_a": {
    "name": "Dan",
    "birth_date": "1973-07-24",
    "birth_time": "14:30",
    "timezone": "US/Eastern",
    "latitude": 40.0196,
    "longitude": -75.3167,
    "city": "Bryn Mawr",
    "nation": "US"
  },
  "transit_start_date": "2018-10-10",
  "transit_end_date": "2018-10-10",
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
  
  # Extract seismograph summary from nested path
  echo "📊 Balance Meter Summary:"
  SEISMO=$(echo "$RESPONSE" | jq -r '.person_a.derived.seismograph_summary')
  echo "$SEISMO"
  echo ""
  
  # Parse values
  MAG=$(echo "$SEISMO" | jq -r '.magnitude')
  BIAS=$(echo "$SEISMO" | jq -r '.directional_bias.value // .directional_bias')
  VOL=$(echo "$SEISMO" | jq -r '.volatility')
  
  echo "🔢 Parsed Values:"
  echo "  Magnitude: $MAG (Expected: ≥4.5)"
  echo "  Directional Bias: $BIAS (Expected: ≤-4.0)"
  echo "  Volatility: $VOL"
  echo ""
  
  # Validate golden standard
  if (( $(echo "$MAG >= 4.5" | bc -l) )); then
    echo "✅ Magnitude PASSES golden standard (≥4.5)"
  else
    echo "❌ Magnitude FAILS golden standard: $MAG < 4.5"
  fi
  
  if (( $(echo "$BIAS <= -4.0" | bc -l) )); then
    echo "✅ Directional Bias PASSES golden standard (≤-4.0)"
  else
    echo "❌ Directional Bias FAILS golden standard: $BIAS > -4.0"
  fi
  echo ""
  
  echo "🔍 Provenance:"
  echo "$RESPONSE" | jq -r '.provenance | "  Math Brain: \(.math_brain_version)\n  House System: \(.house_system)\n  Orbs: \(.orbs_profile)"'
  
else
  echo "❌ API returned error or unsuccessful response"
  echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
fi
