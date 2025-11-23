const fs = require('fs');
const path = require('path');
const os = require('os');
const { buildExcerpt } = require('../scripts/generate-persona-excerpts');

describe('generate-persona-excerpts buildExcerpt', () => {
  it('returns excerpt and source filename when candidate file present', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rc-test-'));
    const filename = 'RavenCalder_Corpus_Complete_9.25.25.md';
    const filePath = path.join(tmp, filename);
    fs.writeFileSync(filePath, '# Header\n\nThis is a test excerpt to be included in persona.\nEmail: test@example.com\nURL: https://example.com', 'utf8');

    const info = buildExcerpt(tmp);
    expect(info).toBeTruthy();
    expect(info.excerpt).toContain('This is a test excerpt');
    expect(info.source).toBe(filename);
  });
});

module.exports = {};
