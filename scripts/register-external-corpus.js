#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Usage: node scripts/register-external-corpus.js /path/to/RavenCalder_Corpus
const corpusPath = process.argv[2] || path.resolve(process.cwd(), '..', 'RavenCalder_Corpus');
const provenancePath = path.resolve(process.cwd(), 'corpus_provenance.json');

function ensureFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  return true;
}

function readTop20(corpusDir) {
  const listing = fs.readdirSync(corpusDir);
  const candidates = listing.filter(f => f.toLowerCase().includes('top20') || f.toLowerCase().includes('top 20') || f.toLowerCase().includes('combined') || f.toLowerCase().includes('complete'));
  if (!candidates || !candidates.length) return [];
  try {
    const file = path.join(corpusDir, candidates[0]);
    const raw = fs.readFileSync(file, 'utf8');
    return raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  } catch (e) {
    return [];
  }
}

function readYamlConfig(corpusDir) {
  const configFile = [
    'Raven_Calder_config_Updated.yaml',
    'raven_ai_protocols.yaml',
    'raven_calder_config_updated.yaml'
  ].map(f => path.join(corpusDir, f)).find(f => fs.existsSync(f));
  if (!configFile) return null;
  try {
    const raw = fs.readFileSync(configFile, 'utf8');
    return yaml.load(raw);
  } catch (e) {
    return null;
  }
}

function summariseCorpus(corpusDir) {
  const top20 = readTop20(corpusDir);
  const config = readYamlConfig(corpusDir);
  const stats = fs.readdirSync(corpusDir).map(f => {
    const fp = path.join(corpusDir, f);
    const stat = fs.statSync(fp);
    return { name: f, isDir: stat.isDirectory(), size: stat.size, mtime: stat.mtime.toISOString() };
  }).sort((a,b)=>b.mtime.localeCompare(a.mtime));
  return {
    path: corpusDir,
    top20,
    config: config || null,
    file_count: stats.length,
    sample_files: stats.slice(0,10)
  };
}

function register(corpusSummary) {
  let prov = {};
  if (fs.existsSync(provenancePath)) {
    const raw = fs.readFileSync(provenancePath, 'utf8');
    try { prov = JSON.parse(raw); } catch (e) { prov = {}; }
  }
  prov.raven_calder_corpus = {
    registered_at: new Date().toISOString(),
    path: corpusSummary.path,
    file_count: corpusSummary.file_count,
    sample_files: corpusSummary.sample_files.map(f => f.name),
    top20_count: (corpusSummary.top20 || []).length,
    top20: corpusSummary.top20,
    version_hint: corpusSummary.config && corpusSummary.config.raven_calder_woven_map && corpusSummary.config.raven_calder_woven_map.version ? corpusSummary.config.raven_calder_woven_map.version : (corpusSummary.config && corpusSummary.config.version) || null
  };
  fs.writeFileSync(provenancePath, JSON.stringify(prov, null, 2), 'utf8');
  console.log('Registered Raven Calder corpus to', provenancePath);
}

function main(){
  if (!ensureFile(corpusPath)) {
    console.error('Corpus path does not exist:', corpusPath);
    process.exit(1);
  }
  const summary = summariseCorpus(corpusPath);
  register(summary);
}

if (require.main === module) main();

module.exports = { summariseCorpus, readTop20, readYamlConfig };
