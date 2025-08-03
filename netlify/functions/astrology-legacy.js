const API_NATAL_URL = "https://astrologer.p.rapidapi.com/api/v4/natal-aspects-data";
const API_SYNASTRY_URL = "https://astrologer.p.rapidapi.com/api/v4/synastry-aspects-data";

// Header template for RapidAPI requests. The API key is injected
// at runtime inside the handler so tests can verify configuration
// without reloading this module.
function buildHeaders() {
  return {
    "content-type": "application/json",
    "x-rapidapi-key": process.env.RAPIDAPI_KEY,
    "x-rapidapi-host": "astrologer.p.rapidapi.com",
  };
}

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
    // Ensure date is in YYYY-MM-DD format (UTC)
    let date = tr.date;
    if (date) {
      // Accept both Date objects and strings
      if (date instanceof Date) {
        date = date.toISOString().slice(0, 10);
      } else if (/^\d{2}-\d{2}-\d{4}$/.test(date)) {
        // Convert MM-DD-YYYY to YYYY-MM-DD
        const [mm, dd, yyyy] = date.split('-');
        date = `${yyyy}-${mm}-${dd}`;
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        // Already in ISO format
      } else {
        // Fallback: try Date parse
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

// --- WM-Chart contract builder ---
function buildWMChart({ personA, personB, relocation, synastry, context }) {
  // Helper to extract details from input subject
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
  // Build root object
  const root = {
    schema: "WM-Chart-1.0",
    relationship_type: context?.relationship_type || "partner",
    intimacy_tier: context?.intimacy_tier || undefined,
    diagnostics: [],
    person_a: {
      details: extractDetails(personA.details || personA),
      chart: personA.chart || personA
    },
    person_b: personB ? {
      details: extractDetails(personB.details || personB),
      chart: personB.chart || personB
    } : undefined,
    relocation: relocation ? relocation : undefined,
    synastry: synastry ? synastry : undefined
  };
  // Redundancy rule: if both transits and transitsByDate, deep-compare
  if (personA.chart?.transits && personA.chart?.transitsByDate) {
    const flat = JSON.stringify(personA.chart.transits);
    const dict = JSON.stringify(Object.values(personA.chart.transitsByDate).flat());
    if (flat !== dict) throw new Error("transits and transitsByDate must be deeply equal if both are present");
  }
  // Remove undefined keys
  Object.keys(root).forEach(k => root[k] === undefined && delete root[k]);
  return root;
}

// Helper: Convert DMS string (e.g. "30°10'N, 85°40'W") to decimal degrees
function dmsToDecimal(dmsStr) {
  // Example: "30°10'N, 85°40'W"
  const regex = /([0-9]+)°([0-9]+)'([NS]),\s*([0-9]+)°([0-9]+)'([EW])/;
  const match = dmsStr.match(regex);
  if (!match) return null;
  let lat = parseInt(match[1]) + parseInt(match[2]) / 60;
  let lng = parseInt(match[4]) + parseInt(match[5]) / 60;
  if (match[3] === 'S') lat = -lat;
  if (match[6] === 'W') lng = -lng;
  return { latitude: lat, longitude: lng };
}

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
    // --- Dual-natal (no synastry) support ---
    if (body.person_a && body.person_b && !body.include_synastry) {
      const a = body.person_a;
      const b = body.person_b;
      // Normalize and filter fields for both
      [a, b].forEach(subject => {
        if (subject.lat !== undefined) {
          subject.latitude = subject.lat;
          delete subject.lat;
        }
        if (subject.lng !== undefined) {
          subject.longitude = subject.lng;
          delete subject.lng;
        }
        if (subject.tz_str && !subject.timezone) {
          subject.timezone = subject.tz_str;
        }
        const allowedFields = [
          'year', 'month', 'day', 'hour', 'minute',
          'name', 'city', 'nation', 'latitude', 'longitude', 'zodiac_type', 'timezone'
        ];
        for (const key of Object.keys(subject)) {
          if (!allowedFields.includes(key)) delete subject[key];
        }
      });
      // Validate both
      const missingA = validateSubject(a);
      const missingB = validateSubject(b);
      if (missingA.length || missingB.length) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing required fields', missing: { person_a: missingA, person_b: missingB } })
        };
      }
      // Fetch both charts in parallel
      let natalA, natalB;
      try {
        [natalA, natalB] = await Promise.all([
          fetch(API_NATAL_URL, {
            method: 'POST', headers: buildHeaders(), body: JSON.stringify({ subject: a })
          }),
          fetch(API_NATAL_URL, {
            method: 'POST', headers: buildHeaders(), body: JSON.stringify({ subject: b })
          })
        ]);
      } catch (err) {
        return {
          statusCode: 502,
          body: JSON.stringify({ error: 'External API error', details: err.message })
        };
      }
      const textA = await natalA.text();
      const textB = await natalB.text();
      if (!natalA.ok || !natalB.ok) {
        return {
          statusCode: 502,
          body: JSON.stringify({ error: 'External API error', details: { person_a: textA, person_b: textB } })
        };
      }
      let parsedA, parsedB;
      try {
        parsedA = JSON.parse(textA);
        parsedB = JSON.parse(textB);
      } catch {
        return {
          statusCode: 502,
          body: JSON.stringify({ error: 'Malformed response from API' })
        };
      }
      if (parsedA.transits && Array.isArray(parsedA.transits)) {
        parsedA.transitsByDate = groupByDate(parsedA.transits);
      }
      if (parsedB.transits && Array.isArray(parsedB.transits)) {
        parsedB.transitsByDate = groupByDate(parsedB.transits);
      }
      // Build WM-Chart contract
      const wmChart = buildWMChart({
        personA: { details: a, chart: parsedA },
        personB: { details: b, chart: parsedB },
        context: body.context
      });
      return {
        statusCode: 200,
        body: JSON.stringify(wmChart)
      };
    }
    // --- Synastry request ---
    if (body.first_subject && body.second_subject) {
      const fs = body.first_subject;
      const ss = body.second_subject;
      // Normalize and filter fields
      [fs, ss].forEach(subject => {
        if (subject.lat !== undefined) {
          subject.latitude = subject.lat;
          delete subject.lat;
        }
        if (subject.lng !== undefined) {
          subject.longitude = subject.lng;
          delete subject.lng;
        }
        if (subject.tz_str && !subject.timezone) {
          subject.timezone = subject.tz_str;
        }
        const allowedFields = [
          'year', 'month', 'day', 'hour', 'minute',
          'name', 'city', 'nation', 'latitude', 'longitude', 'zodiac_type', 'timezone'
        ];
        for (const key of Object.keys(subject)) {
          if (!allowedFields.includes(key)) delete subject[key];
        }
      });
      // Validate both
      const missingA = validateSubject(fs);
      const missingB = validateSubject(ss);
      if (missingA.length || missingB.length) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing required fields', missing: { first_subject: missingA, second_subject: missingB } })
        };
      }
      let synastryResponse, natalA, natalB;
      try {
        [synastryResponse, natalA, natalB] = await Promise.all([
          fetch(API_SYNASTRY_URL, {
            method: 'POST',
            headers: buildHeaders(),
            body: JSON.stringify({ first_subject: fs, second_subject: ss })
          }),
          fetch(API_NATAL_URL, {
            method: 'POST',
            headers: buildHeaders(),
            body: JSON.stringify({ subject: fs })
          }),
          fetch(API_NATAL_URL, {
            method: 'POST',
            headers: buildHeaders(),
            body: JSON.stringify({ subject: ss })
          })
        ]);
      } catch (err) {
        console.error('Fetch error (synastry):', err);
        return {
          statusCode: 502,
          body: JSON.stringify({ error: 'External API error', details: err.message })
        };
      }
      const rawSynastry = await synastryResponse.text();
      const rawA = await natalA.text();
      const rawB = await natalB.text();
      if (!synastryResponse.ok || !natalA.ok || !natalB.ok) {
        return {
          statusCode: 502,
          body: JSON.stringify({ error: 'External API error', details: { synastry: rawSynastry, person_a: rawA, person_b: rawB } })
        };
      }
      let parsedSynastry, parsedA, parsedB;
      try {
        parsedSynastry = JSON.parse(rawSynastry);
        parsedA = JSON.parse(rawA);
        parsedB = JSON.parse(rawB);
      } catch {
        return {
          statusCode: 502,
          body: JSON.stringify({ error: 'Malformed response from API' })
        };
      }
      // If transits array exists, add grouped version
      if (parsedSynastry.transits && Array.isArray(parsedSynastry.transits)) {
        parsedSynastry.transitsByDate = groupByDate(parsedSynastry.transits);
      }
      if (parsedA.transits && Array.isArray(parsedA.transits)) {
        parsedA.transitsByDate = groupByDate(parsedA.transits);
      }
      if (parsedB.transits && Array.isArray(parsedB.transits)) {
        parsedB.transitsByDate = groupByDate(parsedB.transits);
      }
      // Build WM-Chart contract
      const wmChart = buildWMChart({
        personA: { details: fs, chart: parsedA },
        personB: { details: ss, chart: parsedB },
        synastry: parsedSynastry,
        context: body.context
      });
      return {
        statusCode: 200,
        body: JSON.stringify(wmChart)
      };
    }
    // --- Solo-natal (A or B only, not synastry, not both) ---
    if ((body.person_a || body.person_b) && !body.include_synastry) {
      const subj = body.person_a || body.person_b;
      if (subj.lat !== undefined) {
        subj.latitude = subj.lat;
        delete subj.lat;
      }
      if (subj.lng !== undefined) {
        subj.longitude = subj.lng;
        delete subj.lng;
      }
      if (subj.tz_str && !subj.timezone) {
        subj.timezone = subj.tz_str;
      }
      const allowedFields = [
        'year', 'month', 'day', 'hour', 'minute',
        'name', 'city', 'nation', 'latitude', 'longitude', 'zodiac_type', 'timezone'
      ];
      for (const key of Object.keys(subj)) {
        if (!allowedFields.includes(key)) delete subj[key];
      }
      const missing = validateSubject(subj);
      if (missing.length) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing required fields', missing })
        };
      }
      let response;
      try {
        response = await fetch(API_NATAL_URL, {
          method: 'POST', headers: buildHeaders(), body: JSON.stringify({ subject: subj })
        });
      } catch (err) {
        return {
          statusCode: 502,
          body: JSON.stringify({ error: 'External API error', details: err.message })
        };
      }
      const text = await response.text();
      if (!response.ok) {
        return {
          statusCode: 502,
          body: JSON.stringify({ error: 'External API error', details: text })
        };
      }
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        return {
          statusCode: 502,
          body: JSON.stringify({ error: 'Malformed response from API' })
        };
      }
      if (parsed.transits && Array.isArray(parsed.transits)) {
        parsed.transitsByDate = groupByDate(parsed.transits);
      }
      // Build WM-Chart contract
      const wmChart = buildWMChart({
        personA: { details: subj, chart: parsed },
        context: body.context
      });
      return {
        statusCode: 200,
        body: JSON.stringify(wmChart)
      };
    }
    // Natal request
    else if (body.subject) {
      const subject = body.subject;
      // Normalize lat/lng to latitude/longitude for API
      if (subject.lat !== undefined) {
        subject.latitude = subject.lat;
        delete subject.lat;
      }
      if (subject.lng !== undefined) {
        subject.longitude = subject.lng;
        delete subject.lng;
      }
      // If tz_str is present, use as timezone
      if (subject.tz_str && !subject.timezone) {
        subject.timezone = subject.tz_str;
      }
      // Only keep allowed fields
      const allowedFields = [
        'year', 'month', 'day', 'hour', 'minute',
        'name', 'city', 'nation', 'latitude', 'longitude', 'zodiac_type', 'timezone'
      ];
      for (const key of Object.keys(subject)) {
        if (!allowedFields.includes(key)) delete subject[key];
      }
      const missing = validateSubject(subject);
      if (missing.length) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing required fields', missing })
        };
      }

      console.log('Outgoing natal body:', JSON.stringify({ subject }));

      let response;
      try {
        response = await fetch(API_NATAL_URL, {
          method: 'POST',
          headers: buildHeaders(),
          body: JSON.stringify({ subject })
        });
      } catch (err) {
        console.error('Fetch error (natal):', err);
        return {
          statusCode: 502,
          body: JSON.stringify({ error: 'External API error', details: err.message })
        };
      }

      const rawText = await response.text();
      if (!response.ok) {
        console.error('Astrology API error (natal):', response.status, rawText);
        return {
          statusCode: 502,
          body: JSON.stringify({ error: 'External API error', details: rawText })
        };
      }
      let parsed;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        return {
          statusCode: 502,
          body: JSON.stringify({ error: 'Malformed response from API' })
        };
      }
      if (parsed.transits && Array.isArray(parsed.transits)) {
        parsed.transitsByDate = groupByDate(parsed.transits);
      }
      // Build WM-Chart contract
      const wmChart = buildWMChart({
        personA: { details: subject, chart: parsed },
        context: body.context
      });
      return {
        statusCode: 200,
        body: JSON.stringify(wmChart)
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing subject or synastry subjects' })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
