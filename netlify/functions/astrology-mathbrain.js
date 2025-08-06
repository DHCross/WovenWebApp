const API_NATAL_URL = "https://astrologer.p.rapidapi.com/api/v4/natal-aspects-data";
const API_SYNASTRY_URL = "https://astrologer.p.rapidapi.com/api/v4/synastry-aspects-data";
const API_TRANSIT_URL = "https://astrologer.p.rapidapi.com/api/v4/transit-aspects-data";

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
  
  // Handle direct fields first (new frontend format)
  for (const key of allowedFields) {
    if (inputData[key] !== undefined && inputData[key] !== null && inputData[key] !== "") {
      fieldData[key] = inputData[key];
    }
  }
  
  // Convert legacy frontend format to API format (for backwards compatibility)
  if (!fieldData.year && inputData.date) {
    const [month, day, year] = inputData.date.split('-');
    fieldData.year = parseInt(year);
    fieldData.month = parseInt(month);
    fieldData.day = parseInt(day);
  }
  
  if (!fieldData.hour && inputData.time) {
    const [hour, minute] = inputData.time.split(':');
    fieldData.hour = parseInt(hour);
    fieldData.minute = parseInt(minute);
  }
  
  if (!fieldData.latitude && inputData.coordinates) {
    const [lat, lng] = inputData.coordinates.split(',').map(s => parseFloat(s.trim()));
    fieldData.latitude = lat;
    fieldData.longitude = lng;
  }
  
  // Map other legacy field names for backwards compatibility
  if (!fieldData.name && inputData.name) fieldData.name = inputData.name;
  if (!fieldData.city && inputData.city) fieldData.city = inputData.city;
  if (!fieldData.nation && inputData.nation) fieldData.nation = inputData.nation;
  if (!fieldData.zodiac_type && inputData.zodiac) fieldData.zodiac_type = inputData.zodiac;
  if (!fieldData.timezone && inputData.offset) fieldData.timezone = inputData.offset;

  // Handle other legacy field names
  if (!fieldData.latitude && inputData.lat !== undefined) fieldData.latitude = inputData.lat;
  if (!fieldData.longitude && inputData.lng !== undefined) fieldData.longitude = inputData.lng;
  if (!fieldData.timezone && inputData.tz_str) fieldData.timezone = inputData.tz_str;

  // STRICT FILTERING: Only return allowed FIELD-level data
  const filtered = {};
  for (const key of Object.keys(fieldData)) {
    if (allowedFields.includes(key)) {
      filtered[key] = fieldData[key];
    }
  }

  console.log('MATH BRAIN: Extracted field data:', JSON.stringify(filtered));
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

  console.log('MATH BRAIN: Natal API response keys:', Object.keys(parsed));

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
    const parsed = JSON.parse(rawText);
    console.log('MATH BRAIN: Synastry API response keys:', Object.keys(parsed));
    return parsed;
  } catch {
    throw new Error('Malformed response from API');
  }
}

// Helper: Convert DMS string (e.g. "30°10'N, 85°40'W") to decimal degrees
function dmsToDecimal(dmsStr) {
  const regex = /([0-9]+)°([0-9]+)'([NS]),\s*([0-9]+)°([0-9]+)'([EW])/;
  const match = dmsStr.match(regex);
  if (!match) return null;
  let lat = parseInt(match[1]) + parseInt(match[2]) / 60;
  let lng = parseInt(match[4]) + parseInt(match[5]) / 60;
  if (match[3] === 'S') lat = -lat;
  if (match[6] === 'W') lng = -lng;
  return { latitude: lat, longitude: lng };
}

// Helper: Normalize subject coordinates (DMS to decimal)
function normalizeCoordinates(subject) {
  // Always check birth_coordinates first
  if (subject.birth_coordinates && typeof subject.birth_coordinates === "string" && /°/.test(subject.birth_coordinates)) {
    const dms = dmsToDecimal(subject.birth_coordinates);
    if (dms) {
      subject.latitude = dms.latitude;
      subject.longitude = dms.longitude;
    }
  } else if (subject.latitude && typeof subject.latitude === "string" && /°/.test(subject.latitude)) {
    // If latitude is DMS string, try to parse with longitude
    const dms = dmsToDecimal(subject.latitude + ',' + subject.longitude);
    if (dms) {
      subject.latitude = dms.latitude;
      subject.longitude = dms.longitude;
    }
  }
  // If latitude/longitude are still missing, try to parse from birth_coordinates as decimal
  if ((!subject.latitude || !subject.longitude) && subject.birth_coordinates && /,/.test(subject.birth_coordinates)) {
    const parts = subject.birth_coordinates.split(',').map(s => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      subject.latitude = parts[0];
      subject.longitude = parts[1];
    }
  }
}

