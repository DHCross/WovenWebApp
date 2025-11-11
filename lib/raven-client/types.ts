import type { Dispatch, SetStateAction } from "react";
import type { ClimateData } from "@/lib/climate-renderer";
import type { Intent } from "@/lib/raven/intent";
import type { SSTProbe } from "@/lib/raven/sst";
import type { ValidationPoint } from "@/lib/validation/types";

export type RavenDraftResponse = {
  ok?: boolean;
  intent?: Intent;
  draft?: Record<string, any> | null;
  prov?: Record<string, any> | null;
  climate?: string | ClimateData | null;
  sessionId?: string;
  probe?: SSTProbe | null;
  guard?: boolean;
  guidance?: string;
  error?: string;
  details?: any;
  validation?: {
    mode: "resonance" | "none";
    allowFallback?: boolean;
  } | null;
};

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
  rawText?: string;
  validationPoints?: ValidationPoint[];
  validationComplete?: boolean;
  validationMode?: 'resonance' | 'none';
  metadata?: {
    onboardingActions?: {
      startReading: () => void;
      upload: () => void;
      dialogue: () => void;
    };
  };
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

export type RavenSessionExport = {
  sessionId?: string;
  scores?: any;
  log?: any;
  suggestions?: any[];
};

export type SessionMode = "idle" | "exploration" | "report";

export type SessionShiftOptions = {
  message?: string;
  hook?: string;
  climate?: string;
};

export type SetMessages = Dispatch<SetStateAction<Message[]>>;

export type SetSessionMode = Dispatch<SetStateAction<SessionMode>>;
