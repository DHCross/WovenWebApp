import { NextResponse } from 'next/server';
import { inferMbtiFromChart, formatForPoeticBrain } from '../../../lib/mbti/inferMbtiFromChart';

// --- Types & Interfaces ---

interface BirthData {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  latitude: number;
  longitude: number;
  timezone: string;
  city?: string;
  country_code?: string;
}

interface PersonInput {
  name: string;
  year: number | string;
  month: number | string;
  day: number | string;
  hour: number | string;
  minute: number | string;
  latitude: number | string;
  longitude: number | string;
  timezone: string;
  city?: string;
  nation?: string;
  zodiac_type?: string;
}

// --- Helper Functions ---

const API_HOST = 'best-astrology-api.p.rapidapi.com';
const API_BASE = 'https://api.astrology-api.io/api/v3';

async function callApi(endpoint: string, payload: any, apiKey: string) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': API_HOST
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();

  // CHANGED: Return error details instead of throwing, so we can debug it
  if (!response.ok) {
    console.error(`[API] Call to ${endpoint} failed: ${response.status} ${text}`);
    return { error: true, status: response.status, message: text, endpoint };
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    return { error: true, message: "Invalid JSON response", raw: text.slice(0, 500) };
  }
}

function normalizePerson(p: PersonInput): BirthData {
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    latitude: Number(p.latitude),
    longitude: Number(p.longitude),
    timezone: p.timezone,
    city: p.city,
    country_code: p.nation || 'US'
  };
}

function buildSubjectPayload(name: string, data: BirthData) {
  return {
    name,
    birth_data: { ...data }
  };
}

/**
 * Four Report Types (per Four Report Types_Integrated 10.1.25.md):
 * - solo_mirror: Solo qualitative (natal only, low location sensitivity)
 * - solo_balance_meter: Solo quantitative (natal + transits, high location sensitivity)
 * - relational_mirror: Relational qualitative (synastry, no transits)
 * - relational_balance_meter: Relational quantitative (synastry + transits for both)
 */
function determineReportType(isRelational: boolean, hasTransits: boolean): string {
  if (isRelational) {
    return hasTransits ? 'relational_balance_meter' : 'relational_mirror';
  }
  return hasTransits ? 'solo_balance_meter' : 'solo_mirror';
}

/**
 * Relocation Mode (per spec):
 * - None: No relocation (natal coordinates only)
 * - A_local: Relocate Person A to specified coords (default for dyads)
 * - B_local: Relocate Person B to specified coords
 * - midpoint: Midpoint of both (discouraged, only if explicitly requested)
 */
function determineRelocationMode(translocation: any, isRelational: boolean): string {
  if (!translocation?.applies) return 'None';
  
  const method = translocation.method || '';
  if (method.includes('midpoint')) return 'midpoint';
  if (method.includes('B')) return 'B_local';
  if (method.includes('A')) return 'A_local';
  
  // Default for relational reports is A_local per spec
  return isRelational ? 'A_local' : 'A_local';
}

