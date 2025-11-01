import { ValidationPoint } from "./types";

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
      // Skip very short paragraphs that might be just formatting
      if (para.length < 20) return;
      
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
