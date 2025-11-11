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

# Now send the test payload
echo ""
echo "Sending benchmark payload..."

curl -X POST http://localhost:3000/api/astrology-mathbrain \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "NATAL_ONLY",
    "person_a": {
      "name": "Dan",
      "year": 1973,
      "month": 7,
      "day": 24,
      "hour": 14,
      "minute": 30,
      "city": "Bryn Mawr",
      "state": "PA",
      "nation": "US"
    },
    "translocation": {
      "applies": true,
      "mode": "felt_weather",
      "target_city": "Panama City",
      "target_state": "FL",
      "target_nation": "US"
    },
    "window": {
      "start_date": "2025-11-11",
      "end_date": "2025-11-11"
    },
    "wantBalanceMeter": true
  }' 2>&1 | tee /tmp/test-response.json | head -200

echo ""
echo ""
echo "Response saved to /tmp/test-response.json"
if grep -q "enrichDailyAspects" /tmp/test-response.json; then
  echo "❌ ERROR: enrichDailyAspects error still present!"
  grep "enrichDailyAspects" /tmp/test-response.json
elif grep -q "\"success\":true" /tmp/test-response.json; then
  echo "✅ SUCCESS: Report generated!"
else
  echo "⚠️ Check response for status"
fi
