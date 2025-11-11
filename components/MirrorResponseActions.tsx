"use client";

import React from "react";
import PingFeedback, {
  PingResponse,
  CheckpointType,
} from "./PingFeedback";

interface MirrorResponseActionsProps {
  messageId: string;
  onFeedback: (messageId: string, response: PingResponse, note?: string) => void;
  disabled?: boolean;
  checkpointType?: CheckpointType;
}

const MirrorResponseActions: React.FC<MirrorResponseActionsProps> = ({
  messageId,
  onFeedback,
  disabled = false,
  checkpointType,
}) => {
  return (
    <div className="space-y-4">
      <PingFeedback
        messageId={messageId}
        onFeedback={onFeedback}
        disabled={disabled}
        checkpointType={checkpointType}
      />
      <p className="text-xs text-slate-500">
        Prefer to answer in your own words? Drop a note in the chat and I’ll thread it into the mirror.
      </p>
    </div>
  );
};

export default MirrorResponseActions;
