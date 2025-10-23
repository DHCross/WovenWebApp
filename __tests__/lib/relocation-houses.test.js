const {
  calculateLST,
  calculateAscendant,
  calculateMidheaven,
  calculatePlacidusHouses,
  findPlanetHouse
} = require('../../lib/relocation-houses.js');

// Test case data based on a known reference:
// Location: New York, NY, USA
// Date: January 1, 2000, 12:00:00 PM EST (17:00:00 UTC)
// Coords: Latitude 40.7128° N, Longitude -74.0060° W
const testDateUTC = new Date('2000-01-01T17:00:00Z');
const testLatitude = 40.7128;
const testLongitude = -74.0060;

// Expected values from a trusted external calculator for reference:
// LST: ~18.45 hours
// Ascendant: ~20° Gemini (approx. 80°)
// Midheaven: ~2° Aries (approx. 2°)
// Placidus Cusps (approximate):
// 11th: ~10° Taurus (40°), 12th: ~20° Gemini (80°) -> This is wrong, ASC is 20 Gem. 12th should be before it.
// Let's re-check online. Astro.com gives:
// ASC: 19° Gem 44' (79.73°), MC: 0° Ari 41' (0.68°)
// 11th cusp: 10° Tau 01' (40.02°), 12th cusp: 29° Tau 57' (59.95°)
// 2nd cusp: 13° Can 02' (103.03°), 3rd cusp: 11° Leo 02' (131.03°)

const norm360 = (degrees) => (degrees % 360 + 360) % 360;

describe('relocation-houses.js', () => {

  describe('Placidus House Calculation', () => {
    it('should correctly calculate the primary angles (ASC, MC, DSC, IC)', () => {
      const lst = calculateLST(testDateUTC, testLongitude);
      const asc = calculateAscendant(lst, testLatitude);
      const mc = calculateMidheaven(lst, testLatitude);
      const placidusHouses = calculatePlacidusHouses(asc, mc, testLatitude);

      // Test that the primary angles are set correctly in the 0-indexed array.
      // houses[0] should be the 1st house cusp (Ascendant)
      expect(placidusHouses[0]).toBeCloseTo(norm360(asc));

      // houses[9] should be the 10th house cusp (Midheaven)
      expect(placidusHouses[9]).toBeCloseTo(norm360(mc));

      // houses[6] should be the 7th house cusp (Descendant)
      expect(placidusHouses[6]).toBeCloseTo(norm360(asc + 180));

      // houses[3] should be the 4th house cusp (Imum Coeli)
      expect(placidusHouses[3]).toBeCloseTo(norm360(mc + 180));
    });
  });
  describe('findPlanetHouse', () => {
    it('should place planets in the correct house for a standard cusp configuration', () => {
      const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
      expect(findPlanetHouse(15, cusps)).toBe(1);
      expect(findPlanetHouse(45, cusps)).toBe(2);
      expect(findPlanetHouse(280, cusps)).toBe(10);
      expect(findPlanetHouse(350, cusps)).toBe(12);
      expect(findPlanetHouse(0, cusps)).toBe(1); // Exactly on the cusp
    });

    it('should place planets correctly when houses wrap around the 0 degree point', () => {
      const cusps = [330, 0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300]; // 1st house wraps
      expect(findPlanetHouse(345, cusps)).toBe(1);
      expect(findPlanetHouse(329, cusps)).toBe(12);
      expect(findPlanetHouse(15, cusps)).toBe(2);
      expect(findPlanetHouse(330, cusps)).toBe(1);
    });

    it('should correctly place a planet in the 12th house when it wraps', () => {
        // 12th house starts at 330, 1st cusp (end of 12th) is at 10
        const cusps = [10, 40, 70, 100, 130, 160, 190, 220, 250, 280, 310, 340];
        expect(findPlanetHouse(350, cusps)).toBe(12);
        expect(findPlanetHouse(5, cusps)).toBe(12);
        expect(findPlanetHouse(9, cusps)).toBe(12);
        expect(findPlanetHouse(10, cusps)).toBe(1);
        expect(findPlanetHouse(339, cusps)).toBe(11);
    });
  });
});