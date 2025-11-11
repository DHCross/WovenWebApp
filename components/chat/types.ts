import type { RelocationSummary } from '../../lib/relocation';
import type { Intent } from '../../lib/raven/intent';
import type { SSTProbe } from '../../lib/raven/sst';
import type { ValidationPoint, ValidationState } from '@/lib/validation/types';

export type MessageRole = "user" | "raven";

export interface Message {
  id: string;
  role: MessageRole;
  html: string;
  climate?: string;
  hook?: string;
  intent?: Intent;
  probe?: SSTProbe | null;
  prov?: Record<string, any> | null;
  pingFeedbackRecorded?: boolean;
  rawText?: string; // Store clean text for copying
  validationPoints?: ValidationPoint[];
  validationComplete?: boolean;
  metadata?: {
    onboardingActions?: {
      startReading: () => void;
      upload: () => void;
      dialogue: () => void;
    };
  };
}

export interface ReportContext {
  id: string;
  type: "mirror" | "balance";
  name: string;
  summary: string;
  content: string;
  relocation?: RelocationSummary;
}

export interface StoredMathBrainPayload {
  savedAt: string;
  from?: string;
  reportType?: string;
  mode?: string;
  includeTransits?: boolean;
  window?: {
    start?: string;
    end?: string;
    step?: string;
  } | null;
  subjects?: {
    personA?: {
      name?: string;
      timezone?: string;
      city?: string;
      state?: string;
    } | null;
    personB?: {
      name?: string;
      timezone?: string;
      city?: string;
      state?: string;
    } | null;
  } | null;
  payload: any;
}

export type ValidationMap = {
  [messageId: string]: ValidationPoint[];
};

export type SessionMode = 'idle' | 'exploration' | 'report';