function buildWMChart({ personA, personB, relocationA, relocationB, synastry, context }) {
  function extractDetails(subject) {
    let coords = subject.birth_coordinates || `${subject.latitude},${subject.longitude}` || "";
    let latitude = subject.latitude;
    let longitude = subject.longitude;
    if (coords && /°/.test(coords)) {
      const dms = dmsToDecimal(coords);
      if (dms) {
        latitude = dms.latitude;
        longitude = dms.longitude;
      }
    } else if (coords && /,/.test(coords)) {
      const parts = coords.split(',').map(s => parseFloat(s.trim()));
      latitude = parts[0];
      longitude = parts[1];
    }
    return {
      name: subject.name || "",
      birth_date: subject.birth_date || subject.date || "",
      birth_time: subject.birth_time || subject.time || "",
      birth_city: subject.birth_city || subject.city || "",
      birth_state: subject.birth_state || subject.state || "",
      birth_country: subject.birth_country || subject.nation || "",
      birth_coordinates: coords,
      latitude,
      longitude,
      timezone: subject.timezone || "",
      zodiac_type: subject.zodiac_type || subject.zodiac || "Tropic"
    };
  }
  const root = {
    schema: "WM-Chart-1.0",
    relationship_type: context?.relationship_type || "partner",
    intimacy_tier: context?.intimacy_tier || undefined,
    is_ex_relationship: context?.is_ex_relationship || false,
    diagnostics: [],
    person_a: {
      details: extractDetails(personA.details || personA),
      chart: personA.chart || personA
    },
    person_b: personB ? {
      details: extractDetails(personB.details || personB),
      chart: personB.chart || personB
    } : undefined,
    relocation_a: relocationA ? relocationA : undefined,
    relocation_b: relocationB ? relocationB : undefined,
    synastry: synastry ? synastry : undefined
  };
  if (personA.chart?.transits && personA.chart?.transitsByDate) {
    const flat = JSON.stringify(personA.chart.transits);
    const dict = JSON.stringify(Object.values(personA.chart.transitsByDate).flat());
    if (flat !== dict) throw new Error("transits and transitsByDate must be deeply equal if both are present");
  }
  Object.keys(root).forEach(k => root[k] === undefined && delete root[k]);
  return root;
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
    console.log('MATH BRAIN: Received request body:', JSON.stringify(body, null, 2));
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON' })
    };
  }

  try {
    let personA = null;
    let personB = null;
    let relocationData = null;
    let context = body.context || null;
    let transitParams = null;
    
    // Extract transit parameters if present
    if (body.transitStartDate && body.transitEndDate) {
      transitParams = {
        startDate: body.transitStartDate,
        endDate: body.transitEndDate,
        step: body.transitStep || 'daily'
      };
      console.log('MATH BRAIN: Extracted transit params:', JSON.stringify(transitParams));
    }
    
    // Handle new frontend format (personA/personB/context/relocation)
    if (body.personA) {
      console.log('MATH BRAIN: Raw personA data from frontend:', JSON.stringify(body.personA, null, 2));
      personA = extractFieldData(body.personA);
      console.log('MATH BRAIN: Extracted personA data:', JSON.stringify(personA, null, 2));
      normalizeCoordinates(personA);
      console.log('MATH BRAIN: PersonA after coordinate normalization:', JSON.stringify(personA, null, 2));
      if (body.personB && hasValidData(body.personB)) {
        personB = extractFieldData(body.personB);
        normalizeCoordinates(personB);
      }
      if (body.relocation && body.relocation.enabled && body.relocation.coordinates) {
        relocationData = extractRelocationFieldData(body.relocation);
        normalizeCoordinates(relocationData);
      }
    } else if (body.person_a && body.person_b && !body.include_synastry) {
      personA = extractFieldData(body.person_a);
      normalizeCoordinates(personA);
      personB = extractFieldData(body.person_b);
      normalizeCoordinates(personB);
    } else if (body.first_subject && body.second_subject) {
      personA = extractFieldData(body.first_subject);
      normalizeCoordinates(personA);
      personB = extractFieldData(body.second_subject);
      normalizeCoordinates(personB);
    } else if (body.subject) {
      personA = extractFieldData(body.subject);
      normalizeCoordinates(personA);
    }
    if (!personA) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing primary subject data' })
      };
    }
    const missingA = validateSubject(personA);
    if (missingA.length) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields for Person A', missing: missingA })
      };
    }
    if (personB) {
      const missingB = validateSubject(personB);
      if (missingB.length) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing required fields for Person B', missing: missingB })
        };
      }
    }
    let natalA = await calculateNatalChart(personA);
    let natalB = personB ? await calculateNatalChart(personB) : undefined;
    let relocationA = relocationData ? await calculateNatalChart({ ...personA, ...relocationData }) : undefined;
    let relocationB = (relocationData && personB && !body.relocation?.excludePersonB) ? 
      await calculateNatalChart({ ...personB, ...relocationData }) : undefined;
    let synastry = personB ? await calculateSynastry(personA, personB) : undefined;
    
    // Calculate transit data if transit parameters are provided
    let transitDataA = null;
    let transitDataB = null;
    if (transitParams && transitParams.startDate && transitParams.endDate) {
      console.log('MATH BRAIN: Calculating transit data for date range');
      transitDataA = await calculateTransitData(personA, transitParams.startDate, transitParams.endDate);
      if (personB) {
        transitDataB = await calculateTransitData(personB, transitParams.startDate, transitParams.endDate);
      }
    }
    
    // Add transit data to charts if available
    if (transitDataA) {
      natalA.transitsByDate = transitDataA;
      console.log('MATH BRAIN: Added transit data to Person A:', Object.keys(transitDataA));
    }
    if (transitDataB) {
      natalB.transitsByDate = transitDataB;
      console.log('MATH BRAIN: Added transit data to Person B:', Object.keys(transitDataB));
    }
    
    // Legacy code - remove these as we're now using dedicated transit API
    if (natalA.transits && Array.isArray(natalA.transits)) {
      natalA.transitsByDate = groupByDate(natalA.transits);
    }
    if (natalB && natalB.transits && Array.isArray(natalB.transits)) {
      natalB.transitsByDate = groupByDate(natalB.transits);
    }
    if (synastry && synastry.transits && Array.isArray(synastry.transits)) {
      synastry.transitsByDate = groupByDate(synastry.transits);
    }
    const wmChart = buildWMChart({
      personA: { details: personA, chart: natalA },
      personB: personB ? { details: personB, chart: natalB } : undefined,
      relocationA,
      relocationB,
      synastry,
      context
    });
    return {
      statusCode: 200,
      body: JSON.stringify(wmChart)
    };
  } catch (err) {
    console.error('MATH BRAIN error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};

async function calculateTransitData(natalSubject, transitStartDate, transitEndDate) {
  console.log('MATH BRAIN: Calculating transit data for:', JSON.stringify(natalSubject));
  console.log('MATH BRAIN: Transit period:', transitStartDate, 'to', transitEndDate);
  
  // Parse dates and create transit subject for each day in the range
  const start = new Date(transitStartDate);
  const end = new Date(transitEndDate);
  const transitDataByDate = {};
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    
    // Create transit subject for this specific date at noon
    const transitSubject = {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      hour: 12,  // Use noon for transit calculations
      minute: 0,
      city: "Greenwich",  // Use Greenwich as reference point for transits
      latitude: 51.4825766,
      longitude: 0,
      timezone: "UTC"
    };
    
    try {
      const response = await fetch(API_TRANSIT_URL, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({
          first_subject: natalSubject,
          transit_subject: transitSubject
        })
      });

      const rawText = await response.text();
      if (!response.ok) {
        console.error(`Transit API error for ${dateStr}:`, response.status, rawText);
        continue; // Skip this date if API call fails
      }

      const parsed = JSON.parse(rawText);
      console.log(`MATH BRAIN: Transit API response for ${dateStr}:`, Object.keys(parsed));
      
      if (parsed.data && parsed.data.aspects) {
        transitDataByDate[dateStr] = parsed.data.aspects;
        console.log(`MATH BRAIN: Found ${parsed.data.aspects.length} transit aspects for ${dateStr}`);
      }
    } catch (error) {
      console.error(`MATH BRAIN: Error calculating transits for ${dateStr}:`, error);
      continue; // Skip this date if there's an error
    }
  }
  
  return transitDataByDate;
}
