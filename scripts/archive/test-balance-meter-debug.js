// Test script to debug Balance Meter logic for synastry reports
const fetch = require('node-fetch'); // You might need to install: npm install node-fetch

async function testSynastryRequest() {
  const url = 'http://localhost:8888/.netlify/functions/astrology-mathbrain';
  
  const requestBody = {
    "person_a": {
      "name": "Dan",
      "birth_date": "1973-07-24",
      "birth_time": "14:30",
      "birth_city": "Bryn Mawr",
      "birth_nation": "US",
      "birth_latitude": 40.016667,
      "birth_longitude": -75.3,
      "birth_timezone": "America/Chicago"
    },
    "person_b": {
      "name": "Test Person",
      "birth_date": "1975-03-15",
      "birth_time": "10:00",
      "birth_city": "New York",
      "birth_nation": "US",
      "birth_latitude": 40.7128,
      "birth_longitude": -74.0060,
      "birth_timezone": "America/New_York"
    },
    "context": {
      "mode": "synastry",
      "type": "relational"
    },
    "relationship_context": {
      "type": "FAMILY",
      "role": "Parent"
    },
    "transitStartDate": "2025-09-06",
    "transitEndDate": "2025-09-20"
  };

  try {
    console.log('Sending synastry request...');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Response status:', response.status);
    const result = await response.text();
    console.log('Response body length:', result.length);
    
    if (response.status !== 200) {
      console.log('Response body:', result);
    } else {
      console.log('Request completed successfully');
    }
  } catch (error) {
    console.error('Request failed:', error.message);
  }
}

testSynastryRequest();
