/**
 * Relational Flow Generator
 * Implements 5-step relational narrative with directional attribution
 * 
 * Step 1: Individual diagnostics (Person A, Person B)
 * Step 2: Parallel weather (each person's transits)
 * Step 3: Conditional layer (When PersonA does X, PersonB responds with Y)
 * Step 4: Integration (blending climates)
 * Step 5: Balance Meter (magnitude and directional bias at end)
 * 
 * Attribution Mandate: Always name who experiences what.
 * Never use "they" or generic pronouns.
 */

/**
 * Step 1: Generate individual diagnostics
 * Uses Solo Mirror template for each person
 */
function generateIndividualDiagnostics(personA, personB, natalChartA, natalChartB) {
  const { generateSoloMirror } = require('./solo-mirror-template.js');
  
  const diagnosticA = generateSoloMirror(personA, natalChartA);
  const diagnosticB = generateSoloMirror(personB, natalChartB);

  return {
    person_a_diagnostic: diagnosticA,
    person_b_diagnostic: diagnosticB
  };
}

/**
 * Step 2: Generate parallel weather
 * Each person's transit activations
 */
function generateParallelWeather(personA, personB, weatherA, weatherB) {
  let output = `## Parallel Weather\n\n`;

  output += `### ${personA}'s Symbolic Weather\n\n`;
  output += `${weatherA || 'Transit activations for ' + personA + ' during this period.'}\n\n`;

  output += `### ${personB}'s Symbolic Weather\n\n`;
  output += `${weatherB || 'Transit activations for ' + personB + ' during this period.'}\n\n`;

  return output;
}

/**
 * Step 3: Generate conditional layer
 * When PersonA does X, PersonB responds with Y
 * Uses mirror data to create directional attribution
 */
function generateConditionalLayer(personA, personB, mirrorData, intimacyTier = 'P1') {
  if (!mirrorData) {
    return generateFallbackConditionalLayer(personA, personB);
  }

  const {
    person_a_contribution = {},
    person_b_contribution = {},
    relational_tension = 'unspecified',
    relational_flow = 'unspecified',
    dominant_theme = 'unspecified'
  } = mirrorData;

  const aContribution = person_a_contribution.magnitude || 0;
  const bContribution = person_b_contribution.magnitude || 0;

  let output = `## The Relational Engine\n\n`;
  output += `### How You Two Move Together\n\n`;

  // Determine who has more pressure
  if (aContribution > bContribution) {
    output += `${personA} is carrying more of the pressure right now. `;
    output += `When ${personA} experiences this intensity, ${personB} often responds by `;
    output += `${getResponsePattern(person_b_contribution.bias)}. `;
  } else if (bContribution > aContribution) {
    output += `${personB} is carrying more of the pressure right now. `;
    output += `When ${personB} experiences this intensity, ${personA} often responds by `;
    output += `${getResponsePattern(person_a_contribution.bias)}. `;
  } else {
    output += `Both ${personA} and ${personB} are feeling pressure, but in different ways. `;
    output += `${personA} tends to ${getResponsePattern(person_a_contribution.bias)}, `;
    output += `while ${personB} tends to ${getResponsePattern(person_b_contribution.bias)}. `;
  }

  output += `\n\n`;

  // Describe the relational pattern
  output += `### The Pattern\n\n`;
  output += `The dominant theme between you is: **${dominant_theme}**\n\n`;
  output += `The relational tension shows up as: ${relational_tension}\n\n`;
  output += `The relational flow is: ${relational_flow}\n\n`;

  // Specific attribution
  output += `### Who Experiences What\n\n`;
  output += `- **${personA}**: Magnitude ${aContribution.toFixed(1)}, `;
  output += `Direction ${person_a_contribution.bias > 0 ? 'expansive' : 'contractive'}\n`;
  output += `- **${personB}**: Magnitude ${bContribution.toFixed(1)}, `;
  output += `Direction ${person_b_contribution.bias > 0 ? 'expansive' : 'contractive'}\n\n`;

  return output;
}

/**
 * Helper: Get response pattern based on directional bias
 */
function getResponsePattern(bias) {
  if (!bias) return 'respond in their own way';
  if (bias > 2) return 'expand, reach out, try to connect or solve';
  if (bias > 0) return 'move toward, open up, engage';
  if (bias < -2) return 'contract, pull back, protect themselves';
  if (bias < 0) return 'withdraw, pause, take space';
  return 'stay neutral, observe';
}

/**
 * Fallback conditional layer when mirror data unavailable
 */
