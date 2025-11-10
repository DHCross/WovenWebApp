// src/math_brain/utils.ts
/* eslint-disable no-console */

// This file is a collection of ported helper functions from the legacy
// `lib/server/astrology-mathbrain.js` monolith.

import { aggregate, _internals as seismoInternals } from '../../src/seismograph.js';
import { DateTime } from 'luxon';

const API_BASE_URL = 'https://astrologer.p.rapidapi.com';

const API_ENDPOINTS = {
  BIRTH_CHART:        `${API_BASE_URL}/api/v4/birth-chart`,
  NATAL_ASPECTS_DATA: `${API_BASE_URL}/api/v4/natal-aspects-data`,
  SYNASTRY_CHART:     `${API_BASE_URL}/api/v4/synastry-chart`,
  TRANSIT_CHART:      `${API_BASE_URL}/api/v4/transit-chart`,
  TRANSIT_ASPECTS:    `${API_BASE_URL}/api/v4/transit-aspects-data`,
  SYNASTRY_ASPECTS:   `${API_BASE_URL}/api/v4/synastry-aspects-data`,
  BIRTH_DATA:         `${API_BASE_URL}/api/v4/birth-data`,
  NOW:                `${API_BASE_URL}/api/v4/now`,
  COMPOSITE_ASPECTS:  `${API_BASE_URL}/api/v4/composite-aspects-data`,
  COMPOSITE_CHART:    `${API_BASE_URL}/api/v4/composite-chart`,
};

const logger = {
  log: (...args: any[]) => console.log(`[LOG]`, ...args),
  info: (...args: any[]) => console.info(`[INFO]`, ...args),
  warn: (...args: any[]) => console.warn(`[WARN]`, ...args),
  error: (...args: any[]) => console.error(`[ERROR]`, ...args),
  debug: (...args: any[]) => process.env.LOG_LEVEL === 'debug' && console.debug(`[DEBUG]`, ...args),
};
let loggedMissingRapidApiKey = false;

export function buildHeaders() {
  const rawKey = process.env.RAPIDAPI_KEY;
  const key = rawKey && String(rawKey).trim();
  if (!key) {
    if (!loggedMissingRapidApiKey) {
      logger.error('RAPIDAPI_KEY environment variable is not configured.');
      loggedMissingRapidApiKey = true;
    }
    throw new Error('RAPIDAPI_KEY environment variable is not configured.');
  }
  return {
    "content-type": "application/json",
    "x-rapidapi-key": key,
    "x-rapidapi-host": "astrologer.p.rapidapi.com",
  };
}

export async function apiCallWithRetry(url: string, options: any, operation: string, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.debug(`API call attempt ${attempt}/${maxRetries} for ${operation}`);
      const response = await fetch(url, options);

      if (!response.ok) {
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          const status = response.status;
          let rawText = '';
          try { rawText = await response.text(); } catch { rawText = 'Unable to read response body'; }
          throw new Error(`Client error ${status} for ${operation}`);
        }
        logger.warn(`API call failed with status ${response.status}. Retrying...`);
        throw new Error(`Server error: ${response.status}`);
      }
      return response.json();
    } catch (error: any) {
      if (attempt === maxRetries) {
        logger.error(`Failed after ${attempt} attempts: ${error.message}`, { url, operation });
        throw new Error(`Service temporarily unavailable. Please try again later.`);
      }
      const delay = Math.pow(2, attempt) * 100 + Math.random() * 100;
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

export function normalizeTimezone(tz: string) {
  if (!tz || typeof tz !== 'string') return tz;
  const t = tz.trim().toUpperCase();
  const timezoneMap: Record<string, string> = {
    'EASTERN': 'America/New_York', 'EST': 'America/New_York', 'EDT': 'America/New_York',
    'CENTRAL': 'America/Chicago', 'CST': 'America/Chicago', 'CDT': 'America/Chicago',
    'MOUNTAIN': 'America/Denver', 'MST': 'America/Denver', 'MDT': 'America/Denver',
    'PACIFIC': 'America/Los_Angeles', 'PST': 'America/Los_Angeles', 'PDT': 'America/Los_Angeles',
  };
  if (timezoneMap[t]) {
    return timezoneMap[t];
  }
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: tz }).resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

