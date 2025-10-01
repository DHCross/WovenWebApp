// Maps daily indices to lexicon axes and a single scenario question for Poetic Brain

export type DailyIndex = {
  date: string;
  magnitude?: number; // 0..5
  valence?: number;   // -5..5 (bounded or calibrated)
  volatility?: number; // 0..5
  sf_diff?: number;   // support-friction differential (approx)
};

export type ScenarioAxis = {
  axis: 'Openness \u2194 Restriction' | 'Supported \u2194 Unsanctioned' | 'Risk \u2194 Stability' | 'Visibility \u2194 Obscurity';
  left: string; // adjective on left pole
  right: string; // adjective on right pole
  leaning: 'left' | 'right' | 'neutral';
};

export type ScenarioResult = {
  axes: ScenarioAxis[];
  prompt: string; // one scenario question
};

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function indicesToScenario(indices: DailyIndex[]): ScenarioResult {
  const last3 = indices.slice(-3);
  const m = avg(last3.map(d => Number(d.magnitude ?? 0)));
  const v = avg(last3.map(d => Number(d.valence ?? 0)));
  const vol = avg(last3.map(d => Number(d.volatility ?? 0)));
  const sfd = avg(last3.map(d => Number(d.sf_diff ?? 0)));

  // Normalize thresholds (heuristic)
  const hi = (x: number, t: number) => x >= t;
  const lo = (x: number, t: number) => x <= t;

  // Supported ↔ Unsanctioned → valence tilt
  const supportedAxis: ScenarioAxis = {
    axis: 'Supported \u2194 Unsanctioned',
    left: 'Supported',
    right: 'Unsanctioned',
    leaning: v > 0.8 ? 'left' : v < -0.8 ? 'right' : 'neutral'
  };

  // Risk ↔ Stability → volatility + magnitude
  const riskAxis: ScenarioAxis = {
    axis: 'Risk \u2194 Stability',
    left: 'Risk',
    right: 'Stability',
    leaning: hi(vol, 3.2) || hi(m, 3.6) ? 'left' : lo(vol, 1.2) && lo(m, 1.2) ? 'right' : 'neutral'
  };

  // Openness ↔ Restriction → valence + sfd
  const opennessAxis: ScenarioAxis = {
    axis: 'Openness \u2194 Restriction',
    left: 'Openness',
    right: 'Restriction',
    leaning: (v - Math.max(0, -sfd)) > 0.6 ? 'left' : (v + Math.max(0, sfd)) < -0.6 ? 'right' : 'neutral'
  };

  // Visibility ↔ Obscurity → proxy via magnitude and low volatility
  const visibilityAxis: ScenarioAxis = {
    axis: 'Visibility \u2194 Obscurity',
    left: 'Visibility',
    right: 'Obscurity',
    leaning: hi(m, 2.2) && lo(vol, 3.8) ? 'left' : lo(m, 1.0) ? 'right' : 'neutral'
  };

  const axes = [opennessAxis, supportedAxis, riskAxis, visibilityAxis];

  // Pick a question based on strongest leaning (simple scoring)
  const scored = axes.map(a => ({ a, score: a.leaning === 'neutral' ? 0 : 1 + (a.axis.startsWith('Openness') ? 0.1 : 0) }));
  scored.sort((x, y) => y.score - x.score);
  const top = scored[0].a;

  let prompt = '';
  switch (top.axis) {
    case 'Openness \u2194 Restriction':
      prompt = 'Does openness carry risk right now, or does restriction conserve something useful?';
      break;
    case 'Supported \u2194 Unsanctioned':
      prompt = 'Is agency flowing with the field, or do moves meet reversal?';
      break;
    case 'Risk \u2194 Stability':
      prompt = 'Is today better for exposure and testing, or for consolidation?';
      break;
    case 'Visibility \u2194 Obscurity':
      prompt = 'Will this action be seen, or does it work better offstage?';
      break;
  }

  return { axes, prompt };
}

