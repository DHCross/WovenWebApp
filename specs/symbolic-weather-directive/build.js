#!/usr/bin/env node

/**
 * Multi-Format Spec Builder
 * Generates PDF, HTML, TXT, and JSON artifacts from spec.md
 * 
 * Usage: node build.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SPEC_DIR = __dirname;
const SPEC_MD = path.join(SPEC_DIR, 'spec.md');
const OUTPUT_DIR = SPEC_DIR;
const API_DIR = path.join(SPEC_DIR, 'api');

console.log('📦 Building Symbolic Weather Directive Specs...\n');

// Ensure API directory exists
if (!fs.existsSync(API_DIR)) {
  fs.mkdirSync(API_DIR, { recursive: true });
}

// Read source files
const specContent = fs.readFileSync(SPEC_MD, 'utf-8');
const glossaryContent = fs.readFileSync(path.join(SPEC_DIR, 'glossary.md'), 'utf-8');
const testsContent = fs.readFileSync(path.join(SPEC_DIR, 'tests-acceptance.md'), 'utf-8');

console.log('✅ Read source files');

// Extract metadata
const versionMatch = specContent.match(/v(\d+\.\d+\.\d+)/);
const version = versionMatch ? versionMatch[1] : '3.1.0';

// Count sections (§ markers in headings with anchors)
const sectionIds = (specContent.match(/\{#(§?[\d.]+[\w-]*)\}/g) || [])
  .map(m => m.replace(/\{#|}/g, ''));
const sectionCount = sectionIds.length;

// Count line anchors
const lineAnchors = specContent.match(/`\[L\d+\]`/g) || [];
const lineAnchorCount = lineAnchors.length;

// Count tests
const testIds = testsContent.match(/TEST-\d+/g) || [];
const testCount = testIds.length;

// Count glossary terms
const glossaryTerms = glossaryContent.match(/\*\*[A-Z][A-Za-z\s/()]+\*\*/g) || [];
const glossaryCount = glossaryTerms.length;

console.log(`📊 Metadata extracted:`);
console.log(`   Version: ${version}`);
console.log(`   Sections: ${sectionCount}`);
console.log(`   Line Anchors: ${lineAnchorCount}`);
console.log(`   Tests: ${testCount}`);
console.log(`   Glossary Terms: ${glossaryCount}\n`);

