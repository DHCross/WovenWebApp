import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { REPORT_STRUCTURES } from './prompts';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// LLM provider abstraction.
export interface LLMChunk { delta: string; error?: string; }
export interface StreamOptions { model?: string; personaHook?: string; }

// Configuration
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const SAFETY_SETTINGS = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

function delay(ms:number){ return new Promise(r=>setTimeout(r,ms)); }

export async function *generateStream(prompt: string, opts: StreamOptions = {}): AsyncGenerator<LLMChunk> {
  if (!process.env.GEMINI_API_KEY) {
    yield { delta: "", error: "Error: GEMINI_API_KEY is not configured." };
    return;
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash", // Using 1.5 Flash as a robust default
    systemInstruction: REPORT_STRUCTURES,
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
        temperature: 0.7,
        topP: 1,
        topK: 1,
        maxOutputTokens: 4096, // Increased for potentially longer reports
    }
  });

  let lastError: any = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const stream = await model.generateContentStream(prompt);
      for await (const chunk of stream.stream) {
        // Check for empty chunks or finish reasons that indicate a block
        if (chunk.candidates && chunk.candidates.length > 0) {
            if(chunk.candidates[0].finishReason && chunk.candidates[0].finishReason !== 'STOP') {
                yield { delta: "", error: `API call finished with reason: ${chunk.candidates[0].finishReason}` };
                return;
            }
        }

        const delta = chunk.text();
        if (delta) {
          yield { delta };
        }
      }
      return; // Success, exit the generator
    } catch (error: any) {
      lastError = error;
      // Implement exponential backoff
      const backoffTime = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
      console.warn(`Attempt ${attempt + 1} failed. Retrying in ${backoffTime}ms...`, error.message);
      await delay(backoffTime);
    }
  }

  // If all retries fail, yield the final error
  const errorMessage = lastError?.message || "An unknown error occurred after multiple retries.";
  yield { delta: "", error: `Error: API call failed after ${MAX_RETRIES} attempts. Last error: ${errorMessage}` };
}

function normalizePrompt(p: string){ return p.replace(/\s+/g,' ').trim(); }

// Convenience helper: generate a single accumulated text response (uses the stream generator)
export async function generateText(prompt: string, opts: StreamOptions = {}): Promise<string> {
  let out = '';
  let lastError = '';
  for await (const chunk of generateStream(prompt, opts)) {
    if (chunk.error) {
        lastError = chunk.error;
        console.error(chunk.error);
        // Continue processing to accumulate any partial delta content
    }
    out += String(chunk.delta || '');
  }

  if (lastError) {
      // Decide how to propagate the error. Here, we'll append it to the output for visibility.
      return normalizePrompt(out) + `\n\n[ERROR: ${lastError}]`;
  }

  return normalizePrompt(out);
}

export async function callGemini(prompt: string, opts: StreamOptions = {}): Promise<string> {
  return generateText(prompt, opts);
}
