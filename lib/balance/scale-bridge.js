/**
 * CommonJS bridge for balance meter scalers.
 *
 * Historically this file reimplemented the TypeScript scalers so that
 * CommonJS consumers (notably `src/seismograph.js`) could access them without
 * a build step. Now the canonical runtime lives in `scale.js`, so this bridge
 * simply re-exports that implementation to avoid duplication.
 */

module.exports = require('./scale.js');
