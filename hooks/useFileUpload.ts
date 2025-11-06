import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { RelocationSummary } from "@/lib/relocation";
import {
  parseReportContent,
  type ParsedReportContent,
  type ReportContext,
  type ReportContextType,
} from "@/lib/report-parsing";
import type {
  SessionMode,
  SessionShiftOptions,
  StoredMathBrainPayload,
} from "@/lib/raven-client/types";

const MB_LAST_PAYLOAD_KEY = "mb.lastPayload";
const MB_LAST_PAYLOAD_ACK_KEY = "mb.lastPayloadAck";

const MAX_PDF_SIZE = 50 * 1024 * 1024;
const MAX_TEXT_SIZE = 10 * 1024 * 1024;

export interface UseFileUploadArgs {
  reportContexts: ReportContext[];
  setReportContexts: Dispatch<SetStateAction<ReportContext[]>>;
  setRelocation: Dispatch<SetStateAction<RelocationSummary | null>>;
  analyzeReportContext: (
    context: ReportContext,
    contextsForPayload?: ReportContext[],
  ) => Promise<void>;
  typing: boolean;
  setStatusMessage: Dispatch<SetStateAction<string | null>>;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
  shiftSessionMode: (mode: SessionMode, options?: SessionShiftOptions) => void;
}

export interface UseFileUploadResult {
  fileInputRef: MutableRefObject<HTMLInputElement | null>;
  storedPayload: StoredMathBrainPayload | null;
  hasSavedPayloadSnapshot: boolean;
  storedPayloadSummary: string;
  handleUploadButton: (type: ReportContextType) => void;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  recoverLastStoredPayload: () => void;
  dismissStoredPayload: (record?: StoredMathBrainPayload | null) => void;
  applyStoredPayload: (record: StoredMathBrainPayload) => Promise<void>;
  clearStoredPayload: () => void;
}

const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(String(event.target?.result ?? ""));
    reader.onerror = () => reject(new Error("File read failure"));
    reader.readAsText(file);
  });