export function normalizeSubjectData(data: any): any {
    if (!data || typeof data !== 'object') return {};
  const normalized: any = {
    name: data.name || 'Subject',
    year: data.year, month: data.month, day: data.day,
    hour: data.hour, minute: data.minute,
    city: data.city, nation: data.nation,
    latitude: data.latitude ?? data.lat,
    longitude: data.longitude ?? data.lon ?? data.lng,
    timezone: normalizeTimezone(data.timezone || data.tz_str),
    zodiac_type: data.zodiac_type || data.zodiac || 'Tropic',
  };
  return normalized;
}

export function validateSubject(subject: any) {
  const baseReq = ['year','month','day','hour','minute','name','zodiac_type'];
  const baseMissing = baseReq.filter(f => subject[f] === undefined || subject[f] === null || subject[f] === '');
  const hasCoords = (typeof subject.latitude === 'number') && (typeof subject.longitude === 'number') && !!subject.timezone;
  const hasCity = !!(subject.city && subject.nation);
  const okMode = hasCoords || hasCity;
  const modeMsg = okMode ? '' : 'coords(lat,lon,timezone) OR city,nation required';
  const missingMsg = baseMissing.length ? `Missing: ${baseMissing.join(', ')}` : '';
  return { isValid: baseMissing.length === 0 && okMode, message: [missingMsg, modeMsg].filter(Boolean).join('; ') || 'ok' };
}

export function subjectToAPI(s: any = {}, pass: any = {}) {
    if (!s) return {};
    const hasCoords = (typeof s.latitude === 'number' || typeof s.lat === 'number') &&
                      (typeof s.longitude === 'number' || typeof s.lon === 'number' || typeof s.lng === 'number') &&
                      (s.timezone || s.tz_str);
    const hasCity = !!(s.city && s.nation);
    const tzNorm = normalizeTimezone(s.timezone || s.tz_str);
    const apiSubject: any = {
        name: s.name,
        year: s.year, month: s.month, day: s.day,
        hour: s.hour, minute: s.minute,
        zodiac_type: s.zodiac_type || 'Tropic'
    };
    if (hasCoords) {
        apiSubject.latitude = s.latitude ?? s.lat;
        apiSubject.longitude = s.longitude ?? s.lon ?? s.lng;
        apiSubject.timezone = tzNorm;
    }
    if (hasCity) {
        apiSubject.city = s.state ? `${s.city}, ${s.state}` : s.city;
        apiSubject.nation = s.nation;
    }
    return apiSubject;
}

export async function callNatal(endpoint: string, subject: any, headers: any, pass: any = {}, description = 'Natal call'){
  const payload = { subject: subjectToAPI(subject, pass) };
  return await apiCallWithRetry(endpoint, { method: 'POST', headers, body: JSON.stringify(payload) }, description);
}

export async function fetchNatalChartComplete(subject: any, headers: any, pass: any, subjectLabel: string, contextLabel: string) {
  const natalResponse = await callNatal(
    API_ENDPOINTS.BIRTH_CHART,
    subject,
    headers,
    pass,
    `Birth chart (${subjectLabel}) - ${contextLabel}`
  );

  const chartData = natalResponse.data || {};
  const natalData = {
    details: subject,
    chart: chartData,
    aspects: Array.isArray(natalResponse.aspects) ? natalResponse.aspects : (chartData.aspects || []),
    assets: []
  };
  return natalData;
}

function normalizeStep(step: string) {
  const s = String(step || '').toLowerCase();
  if (['daily','weekly','monthly'].includes(s)) return s;
  return 'daily';
}


