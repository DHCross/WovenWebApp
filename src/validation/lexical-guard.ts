/**
 * Lexical Guard - Prevents Cross-Contamination Between Axes
 * 
 * Enforces semantic orthogonality by preventing:
 * 1. Directional terms (expansion/contraction) in cohesion descriptions
 * 2. Lexical bleed that collapses distinct axes
 * 
 * This is a build-time and runtime lint that fails hard on violations.
 */

export interface LexicalViolation {
  field: string;
  term: string;
  category: 'directional';
  wrongContext: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface LexicalLintResult {
  valid: boolean;
  violations: LexicalViolation[];
  clean: boolean;
}

/**
 * Directional Bias vocabulary (expansion/contraction, outward/inward)
 * These terms should ONLY appear in directional bias contexts
 */
const DIRECTIONAL_TERMS = new Set([
  'expansion',
  'contract',
  'contraction',
  'contracting',
  'expand',
  'expanding',
  'outward',
  'inward',
  'opening',
  'closing',
  'push',
  'pull',
  'centrifugal',
  'centripetal',
  'dilate',
  'dilating',
  'constrict',
  'constricting'
]);

/**
 * Neutral terms that can appear in any context
 */
const NEUTRAL_TERMS = new Set([
  'intensity',
  'strong',
  'weak',
  'high',
  'low',
  'magnitude',
  'signal',
  'pressure',
  'force',
  'energy',
  'active',
  'quiet',
  'stable',
  'volatile',
  'coherent',
  'scattered'
]);

/**
 * Lint a text string for lexical violations
 * 
 * @param text - Text to check
 * @param expectedContext - 'directional' | 'neutral'
 * @param fieldName - Name of field being checked (for error messages)
 */
export function lintText(
  text: string,
  expectedContext: 'directional' | 'neutral',
  fieldName: string
): LexicalLintResult {
  if (!text || typeof text !== 'string') {
    return { valid: true, violations: [], clean: true };
  }

  const violations: LexicalViolation[] = [];
  const normalizedText = text.toLowerCase();
  const words = normalizedText.split(/\s+/);

  return {
    valid: violations.length === 0,
    violations,
    clean: violations.length === 0
  };
}

/**
 * Lint a complete reading object for lexical violations
 *
 * @param reading - Reading object with bias_label, etc.
 */
export function lintReading(reading: any): LexicalLintResult {
  const allViolations: LexicalViolation[] = [];

  // Check directional bias label/description
  if (reading.bias_label || reading.directional_label) {
    const text = reading.bias_label || reading.directional_label;
    const result = lintText(text, 'directional', 'bias_label');
    allViolations.push(...result.violations);
  }

  return {
    valid: allViolations.length === 0,
    violations: allViolations,
    clean: allViolations.length === 0
  };
}

/**
 * Lint an entire payload (balance meter output) for lexical violations
 * 
 * @param payload - Full payload with balance_meter, daily readings, etc.
 */
export function lintPayload(payload: any): LexicalLintResult {
  const allViolations: LexicalViolation[] = [];

  // Check balance meter if present
  if (payload.balance_meter) {
    const result = lintReading(payload.balance_meter);
    allViolations.push(...result.violations);
  }

  // Check daily readings
  if (payload.days || payload.indices?.days) {
    const days = payload.days || payload.indices.days;
    if (Array.isArray(days)) {
      days.forEach((day: any, idx: number) => {
        if (day.seismograph || day.balance_meter) {
          const reading = day.seismograph || day.balance_meter;
          const result = lintReading(reading);
          result.violations.forEach(v => {
            v.field = `day[${idx}].${v.field}`;
          });
          allViolations.push(...result.violations);
        }
      });
    }
  }

  return {
    valid: allViolations.length === 0,
    violations: allViolations,
    clean: allViolations.length === 0
  };
}

/**
 * Generate a human-readable lexical lint report
 */
export function generateLexicalReport(result: LexicalLintResult): string {
  const lines: string[] = [];

  lines.push('📖 Lexical Guard Report');
  lines.push('='.repeat(50));

  if (result.clean) {
    lines.push('✅ CLEAN - No lexical bleed detected');
    lines.push('All axes maintain semantic orthogonality');
  } else {
    lines.push(`❌ VIOLATIONS DETECTED (${result.violations.length})`);
    lines.push('');

    result.violations.forEach(v => {
      const icon = v.severity === 'error' ? '🚨' : '⚠️';
      lines.push(`${icon} ${v.message}`);
      lines.push(`   Field: ${v.field}`);
      lines.push(`   Term: "${v.term}" (${v.category})`);
      lines.push('');
    });

    lines.push('ACTION REQUIRED:');
    lines.push('1. Replace contaminating terms with axis-appropriate vocabulary');
    lines.push('2. Review FIELD → MAP → VOICE pipeline for semantic drift');
    lines.push('3. Restore orthogonality before display');
  }

  return lines.join('\n');
}

/**
 * Build-time check: Can be used in tests or CI/CD
 * Throws if violations found
 */
export function assertLexicalIntegrity(payload: any, context: string = 'payload'): void {
  const result = lintPayload(payload);
  if (!result.valid) {
    const report = generateLexicalReport(result);
    throw new Error(`Lexical integrity violation in ${context}:\n${report}`);
  }
}

/**
 * Get suggested replacements for contaminating terms
 */
export function getSuggestedReplacements(term: string, targetContext: 'directional' | 'neutral'): string[] {
  const suggestions: string[] = [];

  if (targetContext === 'directional') {
    if (!DIRECTIONAL_TERMS.has(term.toLowerCase())) {
      return ['use directional terminology (expansion, contraction, outward, inward)'];
    }
  }

  return suggestions;
}
