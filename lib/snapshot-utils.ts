import { SnapshotData, SnapshotTone, SnapshotAnchor, SnapshotHook, ReportHeader, Weather, Blueprint } from './ui-types';

// House keywords for plain language descriptions
const HOUSE_KEYWORDS: Record<string, string> = {
  '01': 'identity, first impressions',
  '02': 'values, resources, self-worth',
  '03': 'communication, siblings, learning',
  '04': 'home, family, roots',
  '05': 'creativity, romance, self-expression',
  '06': 'daily routine, health, service',
  '07': 'partnerships, relationships, others',
  '08': 'shared resources, transformation, deeper matters',
  '09': 'beliefs, higher learning, travel',
  '10': 'career, reputation, public image',
  '11': 'friendships, groups, hopes',
  '12': 'spirituality, hidden things, rest'
};

export function shouldShowSnapshot(startDate: string, endDate: string, step: string, result: any): boolean {
  // Single-day window with daily step
  if (startDate === endDate && step === 'daily') {
    return true;
  }

  // Valid window but zero plot-worthy points
  const daily = result?.person_a?.chart?.transitsByDate || {};
  const dates = Object.keys(daily).filter(d => d && d.match(/^\d{4}-\d{2}-\d{2}$/));
  if (dates.length === 0) {
    return true;
  }

  // Check if all points have insufficient data for plotting
  const hasPlottableData = dates.some(date => {
    const dayData = daily[date];
    return dayData?.seismograph?.magnitude || dayData?.seismograph?.valence || dayData?.seismograph?.volatility;
  });

  return !hasPlottableData;
}

export function extractReportHeader(mode: string, startDate: string, endDate: string, step: string, relocated: { active: boolean; label?: string }): ReportHeader {
  const normalizedMode = mode.toUpperCase().replace('_ONLY', '').replace('_TRANSITS', '_TRANSITS') as ReportHeader['mode'];

  return {
    mode: normalizedMode,
    window: startDate && endDate ? { start: startDate, end: endDate, step: step as "daily" | "hourly" | "none" } : undefined,
    relocated
  };
}

export function extractWeather(startDate: string, endDate: string, result: any): Weather {
  const hasWindow = !!(startDate && endDate && startDate.trim() && endDate.trim());

  // Extract balance meter data if available
  let balanceMeter: Weather['balanceMeter'] | undefined;
  const summary = result?.person_a?.derived?.seismograph_summary;
  if (summary) {
    balanceMeter = {
      magnitude: summary.magnitude_label || (Number(summary.magnitude ?? 0) >= 3 ? 'High' : Number(summary.magnitude ?? 0) >= 1.5 ? 'Moderate' : 'Low'),
      valence: summary.valence_label || (Number(summary.valence ?? 0) > 0.5 ? 'Harmonious' : Number(summary.valence ?? 0) < -0.5 ? 'Tense' : 'Complex'),
      volatility: summary.volatility_label || (Number(summary.volatility ?? 0) >= 3 ? 'Unstable' : Number(summary.volatility ?? 0) >= 1 ? 'Variable' : 'Stable')
    };
  }

  // Extract tier-1 hooks with plain language explanations
  const tier1Hooks: Weather['tier1Hooks'] = [];
  const wovenMap = result?.person_a?.derived?.woven_map ?? result?.woven_map ?? null;
  const hooks = wovenMap?.hook_stack?.hooks || [];

  const pushHook = (hook: any) => {
    if (!hook) return;
    const planetA = hook.planet_a || hook.p1_name || '';
    const planetB = hook.planet_b || hook.p2_name || '';
    const aspect = hook.aspect || hook.type || '';

    tier1Hooks.push({
      label: `${planetA} ${aspect} ${planetB}`.trim(),
      why: generateHookExplanation(planetA, planetB, aspect)
    });
  };

  hooks.filter((hook: any) => (hook.orb || hook.orbit || 0) <= 1.0).slice(0, 3).forEach(pushHook);
  if (tier1Hooks.length === 0 && hooks.length > 0) {
    hooks.slice(0, 2).forEach(pushHook);
  }

  return {
    hasWindow,
    balanceMeter,
    tier1Hooks
  };
}

