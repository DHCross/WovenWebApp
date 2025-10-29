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
      const base = 'You may feel torn between sharing more of yourself and keeping things private. Openness can build trust but may also leave you exposed. Restriction safeguards your time and energy yet can create distance.';
      const left = 'If conversations invite honesty or visibility, test what happens when you open the door a little wider.';
      const right = 'If your day is already crowded or you sense pushback, try honoring a boundary and see whether relief arrives.';
      const neutral = 'Track which side shows up as you move through the day—note when sharing lands well and when restraint keeps the field steady.';
      return `${base} ${leaning === 'left' ? left : leaning === 'right' ? right : neutral}`;
    }
    case 'support': {
      const base = 'Today may highlight the difference between moves that feel supported and those that instantly meet resistance. Supported choices tend to receive quick yeses or natural momentum, while unsanctioned choices bump into delays or conditions.';
      const left = 'When doors open easily, consider leaning into that lane and gather data on what the field is endorsing.';
      const right = 'If every attempt stalls or triggers friction, pause and log it as a signal: the system may be asking for a reroute or lighter touch.';
      const neutral = 'Notice where things glide versus where they snag—the contrast itself is valuable data.';
      return `${base} ${leaning === 'left' ? left : leaning === 'right' ? right : neutral}`;
    }
    case 'risk': {
      const base = 'You may feel pulled between taking a chance on something new and sticking with routines that keep you grounded. Risk can catalyze growth but may unsettle logistics. Stability protects existing structures yet can leave things feeling stagnant.';
      const left = 'If sparks of excitement or urgency keep surfacing, experiment with one small, contained risk and track the fallout.';
      const right = 'If fatigue is high or systems feel brittle, favor consolidation and watch whether steadiness restores capacity.';
      const neutral = 'Check in moment to moment: when energy rises, note what a measured risk would look like; when overwhelm spikes, let stability take the lead.';
      return `${base} ${leaning === 'left' ? left : leaning === 'right' ? right : neutral}`;
    }
    case 'visibility': {
      const base = 'Situations may pivot between being seen and staying behind the scenes. Visibility helps your message land but also invites feedback. Working quietly preserves autonomy yet can keep progress hidden.';
      const left = 'If invitations, questions, or spotlight moments appear, test what happens when you step forward and narrate the story yourself.';
      const right = 'If you crave privacy or notice eyes elsewhere, treat the low profile as a window to refine things offstage.';
      const neutral = 'Log which moments ask for voice versus which benefit from quiet build—the pattern will show you where the field is pointing.';
      return `${base} ${leaning === 'left' ? left : leaning === 'right' ? right : neutral}`;
    }
  }

  return '';
}
