"use client";

import React, { useCallback, useState } from "react";
import PingFeedback, {
  PingResponse,
  CheckpointType,
} from "./PingFeedback";

interface MirrorResponseActionsProps {
  messageId: string;
  onFeedback: (messageId: string, response: PingResponse, note?: string) => void;
  onQuickReply: (content: string) => void;
  disabled?: boolean;
  checkpointType?: CheckpointType;
}

interface QuickReplyOption {
  label: string;
  response: PingResponse;
  content: string;
}

const QUICK_REPLY_OPTIONS: QuickReplyOption[] = [
  {
    label: "Agree",
    response: "yes",
    content: "Yes, that resonates.",
  },
  {
    label: "Partly",
    response: "maybe",
    content: "Partly—it lands in some ways but not all.",
  },
  {
    label: "Disagree",
    response: "no",
    content: "No, that doesn't fit for me.",
  },
  {
    label: "Unsure",
    response: "unclear",
    content: "I'm unsure / it feels confusing.",
  },
];

const MirrorResponseActions: React.FC<MirrorResponseActionsProps> = ({
  messageId,
  onFeedback,
  onQuickReply,
  disabled = false,
  checkpointType,
}) => {
  const [quickReplyUsed, setQuickReplyUsed] = useState(false);

  const handleQuickReply = useCallback(
    (option: QuickReplyOption) => {
      if (disabled || quickReplyUsed) return;
      setQuickReplyUsed(true);
      onFeedback(messageId, option.response, "__quick_reply__");
      onQuickReply(option.content);
    },
    [disabled, messageId, onFeedback, onQuickReply, quickReplyUsed],
  );

  const quickReplyDisabled = disabled || quickReplyUsed;

  return (
    <div className="space-y-3">
      <PingFeedback
        messageId={messageId}
        onFeedback={onFeedback}
        disabled={disabled || quickReplyUsed}
        checkpointType={checkpointType}
      />
      <div className="flex flex-wrap gap-2">
        {QUICK_REPLY_OPTIONS.map((option) => (
          <button
            key={option.label}
            type="button"
            className="rounded-md border border-slate-700/70 bg-slate-900/60 px-3 py-1 text-sm font-medium text-slate-100 transition hover:border-emerald-400/50 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => handleQuickReply(option)}
            disabled={quickReplyDisabled}
            title={`Send "${option.label}" as a reply`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MirrorResponseActions;