export async function getTransits(subject: any, transitParams: any, headers: any, pass: any = {}) {
  if (!transitParams || !transitParams.startDate || !transitParams.endDate) return {};

  const { buildWindowSamples } = require('../../lib/time-sampling');
  const transitsByDate: Record<string, any> = {};
  const retroFlagsByDate: Record<string, any> = {};
  const provenanceByDate: Record<string, any> = {};
  const chartAssets: any[] = [];

  const ianaTz = subject?.timezone || 'UTC';
  const step = normalizeStep(transitParams.step || 'daily');
  const samplingWindow = buildWindowSamples(
    { start: transitParams.startDate, end: transitParams.endDate, step },
    ianaTz,
    transitParams?.timeSpec || null
  );
  const samples = Array.isArray(samplingWindow?.samples) ? samplingWindow.samples : [];
  const samplingZone = samplingWindow?.zone || ianaTz || 'UTC';

  const CHUNK_SIZE = 5;

  for (let chunkStart = 0; chunkStart < samples.length; chunkStart += CHUNK_SIZE) {
    const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, samples.length);
    const chunkSamples = samples.slice(chunkStart, chunkEnd);
    const chunkPromises: Promise<any>[] = [];

    for (const sampleIso of chunkSamples) {
        const utcDate = DateTime.fromISO(sampleIso, { zone: 'utc' });
        let localDate = utcDate.setZone(samplingZone);
        if (!localDate.isValid) {
            localDate = utcDate;
        }
        const dateString = localDate.toISODate();
        const transit_subject = {
            year: localDate.year,
            month: localDate.month,
            day: localDate.day,
            hour: localDate.hour,
            minute: localDate.minute,
            zodiac_type: 'Tropic',
            timezone: samplingZone
        };

        const payload = {
            first_subject: subjectToAPI(subject, pass),
            transit_subject: subjectToAPI(transit_subject, pass),
            ...pass
        };

        chunkPromises.push(
            (async () => {
                const resp = await apiCallWithRetry(
                    API_ENDPOINTS.TRANSIT_ASPECTS,
                    { method: 'POST', headers, body: JSON.stringify(payload) },
                    `Transits for ${subject.name} on ${dateString}`
                );
                if (resp && resp.aspects && resp.aspects.length > 0) {
                    transitsByDate[dateString] = resp.aspects;
                }
            })().catch(e => logger.error(`Failed to get transits for ${dateString}`, e))
        );
    }
    await Promise.all(chunkPromises);
  }
  return { transitsByDate, retroFlagsByDate, provenanceByDate, chartAssets };
}


export function calculateSeismograph(transitsByDate: any, retroFlagsByDate = {}, options: any = {}) {
  const daily: Record<string, any> = {};
  const summary: Record<string, any> = {};
  const graphRows: any[] = [];

  for (const date in transitsByDate) {
      const aspects = transitsByDate[date];
      const agg = aggregate(aspects.map((a: any) => ({
          transit: { body: a.p1_name },
          natal: { body: a.p2_name },
          type: a.aspect,
          orbDeg: a.orbit
      })), null, {});

      daily[date] = { seismograph: agg };
      graphRows.push({ date, magnitude: agg.magnitude, bias_signed: agg.directional_bias });
  }

  const numDays = Object.keys(daily).length;
  if (numDays > 0) {
      summary.magnitude = graphRows.reduce((sum, row) => sum + row.magnitude, 0) / numDays;
      summary.directional_bias = graphRows.reduce((sum, row) => sum + row.bias_signed, 0) / numDays;
  }

  return { daily, summary, graph_rows: graphRows };
}

export async function computeComposite(A: any, B: any, pass: any = {}, H: any) {
  try {
    const payload = {
      first_subject: subjectToAPI(A, pass),
      second_subject: subjectToAPI(B, pass),
      ...pass,
    };
    const r = await apiCallWithRetry(
      API_ENDPOINTS.COMPOSITE_ASPECTS,
      { method: 'POST', headers: H, body: JSON.stringify(payload) },
      'Composite aspects'
    );
    const data = r.data || {};
    const topAspects = Array.isArray(r.aspects) ? r.aspects : (data.aspects || []);
    return { aspects: topAspects, raw: data };
  } catch (error: any) {
    logger.error('Composite calculation failed:', error);
    throw new Error(`Composite calculation failed: ${error.message}`);
  }
}
