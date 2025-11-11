import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { Message } from "@/lib/raven-client/types";
import {
  hasPendingValidations,
  validationReducer,
} from "@/lib/validation/validationUtils";
import type {
  ValidationPoint,
  ValidationState,
} from "@/lib/validation/types";

interface UseValidationArgs {
  sessionId: string | null;
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
}

interface UseValidationResult {
  validationMap: ValidationState;
  setValidationPoints: (messageId: string, points: ValidationPoint[]) => void;
  updateValidationNote: (messageId: string, pointId: string, note: string) => void;
}

export function useValidation({
  sessionId,
  messages,
  setMessages,
}: UseValidationArgs): UseValidationResult {
  const [validationMap, dispatchValidation] = useReducer(
    validationReducer,
    {} as ValidationState,
  );

  const syncRef = useRef<Set<string>>(new Set());

  const setValidationPoints = useCallback(
    (messageId: string, points: ValidationPoint[]) => {
      dispatchValidation({
        type: "setPoints",
        messageId,
        points,
      });

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                validationPoints: points,
                validationComplete:
                  points.length === 0 || !hasPendingValidations(points),
              }
            : msg,
        ),
      );
    },
    [setMessages],
  );

  const updateValidationNote = useCallback(
    (messageId: string, pointId: string, note: string) => {
      dispatchValidation({
        type: "setNote",
        messageId,
        pointId,
        note,
      });

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          const nextPoints = (msg.validationPoints ?? []).map((point) =>
            point.id === pointId ? { ...point, note } : point,
          );
          return {
            ...msg,
            validationPoints: nextPoints,
          };
        }),
      );
    },
    [setMessages],
  );

  useEffect(() => {
    const readyForSync = messages.filter(
      (msg) =>
        msg.role === "raven" &&
        Array.isArray(msg.validationPoints) &&
        msg.validationPoints.length > 0 &&
        !msg.validationComplete &&
        !hasPendingValidations(msg.validationPoints ?? []) &&
        !syncRef.current.has(msg.id),
    );

    readyForSync.forEach((msg) => {
      syncRef.current.add(msg.id);
      const payload = {
        sessionId: sessionId ?? null,
        messageId: msg.id,
        hook: msg.hook ?? null,
        climate: msg.climate ?? null,
        validations: (msg.validationPoints ?? []).map((point) => ({
          id: point.id,
          field: point.field,
          voice: point.voice,
          tag: point.tag ?? null,
          note: point.note ?? null,
        })),
      };

      void fetch("/api/validation-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(() => {
          setMessages((prev) =>
            prev.map((entry) =>
              entry.id === msg.id
                ? { ...entry, validationComplete: true }
                : entry,
            ),
          );
        })
        .catch((error) => {
          console.error("Failed to persist validation log:", error);
        })
        .finally(() => {
          syncRef.current.delete(msg.id);
        });
    });
  }, [messages, sessionId, setMessages]);

  return {
    validationMap,
    setValidationPoints,
    updateValidationNote,
  };
}

export default useValidation;
