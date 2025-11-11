/**
 * SRP Ledger Loader
 * Runtime hydration from external JSON with TypeScript fallback
 * 
 * Priority: /data/srp/*.json → hardcoded TS ledger
 * This lets content evolve without code changes while maintaining resilience
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { LightBlend, ShadowBlend } from './types';

// Import hardcoded fallback ledger
import { 
  LIGHT_LEDGER as FALLBACK_LIGHT_LEDGER, 
  SHADOW_LEDGER as FALLBACK_SHADOW_LEDGER 
} from './ledger';

const SRP_TRUTHY_VALUES = new Set([
  'true',
  '1',
  'yes',
  'on',
  'enable',
  'enabled',
  'auto'
]);

const SRP_FALSY_VALUES = new Set([
  'false',
  '0',
  'no',
  'off',
  'disable',
  'disabled'
]);

interface LightLedgerJSON {
  version: string;
  generated: string;
  description: string;
  blends: Record<string, LightBlend>;
}

interface ShadowLedgerJSON {
  version: string;
  generated: string;
  description: string;
  shadows: Record<string, ShadowBlend>;
}

let lightLedgerCache: Record<number, LightBlend> | null = null;
let shadowLedgerCache: Record<string, ShadowBlend> | null = null;

/**
 * Check if SRP is enabled via environment variable
 */
function isSRPEnabled(): boolean {
  const raw = process.env.ENABLE_SRP;

  // Default: enabled (can be disabled via explicit opt-out)
  if (raw === undefined || raw === null) return true;

  const normalized = raw.trim().toLowerCase();
  if (!normalized) return true;

  if (SRP_TRUTHY_VALUES.has(normalized)) return true;
  if (SRP_FALSY_VALUES.has(normalized)) return false;

  console.warn(`[SRP] Unrecognized ENABLE_SRP value "${raw}", defaulting to enabled.`);
  return true;
}

/**
 * Load light ledger from JSON or fallback to TypeScript
 */
function loadLightLedger(): Record<number, LightBlend> {
  if (lightLedgerCache) return lightLedgerCache;

  const jsonPath = join(process.cwd(), 'data/srp/light-ledger.json');
  
  if (existsSync(jsonPath)) {
    try {
      const raw = readFileSync(jsonPath, 'utf-8');
      const data: LightLedgerJSON = JSON.parse(raw);
      
      // Convert string keys to numbers for blend IDs
      const ledger: Record<number, LightBlend> = {};
      Object.entries(data.blends).forEach(([key, blend]) => {
        ledger[parseInt(key, 10)] = blend;
      });
      
      lightLedgerCache = ledger;
      console.log(`[SRP] Loaded ${Object.keys(ledger).length} light blends from JSON`);
      return ledger;
    } catch (err) {
      console.warn('[SRP] Failed to load light-ledger.json, using TypeScript fallback:', err);
    }
  }
  
  // Fallback to hardcoded TypeScript ledger
  console.log('[SRP] Using hardcoded TypeScript light ledger');
  lightLedgerCache = FALLBACK_LIGHT_LEDGER;
  return FALLBACK_LIGHT_LEDGER;
}

/**
 * Load shadow ledger from JSON or fallback to TypeScript
 */
function loadShadowLedger(): Record<string, ShadowBlend> {
  if (shadowLedgerCache) return shadowLedgerCache;

  const jsonPath = join(process.cwd(), 'data/srp/shadow-ledger.json');
  
  if (existsSync(jsonPath)) {
    try {
      const raw = readFileSync(jsonPath, 'utf-8');
      const data: ShadowLedgerJSON = JSON.parse(raw);
      
      shadowLedgerCache = data.shadows;
      console.log(`[SRP] Loaded ${Object.keys(data.shadows).length} shadow blends from JSON`);
      return data.shadows;
    } catch (err) {
      console.warn('[SRP] Failed to load shadow-ledger.json, using TypeScript fallback:', err);
    }
  }
  
  // Fallback to hardcoded TypeScript ledger
  console.log('[SRP] Using hardcoded TypeScript shadow ledger');
  shadowLedgerCache = FALLBACK_SHADOW_LEDGER;
  return FALLBACK_SHADOW_LEDGER;
}

/**
 * Get light blend by ID (with runtime loading)
 * Returns null if SRP is disabled via feature flag
 */
export function getLightBlend(blendId: number): LightBlend | null {
  if (!isSRPEnabled()) return null;
  
  const ledger = loadLightLedger();
  return ledger[blendId] || null;
}

/**
 * Get shadow blend by ID (with runtime loading)
 * Returns null if SRP is disabled via feature flag
 */
export function getShadowBlend(blendId: number): ShadowBlend | null {
  if (!isSRPEnabled()) return null;
  
  const ledger = loadShadowLedger();
  const shadowId = `${blendId}R`;
  return ledger[shadowId] || null;
}

/**
 * Calculate blend ID from driver and manner signs
 * Formula: (driver_index * 12) + manner_index + 1
 */
export function calculateBlendId(driver: string, manner: string): number | null {
  const signs = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];
  
  const driverIdx = signs.indexOf(driver);
  const mannerIdx = signs.indexOf(manner);
  
  if (driverIdx === -1 || mannerIdx === -1) return null;
  
  return (driverIdx * 12) + mannerIdx + 1;
}

/**
 * Clear cache (useful for testing or hot-reload scenarios)
 */
export function clearLedgerCache(): void {
  lightLedgerCache = null;
  shadowLedgerCache = null;
  console.log('[SRP] Ledger cache cleared');
}
