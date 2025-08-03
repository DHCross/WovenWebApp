const API_NATAL_URL = "https://astrologer.p.rapidapi.com/api/v4/natal-aspects-data";
const API_SYNASTRY_URL = "https://astrologer.p.rapidapi.com/api/v4/synastry-aspects-data";

// Header template for RapidAPI requests
function buildHeaders() {
  return {
    "content-type": "application/json",
    "x-rapidapi-key": process.env.RAPIDAPI_KEY,
    "x-rapidapi-host": "astrologer.p.rapidapi.com",
  };
}

// MATH BRAIN COMPLIANCE: Validate only FIELD-level data
function validateSubject(subject) {
  const required = [
    'year', 'month', 'day', 'hour', 'minute',
    'name', 'city', 'nation', 'latitude', 'longitude', 'zodiac_type', 'timezone'
  ];
  const missing = [];
  for (const key of required) {
    if (subject[key] === undefined || subject[key] === null || subject[key] === "") {
      missing.push(key);
    }
  }
  return missing;
}

// Helper to group transits by date (YYYY-MM-DD)
function groupByDate(transits) {
  return transits.reduce((acc, tr) => {
    let date = tr.date;
    if (date) {
      if (date instanceof Date) {
        date = date.toISOString().slice(0, 10);
      } else if (/^\d{2}-\d{2}-\d{4}$/.test(date)) {
        const [mm, dd, yyyy] = date.split('-');
        date = `${yyyy}-${mm}-${dd}`;
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        // Already in ISO format
      } else {
        try {
          date = new Date(date).toISOString().slice(0, 10);
        } catch {
          // Leave as-is if parse fails
        }
      }
    }
    (acc[date] ??= []).push(tr);
    return acc;
  }, {});
}

// MATH BRAIN COMPLIANCE: Extract only FIELD-level data, ignore all VOICE context
function extractFieldData(inputData) {
  const allowedFields = [
    'year', 'month', 'day', 'hour', 'minute',
    'name', 'city', 'nation', 'latitude', 'longitude', 
    'zodiac_type', 'timezone', 'state', 'coordinates'
  ];

  const fieldData = {};
  
  // Convert frontend format to API format
  if (inputData.date) {
    const [month, day, year] = inputData.date.split('-');
    fieldData.year = parseInt(year);
    fieldData.month = parseInt(month);
    fieldData.day = parseInt(day);
  }
  
  if (inputData.time) {
    const [hour, minute] = inputData.time.split(':');
    fieldData.hour = parseInt(hour);
    fieldData.minute = parseInt(minute);
  }
  
  if (inputData.coordinates) {
    const [lat, lng] = inputData.coordinates.split(',').map(s => parseFloat(s.trim()));
    fieldData.latitude = lat;
    fieldData.longitude = lng;
  }
  
  // Map other direct fields
  if (inputData.name) fieldData.name = inputData.name;
  if (inputData.city) fieldData.city = inputData.city;
  if (inputData.nation) fieldData.nation = inputData.nation;
  if (inputData.zodiac) fieldData.zodiac_type = inputData.zodiac;
  if (inputData.offset) fieldData.timezone = inputData.offset;

  // Handle legacy field names
  if (inputData.lat !== undefined) fieldData.latitude = inputData.lat;
  if (inputData.lng !== undefined) fieldData.longitude = inputData.lng;
  if (inputData.tz_str) fieldData.timezone = inputData.tz_str;

  // STRICT FILTERING: Only return allowed FIELD-level data
  const filtered = {};
  for (const key of Object.keys(fieldData)) {
    if (allowedFields.includes(key)) {
      filtered[key] = fieldData[key];
    }
  }

  return filtered;
}

function extractRelocationFieldData(relocationData) {
  const coords = relocationData.coordinates.split(',').map(s => parseFloat(s.trim()));
  return {
    latitude: coords[0],
    longitude: coords[1],
    city: relocationData.city || "Relocated Location",
  };
}

function hasValidData(data) {
  return data && (data.date || data.year) && (data.coordinates || (data.latitude && data.longitude));
}

