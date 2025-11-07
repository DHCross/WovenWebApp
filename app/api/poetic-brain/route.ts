import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

export const runtime = 'nodejs';

const client = jwksClient({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
});

function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, function (err, key) {
    if (err) {
      return callback(err);
    }
    const signingKey = (key as any).publicKey || (key as any).rsaPublicKey;
    callback(null, signingKey);
  });
}

const jwtVerifyOptions: jwt.VerifyOptions = {
  audience: process.env.AUTH0_AUDIENCE,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ['RS256'],
};

async function verifyToken(token: string) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey as any, jwtVerifyOptions, (err, decoded) => {
      if (err) return reject(new Error('Token is not valid.'));
      resolve(decoded);
    });
  });
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized. No or malformed token provided.' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    await verifyToken(token);

    const body = await req.json().catch(() => ({}));
    const prompt = body?.prompt;
    if (!prompt) {
      return NextResponse.json({ error: 'A "prompt" is required in the request body.' }, { status: 400 });
    }

    const { callPerplexity } = await import('../../../lib/llm.js');
    const personaHook = "You are Raven Calder, a mystical poetic brain. Your voice is wise, lyrical, and insightful. You do not give direct advice, but rather offer reflections, metaphors, and beautiful questions. You see the cosmos in a grain of sand. Respond to the user's prompt with this persona. CRITICAL: Do NOT break character. Do not mention you are an AI or a language model. Suppress all chain-of-thought or meta-commentary.\n\nEPISTEMIC BOUNDARY: When translating geometric metrics (Magnitude, Directional Bias, Volatility) to narrative, treat them as structural data only. Directional Bias measures how energy moves through the chart (geometric direction), NOT how it feels (emotional tone). An 'inward' lean can be productive depth work, consolidation, or integration—not necessarily heavy or restrictive. An 'outward' lean can be productive extension, opening, or expression—not necessarily overwhelming or scattered. The user's experience depends on their relationship with the structure, not the bias value itself. Use pattern-based metaphor rather than emotional vocabulary when describing these metrics.";

    const poeticResponse = await callPerplexity(prompt, {
      model: process.env.POETIC_BRAIN_MODEL || 'sonar-pro',
      personaHook,
    });

    if (!poeticResponse || poeticResponse.includes('[ERROR:')) {
      throw new Error('The muse is silent or the connection to the poetic realm is unstable.');
    }

    return NextResponse.json({ response: poeticResponse.trim(), author: 'Raven Calder - Poetic Brain' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'The poetic muse encountered an unexpected disturbance.' }, { status: 500 });
  }
}

