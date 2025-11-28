// Maps daily indices to lexicon axes and a single scenario question for Poetic Brain

export type DailyIndex = {
  date: string;
  magnitude?: number; // 0..5
  valence?: number;   // -5..5 (bounded or calibrated)
  volatility?: number; // 0..5
};

export type ScenarioAxis = {
  axis: 'Openness \u2194 Restriction' | 'Supported \u2194 Unsanctioned' | 'Risk \u2194 Stability' | 'Visibility \u2194 Obscurity';
  left: string;
  right: string;
  leaning: 'left' | 'right' | 'neutral';
};

export type ScenarioResult = {
  axes: ScenarioAxis[];
  prompt: string; // internal question (not surfaced)
  translation: string; // reader-facing translation paragraph
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

  // Openness ↔ Restriction → valence tilt
  const opennessAxis: ScenarioAxis = {
    axis: 'Openness \u2194 Restriction',
    left: 'Openness',
    right: 'Restriction',
    leaning: v > 0.6 ? 'left' : v < -0.6 ? 'right' : 'neutral'
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
  let translation = '';
  switch (top.axis) {
    case 'Openness \u2194 Restriction':
      prompt = 'Does openness carry risk right now, or does restriction conserve something useful?';
      translation = buildTranslation('openness', top.leaning);
      break;
    case 'Supported \u2194 Unsanctioned':
      prompt = 'Is agency flowing with the field, or do moves meet reversal?';
      translation = buildTranslation('support', top.leaning);
      break;
    case 'Risk \u2194 Stability':
      prompt = 'Is today better for exposure and testing, or for consolidation?';
      translation = buildTranslation('risk', top.leaning);
      break;
    case 'Visibility \u2194 Obscurity':
      prompt = 'Will this action be seen, or does it work better offstage?';
      translation = buildTranslation('visibility', top.leaning);
      break;
  }

  return { axes, prompt, translation };
}

function buildTranslation(kind: 'openness' | 'support' | 'risk' | 'visibility', leaning: ScenarioAxis['leaning']): string {
  switch (kind) {
    case 'openness': {
      const base = 'The field today may highlight the tension between openness and restriction. Openness can build connection but may also increase exposure. Restriction conserves energy but may create distance.';
      const left = 'If the field leans toward openness, sharing may land more easily than usual. It may not. You choose.';
      const right = 'If the field leans toward restriction, boundaries may feel more natural. Honoring them is one option.';
      const neutral = 'The field is balanced. Both openness and restriction are available. Neither is correct.';
      return `${base} ${leaning === 'left' ? left : leaning === 'right' ? right : neutral}`;
    }
    case 'support': {
      const base = 'The field today may highlight which moves feel supported versus which meet friction. Supported choices tend to flow; unsanctioned choices tend to snag.';
      const left = 'If doors open easily, that is the field endorsing a lane. You can take it or not.';
      const right = 'If attempts stall, that is information about the field. Rerouting is one response; waiting is another.';
      const neutral = 'The field is mixed. Some things glide; others snag. The contrast itself is data.';
      return `${base} ${leaning === 'left' ? left : leaning === 'right' ? right : neutral}`;
    }
    case 'risk': {
      const base = 'The field today may surface the tension between risk and stability. Risk can catalyze growth but may unsettle logistics. Stability protects structures but may feel static.';
      const left = 'If energy rises toward risk, that is the weather. A small experiment is one option. Waiting is another.';
      const right = 'If the field leans toward stability, consolidation may feel more natural. Action is also valid.';
      const neutral = 'The field is balanced between risk and stability. Both are available. Neither is required.';
      return `${base} ${leaning === 'left' ? left : leaning === 'right' ? right : neutral}`;
    }
    case 'visibility': {
      const base = 'The field today may highlight visibility versus working behind the scenes. Visibility invites feedback. Quiet work preserves autonomy.';
      const left = 'If the field leans toward visibility, stepping forward may land. It may not. You choose.';
      const right = 'If the field leans toward obscurity, working offstage may feel more natural. Visibility is also valid.';
      const neutral = 'The field is balanced. Both visibility and quiet work are available. Neither is correct.';
      return `${base} ${leaning === 'left' ? left : leaning === 'right' ? right : neutral}`;
    }
  }

  return '';
}