export function extractBlueprint(result: any): Blueprint {
  // Extract thesis from result or generate fallback
  const wovenMap = result?.person_a?.derived?.woven_map ?? result?.woven_map ?? null;
  const voice = wovenMap?.voice;
  const tier1Count = wovenMap?.hook_stack?.tier_1_orbs || 0;

  let thesis = voice || '';
  if (!thesis) {
    thesis = `Your chart shows ${tier1Count} key patterns that shape how you engage with life. These core themes provide the foundation for understanding how current energies will affect you.`;
  }

  return { thesis };
}

export function extractSnapshotData(
  location: string,
  startDate: string,
  endDate: string,
  result: any,
  relocated: { active: boolean; label?: string }
): SnapshotData {
  // Format date range
  const dateRange = startDate === endDate
    ? new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : `${new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  // Extract tone from balance meter data
  const summary = result?.person_a?.derived?.seismograph_summary;
  const tone: SnapshotTone = {
    magnitude: summary?.magnitude_label || (Number(summary?.magnitude ?? 0) >= 3 ? 'High' : Number(summary?.magnitude ?? 0) >= 1.5 ? 'Moderate' : 'Low'),
    valence: summary?.valence_label || (Number(summary?.valence ?? 0) > 0.5 ? 'Harmonious' : Number(summary?.valence ?? 0) < -0.5 ? 'Tense' : 'Complex'),
    volatility: summary?.volatility_label || (Number(summary?.volatility ?? 0) >= 3 ? 'Unstable' : Number(summary?.volatility ?? 0) >= 1 ? 'Variable' : 'Stable')
  };

  // Extract anchors from major aspects or planetary emphasis
  const anchors: SnapshotAnchor[] = extractAnchors(result);

  // Extract hooks from tight aspects
  const hooks: SnapshotHook[] = extractHooks(result, relocated.active);

  // Determine top house
  const topHouse = extractTopHouse(result, hooks, relocated.active);

  // Create heat band for multi-day windows
  const heatband = startDate !== endDate ? createHeatBand(result, startDate, endDate) : undefined;

  return {
    header: {
      location,
      dateRange,
      type: startDate === endDate ? "Snapshot" : "Overview"
    },
    tone,
    anchors,
    hooks,
    topHouse,
    heatband,
    auditFooter: {
      anchorsCount: anchors.length,
      hooksCount: hooks.length,
      lens: relocated.label || location,
      peaks: extractPeaks(result, startDate, endDate)
    }
  };
}

function generateHookExplanation(planetA: string, planetB: string, aspect: string): string {
  const explanations: Record<string, string> = {
    'Sun opposition Saturn': 'tests boundaries around responsibility vs. autonomy',
    'Moon square Mars': 'creates tension between comfort and action',
    'Venus trine Jupiter': 'opens opportunities for growth and pleasure',
    'Mercury conjunction Pluto': 'intensifies communication and mental focus',
    'Mars square Jupiter': 'challenges you to balance ambition with restraint'
  };

  const key = `${planetA} ${aspect} ${planetB}`;
  return explanations[key] || `creates dynamic interaction between ${planetA.toLowerCase()} and ${planetB.toLowerCase()} themes`;
}

function extractAnchors(result: any): SnapshotAnchor[] {
  const anchors: SnapshotAnchor[] = [];
  const wovenMap = result?.person_a?.derived?.woven_map ?? result?.woven_map ?? null;
  const hooks = wovenMap?.hook_stack?.hooks || [];

  // Get strongest aspects and convert to anchors
  hooks.slice(0, 3).forEach((hook: any) => {
    const planetA = hook.planet_a || hook.p1_name || '';
    const planetB = hook.planet_b || hook.p2_name || '';
    const aspect = hook.aspect || hook.type || '';
    const weight = hook.weight || 0;

    anchors.push({
      name: `${planetA} vs. ${planetB}`,
      strength: Math.abs(weight),
      valence: weight > 0 ? 'supportive' : weight < 0 ? 'challenging' : 'mixed',
      benefit: generateBenefit(planetA, planetB, aspect),
      friction: generateFriction(planetA, planetB, aspect)
    });
  });

  return anchors;
}

function extractHooks(result: any, relocated: boolean): SnapshotHook[] {
  const hooks: SnapshotHook[] = [];
  const wovenMap = result?.person_a?.derived?.woven_map ?? result?.woven_map ?? null;
  const hookData = wovenMap?.hook_stack?.hooks || [];

  hookData.filter((hook: any) => (hook.orb || hook.orbit || 0) <= 1.0).slice(0, 3).forEach((hook: any) => {
    const planetA = hook.planet_a || hook.p1_name || '';
    const planetB = hook.planet_b || hook.p2_name || '';
    const aspect = hook.aspect || hook.type || '';

    hooks.push({
      label: `${planetA} ↔ ${planetB}`,
      intensity: hook.weight || 0,
      targetHouse: `A:${String(hook.house || 1).padStart(2, '0')}`
    });
  });

  return hooks;
}

function extractTopHouse(result: any, hooks: SnapshotHook[], relocated: boolean): { tag: string; keywords: string; relocated: boolean } {
  // Use house from top hook, or default to house 1
  const topHouseNum = hooks[0]?.targetHouse.split(':')[1] || '01';

  return {
    tag: `A:${topHouseNum}`,
    keywords: HOUSE_KEYWORDS[topHouseNum] || 'life themes',
    relocated
  };
}

function createHeatBand(result: any, startDate: string, endDate: string): Array<{ day: string; intensity: "light" | "medium" | "dark" }> {
  const daily = result?.person_a?.chart?.transitsByDate || {};
  const dates = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }

  return dates.map(date => {
    const dayData = daily[date];
    const magnitude = Number(dayData?.seismograph?.magnitude || 0);

    let intensity: "light" | "medium" | "dark" = "light";
    if (magnitude >= 3) intensity = "dark";
    else if (magnitude >= 1.5) intensity = "medium";

    return {
      day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      intensity
    };
  });
}

function extractPeaks(result: any, startDate: string, endDate: string): string | undefined {
  if (startDate === endDate) return undefined;

  const daily = result?.person_a?.chart?.transitsByDate || {};
  const peaks: string[] = [];

  Object.entries(daily).forEach(([date, data]: [string, any]) => {
    const magnitude = Number(data?.seismograph?.magnitude || 0);
    if (magnitude >= 3) {
      const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
      peaks.push(dayName);
    }
  });

  return peaks.length > 0 ? peaks.join('/') : undefined;
}

function generateBenefit(planetA: string, planetB: string, aspect: string): string {
  // Simple benefit mappings - expand as needed
  const benefits: Record<string, string> = {
    'Sun': 'express your authentic self',
    'Moon': 'trust your intuition',
    'Mercury': 'communicate clearly',
    'Venus': 'create harmony',
    'Mars': 'take decisive action',
    'Jupiter': 'expand your horizons',
    'Saturn': 'build solid foundations'
  };

  return benefits[planetA] || 'harness this energy';
}

function generateFriction(planetA: string, planetB: string, aspect: string): string {
  // Simple friction mappings - expand as needed
  const frictions: Record<string, string> = {
    'Sun': 'ego conflicts',
    'Moon': 'emotional overwhelm',
    'Mercury': 'miscommunication',
    'Venus': 'indulgence',
    'Mars': 'impulsive reactions',
    'Jupiter': 'overextension',
    'Saturn': 'excessive restriction'
  };

  return frictions[planetA] || 'potential tension';
}