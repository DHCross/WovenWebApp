import { useState, useCallback, useMemo, useRef } from 'react';
import type { SessionMode, ReportContext, StoredMathBrainPayload, RavenSessionExport } from '../types';
import { pingTracker } from '../../../lib/ping-tracker';

interface useSessionManagerProps {
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
  createInitialMessage: () => any;
  pushRavenNarrative: (text: string, options?: { hook?: string; climate?: string }) => void;
}

export function useSessionManager({ setMessages, createInitialMessage, pushRavenNarrative }: useSessionManagerProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [reportContexts, setReportContexts] = useState<ReportContext[]>([]);
  const [uploadType, setUploadType] = useState<"mirror" | "balance" | null>(null);
  const [relocation, setRelocation] = useState<any | null>(null);
  const [storedPayload, setStoredPayload] = useState<StoredMathBrainPayload | null>(null);
  const [hasSavedPayloadSnapshot, setHasSavedPayloadSnapshot] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessionStarted, setSessionStarted] = useState<boolean>(false);
  const [sessionMode, setSessionMode] = useState<SessionMode>('idle');
  const [isWrapUpOpen, setIsWrapUpOpen] = useState(false);
  const [wrapUpLoading, setWrapUpLoading] = useState(false);
  const [showWrapUpPanel, setShowWrapUpPanel] = useState(false);
  const [wrapUpExport, setWrapUpExport] = useState<RavenSessionExport | null>(null);
  const [showClearMirrorExport, setShowClearMirrorExport] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const sessionAnnouncementRef = useRef<string | null>(null);
  const sessionAnnouncementHookRef = useRef<string | undefined>(undefined);
  const sessionAnnouncementClimateRef = useRef<string | undefined>(undefined);
  const previousModeRef = useRef<SessionMode>('idle');

  const shiftSessionMode = useCallback(
    (nextMode: SessionMode, options: any = {}) => {
      if (nextMode === 'idle') {
        setSessionMode('idle');
        setSessionStarted(false);
        return;
      }

      if (nextMode === sessionMode) {
        setSessionStarted(true);
        return;
      }

      sessionAnnouncementRef.current = options.message ?? null;
      sessionAnnouncementHookRef.current = options.hook;
      sessionAnnouncementClimateRef.current = options.climate;

      setSessionStarted(true);
      setSessionMode((prev) => (prev === nextMode ? prev : nextMode));
    },
    [sessionMode],
  );

  const performSessionReset = useCallback(() => {
    if (abortRef.current) {
      try {
        abortRef.current.abort();
      } catch {
        // ignore
      }
    }
    shiftSessionMode('idle');
    sessionAnnouncementRef.current = null;
    sessionAnnouncementHookRef.current = undefined;
    sessionAnnouncementClimateRef.current = undefined;
    previousModeRef.current = 'idle';
    setWrapUpLoading(false);
    setShowWrapUpPanel(false);
    setWrapUpExport(null);
    setMessages([createInitialMessage()]);
    setReportContexts([]);
    setRelocation(null);
    setSessionId(null);
    setStoredPayload(null);
    setStatusMessage("Session cleared. Begin typing whenever you're ready.");
    pingTracker.sealSession(sessionId ?? undefined);
  }, [sessionId, shiftSessionMode, setMessages, createInitialMessage]);

  const closeServerSession = useCallback(async (sealedSessionId?: string | null) => {
    if (!sealedSessionId) return;
    try {
      await fetch("/api/raven", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close", sessionId: sealedSessionId }),
      });
    } catch (error) {
      console.warn("Failed to close session on server:", error);
    }
  }, []);

  const handleStartWrapUp = useCallback(() => {
    setIsWrapUpOpen(true);
  }, []);

  const handleDismissWrapUp = useCallback(() => {
    setIsWrapUpOpen(false);
  }, []);

  const handleConfirmWrapUp = useCallback(async () => {
    setIsWrapUpOpen(false);

    if (!sessionStarted) {
      performSessionReset();
      return;
    }

    setWrapUpLoading(true);
    try {
      let exportPayload: RavenSessionExport | null = null;
      if (sessionId) {
        const response = await fetch("/api/raven", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "export", sessionId }),
        });

        if (response.ok) {
          exportPayload = await response.json();
        } else if (response.status !== 404) {
          throw new Error(`Export failed (${response.status})`);
        }
      }

      setWrapUpExport(exportPayload);
      setShowWrapUpPanel(true);
    } catch (error) {
      console.error("Failed to prepare wrap-up:", error);
      setStatusMessage("Wrap-up export failed, clearing session instead.");
      performSessionReset();
    } finally {
      setWrapUpLoading(false);
    }
  }, [performSessionReset, sessionId, sessionStarted, setStatusMessage]);

  const sessionModeDescriptor = useMemo(() => {
    switch (sessionMode) {
      case 'exploration':
        return {
          label: 'Exploratory Dialogue',
          description:
            'Free-form voice. No report is attached, so feel free to orient, vent, or ask for guidance. Upload a Math Brain export to shift into a structured reading.',
          badgeClass: 'border-emerald-400/40 bg-emerald-500/20 text-emerald-200',
        };
      case 'report':
        return {
          label: 'Structured Reading',
          description:
            'A report or upload triggered Raven’s VOICE layer. Resonance pings are tracked until you end the session or clear the context.',
          badgeClass: 'border-indigo-400/40 bg-indigo-500/20 text-indigo-200',
        };
      default:
        return {
          label: 'Session Idle',
          description: 'Begin typing below to start speaking with Raven.',
          badgeClass: 'border-slate-700/50 bg-slate-800/60 text-slate-300',
        };
    }
  }, [sessionMode]);

  return {
    sessionId,
    setSessionId,
    reportContexts,
    setReportContexts,
    uploadType,
    setUploadType,
    relocation,
    setRelocation,
    storedPayload,
    setStoredPayload,
    hasSavedPayloadSnapshot,
    setHasSavedPayloadSnapshot,
    statusMessage,
    setStatusMessage,
    errorMessage,
    setErrorMessage,
    sessionStarted,
    setSessionStarted,
    sessionMode,
    setSessionMode,
    isWrapUpOpen,
    setIsWrapUpOpen,
    wrapUpLoading,
    setWrapUpLoading,
    showWrapUpPanel,
    setShowWrapUpPanel,
    wrapUpExport,
    setWrapUpExport,
    showClearMirrorExport,
    setShowClearMirrorExport,
    abortRef,
    shiftSessionMode,
    performSessionReset,
    closeServerSession,
    handleStartWrapUp,
    handleDismissWrapUp,
    handleConfirmWrapUp,
    sessionModeDescriptor,
  };
}