export function useFileUpload({
  reportContexts,
  setReportContexts,
  setRelocation,
  analyzeReportContext,
  typing,
  setStatusMessage,
  setErrorMessage,
  shiftSessionMode,
}: UseFileUploadArgs): UseFileUploadResult {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadTypeRef = useRef<ReportContextType | null>(null);
  const [storedPayload, setStoredPayload] = useState<StoredMathBrainPayload | null>(null);
  const [hasSavedPayloadSnapshot, setHasSavedPayloadSnapshot] = useState<boolean>(false);

  const acknowledgeStoredPayload = useCallback((timestamp?: string) => {
    if (typeof window === "undefined") return;
    try {
      const token =
        typeof timestamp === "string" && timestamp
          ? timestamp
          : new Date().toISOString();
      window.localStorage.setItem(MB_LAST_PAYLOAD_ACK_KEY, token);
    } catch {
      // ignore storage quota failures
    }
  }, []);

  const dismissStoredPayload = useCallback(
    (record?: StoredMathBrainPayload | null) => {
      acknowledgeStoredPayload(record?.savedAt);
      setStoredPayload(null);
    },
    [acknowledgeStoredPayload],
  );

  const clearStoredPayload = useCallback(() => {
    setStoredPayload(null);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(MB_LAST_PAYLOAD_KEY);
      if (!raw) {
        setHasSavedPayloadSnapshot(false);
        return;
      }
      const parsed = JSON.parse(raw) as StoredMathBrainPayload | null;
      if (!parsed || !parsed.payload) {
        setHasSavedPayloadSnapshot(false);
        return;
      }
      const savedAt =
        typeof parsed.savedAt === "string" && parsed.savedAt
          ? parsed.savedAt
          : new Date().toISOString();
      setHasSavedPayloadSnapshot(true);

      const ack = window.localStorage.getItem(MB_LAST_PAYLOAD_ACK_KEY);
      if (ack && ack === savedAt) return;

      setStoredPayload({ ...parsed, savedAt });
    } catch {
      setHasSavedPayloadSnapshot(false);
    }
  }, []);

  useEffect(() => {
    if (reportContexts.length > 0 && storedPayload) {
      setStoredPayload(null);
    }
  }, [reportContexts, storedPayload]);

  const storedPayloadSummary = useMemo(() => {
    if (!storedPayload) return "";
    const parts: string[] = [];
    const person = storedPayload.subjects?.personA?.name?.trim();
    if (person) parts.push(person);
    if (storedPayload.includeTransits) parts.push("Transits on");
    const windowStart = storedPayload.window?.start;
    const windowEnd = storedPayload.window?.end;
    if (windowStart && windowEnd) {
      parts.push(`${windowStart} → ${windowEnd}`);
    } else if (windowStart) {
      parts.push(`Starting ${windowStart}`);
    } else if (windowEnd) {
      parts.push(`Ending ${windowEnd}`);
    }
    return parts.join(" • ");
  }, [storedPayload]);

  const handleUploadButton = useCallback((type: ReportContextType) => {
    uploadTypeRef.current = type;
    fileInputRef.current?.click();
  }, []);

  const extractPdfText = useCallback(async (file: File): Promise<string> => {
    setStatusMessage("Extracting PDF text...");
    const pdfjsLib = await import("pdfjs-dist");
    (pdfjsLib as any).GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i += 1) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => ("str" in item ? (item as any).str : ""))
        .join(" ");
      fullText += `${pageText}\n\n`;
    }
    return fullText.trim();
  }, [setStatusMessage]);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");
      const maxSize = isPdf ? MAX_PDF_SIZE : MAX_TEXT_SIZE;
      if (file.size > maxSize) {
        const sizeInMB = (maxSize / (1024 * 1024)).toFixed(0);
        setErrorMessage(`File too large. Max size: ${sizeInMB}MB. Please upload a smaller file.`);
        event.target.value = "";
        return;
      }

      let rawContent = "";
      try {
        if (isPdf) {
          rawContent = await extractPdfText(file);
        } else {
          setStatusMessage("Reading file...");
          rawContent = await readFileAsText(file);
        }
      } catch (error) {
        console.error("File read error:", error);
        setErrorMessage(isPdf ? "Failed to extract text from that PDF." : "Failed to read that file.");
        event.target.value = "";
        return;
      }

      if (!rawContent.trim()) {
        setErrorMessage("That file looked empty.");
        event.target.value = "";
        return;
      }

      let parsed: ParsedReportContent;
      try {
        parsed = parseReportContent(rawContent, {
          uploadType: uploadTypeRef.current,
          fileName: file.name,
        });
      } catch (error) {
        console.error("Report parse error:", error);
        setErrorMessage("Could not parse that upload.");
        event.target.value = "";
        return;
      }

      const nextContexts = [
        ...reportContexts.filter((ctx) => ctx.id !== parsed.context.id),
        parsed.context,
      ];

      setReportContexts(nextContexts);
      setRelocation(parsed.relocation ?? null);
      setStatusMessage(parsed.isMirror ? "Mirror context loaded." : "Report context added.");

      try {
        await analyzeReportContext(parsed.context, nextContexts);
      } catch (error) {
        console.error("Analysis error after upload:", error);
        setErrorMessage("Report added, but analysis failed. Try again.");
      } finally {
        if (event.target) {
          event.target.value = "";
        }
        uploadTypeRef.current = null;
      }
    },
    [
      analyzeReportContext,
      parseReportContent,
      reportContexts,
      setErrorMessage,
      setRelocation,
      setReportContexts,
      setStatusMessage,
      extractPdfText,
    ],
  );

  const recoverLastStoredPayload = useCallback(() => {
    if (storedPayload) {
      setStatusMessage("Math Brain export already queued.");
      return;
    }
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(MB_LAST_PAYLOAD_KEY);
      if (!raw) {
        setHasSavedPayloadSnapshot(false);
        setStatusMessage("No saved Math Brain export found.");
        return;
      }

      const parsed = JSON.parse(raw) as StoredMathBrainPayload | null;
      if (!parsed || !parsed.payload) {
        setHasSavedPayloadSnapshot(false);
        setStatusMessage("No saved Math Brain export found.");
        return;
      }

      const savedAt =
        typeof parsed.savedAt === "string" && parsed.savedAt
          ? parsed.savedAt
          : new Date().toISOString();
      setHasSavedPayloadSnapshot(true);

      const ack = window.localStorage.getItem(MB_LAST_PAYLOAD_ACK_KEY);
      if (ack && ack === savedAt) return;

      setStoredPayload({ ...parsed, savedAt });
      setStatusMessage("Last Math Brain export is ready to load.");
    } catch (error) {
      console.error("Failed to recover stored payload:", error);
      setErrorMessage("Could not retrieve the saved Math Brain export.");
    }
  }, [setErrorMessage, setStatusMessage, storedPayload]);

  const applyStoredPayload = useCallback(
    async (record: StoredMathBrainPayload) => {
      if (!record?.payload) {
        dismissStoredPayload(record);
        return;
      }
      if (typing) {
        setStatusMessage("Hold on—analysis already in progress.");
        return;
      }

      try {
        let rawContent: string;
        if (typeof record.payload === "string") {
          rawContent = record.payload;
        } else {
          try {
            rawContent = JSON.stringify(record.payload);
          } catch {
            rawContent = String(record.payload);
          }
        }

        const parsed = parseReportContent(rawContent, {
          uploadType:
            record.reportType === "mirror"
              ? "mirror"
              : record.reportType === "balance"
                ? "balance"
                : null,
          sourceLabel: record.from || record.reportType || undefined,
          windowLabel:
            record.window?.start && record.window?.end
              ? `Window ${record.window.start} → ${record.window.end}`
              : record.window?.start
                ? `Window starting ${record.window.start}`
                : record.window?.end
                  ? `Window ending ${record.window.end}`
                  : null,
        });

        const nextContexts = [
          ...reportContexts.filter((ctx) => ctx.id !== parsed.context.id),
          parsed.context,
        ];

        const reportLabel = parsed.context.name?.trim()
          ? `“${parsed.context.name.trim()}”`
          : "This report";

        shiftSessionMode("report", {
          message: `Structured reading resumed from Math Brain. ${reportLabel} is ready for interpretation.`,
          hook: "Session · Structured Reading",
          climate: "VOICE · Report Interpretation",
        });

        setReportContexts(nextContexts);
        setRelocation(parsed.relocation ?? null);

        acknowledgeStoredPayload(record.savedAt);
        setStoredPayload(null);
        setStatusMessage("Math Brain payload loaded.");

        await analyzeReportContext(parsed.context, nextContexts);
      } catch (error) {
        console.error("Failed to apply stored payload:", error);
        setStatusMessage("Could not load the stored Math Brain report. Upload it manually.");
        dismissStoredPayload(record);
      }
    },
    [
      acknowledgeStoredPayload,
      analyzeReportContext,
      dismissStoredPayload,
      reportContexts,
      setRelocation,
      setReportContexts,
      setStatusMessage,
      shiftSessionMode,
      typing,
    ],
  );

  return {
    fileInputRef,
    storedPayload,
    hasSavedPayloadSnapshot,
    storedPayloadSummary,
    handleUploadButton,
    handleFileChange,
    recoverLastStoredPayload,
    dismissStoredPayload,
    applyStoredPayload,
    clearStoredPayload,
  };
}

export default useFileUpload;
