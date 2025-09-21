function getInternalBaseUrl(): string {
  const explicit = process.env.MATHBRAIN_INTERNAL_BASE_URL || process.env.MATH_BRAIN_INTERNAL_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  const publicSite = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (publicSite) return publicSite.replace(/\/$/, '');
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/$/, '')}`;
  const port = process.env.PORT || 3000;
  return `http://127.0.0.1:${port}`;
}

function extractClimate(payload: any): any {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.climate) return payload.climate;
  const balance = payload.balance_meter || payload.summary?.balance_meter;
  if (balance?.climate) return balance.climate;
  if (balance?.climate_line) {
    return {
      line: balance.climate_line,
      magnitude: balance.magnitude,
      valence: balance.valence_bounded ?? balance.valence,
      volatility: balance.volatility
    };
  }
  return null;
}

function extractGeometry(payload: any): any {
  if (!payload || typeof payload !== 'object') return null;
  return payload.geometry || payload.raw_geometry || payload.report?.geometry || null;
}

function buildProvenance(options: Record<string, any>, payload: any): Record<string, any> {
  const fromPayload = payload?.provenance && typeof payload.provenance === 'object' ? payload.provenance : {};
  const reportType = options?.reportType || options?.report_type || 'unknown';
  return {
    source: 'Math Brain API',
    report_type: reportType,
    api_version: payload?.provenance?.api_version || payload?.meta?.api_version || 'unversioned',
    ...fromPayload,
  };
}

const REPORT_TYPE_ALIAS: Record<string, string> = {
  mirror: 'solo_mirror',
  solo_mirror: 'solo_mirror',
  balance: 'solo_balance_meter',
  solo_balance: 'solo_balance_meter',
  solo_balance_meter: 'solo_balance_meter',
  transit: 'solo_balance_meter',
  relational_mirror: 'relational_mirror',
  synastry: 'relational_mirror',
  composite: 'relational_balance_meter',
  relational_balance_meter: 'relational_balance_meter',
  relational_balance: 'relational_balance_meter',
};

function normaliseOptions(options: Record<string, any>): Record<string, any> {
  const payload = { ...(options || {}) };
  const rawType = options?.report_type || options?.reportType;
  if (rawType) {
    const key = String(rawType).toLowerCase();
    const canonical = REPORT_TYPE_ALIAS[key] || rawType;
    payload.report_type = canonical;
  }
  return payload;
}

/**
 * Calls the Math Brain internal API and normalises the response into a shared format.
 */
export async function runMathBrain(options: Record<string, any>): Promise<Record<string, any>> {
  const endpoint = `${getInternalBaseUrl()}/api/astrology-mathbrain`;
  const payloadOptions = normaliseOptions(options ?? {});
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadOptions),
      cache: 'no-store'
    });

    const text = await res.text();
    let payload: any = {};
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch (parseError) {
        payload = { raw: text };
      }
    }

    if (!res.ok) {
      return {
        success: false,
        status: res.status,
        error: payload?.error || `Math Brain API call failed (${res.status})`,
        details: payload,
      };
    }

    return {
      success: true,
      provenance: buildProvenance(payloadOptions, payload),
      geometry: extractGeometry(payload),
      climate: extractClimate(payload),
      data: payload,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Math Brain API call failed',
      details: error,
    };
  }
}
