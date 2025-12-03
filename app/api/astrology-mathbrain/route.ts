import { NextResponse } from 'next/server';

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

  if (!response.ok) {
    const text = await response.text();
    console.error(`[API] Call to ${endpoint} failed: ${response.status} ${text}`);
    throw new Error(`API call to ${endpoint} failed: ${response.statusText}`);
  }

  return response.json();
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
      const payload = {
        subject: buildSubjectPayload(name, data),
        options: settings
      };

      const [positionsRes, housesRes] = await Promise.all([
        callApi('/data/positions', payload, apiKey),
        callApi('/data/house-cusps', payload, apiKey)
      ]);

      // --- ROBUST PARSING LOGIC START ---

      // Parse Positions: Handle Array directly, { data: [...] }, or { data: { planets: [...] } }
      let rawPositions: any[] = [];
      if (Array.isArray(positionsRes)) {
        rawPositions = positionsRes;
      } else if (Array.isArray(positionsRes.data)) {
        rawPositions = positionsRes.data;
      } else if (positionsRes.data && Array.isArray(positionsRes.data.planets)) {
        rawPositions = positionsRes.data.planets;
      } else {
        console.warn('[API Warning] Unexpected positions format:', JSON.stringify(positionsRes).slice(0, 200));
      }

      // Parse House Cusps: Handle Array directly or { data: [...] } or { data: { cusps: [...] } }
      let rawHouses: any[] = [];
      if (Array.isArray(housesRes)) {
        rawHouses = housesRes;
      } else if (Array.isArray(housesRes.data)) {
        rawHouses = housesRes.data;
      } else if (housesRes.data && Array.isArray(housesRes.data.cusps)) {
        rawHouses = housesRes.data.cusps;
      } else {
        console.warn('[API Warning] Unexpected houses format:', JSON.stringify(housesRes).slice(0, 200));
      }

      // --- ROBUST PARSING LOGIC END ---

      // Convert array to Dictionary for Math Brain compatibility
      const positionsMap: Record<string, any> = {};
      const anglesMap: Record<string, any> = {};

      rawPositions.forEach((p: any) => {
        const key = p.name || p.id;
        if (key) {
          positionsMap[key] = {
            sign: p.sign || p.sign_id,
            deg: typeof p.norm_degree === 'number' ? p.norm_degree : (p.longitude || 0),
            house: p.house_number || p.house,
            retro: !!p.is_retrograde
          };

          // Capture Angles for legacy compatibility
          if (key === 'Ascendant' || key === 'ASC') anglesMap['Ascendant'] = positionsMap[key];
          if (key === 'Midheaven' || key === 'MC' || key === 'Medium_Coeli') anglesMap['MC'] = positionsMap[key];
        }
      });

      return {
        positions: positionsMap,
        angles: anglesMap,
        angle_signs: anglesMap, // Fallback alias
        cusps: rawHouses
      };
    };

    const settings = {
      zodiac_type: body.personA.zodiac_type || 'Tropic',
      house_system: 'P', // Placidus
      active_points: ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Ascendant', 'MC', 'North Node', 'Chiron']
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
      const method = body.translocation.method;

      const fetchRelocated = async (name: string, birth: BirthData) => {
        const relocatedBirthData = { ...birth, latitude, longitude };
        return fetchChartData(name, relocatedBirthData, settings);
      };

      if (method === 'A_local' || method === 'Both_local') {
        relocationDataA = await fetchRelocated(body.personA.name, personAData);
      }
      if (personBData && (method === 'B_local' || method === 'Both_local')) {
        relocationDataB = await fetchRelocated(body.personB.name, personBData);
      }
    }

    // 4. Generate Transits (Mock for now)
    const transitsByDate = generateMockTransits(body.window?.start, body.window?.end);

    // 5. Construct Response
    const response = {
      _format: 'mirror-symbolic-weather-v1',
      _natal_sections: personBData ? 2 : 1,
      _required_sections: personBData ? ['person_a', 'person_b'] : ['person_a'],
      _natal_section: {
        mirror_source: 'integrated',
        note: 'Natal geometry integrated with symbolic weather in single file'
      },

      success: true,
      sessionId: `session-${Date.now()}`,

      mirror_contract: {
        report_kind: personBData ? 'Relational Balance Meter' : 'Solo Balance Meter',
        is_relational: !!personBData,
        relationship_type: body.relationship_context?.type || (personBData ? 'Partner' : undefined),
        intimacy_tier: body.relationship_context?.intimacy_tier,
        contact_state: 'ACTIVE'
      },

      provenance: {
        math_brain_version: '3.2.3-robust-parsing',
        build_ts: new Date().toISOString(),
        house_system: 'Placidus',
        orbs_profile: 'wm-tight-2025-11-v5',
        ephemeris_source: 'best-astrology-api-v3',
        relocation_state: relocationDataA || relocationDataB ? 'truly_local' : 'natal_only',

        relocation_audit: (relocationDataA || relocationDataB) ? {
          mode: body.translocation?.method || 'unknown',
          original_coords: { lat: personAData.latitude, lon: personAData.longitude },
          effective_coords: {
            lat: relocationDataA ? body.translocation.coords.latitude : personAData.latitude,
            lon: relocationDataA ? body.translocation.coords.longitude : personAData.longitude
          },
        } : undefined
      },

      person_a: {
        name: body.personA.name,
        birth_data: personAData,
        chart: {
          positions: relocationDataA ? relocationDataA.positions : chartA.positions,
          angles: relocationDataA ? relocationDataA.angles : chartA.angles,
          cusps: relocationDataA ? relocationDataA.cusps : chartA.cusps,
          transitsByDate
        },
        summary: { axes: { magnitude: 3.5, directional_bias: 1.2, volatility: 0.5 } }
      },

      ...(personBData && {
        person_b: {
          name: body.personB.name,
          birth_data: personBData,
          chart: {
            positions: relocationDataB ? relocationDataB.positions : chartB?.positions,
            angles: relocationDataB ? relocationDataB.angles : chartB?.angles,
            cusps: relocationDataB ? relocationDataB.cusps : chartB?.cusps,
          },
          summary: { axes: { magnitude: 3.2, directional_bias: 0.8, volatility: 0.3 } }
        }
      }),

      balance_meter: {
        magnitude: 3.5,
        directional_bias: 1.2,
        volatility: 0.5,
        magnitude_label: 'Active',
        valence_label: 'Flow',
        volatility_label: 'Stable'
      },

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
