// src/math_brain/service.ts

/**
 * @module mathBrainService
 *
 * This service is responsible for orchestrating the fetching and processing of
 * astrological chart data. It acts as a replacement for the monolithic
 * `lib/server/astrology-mathbrain.js` file, providing a modern, testable,
 * and maintainable interface for the Math Brain v2 system.
 */

import {
  normalizeSubjectData,
  validateSubject,
  buildHeaders,
  fetchNatalChartComplete,
  getTransits,
  calculateSeismograph,
  computeComposite,
} from './utils';


interface ChartDataPayload {
  [key: string]: any;
}

interface ChartDataResult {
  success: boolean;
  provenance: any;
  person_a: any;
  person_b?: any;
  synastry?: any;
  composite?: any;
  woven_map?: any;
  relationship_context?: any;
  transitsByDate?: any;
  [key: string]: any; // Allow other properties to match monolith's output
}

class MathBrainService {
  /**
   * Fetches and processes all necessary astrological data for a given request payload.
   * This is the primary entry point for the service.
   *
   * @param {ChartDataPayload} rawPayload - The raw request body from the API route.
   * @returns {Promise<ChartDataResult>} The processed chart data, ready for the v2 orchestrator.
   */
  public async fetch(rawPayload: ChartDataPayload): Promise<ChartDataResult> {
    const personA = normalizeSubjectData(rawPayload.personA || {});
    const validation = validateSubject(personA);
    if (!validation.isValid) {
      throw new Error(`Primary subject validation failed: ${validation.message}`);
    }

    const headers = buildHeaders();
    const pass = {};
    [
      'active_points', 'active_aspects', 'houses_system_identifier',
      'sidereal_mode', 'perspective_type', 'wheel_only', 'wheel_format',
      'theme', 'language'
    ].forEach((key) => {
      if (rawPayload[key] !== undefined) pass[key] = rawPayload[key];
    });

    const personANatal = await fetchNatalChartComplete(
      personA,
      headers,
      pass,
      'person_a',
      rawPayload.mode || 'standard'
    );

    const result: ChartDataResult = {
      success: true,
      provenance: {},
      person_a: {
        details: personANatal.details,
        chart: personANatal.chart,
        aspects: personANatal.aspects,
        assets: personANatal.assets || [],
      },
    };

    const win = rawPayload.window || null;
    const start = win?.start;
    const end = win?.end;
    const step = win?.step || 'daily';
    const haveRange = Boolean(start && end);

    if (haveRange) {
      const { transitsByDate, retroFlagsByDate, provenanceByDate } = await getTransits(
        personA,
        { startDate: start, endDate: end, step: step },
        headers,
        pass
      );
      const seismographData = calculateSeismograph(transitsByDate, retroFlagsByDate, {
        orbsProfile: rawPayload.orbs_profile || 'wm-tight-2025-11-v5'
      });
      result.person_a.chart.transitsByDate = seismographData.daily;
      result.person_a.chart.provenanceByDate = provenanceByDate;
      result.person_a.derived = {
        seismograph_summary: seismographData.summary,
      };
    }

    const hasPersonB = rawPayload.personB && Object.keys(rawPayload.personB).length > 0;
    const mode = rawPayload.mode || '';
    const isSynastry = mode.includes('SYNASTRY');
    const isComposite = mode.includes('COMPOSITE');
    const isRelational = isSynastry || isComposite || hasPersonB;

    if (isRelational) {
      if (!hasPersonB) {
        throw new Error('Relational report requested but personB is missing.');
      }
      const personB = normalizeSubjectData(rawPayload.personB);
      const validationB = validateSubject(personB);
      if (!validationB.isValid) {
        throw new Error(`Secondary subject validation failed: ${validationB.message}`);
      }
      const personBNatal = await fetchNatalChartComplete(
        personB,
        headers,
        pass,
        'person_b',
        mode
      );
      result.person_b = {
        details: personBNatal.details,
        chart: personBNatal.chart,
        aspects: personBNatal.aspects,
        assets: personBNatal.assets || [],
      };
      if (isComposite) {
         const composite = await computeComposite(personA, personB, pass, headers);
         result.composite = {
            aspects: composite.aspects,
            data: composite.raw,
         };
      }
    }

    return result;
  }
}

export const mathBrainService = new MathBrainService();