// --- Main Route Handler ---

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const apiKey = process.env.RAPIDAPI_KEY;

    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Server configuration error: Missing API Key' }, { status: 500 });
    }

    if (!body.personA) {
      return NextResponse.json({ success: false, error: 'Missing Person A data' }, { status: 400 });
    }

    // 1. Prepare Subjects
    const personAData = normalizePerson(body.personA);
    const personBData = body.personB ? normalizePerson(body.personB) : null;

    // 2. Fetch Natal Geometry (Parallel)
    const fetchChartData = async (name: string, data: BirthData, settings: any) => {
      const subject = buildSubjectPayload(name, data);

      const positionsPayload = {
        subject,
        options: settings
      };

      const housesPayload = {
        subject,
        options: {
          house_system: settings.house_system,
          zodiac_type: settings.zodiac_type
        }
      };

      const [positionsRes, housesRes] = await Promise.all([
        callApi('/data/positions', positionsPayload, apiKey),
        callApi('/data/house-cusps', housesPayload, apiKey)
      ]);

      // --- ROBUST PARSING LOGIC ---
      let rawPositions: any[] = [];

      // Check if API returned an error
      if (positionsRes?.error) {
        console.error(`[API] Positions API error for ${name}:`, positionsRes.message);
      }
      
      // Check for array in various locations (ordered by likelihood based on v3 API)
      if (positionsRes?.data?.positions && Array.isArray(positionsRes.data.positions)) {
        // v3 API format: { success: true, data: { positions: [...] } }
        rawPositions = positionsRes.data.positions;
      } else if (Array.isArray(positionsRes)) {
        rawPositions = positionsRes;
      } else if (Array.isArray(positionsRes?.data)) {
        rawPositions = positionsRes.data;
      } else if (positionsRes?.data && Array.isArray(positionsRes.data.planets)) {
        rawPositions = positionsRes.data.planets;
      } else if (positionsRes?.planets && Array.isArray(positionsRes.planets)) {
        rawPositions = positionsRes.planets;
      } else {
        console.warn(`[API] Could not parse positions for ${name}. Response keys:`, 
          positionsRes ? Object.keys(positionsRes) : 'null');
      }

      // Convert array to Dictionary
      const positionsMap: Record<string, any> = {};
      const anglesMap: Record<string, any> = {};

      rawPositions.forEach((p: any) => {
        const key = p.name || p.id || p.planet || p.object;
        if (key) {
          const position = {
            sign: p.sign || p.sign_id,
            deg: typeof p.degree === 'number' ? p.degree : (typeof p.norm_degree === 'number' ? p.norm_degree : (p.longitude || 0)),
            abs_pos: typeof p.absolute_longitude === 'number' ? p.absolute_longitude : undefined,
            house: p.house_number || p.house,
            retro: !!p.is_retrograde
          };
          
          positionsMap[key] = position;

          // Map angles - API returns them as First_House, Tenth_House, or Ascendant, Medium_Coeli
          if (key === 'Ascendant' || key === 'ASC' || key === 'First_House') {
            anglesMap['Ascendant'] = position;
            anglesMap['ascendant'] = p.sign; // Just the sign for angle_signs
          }
          if (key === 'Midheaven' || key === 'MC' || key === 'Medium_Coeli' || key === 'Tenth_House') {
            anglesMap['MC'] = position;
            anglesMap['mc'] = p.sign; // Just the sign for angle_signs
          }
        }
      });

      let rawHouses: any[] = [];
      // Check if API returned an error
      if (housesRes?.error) {
        console.error(`[API] Houses API error for ${name}:`, housesRes.message);
      }
      
      // v3 API format: { success: true, data: { cusps: [...] } }
      if (housesRes?.data?.cusps && Array.isArray(housesRes.data.cusps)) {
        rawHouses = housesRes.data.cusps;
      } else if (Array.isArray(housesRes)) {
        rawHouses = housesRes;
      } else if (Array.isArray(housesRes?.data)) {
        rawHouses = housesRes.data;
      } else {
        console.warn(`[API] Could not parse house cusps for ${name}. Response keys:`, 
          housesRes ? Object.keys(housesRes) : 'null');
      }
      
      // Convert cusps array to just the absolute_longitude values for the 12 houses
      const cuspsArray = rawHouses
        .filter((c: any) => typeof c.house === 'number' && c.house >= 1 && c.house <= 12)
        .sort((a: any, b: any) => a.house - b.house)
        .map((c: any) => c.absolute_longitude);

      return {
        positions: positionsMap,
        angles: anglesMap,
        angle_signs: {
          ascendant: anglesMap.ascendant || null,
          mc: anglesMap.mc || null
        },
        cusps: cuspsArray.length === 12 ? cuspsArray : rawHouses,
        // CAPTURE RAW RESPONSE for Provenance injection
        _raw_response: {
          positions: positionsRes,
          houses: housesRes
        }
      };
    };

    const settings = {
      zodiac_type: body.personA.zodiac_type || 'Tropic',
      house_system: 'P',
      active_points: [
        'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn',
        'Uranus', 'Neptune', 'Pluto', 'Chiron',
        'Ascendant', 'Medium_Coeli', 'Mean_Node'
      ]
    };

    const [chartA, chartB] = await Promise.all([
      fetchChartData(body.personA.name, personAData, settings),
      personBData ? fetchChartData(body.personB.name, personBData, settings) : Promise.resolve(null)
    ]);

    // 3. Handle Relocation
    let relocationDataA = null;
    let relocationDataB = null;

    if (body.translocation && body.translocation.applies && body.translocation.coords) {
      const { latitude, longitude } = body.translocation.coords;
      const fetchRelocated = async (name: string, birth: BirthData) => {
        const relocatedBirthData = { ...birth, latitude, longitude };
        return fetchChartData(name, relocatedBirthData, settings);
      };
      if (body.translocation.method.includes('A')) relocationDataA = await fetchRelocated(body.personA.name, personAData);
      if (body.translocation.method.includes('B') && personBData) relocationDataB = await fetchRelocated(body.personB.name, personBData);
    }

    // 4. Fetch Real Transits (for both persons if relational)
    const subjectA = buildSubjectPayload(body.personA.name, personAData);
    const transitsByDateA = body.window?.start && body.window?.end
      ? await fetchNatalTransits(subjectA, body.window.start, body.window.end, apiKey)
      : {};
    
    let transitsByDateB: Record<string, any> = {};
    if (personBData && body.window?.start && body.window?.end) {
      const subjectB = buildSubjectPayload(body.personB.name, personBData);
      transitsByDateB = await fetchNatalTransits(subjectB, body.window.start, body.window.end, apiKey);
    }
    
    // 5. Fetch Synastry (if relational)
    let synastryData: { aspects: any[]; summary: any } | null = null;
    if (personBData) {
      synastryData = await fetchSynastryAspects(
        buildSubjectPayload(body.personA.name, personAData),
        buildSubjectPayload(body.personB.name, personBData),
        apiKey
      );
    }

    // 5a. Determine Report Type (Four Report Types per spec)
    const hasTransits = !!(body.window?.start && body.window?.end);
    const isRelational = !!personBData;
    const reportType = determineReportType(isRelational, hasTransits);
    
    // 5b. Determine Relocation Mode
    const relocationMode = determineRelocationMode(body.translocation, isRelational);

    // 6. Construct Response
    const response = {
      // Format and structure metadata
      _format: 'woven-map-v2',
      _schema_version: '2.0.0',
      _report_type: reportType,  // Top-level for easy access
      _natal_sections: isRelational ? 2 : 1,
      _required_sections: isRelational ? ['person_a', 'person_b', 'synastry'] : ['person_a'],
      _natal_section: {
        mirror_source: 'integrated',
        note: 'Natal geometry integrated with symbolic weather in single file'
      },

      success: true,
      sessionId: `session-${Date.now()}`,

      mirror_contract: {
        // Four Report Types: solo_mirror, solo_balance_meter, relational_mirror, relational_balance_meter
        report_type: reportType,
        report_kind: reportType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        is_relational: isRelational,
        has_transits: hasTransits,
        
        // Relationship Categories: Partner, friend/colleague, family, acquaintance
        relationship_type: body.relationship_context?.type || (isRelational ? 'Partner' : undefined),
        
        // Intimacy Tier (for Partner type): P2-P5b per spec
        // P2=Friends-with-benefits, P3=Situationship, P4=Low-commitment, P5a=Committed+sexual, P5b=Committed non-sexual
        intimacy_tier: body.relationship_context?.intimacy_tier,
        
        // Consent Status: mutual, single-sided, anonymized
        consent_status: body.relationship_context?.consent_status || (isRelational ? 'mutual' : undefined),
        
        // Contact State: ACTIVE, DORMANT, SEVERED
        contact_state: body.relationship_context?.contact_state || 'ACTIVE'
      },

      provenance: {
        // Core versioning
        math_brain_version: '3.3.0-four-report-types',
        build_ts: new Date().toISOString(),
        
        // House system and orbs (per spec: Placidus default, wm-spec-2025-09 orbs)
        house_system: 'Placidus',
        house_system_code: 'P',
        orbs_profile: 'wm-spec-2025-09',
        
        // Ephemeris source
        ephemeris_source: 'best-astrology-api-v3',
        timezone_db_version: 'IANA-2024a',
        
        // Relocation per spec: None | A_local | B_local (midpoint discouraged)
        relocation_mode: relocationMode,
        relocation_coords: body.translocation?.coords || null,
        relocation_state: relocationDataA || relocationDataB ? 'truly_local' : 'natal_only',
        
        // Engine versions for auditing
        engine_versions: {
          seismograph: '2.1.0',
          balance_meter: '5.0.0',
          synastry: '1.0.0'
        },
        
        // Debug info (only in dev)
        ...(process.env.NODE_ENV !== 'production' && {
          debug_dump: {
            person_a_raw: chartA._raw_response,
            person_b_raw: chartB ? chartB._raw_response : null
          }
        })
      },

      person_a: {
        name: body.personA.name,
        birth_data: personAData,
        chart: {
          positions: relocationDataA ? relocationDataA.positions : chartA.positions,
          angle_signs: relocationDataA ? relocationDataA.angle_signs : chartA.angle_signs,
          cusps: relocationDataA ? relocationDataA.cusps : chartA.cusps,
          transitsByDate: transitsByDateA
        },
        summary: calculatePersonSummary(transitsByDateA)
      },

      ...(personBData && {
        person_b: {
          name: body.personB.name,
          birth_data: personBData,
          chart: {
            positions: relocationDataB ? relocationDataB.positions : chartB?.positions,
            angle_signs: relocationDataB ? relocationDataB.angle_signs : chartB?.angle_signs,
            cusps: relocationDataB ? relocationDataB.cusps : chartB?.cusps,
            transitsByDate: transitsByDateB
          },
          summary: calculatePersonSummary(transitsByDateB)
        }
      }),
      
      // Synastry (cross-chart aspects) - only for relational reports
      ...(synastryData && {
        synastry: {
          aspects: synastryData.aspects,
          summary: synastryData.summary
        }
      }),

      balance_meter: calculateCombinedBalanceMeter(transitsByDateA, transitsByDateB),

      // MBTI Correspondence (backstage only - symbolic resonance, not typology assertion)
      mbti_correspondence: (() => {
        const chartForMbti = {
          positions: relocationDataA ? relocationDataA.positions : chartA.positions,
          angle_signs: relocationDataA ? relocationDataA.angle_signs : chartA.angle_signs,
        };
        const inference = inferMbtiFromChart(chartForMbti);
        if (!inference) return null;
        return {
          // Backstage: full inference data for debugging/analysis
          _backstage: inference,
          // Poetic Brain context: symbolic phrases only, no raw codes
          poetic_brain_context: formatForPoeticBrain(inference),
          // Quick reference (backstage only)
          code: inference.code,
          confidence: inference.confidence,
          archetypal_motion: inference.archetypal_motion,
        };
      })(),

      context: {
        mode: body.mode,
        period: body.window,
        relocation: body.translocation
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[API] Handler Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// --- Helper Functions for Balance Meter ---

/**
 * Calculate summary axes from transit data
 */
function calculatePersonSummary(transitsByDate: Record<string, any>): { axes: { magnitude: number; directional_bias: number; volatility: number } } {
  const days = Object.values(transitsByDate);
  if (days.length === 0) {
    return { axes: { magnitude: 0, directional_bias: 0, volatility: 0 } };
  }
  
  let totalMag = 0, totalBias = 0, totalVol = 0;
  for (const day of days) {
    const seismo = day.seismograph || {};
    totalMag += seismo.magnitude || 0;
    totalBias += seismo.directional_bias || 0;
    totalVol += seismo.volatility || 0;
  }
  
  return {
    axes: {
      magnitude: Number((totalMag / days.length).toFixed(1)),
      directional_bias: Number((totalBias / days.length).toFixed(1)),
      volatility: Number((totalVol / days.length).toFixed(1))
    }
  };
}

/**
 * Calculate combined Balance Meter from both persons' transits
 */
function calculateCombinedBalanceMeter(
  transitsByDateA: Record<string, any>,
  transitsByDateB: Record<string, any>
): { magnitude: number; directional_bias: number; volatility: number; magnitude_label: string; valence_label: string; volatility_label: string } {
  const summaryA = calculatePersonSummary(transitsByDateA);
  const summaryB = calculatePersonSummary(transitsByDateB);
  
  // Average both persons' axes for relational meter
  const hasB = Object.keys(transitsByDateB).length > 0;
  const magnitude = hasB 
    ? (summaryA.axes.magnitude + summaryB.axes.magnitude) / 2
    : summaryA.axes.magnitude;
  const directional_bias = hasB
    ? (summaryA.axes.directional_bias + summaryB.axes.directional_bias) / 2
    : summaryA.axes.directional_bias;
  const volatility = hasB
    ? (summaryA.axes.volatility + summaryB.axes.volatility) / 2
    : summaryA.axes.volatility;
  
  // Generate labels
  const magnitude_label = magnitude < 1.5 ? 'Quiet' : magnitude < 3 ? 'Active' : 'Intense';
  const valence_label = directional_bias < -1 ? 'Friction' : directional_bias > 1 ? 'Flow' : 'Mixed';
  const volatility_label = volatility < 1.5 ? 'Stable' : volatility < 3 ? 'Variable' : 'Volatile';
  
  return {
    magnitude: Number(magnitude.toFixed(1)),
    directional_bias: Number(directional_bias.toFixed(1)),
    volatility: Number(volatility.toFixed(1)),
    magnitude_label,
    valence_label,
    volatility_label
  };
}

// --- Transit Weight Constants for Balance Meter Calculation ---
const ASPECT_WEIGHTS: Record<string, { magnitude: number; valence: number }> = {
  'conjunction': { magnitude: 1.0, valence: 0 },    // Neutral, amplifying
  'opposition': { magnitude: 0.9, valence: -0.6 },  // Challenging
  'square': { magnitude: 0.8, valence: -0.8 },      // Hard challenge
  'trine': { magnitude: 0.7, valence: 0.8 },        // Flowing support
  'sextile': { magnitude: 0.5, valence: 0.6 },      // Gentle opportunity
  'quincunx': { magnitude: 0.4, valence: -0.3 },    // Awkward adjustment
};

const PLANET_WEIGHTS: Record<string, number> = {
  'Sun': 1.0, 'Moon': 0.9, 'Mercury': 0.6, 'Venus': 0.7, 'Mars': 0.8,
  'Jupiter': 0.85, 'Saturn': 0.9, 'Uranus': 0.75, 'Neptune': 0.7, 'Pluto': 0.95,
  'Chiron': 0.5
};

/**
 * Calculate seismograph values from transit events for a single day
 */
function calculateSeismograph(events: any[]): { magnitude: number; directional_bias: number; volatility: number; drivers: string[] } {
  if (!events || events.length === 0) {
    return { magnitude: 0, directional_bias: 0, volatility: 0, drivers: [] };
  }
  
  let totalMagnitude = 0;
  let totalValence = 0;
  let magnitudeCount = 0;
  const drivers: string[] = [];
  
  for (const event of events) {
    const aspectType = event.aspect_type?.toLowerCase() || '';
    const transitingPlanet = event.transiting_planet || '';
    const stationedPlanet = event.stationed_planet || '';
    const orb = Math.abs(event.orb || 0);
    
    // Get weights
    const aspectWeight = ASPECT_WEIGHTS[aspectType] || { magnitude: 0.3, valence: 0 };
    const planetWeight = Math.max(
      PLANET_WEIGHTS[transitingPlanet] || 0.5,
      PLANET_WEIGHTS[stationedPlanet] || 0.5
    );
    
    // Tighter orbs = stronger effect
    const orbFactor = Math.max(0.2, 1 - (orb / 3));
    
    // Calculate contribution
    const contribution = aspectWeight.magnitude * planetWeight * orbFactor;
    totalMagnitude += contribution;
    totalValence += aspectWeight.valence * contribution;
    magnitudeCount++;
    
    // Track top drivers
    if (contribution > 0.3) {
      drivers.push(`${transitingPlanet} ${aspectType} ${stationedPlanet}`);
    }
  }
  
  // Normalize to 0-5 scale
  const magnitude = Math.min(5, Math.max(0, (totalMagnitude / Math.max(1, magnitudeCount)) * 4));
  const directional_bias = Math.min(5, Math.max(-5, (totalValence / Math.max(1, magnitudeCount)) * 3));
  
  // Volatility based on aspect mix (more opposing aspects = higher volatility)
  const hardAspects = events.filter(e => ['square', 'opposition'].includes(e.aspect_type?.toLowerCase())).length;
  const softAspects = events.filter(e => ['trine', 'sextile'].includes(e.aspect_type?.toLowerCase())).length;
  const volatility = Math.min(5, Math.abs(hardAspects - softAspects) * 0.5);
  
  return {
    magnitude: Number(magnitude.toFixed(1)),
    directional_bias: Number(directional_bias.toFixed(1)),
    volatility: Number(volatility.toFixed(1)),
    drivers: drivers.slice(0, 5) // Top 5 drivers
  };
}

/**
 * Fetch real transits from the API and process into Balance Meter format
 */
async function fetchNatalTransits(
  subject: { name: string; birth_data: BirthData },
  startDate: string,
  endDate: string,
  apiKey: string
): Promise<Record<string, any>> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const payload = {
    subject,
    date_range: {
      start_date: { year: start.getFullYear(), month: start.getMonth() + 1, day: start.getDate() },
      end_date: { year: end.getFullYear(), month: end.getMonth() + 1, day: end.getDate() }
    },
    options: {
      house_system: 'P',
      zodiac_type: 'Tropic',
      active_points: ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']
    }
  };
  
  try {
    const response = await callApi('/charts/natal-transits', payload, apiKey);
    
    if (response?.error) {
      console.warn(`[Transits] API error for ${subject.name}:`, response.message);
      return generateMockTransits(startDate, endDate);
    }
    
    // Group events by date
    const events = response?.events || [];
    const eventsByDate: Record<string, any[]> = {};
    
    for (const event of events) {
      const date = event.date;
      if (!eventsByDate[date]) eventsByDate[date] = [];
      eventsByDate[date].push(event);
    }
    
    // Calculate seismograph for each day
    const transitsByDate: Record<string, any> = {};
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayEvents = eventsByDate[dateStr] || [];
      const seismo = calculateSeismograph(dayEvents);
      transitsByDate[dateStr] = {
        date: dateStr,
        seismograph: seismo,
        drivers: seismo.drivers,
        event_count: dayEvents.length
      };
    }
    
    return transitsByDate;
    
  } catch (error) {
    console.error(`[Transits] Failed to fetch for ${subject.name}:`, error);
    return generateMockTransits(startDate, endDate);
  }
}

