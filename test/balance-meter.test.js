const assert = require('assert');
const { computeSFD } = require('../src/balance-meter.js');

function testHeavyBeneficConjunctionPenalty(){
  const dayAspects = [
    { p1_name: 'Saturn', p2_name: 'Jupiter', aspect: 'conjunction', orb: 0 }
  ];
  const { Sminus } = computeSFD(dayAspects);
  assert(Sminus > 1.0 && Sminus < 1.3, `Sminus should reflect full penalty, got ${Sminus}`);
}

function testCompensatedReduction(){
  const dayAspects = [
    { p1_name: 'Saturn', p2_name: 'Jupiter', aspect: 'conjunction', orb: 0 },
    { p1_name: 'Jupiter', p2_name: 'Sun', aspect: 'trine', orb: 0.5 }
  ];
  const { Sminus } = computeSFD(dayAspects);
  assert(Sminus > 0.5 && Sminus < 0.8, `Sminus should be reduced, got ${Sminus}`);
}

function testCompensatedNull(){
  const dayAspects = [
    { p1_name: 'Saturn', p2_name: 'Jupiter', aspect: 'conjunction', orb: 0 },
    { p1_name: 'Jupiter', p2_name: 'Sun', aspect: 'trine', orb: 0.5 },
    { p1_name: 'Moon', p2_name: 'Jupiter', aspect: 'sextile', orb: 1.0 }
  ];
  const { Sminus } = computeSFD(dayAspects);
  assert(Sminus < 0.1, `Sminus should be nullified, got ${Sminus}`);
}

try {
  testHeavyBeneficConjunctionPenalty();
  testCompensatedReduction();
  testCompensatedNull();
  console.log('balance-meter tests passed');
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
