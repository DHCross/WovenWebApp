#!/bin/bash
curl -s -X POST http://localhost:3000/api/astrology-mathbrain \
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
