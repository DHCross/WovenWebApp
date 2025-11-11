/* Schema Rule-Patch Usage Examples */

import { ContractLinter, lintAndFixPayload } from '../src/contract-linter';
import { renderFrontstage } from '../src/frontstage-renderer';
import { renderShareableMirror } from '../lib/raven/render';
import { OPERATIONAL_FLOW } from '../lib/poetic-brain/runtime';

const DEMO_GEOMETRY: any = {
  placements: [
    { body: 'Sun', sign: 'Leo', degree: 15, house: 1 },
    { body: 'Moon', sign: 'Scorpio', degree: 22, house: 4 },
    { body: 'Ascendant', sign: 'Sagittarius', degree: 5, house: 1 },
  ],
  aspects: [
    { from: 'Sun', to: 'Moon', type: 'Square', orb: 3.0 },
  ],
  summary: {
    elementTotals: { Fire: 1, Earth: 0, Air: 0, Water: 1 },
    modalityTotals: { Cardinal: 0, Fixed: 2, Mutable: 0 },
    dominantElement: 'Fire',
    dominantModality: 'Fixed',
    luminaries: { sun: 'Leo', moon: 'Scorpio', ascendant: 'Sagittarius' },
    retrogradeBodies: [],
  },
  snippet: 'Sun 15° Leo · Moon 22° Scorpio',
  raw: 'Demo geometry payload',
  normalizedFrom: { placements: [], aspects: [], snippet: '', raw: '' },
};

// Example 1: Natal-Only Mode (what the user wanted)
export async function exampleNatalOnly() {
  console.log('\n=== EXAMPLE 1: NATAL-ONLY MODE ===');

  const natalPayload = {
    mode: 'natal-only',
    person_a: {
      chart: {
        planets: [
          { name: 'Sun', sign: 'Leo', degree: 15.5 },
          { name: 'Moon', sign: 'Scorpio', degree: 22.3 },
          { name: 'Mercury', sign: 'Cancer', degree: 28.7 },
          { name: 'Venus', sign: 'Gemini', degree: 12.1 },
          { name: 'Mars', sign: 'Virgo', degree: 4.8 },
          { name: 'Ascendant', sign: 'Sagittarius', degree: 17.2 }
        ]
      }
    },
    // This contaminated data should be stripped:
    indices: {
      window: { start: '2025-09-14', end: '2025-10-03' },
      days: [{ date: '2025-09-15', sf_diff: -2.1, magnitude: 4.0 }]
    },
    transitsByDate: {
      '2025-09-15': { aspects: [] }
    }
  };

  // Step 1: Lint and fix
  const { payload: cleanPayload, result: lintResult } = lintAndFixPayload(natalPayload);
  console.log('Lint Report:', ContractLinter.generateReport(lintResult));

  // Step 2: Render frontstage
  const frontstage = await renderFrontstage(cleanPayload);
  console.log('\nRendered Frontstage:');
  console.log('Blueprint:', frontstage.blueprint);
  console.log('Symbolic Weather:', frontstage.symbolic_weather); // Should be null
  console.log('Stitched Reflection:', frontstage.stitched_reflection);

  // Step 3: Full render using updated renderShareableMirror
  const fullRender = await renderShareableMirror({
    geo: DEMO_GEOMETRY,
    prov: { source: 'example' },
    mode: 'natal-only',
    options: {
      ...cleanPayload,
      geometryValidated: true,
      operationalFlow: OPERATIONAL_FLOW,
      operational_flow: OPERATIONAL_FLOW,
    },
  });

  console.log('\nFull Mirror Output:');
  console.log('Picture:', fullRender.picture);
  console.log('Container:', fullRender.container);
  console.log('Has Symbolic Weather:', !!fullRender.symbolic_weather);
  console.log('Mode:', fullRender.mode);
  console.log('Contract:', fullRender.contract);

  return { cleanPayload, frontstage, fullRender };
}

