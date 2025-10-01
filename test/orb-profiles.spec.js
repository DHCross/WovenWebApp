const { describe, it, expect } = require('@jest/globals');
const {
  getOrbProfile,
  getEffectiveOrb,
  isWithinOrb,
  filterByOrbProfile,
  getAvailableProfiles
} = require('../lib/config/orb-profiles');

describe('Orb Profiles', () => {
  describe('getOrbProfile', () => {
    it('should return Balance Default profile by default', () => {
      const profile = getOrbProfile();
      expect(profile.id).toBe('wm-spec-2025-09');
      expect(profile.name).toBe('Balance Default');
    });

    it('should return Balance Default when explicitly requested', () => {
      const profile = getOrbProfile('wm-spec-2025-09');
      expect(profile.id).toBe('wm-spec-2025-09');
    });

    it('should return Astro-Seek Strict profile', () => {
      const profile = getOrbProfile('astro-seek-strict');
      expect(profile.id).toBe('astro-seek-strict');
      expect(profile.name).toBe('Astro-Seek Strict');
    });

    it('should fallback to Balance Default for unknown profiles', () => {
      const profile = getOrbProfile('unknown-profile');
      expect(profile.id).toBe('wm-spec-2025-09');
    });
  });

  describe('getEffectiveOrb', () => {
    it('should return base orb for simple conjunction', () => {
      const orb = getEffectiveOrb('conjunction', 'Venus', 'Mars', 'wm-spec-2025-09');
      expect(orb).toBe(8.0); // Base conjunction orb
    });

    it('should add Moon bonus for Moon aspects', () => {
      const orb = getEffectiveOrb('conjunction', 'Moon', 'Venus', 'wm-spec-2025-09');
      expect(orb).toBe(9.0); // 8.0 base + 1.0 Moon bonus
    });

    it('should subtract penalty for outer-to-personal aspects', () => {
      const orb = getEffectiveOrb('square', 'Saturn', 'Moon', 'wm-spec-2025-09');
      // 7.0 square base + 1.0 Moon bonus - 1.0 outer-to-personal penalty = 7.0
      expect(orb).toBe(7.0);
    });

    it('should add luminary-to-angle bonus', () => {
      const orb = getEffectiveOrb('conjunction', 'Sun', 'Ascendant', 'wm-spec-2025-09');
      // 8.0 base + 1.0 luminary-to-angle bonus = 9.0
      expect(orb).toBe(9.0);
    });

    it('should use tighter orbs for Astro-Seek Strict profile', () => {
      const balanceOrb = getEffectiveOrb('trine', 'Sun', 'Jupiter', 'wm-spec-2025-09');
      const strictOrb = getEffectiveOrb('trine', 'Sun', 'Jupiter', 'astro-seek-strict');

      expect(balanceOrb).toBe(7.0);
      expect(strictOrb).toBe(5.0);
      expect(strictOrb).toBeLessThan(balanceOrb);
    });

    it('should enforce maximum orb cap', () => {
      // Even with all bonuses, should not exceed max_orb
      const profile = getOrbProfile('wm-spec-2025-09');
      const orb = getEffectiveOrb('conjunction', 'Moon', 'Ascendant', 'wm-spec-2025-09');

      expect(orb).toBeLessThanOrEqual(profile.caps.max_orb);
    });
  });

  describe('isWithinOrb', () => {
    it('should accept aspect within tolerance', () => {
      const aspect = {
        aspect: 'trine',
        p1_name: 'Sun',
        p2_name: 'Jupiter',
        orb: 5.0
      };

      expect(isWithinOrb(aspect, 'wm-spec-2025-09')).toBe(true);
    });

    it('should reject aspect outside tolerance', () => {
      const aspect = {
        aspect: 'trine',
        p1_name: 'Sun',
        p2_name: 'Jupiter',
        orb: 9.0 // Beyond 7° trine orb
      };

      expect(isWithinOrb(aspect, 'wm-spec-2025-09')).toBe(false);
    });

    it('should handle negative orbs correctly', () => {
      const aspect = {
        aspect: 'square',
        p1_name: 'Mars',
        p2_name: 'Venus',
        orb: -3.5 // Separating aspect
      };

      expect(isWithinOrb(aspect, 'wm-spec-2025-09')).toBe(true);
    });

    it('should be stricter with Astro-Seek profile', () => {
      const aspect = {
        aspect: 'sextile',
        p1_name: 'Mercury',
        p2_name: 'Venus',
        orb: 4.5
      };

      // Within Balance Default (5.0) but outside Astro-Seek Strict (4.0)
      expect(isWithinOrb(aspect, 'wm-spec-2025-09')).toBe(true);
      expect(isWithinOrb(aspect, 'astro-seek-strict')).toBe(false);
    });
  });

  describe('filterByOrbProfile', () => {
    const testAspects = [
      { aspect: 'trine', p1_name: 'Sun', p2_name: 'Jupiter', orb: 3.0 },
      { aspect: 'trine', p1_name: 'Moon', p2_name: 'Venus', orb: 6.5 },
      { aspect: 'square', p1_name: 'Saturn', p2_name: 'Mars', orb: 8.0 },
      { aspect: 'sextile', p1_name: 'Mercury', p2_name: 'Uranus', orb: 4.8 }
    ];

    it('should filter aspects using Balance Default profile', () => {
      const filtered = filterByOrbProfile(testAspects, 'wm-spec-2025-09');

      // All should pass Balance Default
      expect(filtered.length).toBeGreaterThan(0);
    });

    it('should filter more strictly with Astro-Seek profile', () => {
      const balanceFiltered = filterByOrbProfile(testAspects, 'wm-spec-2025-09');
      const strictFiltered = filterByOrbProfile(testAspects, 'astro-seek-strict');

      // Strict should filter out some that Balance allows
      expect(strictFiltered.length).toBeLessThanOrEqual(balanceFiltered.length);
    });

    it('should handle empty array', () => {
      const filtered = filterByOrbProfile([], 'wm-spec-2025-09');
      expect(filtered).toEqual([]);
    });

    it('should handle null input', () => {
      const filtered = filterByOrbProfile(null, 'wm-spec-2025-09');
      expect(filtered).toEqual([]);
    });
  });

  describe('getAvailableProfiles', () => {
    it('should return list of available profiles', () => {
      const profiles = getAvailableProfiles();

      expect(Array.isArray(profiles)).toBe(true);
      expect(profiles.length).toBe(2);

      expect(profiles[0].id).toBe('wm-spec-2025-09');
      expect(profiles[1].id).toBe('astro-seek-strict');
    });

    it('should include name and description for each profile', () => {
      const profiles = getAvailableProfiles();

      profiles.forEach(profile => {
        expect(profile).toHaveProperty('id');
        expect(profile).toHaveProperty('name');
        expect(profile).toHaveProperty('description');
      });
    });
  });

  describe('Profile Comparison', () => {
    it('should demonstrate Moon aspect gets wider orb', () => {
      const regularOrb = getEffectiveOrb('conjunction', 'Venus', 'Mars', 'wm-spec-2025-09');
      const moonOrb = getEffectiveOrb('conjunction', 'Moon', 'Mars', 'wm-spec-2025-09');

      expect(moonOrb).toBeGreaterThan(regularOrb);
      expect(moonOrb - regularOrb).toBe(1.0);
    });

    it('should demonstrate outer-to-personal gets tighter orb', () => {
      const regularOrb = getEffectiveOrb('square', 'Venus', 'Mars', 'wm-spec-2025-09');
      const outerOrb = getEffectiveOrb('square', 'Saturn', 'Venus', 'wm-spec-2025-09');

      expect(outerOrb).toBeLessThan(regularOrb);
      expect(regularOrb - outerOrb).toBe(1.0);
    });

    it('should show strict profile reduces false positives', () => {
      // Test case: minor aspect with moderate orb
      const aspect = {
        aspect: 'quintile',
        p1_name: 'Mercury',
        p2_name: 'Neptune',
        orb: 0.8
      };

      const balanceAllows = isWithinOrb(aspect, 'wm-spec-2025-09');
      const strictAllows = isWithinOrb(aspect, 'astro-seek-strict');

      // Balance Default: quintile orb is 1.0, so 0.8 passes
      // Astro-Seek Strict: quintile orb is 0.5, so 0.8 fails
      expect(balanceAllows).toBe(true);
      expect(strictAllows).toBe(false);
    });
  });
});