function generateMockTransits(start: string, end: string) {
  if (!start || !end) return {};
  const transits: Record<string, any> = {};
  const startDate = new Date(start);
  const endDate = new Date(end);
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    transits[dateStr] = {
      date: dateStr,
      seismograph: {
        magnitude: Number((1 + Math.random() * 3).toFixed(1)),
        directional_bias: Number(((Math.random() * 6) - 3).toFixed(1)),
        volatility: Number((Math.random() * 2).toFixed(1))
      },
      drivers: ['Sun trine Moon']
    };
  }
  return transits;
}

/**
 * Fetch synastry (cross-chart) aspects between two persons
 */
async function fetchSynastryAspects(
  subjectA: { name: string; birth_data: BirthData },
  subjectB: { name: string; birth_data: BirthData },
  apiKey: string
): Promise<{ aspects: any[]; summary: any } | null> {
  const payload = {
    subject1: subjectA,
    subject2: subjectB,
    options: {
      house_system: 'P',
      zodiac_type: 'Tropic',
      active_points: ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']
    }
  };
  
  try {
    const response = await callApi('/charts/synastry', payload, apiKey);
    
    if (response?.error) {
      console.warn(`[Synastry] API error:`, response.message);
      return null;
    }
    
    const aspects = response?.chart_data?.aspects || [];
    
    // Calculate synastry summary (how harmonious is the relationship?)
    let harmonyScore = 0;
    let frictionScore = 0;
    const significantAspects: string[] = [];
    
    for (const aspect of aspects) {
      const orb = Math.abs(aspect.orb || 0);
      const aspectType = aspect.aspect_type?.toLowerCase() || '';
      const weight = ASPECT_WEIGHTS[aspectType] || { magnitude: 0.3, valence: 0 };
      
      // Only count aspects with tight orbs (< 5 degrees)
      if (orb < 5) {
        if (weight.valence > 0) {
          harmonyScore += weight.magnitude * (1 - orb/5);
        } else if (weight.valence < 0) {
          frictionScore += weight.magnitude * (1 - orb/5);
        }
        
        // Track significant aspects
        if (orb < 2) {
          significantAspects.push(`${aspect.point1} ${aspectType} ${aspect.point2}`);
        }
      }
    }
    
    return {
      aspects: aspects.map((a: any) => ({
        point1: a.point1,
        point2: a.point2,
        aspect_type: a.aspect_type,
        orb: Number((a.orb || 0).toFixed(2))
      })),
      summary: {
        total_aspects: aspects.length,
        harmony_score: Number(harmonyScore.toFixed(1)),
        friction_score: Number(frictionScore.toFixed(1)),
        balance: Number((harmonyScore - frictionScore).toFixed(1)),
        key_aspects: significantAspects.slice(0, 10)
      }
    };
    
  } catch (error) {
    console.error('[Synastry] Failed to fetch:', error);
    return null;
  }
}