// Example 2: Balance Mode with Valid Indices
export async function exampleBalanceMode() {
  console.log('\n=== EXAMPLE 2: BALANCE MODE ===');

  const balancePayload = {
    mode: 'balance',
    window: { start: '2025-09-14', end: '2025-10-03' },
    context: {
      person_a: {
        coordinates: { lat: 40.7128, lon: -74.0060 },
        timezone: 'America/New_York'
      }
    },
    indices: {
      window: { start: '2025-09-14', end: '2025-10-03' },
      days: [
        { date: '2025-09-15', sf_diff: -2.1, magnitude: 4.0, volatility: 5.0 },
        { date: '2025-09-16', sf_diff: 1.8, magnitude: 3.2, volatility: 4.1 },
        { date: '2025-09-17', sf_diff: 0.3, magnitude: 2.5, volatility: 3.7 }
      ]
    },
    person_a: {
      chart: {
        planets: [
          { name: 'Sun', sign: 'Virgo', degree: 22.1 },
          { name: 'Moon', sign: 'Pisces', degree: 8.5 }
        ]
      }
    }
  };

  // Step 1: Lint and validate
  const { payload: cleanPayload, result: lintResult } = lintAndFixPayload(balancePayload);
  console.log('Lint Report:', ContractLinter.generateReport(lintResult));

  // Step 2: Render frontstage
  const frontstage = await renderFrontstage(cleanPayload);
  console.log('\nRendered Frontstage:');
  console.log('Blueprint:', frontstage.blueprint);
  console.log('Symbolic Weather:', frontstage.symbolic_weather); // Should be present
  console.log('Stitched Reflection:', frontstage.stitched_reflection);

  // Step 3: Full render
  const fullRender = await renderShareableMirror({
    geo: DEMO_GEOMETRY,
    prov: { source: 'example' },
    mode: 'balance',
    options: {
      ...cleanPayload,
      geometryValidated: true,
      operationalFlow: OPERATIONAL_FLOW,
      operational_flow: OPERATIONAL_FLOW,
    },
  });

  console.log('\nFull Mirror Output:');
  console.log('Picture:', fullRender.picture);
  console.log('Has Symbolic Weather:', !!fullRender.symbolic_weather);
  console.log('Mode:', fullRender.mode);

  return { cleanPayload, frontstage, fullRender };
}

// Example 3: Error Cases and Validation
export function exampleErrorCases() {
  console.log('\n=== EXAMPLE 3: ERROR CASES ===');

  // Case 1: Natal-only with indices (violation)
  const violationPayload = {
    mode: 'natal-only',
    indices: {
      window: { start: '2025-09-14', end: '2025-10-03' },
      days: [{ date: '2025-09-15', magnitude: 4.0, volatility: 3.0 }]
    },
    transitsByDate: { '2025-09-15': {} },
    seismograph: { magnitude: 3.2 }
  };

  const lintViolation = ContractLinter.lint(violationPayload);
  console.log('Violation Report:', ContractLinter.generateReport(lintViolation));

  // Case 2: Balance mode missing requirements
  const incompleteBalance = {
    mode: 'balance'
    // Missing window and location
  };

  const lintIncomplete = ContractLinter.lint(incompleteBalance);
  console.log('\nIncomplete Balance Report:', ContractLinter.generateReport(lintIncomplete));

  // Case 3: Invalid mode
  const invalidMode = {
    mode: 'invalid-mode',
    person_a: { chart: { planets: [] } }
  };

  const lintInvalid = ContractLinter.lint(invalidMode);
  console.log('\nInvalid Mode Report:', ContractLinter.generateReport(lintInvalid));

  return { violationPayload, incompleteBalance, invalidMode };
}

// Example 4: Integration with existing system
export async function exampleIntegration() {
  console.log('\n=== EXAMPLE 4: INTEGRATION DEMO ===');

  // Simulate how this would be used in the actual app
  const incomingData = {
    // User selected natal-only but data includes transit indices (common mistake)
    mode: 'natal-only',
    person_a: {
      details: { name: 'Example User' },
      chart: {
        planets: [
          { name: 'Sun', sign: 'Aries', degree: 10 },
          { name: 'Moon', sign: 'Taurus', degree: 25 }
        ]
      }
    },
    // Contaminated with balance data
    indices: { days: [{ date: '2025-09-15' }] },
    balance_meter: { magnitude: 3.0 }
  };

  console.log('Original payload keys:', Object.keys(incomingData));

  // Process through the system
  const { payload: processed, result } = lintAndFixPayload(incomingData);

  console.log('Processed payload keys:', Object.keys(processed));
  console.log('Stripped fields:', result.fixes_applied);
  console.log('Final mode:', processed.mode);
  console.log('Final frontstage policy:', processed.frontstage_policy);

  // Show what gets rendered
  const rendered = await renderShareableMirror({
    geo: DEMO_GEOMETRY,
    prov: { source: 'integration-demo' },
    mode: processed.mode as any,
    options: {
      ...processed,
      geometryValidated: true,
      operationalFlow: OPERATIONAL_FLOW,
      operational_flow: OPERATIONAL_FLOW,
    },
  });

  console.log('\nFinal rendered result keys:', Object.keys(rendered));
  console.log('Contract compliance:', rendered.contract);
  console.log('Mode enforcement:', rendered.mode);

  return { original: incomingData, processed, rendered };
}

// Run all examples
export async function runAllExamples() {
  console.log('🚀 Running Schema Rule-Patch Examples');
  console.log('=====================================');

  try {
    await exampleNatalOnly();
    await exampleBalanceMode();
    exampleErrorCases();
    await exampleIntegration();

    console.log('\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Export for testing
if (require.main === module) {
  runAllExamples();
}
