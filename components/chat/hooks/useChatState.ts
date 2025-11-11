import { useState, useReducer, useRef, useCallback } from 'react';
import { generateId } from '../../../lib/id';
import { validationReducer } from '@/lib/validation/validationUtils';
import type { Message, ValidationMap } from '../chat/types';
import type { ValidationState } from '@/lib/validation/types';
import type { PersonaMode } from '../../lib/persona';

const createInitialMessage = (): Message => ({
  id: generateId(),
  role: "raven",
  html: `<p style="margin:0; line-height:1.65;">I’m a clean mirror. Share whatever’s moving—type below to talk freely, or upload your Mirror + Symbolic Weather JSON when you want the formal reading. I’ll keep you oriented either way.</p>`,
  climate: "VOICE · Orientation",
  hook: "Session · Orientation",
  rawText: `I’m a clean mirror. Share whatever’s moving—type below to talk freely, or upload your Mirror + Symbolic Weather JSON when you want the formal reading. I’ll keep you oriented either way.`,
  validationPoints: [],
  validationComplete: true,
});

export function useChatState() {
  const [messages, setMessages] = useState<Message[]>(() => [createInitialMessage()]);
  const [validationMap, dispatchValidation] = useReducer(validationReducer, {} as ValidationState);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [personaMode, setPersonaMode] = useState<PersonaMode>('hybrid');
  const copyResetRef = useRef<number | null>(null);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);

  const handleCopyMessage = useCallback(async (messageId: string, text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      if (copyResetRef.current) {
        window.clearTimeout(copyResetRef.current);
      }
      copyResetRef.current = window.setTimeout(() => {
        setCopiedMessageId(null);
        copyResetRef.current = null;
      }, 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  }, []);

  return {
    messages,
    setMessages,
    validationMap,
    dispatchValidation,
    copiedMessageId,
    setCopiedMessageId,
    personaMode,
    setPersonaMode,
    copyResetRef,
    input,
    setInput,
    typing,
    setTyping,
    handleCopyMessage,
    createInitialMessage,
  };
}
