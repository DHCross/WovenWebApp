/**
 * US States + DC + Territories — canonical 2-letter codes with full names
 * ISO 3166-2:US compliant
 */

export interface StateEntry {
  code: string;       // 2-letter postal code (canonical)
  name: string;       // Full name
  type: 'state' | 'district' | 'territory';
}

export const US_STATES: StateEntry[] = [
  // 50 States
  { code: 'AL', name: 'Alabama', type: 'state' },
  { code: 'AK', name: 'Alaska', type: 'state' },
  { code: 'AZ', name: 'Arizona', type: 'state' },
  { code: 'AR', name: 'Arkansas', type: 'state' },
  { code: 'CA', name: 'California', type: 'state' },
  { code: 'CO', name: 'Colorado', type: 'state' },
  { code: 'CT', name: 'Connecticut', type: 'state' },
  { code: 'DE', name: 'Delaware', type: 'state' },
  { code: 'FL', name: 'Florida', type: 'state' },
  { code: 'GA', name: 'Georgia', type: 'state' },
  { code: 'HI', name: 'Hawaii', type: 'state' },
  { code: 'ID', name: 'Idaho', type: 'state' },
  { code: 'IL', name: 'Illinois', type: 'state' },
  { code: 'IN', name: 'Indiana', type: 'state' },
  { code: 'IA', name: 'Iowa', type: 'state' },
  { code: 'KS', name: 'Kansas', type: 'state' },
  { code: 'KY', name: 'Kentucky', type: 'state' },
  { code: 'LA', name: 'Louisiana', type: 'state' },
  { code: 'ME', name: 'Maine', type: 'state' },
  { code: 'MD', name: 'Maryland', type: 'state' },
  { code: 'MA', name: 'Massachusetts', type: 'state' },
  { code: 'MI', name: 'Michigan', type: 'state' },
  { code: 'MN', name: 'Minnesota', type: 'state' },
  { code: 'MS', name: 'Mississippi', type: 'state' },
  { code: 'MO', name: 'Missouri', type: 'state' },
  { code: 'MT', name: 'Montana', type: 'state' },
  { code: 'NE', name: 'Nebraska', type: 'state' },
  { code: 'NV', name: 'Nevada', type: 'state' },
  { code: 'NH', name: 'New Hampshire', type: 'state' },
  { code: 'NJ', name: 'New Jersey', type: 'state' },
  { code: 'NM', name: 'New Mexico', type: 'state' },
  { code: 'NY', name: 'New York', type: 'state' },
  { code: 'NC', name: 'North Carolina', type: 'state' },
  { code: 'ND', name: 'North Dakota', type: 'state' },
  { code: 'OH', name: 'Ohio', type: 'state' },
  { code: 'OK', name: 'Oklahoma', type: 'state' },
  { code: 'OR', name: 'Oregon', type: 'state' },
  { code: 'PA', name: 'Pennsylvania', type: 'state' },
  { code: 'RI', name: 'Rhode Island', type: 'state' },
  { code: 'SC', name: 'South Carolina', type: 'state' },
  { code: 'SD', name: 'South Dakota', type: 'state' },
  { code: 'TN', name: 'Tennessee', type: 'state' },
  { code: 'TX', name: 'Texas', type: 'state' },
  { code: 'UT', name: 'Utah', type: 'state' },
  { code: 'VT', name: 'Vermont', type: 'state' },
  { code: 'VA', name: 'Virginia', type: 'state' },
  { code: 'WA', name: 'Washington', type: 'state' },
  { code: 'WV', name: 'West Virginia', type: 'state' },
  { code: 'WI', name: 'Wisconsin', type: 'state' },
  { code: 'WY', name: 'Wyoming', type: 'state' },

  // District
  { code: 'DC', name: 'District of Columbia', type: 'district' },

  // US Territories
  { code: 'AS', name: 'American Samoa', type: 'territory' },
  { code: 'GU', name: 'Guam', type: 'territory' },
  { code: 'MP', name: 'Northern Mariana Islands', type: 'territory' },
  { code: 'PR', name: 'Puerto Rico', type: 'territory' },
  { code: 'VI', name: 'U.S. Virgin Islands', type: 'territory' },
];

// Build lookup maps at module load for O(1) normalization
const CODE_TO_NAME = new Map<string, string>();
const NAME_TO_CODE = new Map<string, string>();

for (const entry of US_STATES) {
  CODE_TO_NAME.set(entry.code.toUpperCase(), entry.name);
  NAME_TO_CODE.set(entry.name.toLowerCase(), entry.code);
}

/**
 * Normalize a state input to its 2-letter code.
 * Accepts: "FL", "fl", "Florida", "florida", "FLORIDA"
 * Returns: "FL" or null if not recognized
 */
export function normalizeStateCode(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Check if it's already a valid 2-letter code
  const upper = trimmed.toUpperCase();
  if (CODE_TO_NAME.has(upper)) {
    return upper;
  }

  // Check if it's a full name
  const lower = trimmed.toLowerCase();
  const code = NAME_TO_CODE.get(lower);
  if (code) {
    return code;
  }

  // Not recognized — allow pass-through for international regions
  return null;
}

/**
 * Get the full state name from a 2-letter code.
 * Returns null if not a recognized US state/territory.
 */
export function getStateName(code: string | null | undefined): string | null {
  if (!code) return null;
  return CODE_TO_NAME.get(code.toUpperCase()) ?? null;
}

/**
 * Check if input looks like a US state (code or full name).
 */
export function isUSState(input: string | null | undefined): boolean {
  return normalizeStateCode(input) !== null;
}

/**
 * Get display label: "FL — Florida" or just the input if not recognized
 */
export function getStateDisplayLabel(input: string | null | undefined): string {
  if (!input) return '';
  const code = normalizeStateCode(input);
  if (code) {
    const name = getStateName(code);
    return name ? `${code} — ${name}` : code;
  }
  return input; // Pass-through for international
}
