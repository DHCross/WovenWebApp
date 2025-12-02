const fs = require('fs');
const path = require('path');
const { sanitizeForFilename } = require('../utils/sanitizeFilename.js');
const { generateFrontstagePreface } = require('./frontstage-preface.js');
const { generateSoloMirror } = require('./solo-mirror-template.js');
const { generateRelationalFlow } = require('./relational-flow.js');
const { generateAspectMandateSection } = require('./aspect-mandate.js');

/**
 * Enhanced Markdown Reading Generator
 * Integrates all four narrative phases:
 * 1. Frontstage Preface (warm entry)
 * 2. Solo Mirror Template (Hook Stack + Polarity Cards + Mirror Voice)
 * 3. Relational Flow (5-step with directional attribution)
 * 4. Aspect Mandate (Geometry → Archetype → Lived Tension)
 */
function createMarkdownReadingEnhanced(inputJsonPath) {
  console.log(`[Formatter] Reading MAP data from: ${inputJsonPath}`);

  if (!fs.existsSync(inputJsonPath)) {
    throw new Error(`Input JSON file not found at: ${inputJsonPath}`);
  }

  const data = JSON.parse(fs.readFileSync(inputJsonPath, 'utf8'));
  const { run_metadata, daily_entries, person_a, person_b, mirror_data } = data;

  let markdownContent = '';

  // ===== PHASE 1: FRONTSTAGE PREFACE =====
  console.log('[Formatter] Generating Frontstage Preface...');
  const preface = generateFrontstagePreface(
    run_metadata?.person_a,
    run_metadata?.person_b,
    person_a?.chart,
    person_b?.chart
  );
  markdownContent += preface;

  // ===== PHASE 2: SOLO MIRROR TEMPLATE =====
  console.log('[Formatter] Generating Solo Mirror Templates...');
  if (person_a?.chart) {
    const soloMirrorA = generateSoloMirror(
      run_metadata?.person_a,
      person_a.chart,
      mirror_data?.intimacy_tier || 'P1'
    );
    markdownContent += soloMirrorA;
  }

  if (person_b?.chart) {
    const soloMirrorB = generateSoloMirror(
      run_metadata?.person_b,
      person_b.chart,
      mirror_data?.intimacy_tier || 'P1'
    );
    markdownContent += soloMirrorB;
  }

  // ===== PHASE 3: RELATIONAL FLOW (if two people) =====
  if (person_b && run_metadata?.person_b) {
    console.log('[Formatter] Generating Relational Flow...');
    const relationalFlow = generateRelationalFlow(
      run_metadata.person_a,
      run_metadata.person_b,
      person_a?.chart,
      person_b?.chart,
      mirror_data,
      null, // weatherA - can be populated from daily_entries if needed
      null, // weatherB - can be populated from daily_entries if needed
      null, // balanceMeter - can be populated from daily_entries if needed
      mirror_data?.intimacy_tier || 'P1'
    );
    markdownContent += relationalFlow;
  }

  // ===== PHASE 4: ASPECT MANDATE =====
  console.log('[Formatter] Generating Aspect Mandate Sections...');
  if (person_a?.chart) {
    const aspectMandateA = generateAspectMandateSection(
      run_metadata?.person_a,
      person_a.chart
    );
    markdownContent += aspectMandateA;
  }

  if (person_b?.chart) {
    const aspectMandateB = generateAspectMandateSection(
      run_metadata?.person_b,
      person_b.chart
    );
    markdownContent += aspectMandateB;
  }

  // ===== DAILY ENTRIES (SYMBOLIC WEATHER) =====
  console.log('[Formatter] Generating Daily Symbolic Weather...');
  markdownContent += `## Daily Symbolic Weather\n\n`;

  for (const day of daily_entries) {
    markdownContent += `### ${day.date}\n\n`;

    // Symbolic Weather
    markdownContent += `**Magnitude**: ${day.symbolic_weather.magnitude} (${day.symbolic_weather.labels.magnitude})\n`;
    markdownContent += `**Directional Bias**: ${day.symbolic_weather.directional_bias} (${day.symbolic_weather.labels.directional_bias})\n\n`;

    // Mirror Data (if relational)
    if (day.mirror_data) {
      markdownContent += `**Relational Pattern**: ${day.mirror_data.dominant_theme}\n`;
      markdownContent += `**Tension**: ${day.mirror_data.relational_tension}\n`;
      markdownContent += `**Flow**: ${day.mirror_data.relational_flow}\n\n`;
    }

    // Poetic Hooks
    if (day.poetic_hooks) {
      markdownContent += `**Peak Aspect**: ${day.poetic_hooks.peak_aspect_of_the_day}\n`;
      markdownContent += `**Key Themes**: ${day.poetic_hooks.key_themes.join(', ')}\n\n`;
    }

    markdownContent += `---\n\n`;
  }

  // ===== PROVENANCE & FALSIFIABILITY =====
  console.log('[Formatter] Adding Provenance...');
  markdownContent += `## Provenance & Falsifiability\n\n`;
  markdownContent += `**Generated**: ${new Date().toISOString()}\n`;
  markdownContent += `**Math Brain Version**: ${run_metadata?.math_brain_version || 'unknown'}\n`;
  markdownContent += `**House System**: ${run_metadata?.house_system || 'Placidus'}\n`;
  markdownContent += `**Orbs Profile**: ${run_metadata?.orbs_profile || 'wm-spec-2025-09'}\n`;
  markdownContent += `**Ephemeris Source**: ${run_metadata?.ephemeris_source || 'astroapi-v3'}\n`;
  markdownContent += `**Relocation Mode**: ${run_metadata?.relocation_mode || 'none'}\n\n`;

  if (person_a?.birth_data) {
    markdownContent += `**${run_metadata?.person_a}**\n`;
    markdownContent += `- Birth: ${person_a.birth_data.date} ${person_a.birth_data.time}\n`;
    markdownContent += `- Location: ${person_a.birth_data.city}, ${person_a.birth_data.state}\n\n`;
  }

  if (person_b?.birth_data) {
    markdownContent += `**${run_metadata?.person_b}**\n`;
    markdownContent += `- Birth: ${person_b.birth_data.date} ${person_b.birth_data.time}\n`;
    markdownContent += `- Location: ${person_b.birth_data.city}, ${person_b.birth_data.state}\n\n`;
  }

  markdownContent += `---\n\n`;
  markdownContent += `**Note**: This reading is falsifiable. Every claim maps to specific chart geometry. If something doesn't resonate with your lived experience, that's data for recalibration, not a system failure.\n\n`;

  // ===== WRITE FILE =====
  const safePersonA = sanitizeForFilename(run_metadata?.person_a, 'PersonA');
  const safePersonB = sanitizeForFilename(run_metadata?.person_b, run_metadata?.person_b ? 'PersonB' : 'Solo');
  const dateRange = Array.isArray(run_metadata?.date_range) ? run_metadata.date_range : [];
  const safeStart = sanitizeForFilename(dateRange[0], 'start');
  const safeEnd = sanitizeForFilename(dateRange[1], dateRange[0] ? 'end' : 'start');

  const outputFileName = `Woven_Reading_${safePersonA}_${safePersonB}_${safeStart}_to_${safeEnd}_ENHANCED.md`;
  const outputPath = path.join(path.dirname(inputJsonPath), outputFileName);
  fs.writeFileSync(outputPath, markdownContent);
  console.log(`[Formatter] Success! Enhanced Markdown reading written to: ${outputPath}`);

  return outputPath;
}

module.exports = { createMarkdownReadingEnhanced };
