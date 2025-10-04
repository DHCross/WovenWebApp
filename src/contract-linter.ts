/* Contract Linter - Prevents Schema Violations Before Reaching Poetic Brain */

import { ReportMode, validateContract, enforceNatalOnlyMode } from './schema-rule-patch';
import { lintPayload as lintLexical, LexicalLintResult } from './validation/lexical-guard';

export interface LintResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  fixes_applied: string[];
  severity: 'clean' | 'warnings' | 'errors';
  lexical?: LexicalLintResult;
}

export class ContractLinter {
  private static BALANCE_FIELDS = [
    'indices',
    'days',
    'uncanny',
    'transitsByDate',
    'filtered_aspects',
    'seismograph',
    'balance_meter',
    'time_series',
    'integration_factors',
    'vector_integrity'
  ];

  /**
   * Comprehensive linting of payload before sending to Poetic Brain
   */
  public static lint(payload: any): LintResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const fixesApplied: string[] = [];

    // Basic structure validation
    if (!payload || typeof payload !== 'object') {
      return {
        valid: false,
        errors: ['Payload must be a non-null object'],
        warnings: [],
        fixes_applied: [],
        severity: 'errors'
      };
    }

    // Mode validation
    if (!payload.mode) {
      errors.push('Missing required "mode" field');
    } else {
      const validModes = ['natal-only', 'balance', 'relational-balance', 'relational-mirror'];
      if (!validModes.includes(payload.mode)) {
        errors.push(`Invalid mode "${payload.mode}". Must be one of: ${validModes.join(', ')}`);
      }
    }

    // Natal-only specific linting
    if (payload.mode === 'natal-only') {
      this.lintNatalOnlyMode(payload, errors, warnings, fixesApplied);
    }

    // Balance mode specific linting
    if (['balance', 'relational-balance'].includes(payload.mode)) {
      this.lintBalanceMode(payload, errors, warnings, fixesApplied);
    }

    // Frontstage policy validation
    this.lintFrontstagePolicy(payload, errors, warnings, fixesApplied);

    // Contract version validation
    this.lintContractVersion(payload, warnings, fixesApplied);

    // Lexical integrity check (epistemic rigor)
    const lexicalResult = lintLexical(payload);
    if (!lexicalResult.valid) {
      lexicalResult.violations.forEach(violation => {
        if (violation.severity === 'error') {
          errors.push(`🔤 LEXICAL BLEED: ${violation.message}`);
        } else {
          warnings.push(`🔤 ${violation.message}`);
        }
      });
    }