function generateFallbackConditionalLayer(personA, personB) {
  return `## The Relational Engine\n\n` +
    `### How You Two Move Together\n\n` +
    `When ${personA} and ${personB} come together, there's a particular dance. ` +
    `Each brings their own rhythm, and the question is: how do those rhythms interact? ` +
    `Do they amplify each other? Create friction? Support each other? ` +
    `The answer depends on what's happening in the moment.\n\n`;
}

/**
 * Step 4: Generate integration
 * Blending climates into shared narrative
 */
function generateIntegration(personA, personB, dominantTheme) {
  let output = `## Integration: The Shared Climate\n\n`;

  output += `Together, ${personA} and ${personB} create a particular atmosphere. `;
  output += `The dominant theme right now is: **${dominantTheme}**\n\n`;

  output += `This isn't something ${personA} is doing to ${personB}, or vice versa. `;
  output += `It's the field that emerges when you're in the same room. `;
  output += `It's what happens when two individual patterns meet and create something new.\n\n`;

  output += `The work isn't to fix the pattern. It's to understand it. `;
  output += `To see where you amplify each other's gifts and where you trigger each other's wounds. `;
  output += `And then to choose, consciously, how you want to move together.\n\n`;

  return output;
}

/**
 * Step 5: Generate Balance Meter summary
 * Magnitude and directional bias at end
 */
function generateBalanceMeterSummary(personA, personB, balanceMeter) {
  if (!balanceMeter) {
    return `## Overall Pressure\n\nNo transit data available for this period.\n\n`;
  }

  const magnitude = balanceMeter.magnitude || 0;
  const bias = balanceMeter.directional_bias || 0;
  const magnitudeLabel = getMagnitudeLabel(magnitude);
  const biasLabel = getBiasLabel(bias);

  let output = `## Overall Symbolic Weather\n\n`;

  output += `**Magnitude**: ${magnitude.toFixed(1)} (${magnitudeLabel})\n`;
  output += `How loud the symbolic field is right now.\n\n`;

  output += `**Directional Bias**: ${bias.toFixed(1)} (${biasLabel})\n`;
  output += `Geometric direction of symbolic pressure—toward expansion or contraction.\n\n`;

  output += `Together, this creates a structural pattern: `;
  if (magnitude > 3 && bias > 0) {
    output += `high-intensity field with strong outward directional pressure. How this expresses depends on your relationship with expansive movement—it can support growth, create scatter, or both.`;
  } else if (magnitude > 3 && bias < 0) {
    output += `high-intensity field with strong inward directional pressure. How this expresses depends on your relationship with contractive movement—it can deepen focus, create compression, or both.`;
  } else if (magnitude < 2 && bias > 0) {
    output += `low-intensity field with gentle outward lean. Space for movement without urgency.`;
  } else if (magnitude < 2 && bias < 0) {
    output += `low-intensity field with gentle inward lean. Space for consolidation without pressure.`;
  } else {
    output += `moderate-intensity field with balanced directional flow. Structure supports multiple response pathways.`;
  }

  output += `\n\n`;

  return output;
}

/**
 * Helper: Get magnitude label
 */
function getMagnitudeLabel(magnitude) {
  if (magnitude < 1) return 'background hum';
  if (magnitude < 2) return 'gentle presence';
  if (magnitude < 3) return 'noticeable motifs';
  if (magnitude < 4) return 'significant pressure';
  return 'peak storm';
}

/**
 * Helper: Get bias label
 */
function getBiasLabel(bias) {
  if (bias > 3) return 'strongly expansive';
  if (bias > 1) return 'expansive';
  if (bias > -1) return 'neutral';
  if (bias > -3) return 'contractive';
  return 'strongly contractive';
}

/**
 * Generate complete relational flow
 */
function generateRelationalFlow(
  personA,
  personB,
  natalChartA,
  natalChartB,
  mirrorData,
  weatherA,
  weatherB,
  balanceMeter,
  intimacyTier = 'P1'
) {
  let output = '';

  // Step 1: Individual diagnostics
  const diagnostics = generateIndividualDiagnostics(personA, personB, natalChartA, natalChartB);
  output += diagnostics.person_a_diagnostic;
  output += diagnostics.person_b_diagnostic;

  // Step 2: Parallel weather
  output += generateParallelWeather(personA, personB, weatherA, weatherB);

  // Step 3: Conditional layer
  output += generateConditionalLayer(personA, personB, mirrorData, intimacyTier);

  // Step 4: Integration
  output += generateIntegration(personA, personB, mirrorData?.dominant_theme || 'unspecified');

  // Step 5: Balance Meter
  output += generateBalanceMeterSummary(personA, personB, balanceMeter);

  return output;
}

module.exports = {
  generateIndividualDiagnostics,
  generateParallelWeather,
  generateConditionalLayer,
  generateIntegration,
  generateBalanceMeterSummary,
  generateRelationalFlow
};
