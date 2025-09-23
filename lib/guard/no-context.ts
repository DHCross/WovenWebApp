export interface NoContextGuardCopy {
  picture: string;
  feeling: string;
  container: string;
  option: string;
  next_step: string;
  guidance: string;
}

type RandomSource = () => number;

type OptionSet = {
  intro: string;
  primary: string;
  secondary: string;
};

const pictures = [
  'With you—before we dive in…',
  'Here with you. One small setup step first…',
  'Holding your question—let’s get the ground right…',
  'Standing by—we need the map in view before I mirror…'
] as const;

const feelings = [
  'To mirror responsibly I need your chart or a Math Brain report in the container.',
  'I can only read cleanly once your chart or Math Brain report is on the table.',
  'To do right by you, I need the chart or Math Brain geometry in view.',
  'I want to stay precise, so I need your chart or Math Brain report right beside us.'
] as const;

const optionSets: OptionSet[] = [
  {
    intro: 'Two quick options to get us anchored:',
    primary: 'Generate Math Brain on the main page (geometry only), then click “Ask Raven” to drop it here.',
    secondary: 'Or ask for “planetary weather only” to hear today’s field without personal mapping.'
  },
  {
    intro: 'Here’s how to set the mirror:',
    primary: 'Run Math Brain on the homepage and send that report through “Ask Raven.”',
    secondary: 'Or request “planetary weather only” so I can speak to today’s currents without overlaying your chart.'
  },
  {
    intro: 'Let’s get the grounding in place:',
    primary: 'Generate a Math Brain report (geometry-only) from the main screen and route it to me via “Ask Raven.”',
    secondary: 'Or invite a “planetary weather only” read—field notes with no personal mapping.'
  },
  {
    intro: 'We can move once the container is ready:',
    primary: 'Generate Math Brain on the main page and send that geometry through “Ask Raven.”',
    secondary: 'Or cue up a “planetary weather only” read so I keep it to today’s field only.'
  }
];

const nextSteps = [
  'If you already have the JSON export file—the download from Math Brain or AstroSeek—upload or paste it and I’ll continue.',
  'Already sitting on the JSON export file—the download from Math Brain or AstroSeek? Drop it here and I’ll move forward.',
  'Have that JSON export file—the download from Math Brain or AstroSeek—handy? Bring it in and I can keep going.',
  'Once the JSON export file—the download from Math Brain or AstroSeek—is here, I can pick up the mirror right away.'
] as const;

function pick<T>(items: readonly T[], rng: RandomSource): T {
  if (items.length === 0) {
    throw new Error('Cannot pick from an empty collection.');
  }
  const raw = rng();
  const clamped = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), 0.999999999999) : 0;
  const index = Math.min(items.length - 1, Math.floor(clamped * items.length));
  return items[index];
}

export function buildNoContextGuardCopy(options: { rng?: RandomSource } = {}): NoContextGuardCopy {
  const rng = options.rng ?? Math.random;
  const picture = pick(pictures, rng);
  const feeling = pick(feelings, rng);
  const option = pick(optionSets, rng);
  const nextStep = pick(nextSteps, rng);

  const container = `Option 1 · ${option.primary}`;
  const secondary = `Option 2 · ${option.secondary}`;
  const guidance = `${feeling}\n${option.intro}\n\n• ${option.primary}\n• ${option.secondary}\n\n${nextStep}`;

  return {
    picture,
    feeling,
    container,
    option: secondary,
    next_step: nextStep,
    guidance
  };
}