    // Determine severity
    let severity: 'clean' | 'warnings' | 'errors' = 'clean';
    if (errors.length > 0) {
      severity = 'errors';
    } else if (warnings.length > 0) {
      severity = 'warnings';
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      fixes_applied: fixesApplied,
      severity,
      lexical: lexicalResult
    };
  }

  private static lintNatalOnlyMode(
    payload: any,
    errors: string[],
    warnings: string[],
    fixesApplied: string[]
  ): void {
    // Check for presence of balance fields
    const balanceFieldsPresent = this.BALANCE_FIELDS.filter(field =>
      payload[field] !== undefined && payload[field] !== null
    );

    if (balanceFieldsPresent.length > 0) {
      warnings.push(
        `⚠️  NATAL-ONLY VIOLATION: Found balance fields [${balanceFieldsPresent.join(', ')}] in natal-only mode. These will be stripped.`
      );
    }

    // Check frontstage policy compliance
    const policy = payload.frontstage_policy || {};
    if (policy.allow_symbolic_weather === true) {
      warnings.push(
        `⚠️  POLICY VIOLATION: "allow_symbolic_weather" must be false for natal-only mode`
      );
      // Auto-fix
      if (!payload.frontstage_policy) payload.frontstage_policy = {};
      payload.frontstage_policy.allow_symbolic_weather = false;
      fixesApplied.push('Set allow_symbolic_weather=false for natal-only mode');
    }

    // Ensure autogenerate is enabled
    if (policy.autogenerate === false) {
      warnings.push(
        `⚠️  POLICY VIOLATION: "autogenerate" should be true for natal-only mode`
      );
      payload.frontstage_policy.autogenerate = true;
      fixesApplied.push('Set autogenerate=true for natal-only mode');
    }

    // Check for indices with date ranges (major violation)
    if (payload.indices?.window) {
      errors.push(
        `🚨 CRITICAL: Natal-only mode cannot include time-window indices (found window: ${JSON.stringify(payload.indices.window)})`
      );
    }

    if (payload.indices?.days && Array.isArray(payload.indices.days) && payload.indices.days.length > 0) {
      errors.push(
        `🚨 CRITICAL: Natal-only mode cannot include daily indices (found ${payload.indices.days.length} daily entries)`
      );
    }
  }

  private static lintBalanceMode(
    payload: any,
    errors: string[],
    warnings: string[],
    fixesApplied: string[]
  ): void {
    // Require window/time range
    const hasWindow = !!(payload.window || payload.indices?.window);
    if (!hasWindow) {
      errors.push('🚨 BALANCE MODE: Requires a valid date window (window or indices.window)');
    }

    // Require location/timezone
    const hasLocation = !!(
      payload.location ||
      payload.context?.person_a?.coordinates ||
      payload.context?.person_a?.timezone
    );
    if (!hasLocation) {
      errors.push('🚨 BALANCE MODE: Requires location data (timezone & coordinates)');
    }

    // Check for daily indices
    const hasDailyIndices = !!(
      payload.indices?.days &&
      Array.isArray(payload.indices.days) &&
      payload.indices.days.length > 0
    );

    if (!hasDailyIndices) {
      warnings.push(
        '⚠️  BALANCE MODE: Missing daily indices - symbolic weather will be unavailable'
      );
    } else {
      // Validate indices structure
      const sampleDay = payload.indices.days[0];
      const hasRequiredFields = !!(
        typeof sampleDay.magnitude === 'number' ||
        typeof sampleDay.volatility === 'number' ||
        typeof sampleDay.sf_diff === 'number'
      );

      if (!hasRequiredFields) {
        warnings.push(
          '⚠️  BALANCE MODE: Daily indices missing required fields (magnitude, volatility, sf_diff)'
        );
      }
    }
  }

  private static lintFrontstagePolicy(
    payload: any,
    errors: string[],
    warnings: string[],
    fixesApplied: string[]
  ): void {
    if (!payload.frontstage_policy) {
      // Auto-fix: add default policy
      payload.frontstage_policy = {
        autogenerate: true,
        allow_symbolic_weather: payload.mode !== 'natal-only'
      };
      fixesApplied.push('Added default frontstage_policy');
    }

    // Validate frontstage directive if present
    if (payload.frontstage?.directive) {
      const directive = payload.frontstage.directive;

      if (directive.status && !['generate', 'skip'].includes(directive.status)) {
        errors.push(`Invalid frontstage directive status: "${directive.status}"`);
      }

      if (directive.include && Array.isArray(directive.include)) {
        const validIncludes = ['blueprint', 'symbolic_weather', 'stitched_reflection'];
        const invalidIncludes = directive.include.filter((item: string) => !validIncludes.includes(item));
        if (invalidIncludes.length > 0) {
          errors.push(`Invalid frontstage directive includes: [${invalidIncludes.join(', ')}]`);
        }
      }
    }
  }

  private static lintContractVersion(
    payload: any,
    warnings: string[],
    fixesApplied: string[]
  ): void {
    if (!payload.contract) {
      payload.contract = 'clear-mirror/1.3';
      fixesApplied.push('Added default contract version');
    } else if (!payload.contract.startsWith('clear-mirror/')) {
      warnings.push(`⚠️  Unexpected contract version: "${payload.contract}"`);
    }
  }

  /**
   * Apply automatic fixes and return cleaned payload
   */
  public static lintAndFix(payload: any): { payload: any; result: LintResult } {
    // Create a deep copy to avoid mutating original
    const cleanedPayload = JSON.parse(JSON.stringify(payload));

    // Run initial lint
    const lintResult = this.lint(cleanedPayload);

    // Apply contract enforcement (includes auto-fixes)
    const processedPayload = enforceNatalOnlyMode(cleanedPayload);

    // Run lint again after fixes
    const finalLint = this.lint(processedPayload);

    return {
      payload: processedPayload,
      result: finalLint
    };
  }

  /**
   * Generate human-readable lint report
   */
  public static generateReport(result: LintResult): string {
    const lines: string[] = [];

    lines.push(`📋 Contract Lint Report - Severity: ${result.severity.toUpperCase()}`);
    lines.push('='.repeat(50));

    if (result.errors.length > 0) {
      lines.push('\n🚨 ERRORS (Must Fix):');
      result.errors.forEach(error => lines.push(`  • ${error}`));
    }

    if (result.warnings.length > 0) {
      lines.push('\n⚠️  WARNINGS:');
      result.warnings.forEach(warning => lines.push(`  • ${warning}`));
    }

    if (result.fixes_applied.length > 0) {
      lines.push('\n✅ AUTO-FIXES APPLIED:');
      result.fixes_applied.forEach(fix => lines.push(`  • ${fix}`));
    }

    if (result.valid && result.warnings.length === 0) {
      lines.push('\n✨ CLEAN - Ready for Poetic Brain');
    } else if (result.valid) {
      lines.push('\n⚡ VALID WITH WARNINGS - Safe to proceed');
    } else {
      lines.push('\n❌ INVALID - Must resolve errors before sending to Poetic Brain');
    }

    return lines.join('\n');
  }
}

// Convenience function for quick linting
export function lintPayload(payload: any): LintResult {
  return ContractLinter.lint(payload);
}

// Convenience function for linting with auto-fixes
export function lintAndFixPayload(payload: any): { payload: any; result: LintResult } {
  return ContractLinter.lintAndFix(payload);
}