// Optional REST/serverless wrapper for Poetic Brain
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateSection } from '../src/index';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { sectionType, inputPayload } = req.body;
  const result = generateSection(sectionType, inputPayload);
  res.status(200).json({ result });
}
