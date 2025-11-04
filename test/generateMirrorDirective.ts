/**
 * Poetic Brain-ready Mirror Directive generator for Dan's solo mirror
 * Run with: npx ts-node test/generateMirrorDirective.ts
 */

interface BirthData {
  date: string;
  time: string;
  timezone: string;
  city: string;
  state: string;
  country: string;
  lat: number;
  lon: number;
}

interface PersonSummary {
  name: string;
  birth_data: BirthData;
  chart: Record<string, unknown> | null;
  aspects: unknown[];
}

interface MirrorContract {
  report_kind: string;
  intimacy_tier: string | null;
  relationship_type: string | null;
  is_relational: boolean;
  is_natal_only: boolean;
}

interface SymbolicWeatherRequest {
  include_transits: boolean;
  relocation_mode: string;
  window: {
    start: string;
    end: string;
    step: string;
  };
}

interface Provenance {
  generated_at: string;
  math_brain_version: string;
  house_system: string;
  orbs_profile: string;
  ephemeris_source: string;
  relocation_mode: string;
  timezone_db_version: string;
}

interface NarrativeSections {
  solo_mirror_a: string;
  weather_overlay: string;
}

interface MirrorDirectivePayload {
  _format: 'mirror_directive_json';
  _version: string;
  _poetic_brain_compatible: boolean;
  generated_at: string;
  person_a: PersonSummary;
  person_b: null;
  mirror_contract: MirrorContract;
  symbolic_weather_request: SymbolicWeatherRequest;
  provenance: Provenance;
  narrative_sections: NarrativeSections;
}

// Dan's birth data
const danBirthData: BirthData = {
  date: '1973-07-24',
  time: '14:30',
  timezone: 'America/Chicago', // Panama City, FL is in Central Time
  city: 'Panama City',
  state: 'FL',
  country: 'US',
  lat: 30.16,
  lon: -85.65
};

// Create the Mirror Directive with Symbolic Weather request
const now = new Date();
const nextMonth = new Date(now);
nextMonth.setMonth(now.getMonth() + 1);

const mirrorDirective: MirrorDirectivePayload = {
  _format: 'mirror_directive_json',
  _version: '1.0',
  _poetic_brain_compatible: true,
  generated_at: now.toISOString(),
  person_a: {
    name: 'Dan / DH Cross',
    birth_data: danBirthData,
    chart: null, // Placeholder: populate with natal geometry for live runs
    aspects: [],
  },
  person_b: null,
  mirror_contract: {
    report_kind: 'mirror',
    intimacy_tier: 'P1',
    relationship_type: null,
    is_relational: false,
    is_natal_only: true,
  },
  symbolic_weather_request: {
    include_transits: true,
    relocation_mode: 'A_local',
    window: {
      start: now.toISOString().split('T')[0],
      end: nextMonth.toISOString().split('T')[0],
      step: '1d',
    },
  },
  provenance: {
    generated_at: now.toISOString(),
    math_brain_version: 'mb-2025.11.03',
    house_system: 'Placidus',
    orbs_profile: 'wm-spec-2025-09',
    ephemeris_source: 'swiss-ephemeris',
    relocation_mode: 'A_local',
    timezone_db_version: 'IANA-2025a',
  },
  narrative_sections: {
    solo_mirror_a: '',
    weather_overlay: '',
  },
};

// Output the JSON with pretty printing
console.log(JSON.stringify(mirrorDirective, null, 2));

// Optional: Uncomment to save to a file
const fs = require('fs');
fs.writeFileSync('dan_mirror_directive_poetic.json', JSON.stringify(mirrorDirective, null, 2));
console.log('Saved to dan_mirror_directive_poetic.json');
