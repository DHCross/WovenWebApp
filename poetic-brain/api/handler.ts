// Optional REST/serverless wrapper for Poetic Brain
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateSection, processMirrorDirective } from '../src/index';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { sectionType, inputPayload } = req.body;
  
  // Detect Mirror Directive JSON format
  if (inputPayload && inputPayload._format === 'mirror_directive_json') {
    // Process Mirror Directive JSON
    const result = processMirrorDirective(inputPayload);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to process Mirror Directive JSON'
      });
    }
    
    // Return populated narrative sections
    return res.status(200).json({
      success: true,
      narrative_sections: result.narrative_sections,
      intimacy_tier: result.intimacy_tier,
      report_kind: result.report_kind,
      _format: 'mirror_directive_json',
      _version: inputPayload._version || '1.0',
    });
  }
  
  // Fallback to legacy format (old generateSection behavior)
  const result = generateSection(sectionType, inputPayload);
  res.status(200).json({ result });
}
