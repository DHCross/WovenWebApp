import { REPORT_STRUCTURES } from './prompts';

// LLM provider abstraction.
export interface LLMChunk { delta: string; error?: string; }
export interface StreamOptions { model?: string; personaHook?: string; temperature?: number; }

// Configuration
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const DEFAULT_MODEL = process.env.PERPLEXITY_DEFAULT_MODEL || 'sonar-pro';
const DEFAULT_TEMPERATURE = Number.isFinite(Number(process.env.PERPLEXITY_TEMPERATURE))
  ? Number(process.env.PERPLEXITY_TEMPERATURE)
  : 0.7;
const API_URL = process.env.PERPLEXITY_API_URL || 'https://api.perplexity.ai/chat/completions';

function delay(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }

function buildMessages(prompt: string, personaHook?: string) {
  const systemSections = [REPORT_STRUCTURES.trim()];
  if (personaHook) {
    systemSections.push(`Persona Hook: ${personaHook}`);
  }
  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: prompt }
  ];
}

function extractText(choice: any): string {
  const message = choice?.message;
  if (!message) return '';
  const content = message.content;
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content.map((part: any) => part?.text || '').join('');
  }
  if (content && typeof content === 'object' && typeof content.text === 'string') {
    return content.text;
  }
  return '';
}

async function requestCompletion(prompt: string, opts: StreamOptions) {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error('Error: PERPLEXITY_API_KEY is not configured.');
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: opts.model || DEFAULT_MODEL,
      messages: buildMessages(prompt, opts.personaHook),
      temperature: opts.temperature ?? DEFAULT_TEMPERATURE,
      top_p: 1,
      stream: false
    })
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorBody = await response.json();
      const apiMessage = errorBody?.error?.message || errorBody?.message;
      if (apiMessage) {
        errorMessage = apiMessage;
      }
    } catch (parseError) {
      // ignore parse error, keep default message
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function *generateStream(prompt: string, opts: StreamOptions = {}): AsyncGenerator<LLMChunk> {
  let lastError: any = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const payload = await requestCompletion(prompt, opts);
      const choice = payload?.choices?.[0];
      const text = extractText(choice);

      if (text) {
        yield { delta: text };
      } else {
        yield { delta: '', error: 'Error: Empty response from Perplexity API.' };
      }
      return;
    } catch (error: any) {
      lastError = error;
      const backoffTime = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
      console.warn(`Attempt ${attempt + 1} failed. Retrying in ${backoffTime}ms...`, error?.message || error);
      await delay(backoffTime);
    }
  }

  const errorMessage = lastError?.message || 'An unknown error occurred after multiple retries.';
  yield { delta: '', error: `Error: API call failed after ${MAX_RETRIES} attempts. Last error: ${errorMessage}` };
}

function normalizePrompt(p: string) { return p.replace(/\s+/g, ' ').trim(); }

// Convenience helper: generate a single accumulated text response (uses the stream generator)
export async function generateText(prompt: string, opts: StreamOptions = {}): Promise<string> {
  let out = '';
  let lastError = '';
  for await (const chunk of generateStream(prompt, opts)) {
    if (chunk.error) {
      lastError = chunk.error;
      console.error(chunk.error);
    }
    out += String(chunk.delta || '');
  }

  if (lastError) {
    return normalizePrompt(out) + `\n\n[ERROR: ${lastError}]`;
  }

  return normalizePrompt(out);
}

export async function callPerplexity(prompt: string, opts: StreamOptions = {}): Promise<string> {
  return generateText(prompt, opts);
}
