import type { ValidationOutcome } from './validators';

export interface ValidationEntry {
  filename: string;
  raw: string;
  size: number;
  lastModified: string;
  outcome: ValidationOutcome;
}
