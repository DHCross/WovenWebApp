import { REPORT_STRUCTURES } from './prompts';

// =============================================================================
// LLM PROVIDER: PERPLEXITY AI ONLY
// =============================================================================
// CRITICAL: Poetic Brain uses PERPLEXITY AI exclusively.
// DO NOT use Gemini, OpenAI, or any other provider.
// Raven Calder's voice is calibrated specifically for Perplexity's models.
// Provider: Perplexity AI (https://perplexity.ai)
// API Documentation: https://docs.perplexity.ai/reference/post_chat_completions
// =============================================================================

// LLM provider abstraction.
export interface LLMChunk { delta: string; error?: string; }
export interface StreamOptions { model?: string; personaHook?: string; temperature?: number; topP?: number; }

// Configuration
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const REQUEST_TIMEOUT_MS = 30000; // 30 second timeout
const DEFAULT_MODEL = process.env.PERPLEXITY_DEFAULT_MODEL || 'sonar-pro';
const DEFAULT_TEMPERATURE = Number.isFinite(Number(process.env.PERPLEXITY_TEMPERATURE))
  ? Number(process.env.PERPLEXITY_TEMPERATURE)
  : 0.7;
const DEFAULT_TOP_P = Number.isFinite(Number(process.env.PERPLEXITY_TOP_P))
  ? Number(process.env.PERPLEXITY_TOP_P)
  : 1;
const API_URL = process.env.PERPLEXITY_API_URL || 'https://api.perplexity.ai/chat/completions';

// Error classification for retry logic
type ErrorType = 'network' | 'timeout' | 'auth' | 'rate_limit' | 'server' | 'unknown';

function classifyError(error: any, status?: number): ErrorType {
  if (status === 401 || status === 403) return 'auth';
  if (status === 429) return 'rate_limit';
  if (status && status >= 500) return 'server';
  if (error?.name === 'AbortError') return 'timeout';
  if (error?.message?.includes('fetch') || error?.message?.includes('network')) return 'network';
  return 'unknown';
}

function shouldRetry(errorType: ErrorType): boolean {
  // Don't retry auth errors or rate limits (they need different handling)
  return errorType === 'network' || errorType === 'timeout' || errorType === 'server';
}

function logRequest(method: string, data: any) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Perplexity] ${method}:`, { model: data.model, temperature: data.temperature });
  }
}

function logResponse(method: string, status: number, duration: number) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Perplexity] ${method} completed in ${duration}ms with status ${status}`);
  }
}

function logError(method: string, errorType: ErrorType, message: string) {
  console.warn(`[Perplexity] ${method} error [${errorType}]: ${message}`);
}

function delay(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }

function buildMessages(prompt: string, personaHook?: string) {
  const systemSections = [REPORT_STRUCTURES.trim()];
  if (personaHook) {
    systemSections.push(`Persona Hook: ${personaHook}`);
  }
  systemSections.push('No internal monologue. Output VOICE only.');
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
  const apiKey = process.env.PERPLEXITY_API_KEY || process.env.PERPLEXITY;
  if (!apiKey) {
    throw new Error('Error: PERPLEXITY_API_KEY is not configured.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const startTime = Date.now();

  try {
    const requestData = {
      model: opts.model || DEFAULT_MODEL,
      messages: buildMessages(prompt, opts.personaHook),
      temperature: opts.temperature ?? DEFAULT_TEMPERATURE,
      top_p: opts.topP ?? DEFAULT_TOP_P,
      stream: false
    };

    logRequest('POST', requestData);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData),
      signal: controller.signal
    });

    const duration = Date.now() - startTime;
    logResponse('POST', response.status, duration);

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
      const errorType = classifyError(null, response.status);
      logError('POST', errorType, errorMessage);
      throw new Error(errorMessage);
    }

    const payload = await response.json();

    // Validate response structure
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid response: expected object');
    }
    if (!Array.isArray(payload.choices) || payload.choices.length === 0) {
      throw new Error('Invalid response: no choices in response');
    }
    if (!payload.choices[0]?.message) {
      throw new Error('Invalid response: no message in first choice');
    }

    return payload;
  } catch (error: any) {
    clearTimeout(timeoutId);
    const errorType = classifyError(error, error?.status);
    logError('POST', errorType, error?.message || String(error));
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function *generateStream(prompt: string, opts: StreamOptions = {}): AsyncGenerator<LLMChunk> {
  let lastError: any = null;
  let lastErrorType: ErrorType = 'unknown';

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const payload = await requestCompletion(prompt, opts);
      const choice = payload?.choices?.[0];
      const text = extractText(choice);

      if (text) {
        yield { delta: text };
        return;
      } else {
        // Empty response is retriable
        lastError = new Error('Empty response from Perplexity API');
        lastErrorType = 'unknown';
        const backoffTime = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        if (attempt < MAX_RETRIES - 1) {
          await delay(backoffTime);
          continue;
        }
      }
    } catch (error: any) {
      lastError = error;
      lastErrorType = classifyError(error);

      // Don't retry auth or rate limit errors
      if (!shouldRetry(lastErrorType)) {
        logError('generateStream', lastErrorType, error?.message || String(error));
        yield { delta: '', error: `Error: ${error?.message || 'API request failed'}` };
        return;
      }

      if (attempt < MAX_RETRIES - 1) {
        const backoffTime = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        logRequest('generateStream', { attempt: attempt + 1, backoffTime, errorType: lastErrorType });
        await delay(backoffTime);
      }
    }
  }

  const errorMessage = lastError?.message || 'An unknown error occurred after multiple retries.';
  yield { delta: '', error: `Error: API call failed after ${MAX_RETRIES} attempts [${lastErrorType}]. Last error: ${errorMessage}` };
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
