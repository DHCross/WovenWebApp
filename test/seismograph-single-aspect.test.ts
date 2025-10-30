const { aggregate } = require('../src/seismograph');

describe('Seismograph: Single Aspect Anomaly', () => {
  it('should register a non-zero magnitude for a single, strong aspect', () => {
    const singleStrongAspect = [
      {
        transit: { body: 'Saturn' },
        natal: { body: 'Sun' },
        type: 'opposition',
        orb: 0.1, // Corrected property from orbDeg to orb
      },
    ];

    const result = aggregate(singleStrongAspect);
    console.log('Single aspect test result (corrected):', JSON.stringify(result, null, 2));

    // With the bug, the magnitude is dampened and results in a near-zero value.
    // A single, exact opposition from Saturn to the Sun should be a significant event.
    // We expect a magnitude well above 1.0, but for the test, we'll just assert it's not near zero.
    expect(result.magnitude).toBeGreaterThan(1.0);
  });
});