import { ValidationPoint } from "./types";

/**
 * Checks if a text is likely metadata, informational, or a system message.
 * These should NOT be tagged for resonance validation.
 */
function isMetadataOrContext(text: string): boolean {
  // Skip very short lines (likely metadata)
  if (text.length < 30) return true;
  
  // Skip common metadata patterns
  const metadataPatterns = [
    /^report logged/i,
    /^context added/i,
    /^stored for interpretation/i,
    /^upload/i,
    /^logging this as/i,
    /^i tried to open/i,
    /^could not|failed|error/i,
    /^re-export|drop it in/i,
    /^ask me to translate/i,
    /^when something feels ready/i,
    /^just tell me/i,
    /^source:/i,
  ];
  
  return metadataPatterns.some(pattern => pattern.test(text));
}

/**
 * Parses a Raven message to extract validation points based on symbolic drivers
 * and FIELD labels in the text.
 */
export function parseValidationPoints(
  message: string,
  existingPoints: ValidationPoint[] = []
): ValidationPoint[] {
  // This regex looks for patterns like "FIELD: Text about the field"
  const fieldRegex = /(?:^|\n)([A-Z][A-Z0-9_/ ]+):\s*([^\n]+)/g;
  
  const points: ValidationPoint[] = [];
  let match;
  
  // Reset the regex state
  fieldRegex.lastIndex = 0;
  
  // Find all FIELD: text patterns
  while ((match = fieldRegex.exec(message)) !== null) {
    const field = match[1].trim();
    const voice = match[2].trim();
    
    // Skip metadata/context messages
    if (isMetadataOrContext(voice)) {
      continue;
    }
    
    // Skip if we already have this point (by field + text)
    const existingPoint = existingPoints.find(
      (p) => p.field === field && p.voice === voice
    );
    
    if (existingPoint) {
      points.push(existingPoint);
    } else if (field && voice) {
      points.push({
        id: `vp_${Date.now()}_${points.length}`,
        field,
        voice,
      });
    }
  }
  
  // If no explicit fields found, try to split by paragraphs
  if (points.length === 0) {
    const paragraphs = message
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
    
    paragraphs.forEach((para, index) => {
      // Skip very short paragraphs that might be just formatting or metadata
      if (para.length < 50) return;
      
      // Skip metadata/context patterns
      if (isMetadataOrContext(para)) return;
      
      points.push({
        id: `para_${Date.now()}_${index}`,
        field: `Point ${index + 1}`,
        voice: para,
      });
    });
  }
  
  return points;
}

/**
 * Extracts the main content from a message by removing any FIELD labels
 * and their associated text.
 */
export function extractMainContent(message: string): string {
  // Remove FIELD: text patterns
  const withoutFields = message.replace(
    /(?:^|\n)([A-Z][A-Z0-9_/ ]+):\s*[^\n]+/g,
    ''
  );
  
  // Clean up any double newlines
  return withoutFields
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
