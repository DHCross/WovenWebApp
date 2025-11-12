#!/bin/bash

# Wait for server to be ready
echo "Waiting for server to start..."
for i in {1..30}; do
  if curl -s http://localhost:3000/math-brain > /dev/null 2>&1; then
    echo "✓ Server ready!"
    break
  fi
  echo -n "."
  sleep 1
done

# Now send the test payload for solar return
echo ""
echo "Sending solar return request..."

curl -X POST http://localhost:3000/api/astrology-mathbrain \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "NATAL_ONLY",
    "report_type": "solar_return",
    "solar_return_year": 2025,
    "personA": {
      "name": "Test User",
      "year": 1990,
      "month": 5,
      "day": 15,
      "hour": 12,
      "minute": 0,
      "city": "New York",
      "state": "NY",
      "nation": "US",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "timezone": "America/New_York",
      "zodiac_type": "Tropic"
    },
    "window": {
      "start": "2025-01-01",
      "end": "2025-12-31"
    },
    "options": {
      "include_detailed_aspects": true,
      "include_planetary_positions": true,
      "include_house_placements": true
    }
  }' > solar-return-response.json

echo "Solar return report saved to solar-return-response.json"
echo ""
echo "Response summary:"
cat solar-return-response.json | jq '{
  success: .success,
  error: .error,
  code: .code,
  report_type: .data?.report_type,
  solar_return_date: .data?.solar_return?.date,
  aspects_count: .data?.aspects?.length,
  planets_count: .data?.planets?.length
}'

echo ""
echo "Check solar-return-response.json for the full response"