async function calculateNatalChart(subject) {
  console.log('MATH BRAIN: Calculating natal chart for:', JSON.stringify(subject));
  
  const response = await fetch(API_NATAL_URL, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ subject })
  });

  const rawText = await response.text();
  if (!response.ok) {
    console.error('Astrology API error (natal):', response.status, rawText);
    throw new Error(`External API error: ${rawText}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error('Malformed response from API');
  }

  // Group transits by date for easier access
  if (parsed.transits && Array.isArray(parsed.transits)) {
    parsed.transitsByDate = groupByDate(parsed.transits);
  }

  return parsed;
}

async function calculateSynastry(firstSubject, secondSubject) {
  console.log('MATH BRAIN: Calculating synastry for:', JSON.stringify({ firstSubject, secondSubject }));
  
  const response = await fetch(API_SYNASTRY_URL, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ 
      first_subject: firstSubject,
      second_subject: secondSubject 
    })
  });

  const rawText = await response.text();
  if (!response.ok) {
    console.error('Astrology API error (synastry):', response.status, rawText);
    throw new Error(`External API error: ${rawText}`);
  }

  try {
    return JSON.parse(rawText);
  } catch {
    throw new Error('Malformed response from API');
  }
}

// MATH BRAIN COMPLIANT HANDLER
exports.handler = async function (event) {
  if (!process.env.RAPIDAPI_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server misconfiguration: RAPIDAPI_KEY is not set.' })
    };
  }
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Only POST requests allowed' })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON' })
    };
  }

  try {
    // MATH BRAIN COMPLIANCE: Extract only FIELD-level data, ignore VOICE-level context
    let personA = null;
    let personB = null;
    let relocationData = null;

    console.log('MATH BRAIN: Processing request, ignoring context/style preferences');

    // Handle new frontend format (personA/personB/context/relocation)
    if (body.personA) {
      personA = extractFieldData(body.personA);
      
      if (body.personB && hasValidData(body.personB)) {
        personB = extractFieldData(body.personB);
      }
      
      if (body.relocation && body.relocation.enabled && body.relocation.coordinates) {
        relocationData = extractRelocationFieldData(body.relocation);
      }

      // MATH BRAIN: Log that we're ignoring VOICE-layer context
      if (body.context) {
        console.log('MATH BRAIN: Ignoring context preferences (focusArea, reportStyle, etc.) - these are VOICE layer concerns');
      }
    }
    // Handle legacy formats for backward compatibility
    else if (body.person_a && body.person_b && !body.include_synastry) {
      personA = extractFieldData(body.person_a);
      personB = extractFieldData(body.person_b);
    }
    else if (body.first_subject && body.second_subject) {
      personA = extractFieldData(body.first_subject);
      personB = extractFieldData(body.second_subject);
    }
    else if (body.subject) {
      personA = extractFieldData(body.subject);
    }

    if (!personA) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing primary subject data' })
      };
    }

    // Validate required FIELD data
    const missingA = validateSubject(personA);
    if (missingA.length) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields for Person A', missing: missingA })
      };
    }

    // If we have Person B data, validate it too
    if (personB) {
      const missingB = validateSubject(personB);
      if (missingB.length) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing required fields for Person B', missing: missingB })
        };
      }
    }

    // MATH BRAIN OUTPUT: Pure geometry computation only
    const results = {};

    // Calculate primary natal chart geometry
    results.natal = await calculateNatalChart(personA);
    
    // Calculate relocation overlay geometry if requested
    if (relocationData) {
      const relocatedSubject = { ...personA, ...relocationData };
      results.relocation = await calculateNatalChart(relocatedSubject);
      console.log('MATH BRAIN: Computed geometry for both birth location and relocated coordinates');
    }

    // Calculate synastry geometry if Person B exists
    if (personB) {
      results.synastry = await calculateSynastry(personA, personB);
      results.natalB = await calculateNatalChart(personB);
      console.log('MATH BRAIN: Computed synastry and dual natal geometries');
    }

    console.log('MATH BRAIN: Returning pure geometry data - no interpretation, context, or narrative');

    return {
      statusCode: 200,
      body: JSON.stringify({
        // Include metadata for downstream VOICE layer
        _mathBrainOutput: true,
        _fieldToMapComputed: new Date().toISOString(),
        _voiceLayerContext: body.context || null, // Pass through for downstream processing
        // Pure MAP-level geometry
        ...results
      })
    };

  } catch (err) {
    console.error('MATH BRAIN error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
