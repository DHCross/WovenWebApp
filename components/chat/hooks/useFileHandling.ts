import { useCallback, useRef } from 'react';
import type { ReportContext } from '../types';
import { parseReportContent } from '../../../lib/chatUtils';

interface useFileHandlingProps {
  setReportContexts: React.Dispatch<React.SetStateAction<ReportContext[]>>;
  setRelocation: React.Dispatch<React.SetStateAction<any | null>>;
  setUploadType: React.Dispatch<React.SetStateAction<"mirror" | "balance" | null>>;
  setStatusMessage: React.Dispatch<React.SetStateAction<string | null>>;
  setErrorMessage: React.Dispatch<React.SetStateAction<string | null>>;
  analyzeReportContext: (reportContext: ReportContext, contextsForPayload?: ReportContext[]) => Promise<void>;
  reportContexts: ReportContext[];
  uploadType: "mirror" | "balance" | null;
}

export function useFileHandling({
  setReportContexts,
  setRelocation,
  setUploadType,
  setStatusMessage,
  setErrorMessage,
  analyzeReportContext,
  reportContexts,
  uploadType,
}: useFileHandlingProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleUploadButton = useCallback((type: "mirror" | "balance") => {
    setUploadType(type);
    fileInputRef.current?.click();
  }, [setUploadType]);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const MAX_PDF_SIZE = 50 * 1024 * 1024;
      const MAX_TEXT_SIZE = 10 * 1024 * 1024;
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const maxSize = isPdf ? MAX_PDF_SIZE : MAX_TEXT_SIZE;

      if (file.size > maxSize) {
        const sizeInMB = (maxSize / (1024 * 1024)).toFixed(0);
        setErrorMessage(`File too large. Max size: ${sizeInMB}MB. Please upload a smaller file.`);
        if (event.target) event.target.value = "";
        return;
      }

      let rawContent = "";

      if (isPdf) {
        try {
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
            fullText += pageText + "\n\n";
          }

          rawContent = fullText.trim();
        } catch (error) {
          console.error("Error extracting PDF text:", error);
          setErrorMessage("Failed to extract text from that PDF.");
          if (event.target) event.target.value = "";
          return;
        }
      } else {
        try {
          setStatusMessage("Reading file...");
          rawContent = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(String(e.target?.result ?? ""));
            reader.onerror = () => reject(new Error("File read failure"));
            reader.readAsText(file);
          });
        } catch (error) {
          console.error("File read error:", error);
          setErrorMessage("Failed to read that file.");
          if (event.target) event.target.value = "";
          return;
        }
      }

      if (!rawContent.trim()) {
        setErrorMessage("That file looked empty.");
        if (event.target) event.target.value = "";
        return;
      }

      const parsed = parseReportContent(rawContent, {
        uploadType,
        fileName: file.name,
      });

      const nextContexts = [
        ...reportContexts.filter((ctx) => ctx.id !== parsed.context.id),
        parsed.context,
      ];
      setReportContexts(nextContexts);
      setRelocation(parsed.relocation ?? null);

      if (parsed.isMirror) {
        setStatusMessage("Mirror context loaded.");
      } else {
        setStatusMessage("Report context added.");
      }

      await analyzeReportContext(parsed.context, nextContexts);

      if (event.target) {
        event.target.value = "";
      }
      setUploadType(null);
    },
    [analyzeReportContext, reportContexts, uploadType, setReportContexts, setRelocation, setUploadType, setStatusMessage, setErrorMessage],
  );

  return { fileInputRef, handleUploadButton, handleFileChange };
}
