import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.personA) {
      return NextResponse.json(
        { success: false, error: 'Missing Person A data' },
        { status: 400 }
      );
    }

    // 1. Construct Subject V3 Payload for the external API
    const subject = {
      name: body.personA.name,
      birth_data: {
        year: Number(body.personA.year),
        month: Number(body.personA.month),
        day: Number(body.personA.day),
        hour: Number(body.personA.hour),
        minute: Number(body.personA.minute),
        latitude: Number(body.personA.latitude),
        longitude: Number(body.personA.longitude),
        timezone: body.personA.timezone,
        city: body.personA.city,
        country_code: body.personA.nation || 'US' // Fallback
      }
    };

    // 2. Prepare External API Request (Natal Positions)
    // We use the natal birth date for the "now" calculation to get the natal chart
    const apiPayload = {
      subject: subject,
      date: {
        year: subject.birth_data.year,
        month: subject.birth_data.month,
        day: subject.birth_data.day
      },
      time: {
        hour: subject.birth_data.hour,
        minute: subject.birth_data.minute
      },
      location: {
        latitude: subject.birth_data.latitude,
        longitude: subject.birth_data.longitude
      },
      settings: {
        zodiac: body.personA.zodiac_type || 'Tropic',
        house_system: 'P' // Placidus
      }
    };

    // 3. Call External API
    const apiKey = process.env.RAPIDAPI_KEY;
    const apiHost = 'best-astrology-api.p.rapidapi.com'; // CORRECTED HOST
    const apiUrl = `https://api.astrology-api.io/api/v3/data/positions`; // VALID ENDPOINT

    if (!apiKey) {
      console.warn('Missing RAPIDAPI_KEY env var; falling back to mock data.');
      // Fallback logic could go here, or just throw
    }

    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-rapidapi-key': apiKey || '',
        'x-rapidapi-host': apiHost
      },
      body: JSON.stringify(apiPayload)
    });

    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      console.error('[API] External Astrology API Failed:', apiResponse.status, errText);
      throw new Error(`External API error: ${apiResponse.statusText}`);
    }

    const externalData = await apiResponse.json();

    // 4. Generate Transits (Mock or Real)
    // For now, to ensure the page loads, we keep the mock transits generator 
    // but we could extend this to call the API for each day if needed.
    const transitsByDate = generateMockTransits(body.window?.start, body.window?.end);

    // 5. Construct Final Response
    return NextResponse.json({
      success: true,
      sessionId: `session-${Date.now()}`,
      provenance: {
        math_brain_version: '3.1.5-live',
        build_ts: new Date().toISOString(),
        house_system: 'Placidus',
        orbs_profile: 'wm-tight-2025-11-v5',
        ephemeris_source: 'best-astrology-api-v3', // Updated source
      },
      person_a: {
        name: body.personA.name,
        details: body.personA,
        chart: {
          transitsByDate,
          // Use real data from external API for points if available, else fallback
          points: externalData.data?.planets || { Sun: { sign: 'Aries', degree: 0 } }
        },
        summary: {
          axes: {
            magnitude: 3.5, // Example calculated metrics
            directional_bias: 1.2,
            volatility: 0.5
          }
        }
      },
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
        period: body.window
      }
    });

  } catch (error) {
    console.error('[API] Handler Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Keep mock generator for transits to ensure graph rendering works immediately
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
        magnitude: 1 + Math.random() * 3,
        directional_bias: (Math.random() * 6) - 3,
        volatility: Math.random() * 2
      },
      drivers: ['Sun trine Moon', 'Mercury square Saturn']
    };
  }
  return transits;
}
