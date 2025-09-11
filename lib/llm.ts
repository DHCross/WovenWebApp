import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { REPORT_STRUCTURES } from './prompts';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// LLM provider abstraction.
export interface LLMChunk { delta: string; }
export interface StreamOptions { model?: string; personaHook?: string; }

export async function *generateStream(prompt: string, opts: StreamOptions = {}): AsyncGenerator<LLMChunk> {
  if (!process.env.GEMINI_API_KEY) {
    yield { delta: "Error: GEMINI_API_KEY is not configured." };
    return;
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: REPORT_STRUCTURES,
    // This is a safety setting, see https://ai.google.dev/gemini-api/docs/safety-settings
    safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ],
    generationConfig: {
        temperature: 0.7,
        topP: 1,
        topK: 1,
        maxOutputTokens: 2048,
    }
  });

  const stream = await model.generateContentStream(prompt);

  for await (const chunk of stream.stream) {
    const delta = chunk.text();
    if (delta) {
      yield { delta };
    }
  }
}

function normalizePrompt(p: string){ return p.replace(/\s+/g,' ').trim(); }
function delay(ms:number){ return new Promise(r=>setTimeout(r,ms)); }