// Generate HTML
function generateHTML() {
  console.log('🌐 Generating HTML...');
  
  // Simple markdown to HTML conversion
  let html = specContent
    .replace(/^(#{1,6})\s+(.+?)\s*\{#([\w§.-]+)\}/gm, (match, hashes, title, id) => {
      const level = hashes.length;
      return `<h${level} id="${id}">${escapeHtml(title)}</h${level}>`;
    })
    .replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, title) => {
      const level = hashes.length;
      return `<h${level}>${escapeHtml(title)}</h${level}>`;
    })
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^```([\w]*)\n([\s\S]*?)^```$/gm, '<pre><code class="language-$1">$2</code></pre>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/gm, '$1<br>');

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Symbolic Weather Directive v${version}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.6;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    h1, h2, h3, h4, h5, h6 { 
      color: #2c3e50; 
      margin-top: 1.5em;
    }
    h1 { border-bottom: 3px solid #3498db; padding-bottom: 0.3em; }
    h2 { border-bottom: 2px solid #95a5a6; padding-bottom: 0.3em; }
    code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
    pre {
      background: #2c3e50;
      color: #ecf0f1;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
    }
    pre code {
      background: transparent;
      color: inherit;
    }
    strong { color: #2c3e50; }
    .toc {
      background: #ecf0f1;
      padding: 20px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .toc h2 { margin-top: 0; }
    .toc ul { list-style: none; padding-left: 0; }
    .toc li { margin: 5px 0; }
    .toc a { color: #3498db; text-decoration: none; }
    .toc a:hover { text-decoration: underline; }
    li { margin: 0.5em 0; }
  </style>
</head>
<body>
  <div class="toc">
    <h2>Table of Contents</h2>
    <ul>
      ${generateTOC(sectionIds)}
    </ul>
  </div>
  <div class="content">
    ${html}
  </div>
  <footer style="margin-top: 3em; padding-top: 1em; border-top: 1px solid #ccc; color: #7f8c8d; font-size: 0.9em;">
    <p>Version ${version} | Generated: ${new Date().toISOString()}</p>
  </footer>
</body>
</html>`;

  const htmlPath = path.join(OUTPUT_DIR, 'spec.html');
  fs.writeFileSync(htmlPath, fullHtml, 'utf-8');
  console.log(`   ✅ Generated: spec.html`);
  return htmlPath;
}

function generateTOC(sectionIds) {
  return sectionIds.map(id => {
    const cleanId = id.replace(/§/g, '');
    const title = cleanId.replace(/[\d.]+-/, '').replace(/-/g, ' ');
    return `<li><a href="#${id}">${id} — ${title}</a></li>`;
  }).join('\n');
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Generate plain text
function generatePlainText() {
  console.log('📄 Generating plain text...');
  
  // Clean markdown formatting for plain text
  let txt = specContent
    .replace(/\{#[\w-]+\}/g, '') // Remove anchor IDs
    .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
    .replace(/`(.+?)`/g, '$1') // Remove code markers
    .replace(/^```[\w]*$/gm, '---') // Replace code fences
    .replace(/#{1,6}\s+/g, ''); // Remove heading markers

  const txtPath = path.join(OUTPUT_DIR, 'spec.txt');
  fs.writeFileSync(txtPath, txt, 'utf-8');
  
  const stats = fs.statSync(txtPath);
  const sizeKB = (stats.size / 1024).toFixed(2);
  console.log(`   ✅ Generated: spec.txt (${sizeKB} KB)`);
  
  if (stats.size > 1024 * 1024) {
    console.warn(`   ⚠️  WARNING: spec.txt exceeds 1 MB size limit!`);
  }
  
  return txtPath;
}

// Generate meta.json
function generateMetaJSON() {
  console.log('📊 Generating meta.json...');
  
  const meta = {
    name: 'symbolic-weather-fix-directive',
    version: version,
    contract: 'clear-mirror/1.3',
    generated: new Date().toISOString(),
    sections: sectionCount,
    tests: testCount,
    glossary_terms: glossaryCount,
    line_anchors: lineAnchorCount,
    artifacts: [
      { file: 'spec.md', type: 'markdown', sections: sectionCount },
      { file: 'spec.html', type: 'html', sections: sectionCount },
      { file: 'spec.txt', type: 'plaintext' },
      { file: 'glossary.md', type: 'markdown', terms: glossaryCount },
      { file: 'tests-acceptance.md', type: 'markdown', tests: testCount }
    ]
  };
  
  const metaPath = path.join(API_DIR, 'meta.json');
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
  console.log(`   ✅ Generated: api/meta.json`);
  return metaPath;
}

// Generate anchors.json
function generateAnchorsJSON() {
  console.log('🔗 Generating anchors.json...');
  
  const anchors = {};
  const lines = specContent.split('\n');
  
  lines.forEach((line, index) => {
    const match = line.match(/##\s+(.+?)\s*\{#([\w-]+)\}/);
    if (match) {
      const [, title, id] = match;
      anchors[id] = {
        title: title.trim(),
        line: index + 1
      };
    }
  });
  
  const anchorsPath = path.join(API_DIR, 'anchors.json');
  fs.writeFileSync(anchorsPath, JSON.stringify(anchors, null, 2), 'utf-8');
  console.log(`   ✅ Generated: api/anchors.json (${Object.keys(anchors).length} anchors)`);
  return anchorsPath;
}

// Generate glossary.json
function generateGlossaryJSON() {
  console.log('📖 Generating glossary.json...');
  
  const glossary = {};
  const glossaryLines = glossaryContent.split('\n');
  
  let currentTerm = null;
  let currentDefinition = [];
  
  glossaryLines.forEach(line => {
    const termMatch = line.match(/^\*\*(.+?)\*\*$/);
    if (termMatch) {
      // Save previous term if exists
      if (currentTerm) {
        glossary[currentTerm] = currentDefinition.join(' ').trim();
      }
      // Start new term
      currentTerm = termMatch[1];
      currentDefinition = [];
    } else if (currentTerm && line.trim() && !line.startsWith('#')) {
      currentDefinition.push(line.trim());
    }
  });
  
  // Save last term
  if (currentTerm) {
    glossary[currentTerm] = currentDefinition.join(' ').trim();
  }
  
  const glossaryPath = path.join(API_DIR, 'glossary.json');
  fs.writeFileSync(glossaryPath, JSON.stringify(glossary, null, 2), 'utf-8');
  console.log(`   ✅ Generated: api/glossary.json (${Object.keys(glossary).length} terms)`);
  return glossaryPath;
}

// Generate manifest.yaml
function generateManifest(generatedFiles) {
  console.log('📋 Generating manifest.yaml...');
  
  const artifacts = [
    'spec.md',
    'spec.html',
    'spec.txt',
    'glossary.md',
    'tests-acceptance.md',
    'fixtures/oct04-11.json',
    'schemas/display-transform.schema.json',
    'api/meta.json',
    'api/anchors.json',
    'api/glossary.json'
  ];
  
  let manifestContent = `name: symbolic-weather-fix-directive
version: ${version}
contract: clear-mirror/1.3
generated: ${new Date().toISOString()}
render_mode: absolute_x50
pipeline: [normalize, scale, clamp, round]
coherence_formula: "5 - (volatility * 50)"

artifacts:\n`;
  
  artifacts.forEach(file => {
    const filePath = path.join(SPEC_DIR, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath);
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      const stats = fs.statSync(filePath);
      
      manifestContent += `  - file: ${file}\n`;
      manifestContent += `    sha256: ${hash}\n`;
      manifestContent += `    size_bytes: ${stats.size}\n`;
    }
  });
  
  const manifestPath = path.join(OUTPUT_DIR, 'manifest.yaml');
  fs.writeFileSync(manifestPath, manifestContent, 'utf-8');
  console.log(`   ✅ Generated: manifest.yaml`);
  return manifestPath;
}

// Generate index.html landing page
function generateIndexHTML() {
  console.log('🏠 Generating index.html...');
  
  const indexContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Symbolic Weather Directive v${version}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .container {
      background: rgba(255, 255, 255, 0.95);
      padding: 40px;
      border-radius: 10px;
      color: #333;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    h1 { margin-top: 0; color: #667eea; }
    .badge {
      background: #3498db;
      color: white;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 0.9em;
      display: inline-block;
      margin: 10px 0;
    }
    .format-links {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 30px 0;
    }
    .format-link {
      background: #ecf0f1;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      text-decoration: none;
      color: #2c3e50;
      transition: transform 0.2s, box-shadow 0.2s;
      border: 2px solid transparent;
    }
    .format-link:hover {
      transform: translateY(-5px);
      box-shadow: 0 5px 15px rgba(0,0,0,0.2);
      border-color: #3498db;
    }
    .format-link.primary {
      background: #3498db;
      color: white;
      font-weight: bold;
    }
    .format-icon { font-size: 2em; margin-bottom: 10px; }
    .stats {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .stats ul { list-style: none; padding: 0; }
    .stats li { margin: 10px 0; }
    .stats strong { color: #667eea; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📚 Symbolic Weather Fix Directive</h1>
    <div class="badge">Version ${version}</div>
    <div class="badge">Contract: clear-mirror/1.3</div>
    
    <div class="stats">
      <h2>📊 Completeness Badge</h2>
      <ul>
        <li><strong>Sections:</strong> ${sectionCount}</li>
        <li><strong>Tests:</strong> ${testCount}</li>
        <li><strong>Glossary Terms:</strong> ${glossaryCount}</li>
        <li><strong>Line Anchors:</strong> ${lineAnchorCount}</li>
      </ul>
    </div>

    <h2>📖 Available Formats</h2>
    <p>Choose your preferred format for reading the specification:</p>

    <div class="format-links">
      <a href="spec.txt" class="format-link primary">
        <div class="format-icon">📄</div>
        <div>Plain Text</div>
        <small>No tools needed</small>
      </a>
      
      <a href="spec.html" class="format-link">
        <div class="format-icon">🌐</div>
        <div>HTML</div>
        <small>Interactive TOC</small>
      </a>
      
      <a href="spec.md" class="format-link">
        <div class="format-icon">✍️</div>
        <div>Markdown</div>
        <small>Source of truth</small>
      </a>
    </div>

    <h2>📦 Additional Resources</h2>
    <div class="format-links">
      <a href="glossary.md" class="format-link">
        <div class="format-icon">📖</div>
        <div>Glossary</div>
      </a>
      
      <a href="tests-acceptance.md" class="format-link">
        <div class="format-icon">✅</div>
        <div>Tests</div>
      </a>
      
      <a href="api/meta.json" class="format-link">
        <div class="format-icon">🔧</div>
        <div>API Meta</div>
      </a>
    </div>

    <h2>🔒 Integrity Verification</h2>
    <p>All artifacts are listed with SHA-256 checksums in <a href="manifest.yaml">manifest.yaml</a>.</p>
    <p>To verify: <code>sha256sum &lt;file&gt;</code> and compare against manifest.</p>

    <footer style="margin-top: 3em; padding-top: 1em; border-top: 1px solid #ccc; color: #7f8c8d; font-size: 0.9em;">
      <p>Generated: ${new Date().toISOString()}</p>
      <p>Part of WovenWebApp Raven Calder System</p>
    </footer>
  </div>
</body>
</html>`;

  const indexPath = path.join(OUTPUT_DIR, 'index.html');
  fs.writeFileSync(indexPath, indexContent, 'utf-8');
  console.log(`   ✅ Generated: index.html`);
  return indexPath;
}

// Main build process
async function build() {
  try {
    const generatedFiles = [];
    
    // Generate all formats
    generatedFiles.push(generateHTML());
    generatedFiles.push(generatePlainText());
    generatedFiles.push(generateMetaJSON());
    generatedFiles.push(generateAnchorsJSON());
    generatedFiles.push(generateGlossaryJSON());
    generatedFiles.push(generateManifest(generatedFiles));
    generatedFiles.push(generateIndexHTML());
    
    console.log('\n✨ Build complete!\n');
    console.log('Generated files:');
    generatedFiles.forEach(file => {
      console.log(`   - ${path.relative(SPEC_DIR, file)}`);
    });
    
    console.log('\n📦 Next steps:');
    console.log('   1. Run validation: npm run validate:specs');
    console.log('   2. Review generated files');
    console.log('   3. Open index.html in browser\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Run build
build();
