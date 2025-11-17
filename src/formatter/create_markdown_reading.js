const fs = require('fs');
const path = require('path');
const { sanitizeForFilename } = require('../utils/sanitizeFilename.js');
const { generateFrontstagePreface } = require('./frontstage-preface.js');

/**
 * Creates a self-contained Markdown reading from a unified JSON data object.
 * This is the final step (Stage 2) of the FIELD -> MAP -> VOICE pipeline.
 *
 * @param {string|object} input - Path to the unified_output.json file (the "MAP") or the parsed object itself.
 * @param {object} options
 * @param {boolean} [options.writeToFile=true] - When true, write the markdown to disk and return the path.
 * @param {string} [options.outputDir] - Directory to write the file to (defaults to input file directory or cwd).
 * @returns {string|{filename: string, content: string}} Path when writing to disk, otherwise an object with filename/content.
 */
function createMarkdownReading(input, options = {}) {
  const { writeToFile = true, outputDir } = options;

  let data;
  let baseDir = outputDir ? path.resolve(outputDir) : null;
  let inputJsonPath = null;

  if (typeof input === 'string') {
    inputJsonPath = input;
    baseDir = baseDir || path.dirname(inputJsonPath);
    console.log(`[Formatter] Reading MAP data from: ${inputJsonPath}`);

    if (!fs.existsSync(inputJsonPath)) {
      throw new Error(`Input JSON file not found at: ${inputJsonPath}`);
    }
    data = JSON.parse(fs.readFileSync(inputJsonPath, 'utf8'));
  } else if (input && typeof input === 'object') {
    data = input;
    if (!baseDir && writeToFile) {
      baseDir = process.cwd();
    }
  } else {
    throw new Error('createMarkdownReading expected a file path or data object');
  }

  const { run_metadata, daily_entries } = data;

  let markdownContent = '';

  // --- Generate Frontstage Preface ---
  const preface = generateFrontstagePreface(
    run_metadata?.person_a,
    run_metadata?.person_b,
    data.person_a?.chart,
    data.person_b?.chart
  );
  markdownContent += preface;

  // --- Generate Markdown for each day ---
  for (const day of daily_entries) {
    markdownContent += `## Woven Reading: ${run_metadata.person_a} & ${run_metadata.person_b}\n`;
    markdownContent += `**Date:** ${day.date}\n\n`;
    markdownContent += '---\n\n';

    markdownContent += '### Data for Interpretation\n\n';

    // 1. Symbolic Reading (Field Metrics)
    markdownContent += '#### Symbolic Reading (Field Metrics)\n';
    markdownContent += `- **Magnitude**: ${day.symbolic_weather.magnitude} (${day.symbolic_weather.labels.magnitude})\n`;
    markdownContent += `- **Directional Bias**: ${day.symbolic_weather.directional_bias} (${day.symbolic_weather.labels.directional_bias})\n`;
    markdownContent += `- **Schema**: BM-v5.0\n`;
    
    markdownContent += '\n';

    // 2. Mirror Data
    markdownContent += '#### Mirror Data (Relational)\n';
    markdownContent += `- **Relational Tension**: ${day.mirror_data.relational_tension}\n`;
    markdownContent += `- **Relational Flow**: ${day.mirror_data.relational_flow}\n`;
    markdownContent += `- **Dominant Theme**: ${day.mirror_data.dominant_theme}\n`;
    markdownContent += `- **${run_metadata.person_a}'s Contribution**: Magnitude ${day.mirror_data.person_a_contribution.magnitude}, Bias ${day.mirror_data.person_a_contribution.bias}\n`;
    markdownContent += `- **${run_metadata.person_b}'s Contribution**: Magnitude ${day.mirror_data.person_b_contribution.magnitude}, Bias ${day.mirror_data.person_b_contribution.bias}\n\n`;

    // 3. Poetic Hooks
    markdownContent += '#### Poetic Hooks (Narrative Triggers)\n';
    markdownContent += `- **Peak Aspect of the Day**: ${day.poetic_hooks.peak_aspect_of_the_day}\n`;
    markdownContent += `- **Key Themes**: ${day.poetic_hooks.key_themes.join(', ')}\n`;
    if(day.poetic_hooks.significant_events && day.poetic_hooks.significant_events.length > 0) {
        markdownContent += `- **Significant Astrological Events**: ${day.poetic_hooks.significant_events.join(', ')}\n`;
    }
    markdownContent += '- **Top Contributing Aspects**:\n';
    day.poetic_hooks.top_contributing_aspects.forEach((aspect, index) => {
      markdownContent += `  - ${index + 1}. ${aspect.aspect} [${aspect.type}]\n`;
    });
    markdownContent += '\n---\n\n';
  }

  // --- Add the Instructions for the Poetic Brain ---
  markdownContent += '### Your Task (Instructions for Raven/Poetic Brain)\n\n';
  markdownContent += 'You are Raven Calder, a poetic interpreter of symbolic data. Your task is to synthesize the data for each day presented above into a "Woven Reading." For each day:\n\n';
  markdownContent += '1.  **Begin with the Symbolic Reading**: Describe the overall feeling of the day using the **Magnitude** (how loud is the sky?) and the **Directional Bias** (which way the energy leans).\n';
  markdownContent += '2.  **Explain the Relational Dynamics**: Use the Mirror Data to describe the interplay between the two individuals. What is the shared experience? How are their individual contributions shaping it?\n';
  markdownContent += '3.  **Weave in the Narrative**: Use the Poetic Hooks to give the "why" behind the numbers. The "Peak Aspect" is the headline story of the day.\n';
  markdownContent += '4.  **Adhere to Your Voice**: Your language must be clear, agency-preserving, and non-predictive. Reflect the patterns; do not dictate the future.\n';

  // --- Write the final file ---
  const safePersonA = sanitizeForFilename(run_metadata?.person_a, 'PersonA');
  const safePersonB = sanitizeForFilename(run_metadata?.person_b, run_metadata?.person_b ? 'PersonB' : 'Solo');
  const dateRange = Array.isArray(run_metadata?.date_range) ? run_metadata.date_range : [];
  const safeStart = sanitizeForFilename(dateRange[0], 'start');
  const safeEnd = sanitizeForFilename(dateRange[1], dateRange[0] ? 'end' : 'start');

  const outputFileName = `Woven_Reading_${safePersonA}_${safePersonB}_${safeStart}_to_${safeEnd}.md`;
  if (writeToFile) {
    const targetDir = baseDir || process.cwd();
    const outputPath = path.join(targetDir, outputFileName);
    fs.writeFileSync(outputPath, markdownContent);
    console.log(`[Formatter] Success! Formatted Markdown reading written to: ${outputPath}`);
    return outputPath;
  }

  return {
    filename: outputFileName,
    content: markdownContent,
  };
}

// --- Main Execution Block ---
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length !== 1) {
        console.error('Usage: node src/formatter/create_markdown_reading.js <path_to_unified_output.json>');
        process.exit(1);
    }
    const inputPath = path.resolve(args[0]);
    createMarkdownReading(inputPath);
}

module.exports = { createMarkdownReading };
