/**
 * Symbolic Weather API Endpoint
 * Returns time-series balance meter data for seismograph visualization
 *
 * IMPORTANT: House frame is ALWAYS natal. The upstream API cannot recalculate
 * houses for relocation. Any place-specific guidance must come from author overlay.
 *
 * Query params:
 *   - start: ISO date string (YYYY-MM-DD)
 *   - end: ISO date string (YYYY-MM-DD)
 *   - step: 'daily' | 'weekly' (default: daily)
 *   - userId: (optional) User ID for stored chart lookup
 *   - chartId: (optional) Chart ID for specific report
 *
 * Returns array of daily readings with BM-v3 schema including house framing:
 * [
 *   {
 *     date: "2025-11-01",
 *     magnitude_0to5: 3.8,
 *     bias_signed_minus5to5: -2.7,
 *     coherence_0to5: 2.3,
 *     sfd_cont_minus1to1: -0.12,
 *     schema_version: "BM-v3",
 *     orbs_profile: "tight",
 *     house_frame: "natal",                   // ALWAYS natal
 *     relocation_supported: false,            // API cannot recalc houses
 *     relocation_overlay: {                   // Optional author guidance
 *       user_place: "Austin, TX",
 *       advisory: "...",
 *       confidence: "author_note"
 *     },
 *     provenance: { ... }
 *   }
 * ]
 */

import { NextResponse } from 'next/server';

interface RelocationOverlay {
  user_place: string;
  advisory: string;
  confidence: 'author_note' | 'heuristic' | 'computed';
  notes: string[];
}

/**
 * Extract time-series data from Math Brain transitsByDate structure
 *
 * CRITICAL: Houses are ALWAYS natal. The API does not support relocated houses.
 * The relocation shim only affects house filtering for Balance Meter scoring,
 * not the actual ephemeris house positions.
 */
function extractSymbolicWeatherSeries(mathBrainResult: any, options: {
  startDate: string;
  endDate: string;
  userPlace?: string;
}) {
  const { userPlace } = options;

  // Extract transit data
  const transitsByDate = mathBrainResult?.person_a?.chart?.transitsByDate || {};
  const provenance = mathBrainResult?.provenance || {};

  const series = [];
  const dates = Object.keys(transitsByDate).sort();

  for (const date of dates) {
    const dayData = transitsByDate[date];
    if (!dayData) continue;

    const seismo = dayData.seismograph || {};
    const balance = dayData.balance || {};
    const sfd = dayData.sfd || {};

    // Houses are ALWAYS natal - the API cannot recalculate for relocation
    const houseFrame = 'natal';
    const relocationSupported = false;

    // Build author-overlay if user has a place context
    let relocationOverlay: RelocationOverlay | null = null;
    if (userPlace) {
      relocationOverlay = {
        user_place: userPlace,
        advisory: 'Read "Maintenance/Work" themes through daily logistics rather than career status. Same sky, natal rooms only.',
        confidence: 'author_note',
        notes: [
          'Houses are derived from natal frame only.',
          'The API does not recalc for relocation.',
          'Any "place" guidance is human-authored overlay, not computed houses.'
        ]
      };
    }

    const dataPoint = {
      date,
      magnitude_0to5: seismo.magnitude ?? balance.magnitude ?? 0,
      bias_signed_minus5to5: seismo.bias_signed ?? balance.bias_signed ?? 0,
      coherence_0to5: seismo.volatility ?? 0, // Volatility maps to narrative coherence
      sfd_cont_minus1to1: sfd.sfd_cont ?? 0,
      schema_version: 'BM-v3',
      orbs_profile: provenance.orbs_profile || 'wm-spec-2025-09',
      house_frame: houseFrame,
      relocation_supported: relocationSupported,
      ...(relocationOverlay && { relocation_overlay: relocationOverlay }),
      provenance: {
        house_system: `${provenance.house_system || 'Placidus'} (natal)`,
        relocation_mode: 'not_applied', // Never applied to ephemeris
        orbs_profile: provenance.orbs_profile || 'wm-spec-2025-09',
        math_brain_version: provenance.math_brain_version || provenance.version || '3.1.4',
        tz: provenance.tz || provenance.timezone || 'UTC',
        bias_method: seismo.bias_method || balance.bias_method || 'signed_z_to_[-5,5]',
        mag_method: seismo.magnitude_method || balance.magnitude_method || 'z_to_[0,5]'
      }
    };

    series.push(dataPoint);
  }

  return series;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const step = searchParams.get('step') || 'daily';

    // Optional: User context for fetching stored data
    const userId = searchParams.get('userId');
    const chartId = searchParams.get('chartId');

    if (!start || !end) {
      return NextResponse.json(
        { error: 'Missing required parameters: start and end dates' },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start) || !dateRegex.test(end)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // TODO: Fetch stored Math Brain result for userId/chartId
    // For now, return structured mock data with correct house framing
    const mockMathBrainResult = {
      person_a: {
        chart: {
          transitsByDate: {
            [start]: {
              seismograph: {
                magnitude: 3.8,
                bias_signed: -2.7,
                volatility: 2.3,
                bias_method: 'balance_signed_v3',
                magnitude_method: 'rolling_window_v3'
              },
              balance: {
                magnitude: 3.8,
                bias_signed: -2.7
              },
              sfd: {
                sfd_cont: -0.12
              }
            }
          }
        }
      },
      provenance: {
        house_system: 'Placidus',
        orbs_profile: 'tight',
        math_brain_version: '3.1.4',
        tz: 'America/Chicago'
      }
    };

    const series = extractSymbolicWeatherSeries(mockMathBrainResult, {
      startDate: start,
      endDate: end,
      userPlace: 'Austin, TX, US' // TODO: get from user profile/session
    });

    return NextResponse.json({
      success: true,
      data: series,
      meta: {
        start,
        end,
        step,
        count: series.length,
        schema_version: 'BM-v3',
        house_frame: 'natal', // ALWAYS natal - API cannot recalc
        relocation_supported: false
      }
    });
  } catch (error) {
    console.error('[Symbolic Weather API Error]', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
