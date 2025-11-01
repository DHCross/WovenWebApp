const path = require('path');

/**
 * Creates the mandatory provenance block for the output file.
 * @param {object} config - The input configuration.
 * @returns {object} The populated metadata block.
 */
function createProvenanceBlock(config) {
  return {
    generated_at: new Date().toISOString(),
    config_source: path.basename(config.sourcePath || 'unknown'),
    math_brain_version: '1.0.0',
    mode: config.mode || 'unknown',
    person_a: config.personA?.name || 'Person A',
    person_b: config.personB ? config.personB.name : null,
    date_range: config.startDate && config.endDate ? [config.startDate, config.endDate] : null,
    house_system: 'Placidus',
    orbs_profile: 'default_v5',
    relocation_mode: config.translocation || 'NONE',
    relationship_context: config.relationshipContext ? { ...config.relationshipContext } : null,
    engine_versions: {
      kerykeion: '4.0.0',
    },
  };
}

module.exports = { createProvenanceBlock };
