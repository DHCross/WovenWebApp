// Lightweight stub for Raven renderer.
// Exists to satisfy build-time resolution when the full Raven module
// is not bundled in this environment. The Poetic Brain pipeline will
// merge this output with its local fallback so required fields remain
// populated.

type AnyRecord = Record<string, any>;

async function tryLoadFormatter(): Promise<{
  mod: AnyRecord | null;
  used: string | null;
  fn: ((ctx: AnyRecord) => Promise<any> | any) | null;
}> {
  try {
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    const mod: AnyRecord = await import('@/src/formatter/create_markdown_reading_enhanced.js');
    const fn =
      (typeof mod?.default === 'function' && mod.default) ||
      (typeof mod?.createMarkdownReadingEnhanced === 'function' && mod.createMarkdownReadingEnhanced) ||
      (typeof mod?.create_markdown_reading_enhanced === 'function' && mod.create_markdown_reading_enhanced) ||
      (typeof mod?.render === 'function' && mod.render) ||
      (typeof mod?.format === 'function' && mod.format) ||
      null;
    if (fn) return { mod, used: '@/src/formatter/create_markdown_reading_enhanced.js', fn };
  } catch {
    // formatter not present; caller will fall back
  }
  return { mod: null, used: null, fn: null };
}

function normalizeMarkdownOutput(res: any): string | null {
  if (!res) return null;
  if (typeof res === 'string') return res;
  if (typeof res === 'object') {
    if (typeof res.markdown === 'string') return res.markdown;
    if (typeof res.text === 'string') return res.text;
    if (typeof res.content === 'string') return res.content;
  }
  return null;
}

export async function renderShareableMirror({
  geo,
  prov,
  options,
}: {
  geo: AnyRecord;
  prov?: AnyRecord;
  options?: AnyRecord;
}): Promise<AnyRecord> {
  // Attempt to route to the enhanced markdown formatter. If unavailable,
  // fall back to a minimal appendix only; upstream will merge with local draft.
  const { fn, used } = await tryLoadFormatter();
  let readerMarkdown: string | null = null;
  if (fn) {
    try {
      const ctx = { geo, prov: prov ?? {}, options: options ?? {} };
      const res = await fn(ctx);
      readerMarkdown = normalizeMarkdownOutput(res);
    } catch {
      // ignore formatter errors; keep fallback
      readerMarkdown = null;
    }
  }

  const appendix: AnyRecord = {
    renderer: fn ? 'raven-markdown-formatter' : 'raven-stub',
    formatter_module: used,
    prov: prov ?? { source: 'raven-stub' },
    options: options ?? {},
    echoed_aspects: Array.isArray(geo?.aspects) ? geo.aspects.length : 0,
  };
  if (readerMarkdown) appendix.reader_markdown = readerMarkdown;

  return { appendix } as AnyRecord;
}

export const renderMirror = renderShareableMirror;
export default renderShareableMirror;
