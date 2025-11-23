#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const provPath = path.resolve(process.cwd(), 'corpus_provenance.json');
const outPath = path.resolve(process.cwd(), 'poetic-brain', 'ravencalder-persona-excerpt.txt');

function loadProvenance() {
  if (!fs.existsSync(provPath)) return null;
  try { return JSON.parse(fs.readFileSync(provPath, 'utf8')); } catch (e) { return null; }
}

function buildExcerpt(corpusPath) {
  const combinedCandidates = ['RavenCalder_Corpus_TOP20 8.28.25.txt', 'RavenCalder_Corpus_Combined_2025-10-1.txt', 'RavenCalder_Corpus_Complete_9.25.25.md', 'RavenCalder_Corpus_Combined_2025-09-22.md'];
  const filenames = fs.readdirSync(corpusPath);
  const candidate = combinedCandidates.map(n => filenames.find(f => f.trim() === n)).find(Boolean);
  if (!candidate) return null;
  const raw = fs.readFileSync(path.join(corpusPath, candidate), 'utf8');
  // Simple heuristic: take up to first 60 non-empty lines, then filter to best ~20
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(0, 60);
  const excerptLines = lines.filter(l => l.length > 10).slice(0, 20);
  const excerptRaw = excerptLines.join('\n');
  return excerptRaw;
}

function sanitizeExcerpt(text) {
  if (!text) return '';
  // Remove emails
  text = text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted]');
  // Remove URLs
  text = text.replace(/https?:\/\/\S+/gi, '[redacted]');
  // Remove phone-like numbers
  text = text.replace(/\+?\d[\d\-() ]{6,}\d/g, '[redacted]');
  // Collapse repeated whitespace and long lines
  text = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => l.slice(0, 500)).join('\n');
  // Truncate overall to reasonable size (~1200 chars)
  if (text.length > 1200) text = text.slice(0, 1200) + '\n...[truncated]';
  return text;
}

function main() {
  const prov = loadProvenance();
  if (!prov || !prov.raven_calder_corpus || !prov.raven_calder_corpus.path) {
    console.error('No Raven Calder corpus registered in corpus_provenance.json. Run scripts/register-external-corpus.js first.');
    process.exit(1);
  }
  const corpusPath = prov.raven_calder_corpus.path;
  if (!fs.existsSync(corpusPath)) {
    console.error('Registered corpus path not found:', corpusPath);
    process.exit(1);
  }
  const excerpt = buildExcerpt(corpusPath);
  if (!excerpt) {
    console.error('No suitable excerpt found in corpus path:', corpusPath);
    process.exit(1);
  }
  // Sanitize and write to output path
  const sanitized = sanitizeExcerpt(excerpt);
  const heading = `# Raven Calder Persona Excerpt (generated from: ${path.basename(corpusPath)})\n`;
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, heading + '\n' + sanitized + '\n', 'utf8');
  console.log('Persona excerpt written to:', outPath);

  // Update provenance with excerpt metadata (safe best-effort)
  try {
    const prov = loadProvenance() || {};
    prov.raven_calder_corpus = prov.raven_calder_corpus || {};
    prov.raven_calder_corpus.excerpt = sanitized;
    prov.raven_calder_corpus.excerpt_generated_at = new Date().toISOString();
    prov.raven_calder_corpus.excerpt_source_file = path.basename(excerpt ? '' : '');
    fs.writeFileSync(provPath, JSON.stringify(prov, null, 2), 'utf8');
    console.log('Updated provenance at', provPath);
  } catch (e) {
    console.warn('Unable to update provenance file:', e && e.message);
  }
}

if (require.main === module) main();

module.exports = { buildExcerpt };
