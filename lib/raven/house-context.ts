/**
 * House Context & Relocation Narrative System
 */

export interface HouseContext {
  mode: 'natal' | 'relocated' | 'uncertain';
  system: string;
  relocation?: {
    from: string;
    to: string;
    coordinates: { lat: number; lon: number };
    timezone: string;
  };
  birthTimeKnown: boolean;
  birthTimeSource?: 'exact' | 'rectified' | 'noon' | 'unknown';
}

export interface HouseUncertaintyNotice {
  level: 'none' | 'minor' | 'major';
  message: string;
  guidance: string;
}

export function assessHouseUncertainty(
  birthTimeKnown: boolean,
  birthTimeSource?: string
): HouseUncertaintyNotice {
  if (!birthTimeKnown || birthTimeSource === 'unknown') {
    return {
      level: 'major',
      message: 'Birth time unknown — house positions are speculative.',
      guidance: 'Focus on planetary signs, aspects, and general themes. House interpretations should be considered tentative.'
    };
  }

  if (birthTimeSource === 'noon') {
    return {
      level: 'major',
      message: 'Birth time set to 12:00 PM (noon default) — house positions are approximate.',
      guidance: 'Treat house placements as symbolic suggestions rather than precise indicators.'
    };
  }

  if (birthTimeSource === 'rectified') {
    return {
      level: 'minor',
      message: 'Birth time rectified — house positions have moderate confidence.',
      guidance: 'House placements are based on life event analysis. Use them as working hypotheses.'
    };
  }

  return {
    level: 'none',
    message: '',
    guidance: ''
  };
}

export function generateRelocationExplanation(context: HouseContext): string {
  if (context.mode === 'natal') {
    return '';
  }

  const fromLocation = context.relocation?.from || 'your birthplace';
  const toLocation = context.relocation?.to || 'your current location';
  const modeText = context.mode === 'relocated' ? `Relocated to: ${toLocation}` : 'Reading natal houses';

  return `**How Relocation Affects Your Chart**

Your planets never change signs or aspects—those are set the moment you were born. What *does* change when you move is how those planets are arranged into houses.

The houses are tied to the local horizon and meridian (the Ascendant and Midheaven). When you relocate, those angles shift, and the houses are redrawn.

**Example:** A planet that was in your natal 11th house (friends, networks) might move into the 10th house (career, public life) when you live in ${toLocation}. This doesn't erase your natal chart—it's like putting the same pattern into a new frame, showing how your inner blueprint plays out in a different environment.

**Your Chart Context:**
- Birth location: ${fromLocation}
- ${modeText}
- House system: ${context.system}`;
}

export function generateHouseUncertaintyNotice(
  uncertainty: HouseUncertaintyNotice
): string {
  if (uncertainty.level === 'none') {
    return '';
  }

  const icon = uncertainty.level === 'major' ? '⚠️' : 'ℹ️';

  return `${icon} **House Uncertainty Notice**

${uncertainty.message}

*${uncertainty.guidance}*`;
}

export function generateHouseContextNarrative(context: HouseContext): string {
  const uncertainty = assessHouseUncertainty(
    context.birthTimeKnown,
    context.birthTimeSource
  );

  const blocks: string[] = [];

  const relocationBlock = generateRelocationExplanation(context);
  if (relocationBlock) {
    blocks.push(relocationBlock);
  }

  const uncertaintyBlock = generateHouseUncertaintyNotice(uncertainty);
  if (uncertaintyBlock) {
    blocks.push(uncertaintyBlock);
  }

  return blocks.join('\n\n');
}

export function extractHouseContext(chartData: any): HouseContext {
  const birthTimeKnown = chartData?.birth_time_known !== false;
  const birthTimeSource = chartData?.birth_time_source || 'exact';
  const hasRelocation = chartData?.relocation_mode === 'active' ||
                       chartData?.relocated === true ||
                       chartData?.current_location !== chartData?.birth_location;

  return {
    mode: !birthTimeKnown ? 'uncertain' : (hasRelocation ? 'relocated' : 'natal'),
    system: chartData?.house_system || 'Placidus',
    relocation: hasRelocation ? {
      from: chartData?.birth_location || 'unknown',
      to: chartData?.current_location || 'unknown',
      coordinates: {
        lat: chartData?.relocated_lat || chartData?.lat || 0,
        lon: chartData?.relocated_lon || chartData?.lon || 0
      },
      timezone: chartData?.timezone || 'unknown'
    } : undefined,
    birthTimeKnown,
    birthTimeSource
  };
}

export function stampHouseProvenance(context: HouseContext): Record<string, any> {
  return {
    house_system: context.system,
    house_mode: context.mode,
    birth_time_known: context.birthTimeKnown,
    birth_time_source: context.birthTimeSource || 'exact',
    relocation: context.relocation ? {
      from: context.relocation.from,
      to: context.relocation.to,
      coordinates: context.relocation.coordinates,
      timezone: context.relocation.timezone
    } : null
  };
}
