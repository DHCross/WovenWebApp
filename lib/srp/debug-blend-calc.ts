/**
 * Debug: Check driver/manner calculation
 */

import { getPlanetDriver, getAspectManner } from './mapper';
import { getLightBlend, calculateBlendId } from './ledger';

console.log('Testing Sun square Mars:\n');

const planet = 'Sun';
const aspect = 'square';

const driver = getPlanetDriver(planet);
console.log('1. Driver from Sun:', driver);

if (driver) {
  const manner = getAspectManner(aspect, driver);
  console.log('2. Manner for square from', driver, '→', manner);

  if (manner) {
    const blendId = calculateBlendId(driver, manner);
    console.log('3. Blend ID:', blendId);

    if (blendId) {
      const blend = getLightBlend(blendId);
      console.log('4. Ledger has this blend?', blend ? 'YES' : 'NO');
      if (blend) {
        console.log('   Blend data:', blend);
      }
    }
  }
}

console.log('\n\nChecking which blends ARE in the ledger:');
const testIds = [1, 2, 5, 9, 14, 27, 40, 119];
testIds.forEach(id => {
  const blend = getLightBlend(id);
  console.log(`  Blend ${id}:`, blend ? `${blend.driver} × ${blend.manner}` : 'Missing');
});
