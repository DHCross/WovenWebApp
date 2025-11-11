"use client";

import React, { useEffect, useRef } from "react";
import ChatHeader from "./chat/ChatHeader";
import SessionStateBanner from "./chat/SessionStateBanner";
import StoredPayloadBanner from "./chat/StoredPayloadBanner";
import RelocationBanner from "./chat/RelocationBanner";
import ReportContextsBanner from "./chat/ReportContextsBanner";
import StatusBanners from "./chat/StatusBanners";
import WelcomeMessage from "./chat/WelcomeMessage";
import MessageList from "./chat/MessageList";
import ChatInput from "./chat/ChatInput";
import SessionWrapUpModal from "./SessionWrapUpModal";
import WrapUpCard from "./WrapUpCard";
import { useChatState } from "./chat/hooks/useChatState";
import { useSessionManager } from "./chat/hooks/useSessionManager";
import { useApi } from "./chat/hooks/useApi";
import { useFileHandling } from "./chat/hooks/useFileHandling";
import { useChatLogic } from "./chat/hooks/useChatLogic";

export default function ChatClient() {
  const {
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
  } = useChatState();

  const {
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
  } = useSessionManager({ setMessages, createInitialMessage, pushRavenNarrative: () => {} });

  const { runRavenRequest } = useApi({
    setMessages,
    setTyping,
    setSessionId,
    dispatchValidation,
    validationMap,
    personaMode,
    abortRef,
  });

  const {
    analyzeReportContext,
    sendMessage,
    sendProgrammatic,
    handlePingFeedback,
    stop,
    sendCurrentInput,
    pushRavenNarrative,
  } = useChatLogic({
    messages,
    setMessages,
    reportContexts,
    runRavenRequest,
    sessionId,
    shiftSessionMode,
    setSessionStarted,
    relocation,
    sessionMode,
    abortRef,
  });

  const { fileInputRef, handleUploadButton, handleFileChange } = useFileHandling({
    setReportContexts,
    setRelocation,
    setUploadType,
    setStatusMessage,
    setErrorMessage,
    analyzeReportContext,
    reportContexts,
    uploadType,
  });

  const conversationRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = conversationRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#05060b] via-[#0c111e] to-[#010207] text-slate-100">
      <ChatHeader
        personaMode={personaMode}
        onPersonaModeChange={setPersonaMode}
        onUploadMirror={() => handleUploadButton("mirror")}
        onUploadWeather={() => handleUploadButton("balance")}
        canRecoverStoredPayload={hasSavedPayloadSnapshot || Boolean(storedPayload)}
        onRecoverStoredPayload={() => {}}
        onStartWrapUp={handleStartWrapUp}
      />

      <SessionStateBanner
        sessionStarted={sessionStarted}
        sessionModeDescriptor={sessionModeDescriptor}
        onStartWrapUp={handleStartWrapUp}
      />

      <StoredPayloadBanner
        storedPayload={storedPayload}
        storedPayloadSummary={""}
        onApplyStoredPayload={() => {}}
        onDismissStoredPayload={() => {}}
      />

      <RelocationBanner relocation={relocation} />

      <ReportContextsBanner
        reportContexts={reportContexts}
        onRemoveReportContext={() => {}}
      />

      <StatusBanners
        statusMessage={statusMessage}
        errorMessage={errorMessage}
      />

      <WelcomeMessage
        sessionStarted={sessionStarted}
        storedPayload={storedPayload}
        reportContexts={reportContexts}
        onUploadMirror={() => handleUploadButton("mirror")}
        canRecoverStoredPayload={hasSavedPayloadSnapshot || Boolean(storedPayload)}
        onRecoverStoredPayload={() => {}}
      />

      <div ref={conversationRef} className="flex-1 overflow-y-auto">
        <MessageList
          messages={messages}
          typing={typing}
          copiedMessageId={copiedMessageId}
          validationMap={validationMap}
          onCopyMessage={handleCopyMessage}
          onPingFeedback={handlePingFeedback}
          onValidationUpdate={() => {}}
          onValidationNoteChange={() => {}}
          onStop={stop}
        />
      </div>

      <ChatInput
        input={input}
        onInputChange={setInput}
        typing={typing}
        onSend={sendCurrentInput}
        onUploadMirror={() => handleUploadButton("mirror")}
        onUploadWeather={() => handleUploadButton("balance")}
        onStop={stop}
        fileInputRef={fileInputRef}
      />

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
        accept=".txt,.md,.json,.pdf"
      />

      <SessionWrapUpModal
        open={isWrapUpOpen}
        sessionId={sessionId}
        onDismiss={handleDismissWrapUp}
        onConfirmEnd={handleConfirmWrapUp}
        onSkipToExport={() => {}}
      />

      {wrapUpLoading && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/70">
          <div className="rounded-lg border border-slate-700/70 bg-slate-900 px-6 py-4 text-sm text-slate-200 shadow-xl">
            Preparing wrap-up summary…
          </div>
        </div>
      )}

      {showWrapUpPanel && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/80 px-4 py-6">
          <div className="w-full max-w-4xl">
            <WrapUpCard
              sessionId={sessionId ?? undefined}
              exportData={wrapUpExport ?? undefined}
              onClose={() => {
                setShowWrapUpPanel(false);
              }}
              onSealed={(sealedSessionId) => {
                closeServerSession(sealedSessionId).then(() => {
                  performSessionReset();
                  setShowWrapUpPanel(false);
                });
              }}
              onExportClearMirror={() => {}}
            />
          </div>
        </div>
      )}
    </div>
  );
}
