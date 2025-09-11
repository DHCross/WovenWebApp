"use client";
import React, { useState } from 'react';

export type PingResponse = 'yes' | 'no' | 'maybe' | 'unclear';
export type CheckpointType = 'hook' | 'vector' | 'aspect' | 'general' | 'repair';

interface PingFeedbackProps {
  messageId: string;
  onFeedback: (messageId: string, response: PingResponse, note?: string) => void;
  disabled?: boolean;
  checkpointType?: CheckpointType;
}

const PingFeedback: React.FC<PingFeedbackProps> = ({ messageId, onFeedback, disabled = false, checkpointType = 'general' }) => {
  const [selectedResponse, setSelectedResponse] = useState<PingResponse | null>(null);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);

  const getCheckpointLabel = (type: CheckpointType) => {
    switch (type) {
      case 'hook': return 'Does this Hook Stack recognition resonate?';
      case 'vector': return 'Does this hidden push/counterweight feel accurate?';
      case 'aspect': return 'Does this high-voltage pattern ring true?';
      case 'repair': return 'Does this repair feel true to your experience?';
      default: return 'Does any of this feel familiar?';
    }
  };

  const handleResponse = (response: PingResponse) => {
    setSelectedResponse(response);
    onFeedback(messageId, response, note || undefined);
    
    // Show note field for "no" or "unclear" responses
    if (response === 'no' || response === 'unclear') {
      setShowNote(true);
    }
  };

  const handleNoteSubmit = () => {
    if (selectedResponse) {
      onFeedback(messageId, selectedResponse, note || undefined);
      setShowNote(false);
    }
  };

  if (disabled) {
    return (
      <div className="ping-feedback-disabled">
        <span className="feedback-label">✓ Feedback recorded</span>
      </div>
    );
  }

  return (
    <div className="ping-feedback">
      <div className="feedback-header">
        <span className="feedback-label">{getCheckpointLabel(checkpointType)}</span>
      </div>
      
      <div className="feedback-options">
        <button
          className={`feedback-btn yes ${selectedResponse === 'yes' ? 'selected' : ''}`}
          onClick={() => handleResponse('yes')}
          disabled={!!selectedResponse}
        >
          <span className="feedback-icon">✓</span>
          <span className="feedback-text">Yes, resonates</span>
        </button>
        
        <button
          className={`feedback-btn maybe ${selectedResponse === 'maybe' ? 'selected' : ''}`}
          onClick={() => handleResponse('maybe')}
          disabled={!!selectedResponse}
        >
          <span className="feedback-icon">~</span>
          <span className="feedback-text">Partly/Maybe</span>
        </button>
        
        <button
          className={`feedback-btn no ${selectedResponse === 'no' ? 'selected' : ''}`}
          onClick={() => handleResponse('no')}
          disabled={!!selectedResponse}
        >
          <span className="feedback-icon">✗</span>
          <span className="feedback-text">No, doesn't fit</span>
        </button>
        
        <button
          className={`feedback-btn unclear ${selectedResponse === 'unclear' ? 'selected' : ''}`}
          onClick={() => handleResponse('unclear')}
          disabled={!!selectedResponse}
        >
          <span className="feedback-icon">?</span>
          <span className="feedback-text">Unclear/Confusing</span>
        </button>
      </div>

      {showNote && (
        <div className="feedback-note">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional: What specifically didn't resonate or was unclear?"
            className="note-input"
            rows={2}
          />
          <button onClick={handleNoteSubmit} className="note-submit">
            Submit feedback
          </button>
        </div>
      )}

      <style jsx>{`
        .ping-feedback {
          margin: 16px 0;
          padding: 16px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          font-family: 'Inter', sans-serif;
        }

        .ping-feedback-disabled {
          margin: 8px 0;
          padding: 8px 12px;
          background: rgba(0, 255, 0, 0.1);
          border: 1px solid rgba(0, 255, 0, 0.2);
          border-radius: 6px;
          font-size: 12px;
          color: #4ade80;
        }

        .feedback-header {
          margin-bottom: 12px;
        }

        .feedback-label {
          font-size: 14px;
          font-weight: 500;
          color: #e5e7eb;
          font-style: italic;
        }

        .feedback-options {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .feedback-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: #d1d5db;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 100px;
        }

        .feedback-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .feedback-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .feedback-btn.selected {
          background: rgba(59, 130, 246, 0.2);
          border-color: #3b82f6;
          color: #93c5fd;
        }

        .feedback-btn.yes.selected {
          background: rgba(34, 197, 94, 0.2);
          border-color: #22c55e;
          color: #86efac;
        }

        .feedback-btn.no.selected {
          background: rgba(239, 68, 68, 0.2);
          border-color: #ef4444;
          color: #fca5a5;
        }

        .feedback-btn.maybe.selected {
          background: rgba(245, 158, 11, 0.2);
          border-color: #f59e0b;
          color: #fcd34d;
        }

        .feedback-btn.unclear.selected {
          background: rgba(139, 92, 246, 0.2);
          border-color: #8b5cf6;
          color: #c4b5fd;
        }

        .feedback-icon {
          font-weight: bold;
          font-size: 14px;
        }

        .feedback-text {
          font-weight: 400;
        }

        .feedback-note {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .note-input {
          width: 100%;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: #e5e7eb;
          font-size: 12px;
          font-family: 'Inter', sans-serif;
          resize: vertical;
          margin-bottom: 8px;
        }

        .note-input:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .note-input::placeholder {
          color: #6b7280;
        }

        .note-submit {
          padding: 6px 12px;
          background: #3b82f6;
          border: none;
          border-radius: 4px;
          color: white;
          font-size: 11px;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
        }

        .note-submit:hover {
          background: #2563eb;
        }
      `}</style>
    </div>
  );
};

export default PingFeedback;
