"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { generateId } from "../lib/id";
import { formatFullClimateDisplay, ClimateData } from "../lib/climate-renderer";
import UsageMeter from "./UsageMeter";
import { summarizeRelocation, RelocationSummary } from "../lib/relocation";
// Removed top-level imports - now using dynamic imports to avoid Node-only module issues
import type { PoeticIndexCard } from "../lib/poetics/card-generator";
import PingFeedback, { PingResponse } from "./PingFeedback";
import HitRateDisplay from "./HitRateDisplay";
import WrapUpCard from "./WrapUpCard";
import PoeticCard from "./PoeticCard";
import ReadingSummaryCard from "./ReadingSummaryCard";
import { pingTracker } from "../lib/ping-tracker";
import { naturalFollowUpFlow } from "../lib/natural-followup-flow";
import {
  APP_NAME,
  STATUS_CONNECTED,
  INPUT_PLACEHOLDER,
} from "../lib/ui-strings";
import type { Intent } from "../lib/raven/intent";
import type { SSTProbe } from "../lib/raven/sst";
// simple HTML escaper for user-originated plain text rendering safety
const escapeHtml = (s: string) =>
  s.replace(
    /[&<>]/g,
    (c) =>
      (({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }) as Record<string, string>)[
        c
      ] || c,
  );

// Generate dynamic climate display based on context
function generateDynamicClimate(context?: string): string {
  let valence = 0; // -5 to +5 scale
  let magnitude = 1; // default murmur level
  let volatility = 0; // default aligned

  if (context) {
    const text = context.toLowerCase();

    // Valence Analysis: map context to -5 to +5 scale
    // Collapse indicators (-5): crisis, break, fail, crash, end, stuck, impossible
    if (
      /(crisis|break|fail|crash|end|stuck|impossible|collapse|destroy|catastrophe)/i.test(
        text,
      )
    ) {
      valence = -5;
    }
    // Grind indicators (-4): difficult, struggle, resist, fight, hard, burden, exhaust
    else if (
      /(difficult|struggle|resist|fight|hard|burden|exhaust|grind|strain|wear)/i.test(
        text,
      )
    ) {
      valence = -4;
    }
    // Friction indicators (-3): conflict, disagree, argue, oppose, clash, tension
    else if (
      /(conflict|disagree|argue|oppose|clash|tension|friction|dispute|against)/i.test(
        text,
      )
    ) {
      valence = -3;
    }
    // Contraction indicators (-2): narrow, limit, reduce, shrink, constrain, block
    else if (
      /(narrow|limit|reduce|shrink|constrain|block|contract|restrict|close)/i.test(
        text,
      )
    ) {
      valence = -2;
    }
    // Drag indicators (-1): slow, delay, hesitate, doubt, unclear, minor issues
    else if (
      /(slow|delay|hesitate|doubt|unclear|minor|slight|drag|hinder|small)/i.test(
        text,
      )
    ) {
      valence = -1;
    }
    // Liberation indicators (+5): breakthrough, freedom, achieve, breakthrough, transform, unlimited
    else if (
      /(breakthrough|freedom|achieve|transform|unlimited|liberate|soar|transcend)/i.test(
        text,
      )
    ) {
      valence = 5;
    }
    // Expansion indicators (+4): growth, opportunity, develop, advance, expand, progress
    else if (
      /(growth|opportunity|develop|advance|expand|progress|flourish|thrive)/i.test(
        text,
      )
    ) {
      valence = 4;
    }
    // Harmony indicators (+3): balance, align, connect, unite, coherent, synergy
    else if (
      /(balance|align|connect|unite|coherent|synergy|harmony|integrate|blend)/i.test(
        text,
      )
    ) {
      valence = 3;
    }
    // Flow indicators (+2): smooth, adapt, flexible, easy, natural, fluid
    else if (
      /(smooth|adapt|flexible|easy|natural|fluid|flow|graceful|effortless)/i.test(
        text,
      )
    ) {
      valence = 2;
    }
    // Lift indicators (+1): begin, start, improve, hope, gentle, positive
    else if (
      /(begin|start|improve|hope|gentle|positive|lift|rise|encourage)/i.test(
        text,
      )
    ) {
      valence = 1;
    }
    // Default to equilibrium (0) for neutral contexts

    // Magnitude Analysis: intensity of change/activity (0-5)
    if (/(major|significant|huge|massive|complete|total|full)/i.test(text)) {
      magnitude = 5;
    } else if (/(strong|important|serious|considerable|notable)/i.test(text)) {
      magnitude = 4;
    } else if (/(moderate|medium|some|partial|decent)/i.test(text)) {
      magnitude = 3;
    } else if (/(small|minor|little|slight|modest)/i.test(text)) {
      magnitude = 2;
    }

    // Volatility Analysis: rate of change/unpredictability (0-5)
    if (/(chaos|random|wild|unpredictable|turbulent|erratic)/i.test(text)) {
      volatility = 5;
    } else if (/(changing|shifting|variable|dynamic|fluctuating)/i.test(text)) {
      volatility = 3;
    } else if (/(stable|steady|consistent|predictable|calm)/i.test(text)) {
      volatility = 0;
    }

    // Clamp values
    magnitude = Math.max(0, Math.min(5, magnitude));
    volatility = Math.max(0, Math.min(5, volatility));
    valence = Math.max(-5, Math.min(5, valence));
  }

  const climateData: ClimateData = { magnitude, valence, volatility };
  return formatFullClimateDisplay(climateData);
}

type RavenDraftResponse = {
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
};

const MIRROR_SECTION_ORDER: Array<{ key: string; label: string }> = [
  { key: "picture", label: "Picture" },
  { key: "feeling", label: "Feeling" },
  { key: "container", label: "Container" },
  { key: "option", label: "Option" },
  { key: "next_step", label: "Next Step" },
];

function formatShareableDraft(
  draft?: Record<string, any> | null,
  prov?: Record<string, any> | null,
): string {
  if (!draft) return "<i>No mirror draft returned.</i>";
  const rows = MIRROR_SECTION_ORDER.map(({ key, label }) => {
    const value = draft[key];
    if (!value) return null;
    return `
      <div class="mirror-row" style="display:flex; flex-direction:column; gap:4px; padding:8px 10px; background:rgba(15,23,42,0.65); border:1px solid rgba(148,163,184,0.18); border-radius:10px;">
        <span class="mirror-label" style="font-size:11px; text-transform:uppercase; letter-spacing:0.05em; color:#94a3b8;">${label}</span>
        <span class="mirror-value" style="font-size:14px; line-height:1.45; color:#e2e8f0;">${escapeHtml(String(value))}</span>
      </div>
    `;
  })
    .filter(Boolean)
    .join("");

  const appendixEntries =
    draft.appendix && typeof draft.appendix === "object"
      ? Object.entries(draft.appendix as Record<string, any>)
          .filter(
            ([_, val]) =>
              val !== undefined && val !== null && String(val).trim() !== "",
          )
          .map(
            ([key, val]) =>
              `<li><strong>${escapeHtml(key.replace(/_/g, " "))}:</strong> ${escapeHtml(String(val))}</li>`,
          )
      : [];

  const appendix = appendixEntries.length
    ? `<div class="mirror-appendix" style="margin-top:10px; padding:10px; border:1px solid rgba(148,163,184,0.18); border-radius:10px; background:rgba(15,23,42,0.5);">
        <div class="mirror-appendix-title" style="font-size:11px; text-transform:uppercase; letter-spacing:0.05em; color:#94a3b8; margin-bottom:6px;">Appendix</div>
        <ul style="margin:0; padding-left:16px; color:#cbd5f5; font-size:12px; line-height:1.4;">${appendixEntries.join("")}</ul>
      </div>`
    : "";

  const provenance = prov?.source
    ? `<div class="mirror-provenance" style="margin-top:12px; font-size:11px; color:#94a3b8;">Source · ${escapeHtml(String(prov.source))}</div>`
    : "";

  return `
    <section class="mirror-draft" style="display:flex; flex-direction:column; gap:10px;">
      ${rows || "<p><em>No primary mirror lanes provided.</em></p>"}
      ${appendix}
      ${provenance}
    </section>
  `;
}

function formatIntentHook(
  intent?: Intent,
  prov?: Record<string, any> | null,
): string | undefined {
  if (!intent) return prov?.source ? `Source · ${prov.source}` : undefined;
  const lane =
    intent === "geometry"
      ? "Geometry"
      : intent === "report"
        ? "Report"
        : "Conversation";
  const source = prov?.source ? ` · ${prov.source}` : "";
  return `Lane · ${lane}${source}`;
}

function formatClimate(
  climate?: string | ClimateData | null,
): string | undefined {
  if (!climate) return undefined;
  if (typeof climate === "string") return climate;
  try {
    return formatFullClimateDisplay(climate);
  } catch {
    return undefined;
  }
}

const INTENT_TOAST: Record<Intent, string> = {
  geometry: "Chart detected — parsing as geometry",
  report: "Report lane active — Math Brain context ready",
  conversation: "Conversation lane active",
};

function getIntentToast(intent?: Intent): string | null {
  return intent ? INTENT_TOAST[intent] : null;
}

function cleanseFrontstage(raw: string): string {
  if (!raw) return "";
  let text = raw;

  // Remove balance meter data dumps and report headers
  text = text.replace(/\{I've received.*?\}[\s\S]*?(?=\n\n|$)/gi, "");
  text = text.replace(/The Balance Meter shows.*?(?=\n|$)/gi, "");
  text = text.replace(/.*magnitude.*?valence.*?volatility.*?(?=\n|$)/gi, "");
  text = text.replace(/.*glyphs are.*?(?=\n|$)/gi, "");
  text = text.replace(/.*report already contains.*?(?=\n|$)/gi, "");

  // Remove symbolic weather headers when used as opening
  text = text.replace(/^\s*\*\*Symbolic Weather Header:\*\*.*?(?=\n|$)/gim, "");

  // Remove any known backstage headings/blocks
  text = text.replace(
    /(##\s*SST[_\s-]*Clause[\s\S]*?$)|(^.*SST[_\s-]*Prompt.*$)|(^.*Resonance[_\s-]*Rule.*$)|(^.*Conditional[_\s-]*Language.*$)/gim,
    "",
  );

  // Clean inline acronyms and technical notation
  text = text
    .replace(/\bSST\b/g, "")
    .replace(/\bWB\s*\/\s*ABE\s*\/\s*OSR\b/gi, "")
    .replace(/\b(magnitude|valence)\s*[-:]?\s*\d+\.?\d*/gi, "") // remove numeric data
    .replace(/\[[^\]]*operator[^\]]*\]/gi, "")
    .replace(/\[Operator.*?\]/gi, "")
    .replace(
      /[\u260d\u2642\u263d\u26a1\ud83c\udf11\ud83c\udf1e]\s*and\s*[\u260d\u2642\u263d\u26a1\ud83c\udf11\ud83c\udf1e]/g,
      "",
    ) // remove glyph lists
    .replace(/The glyphs are [^.]*\./gi, ""); // remove glyph declarations

  // Detect and handle OSR mentions with user-friendly language
  const mentionsOSR =
    /Outside\s+Symbolic\s+Range\b/i.test(raw) || /\bOSR\b/.test(raw);
  if (mentionsOSR) {
    const addendum =
      "If none of this felt familiar, treat it as valid null data—your experience sets the boundary.";
    if (!text.trim().endsWith(addendum)) {
      text = text.trim() + (/[.!?]$/.test(text.trim()) ? " " : ". ") + addendum;
    }
    text = text.replace(/\bOSR\b/g, "null data"); // replace standalone only
  }

  // Clean clinical prompts
  text = text.replace(
    /Did this land\?\s*Mark\.?/gi,
    "Does any of this feel familiar?",
  );
  text = text.replace(/Mark\s*(WB|ABE|OSR)\.?/gi, "");

  return text
    .replace(/\s{2,}/g, " ")
    .replace(/^\s*[-*]\s*$/gm, "")
    .trim();
}

// Function to detect if a message contains an initial probe (these should NOT get feedback buttons)
function containsInitialProbe(text: string): boolean {
  const probePatterns = [
    /does any of this feel familiar/i,
    /did this land/i,
    /does this fit your experience/i,
    /feel true to you/i,
    /resonate with you/i,
    /ring true/i,
    /sound right/i,
    /feel accurate/i,
  ];

  // Exclude repair validations from being treated as initial probes
  if (containsRepairValidation(text)) {
    return false;
  }

  return probePatterns.some((pattern) => pattern.test(text));
}

// Function to detect repair validation requests (these SHOULD get feedback buttons)
function containsRepairValidation(text: string): boolean {
  const repairValidationPatterns = [
    /does this repair feel true/i,
    /is this a more accurate description/i,
    /is that a more accurate description/i,
    /does this feel more accurate/i,
    /is this closer to your experience/i,
    /does this better capture/i,
    /probe missed.*describing/i,
    /that missed.*you're actually/i,
    /i'm logging that probe as osr/i,
  ];

  return repairValidationPatterns.some((pattern) => pattern.test(text));
}

// Function to detect different types of ping checkpoints for appropriate messaging
function getPingCheckpointType(
  text: string,
): "hook" | "vector" | "aspect" | "repair" | "general" {
  if (containsRepairValidation(text)) return "repair";
  if (/hook stack|paradox.*tags|rock.*spark/i.test(text)) return "hook";
  if (/hidden push|counterweight|vector signature/i.test(text)) return "vector";
  if (/mars.*saturn|personal.*outer|hard aspect/i.test(text)) return "aspect";
  return "general";
}

interface Message {
  id: string;
  role: "user" | "raven";
  html: string;
  climate?: string;
  hook?: string;
  isReport?: boolean;
  reportType?: "mirror" | "balance" | "journal";
  reportName?: string;
  reportSummary?: string;
  collapsed?: boolean;
  pingFeedbackRecorded?: boolean;
  fullContent?: string; // Store complete file content for analysis (separate from display HTML)
  intent?: Intent;
  probe?: SSTProbe | null;
  draft?: Record<string, any> | null;
  prov?: Record<string, any> | null;
}

interface ReportContext {
  id: string;
  type: "mirror" | "balance" | "journal";
  name: string;
  summary: string;
  content: string;
  relocation?: RelocationSummary;
}

const mapRelocationToPayload = (
  summary: RelocationSummary | null | undefined,
): Record<string, any> | undefined => {
  if (!summary) return undefined;
  return {
    active: summary.active,
    mode: summary.mode,
    scope: summary.scope,
    label: summary.label,
    status: summary.status,
    disclosure: summary.disclosure,
    invariants: summary.invariants,
    confidence: summary.confidence,
    coordinates: summary.coordinates,
    houseSystem: summary.houseSystem,
    zodiacType: summary.zodiacType,
    engineVersions: summary.engineVersions,
    house_system: summary.houseSystem ?? null,
    zodiac_type: summary.zodiacType ?? null,
    engine_versions: summary.engineVersions ?? null,
    provenance: summary.provenance,
  };
};

interface StreamState {
  ravenId: string;
  acc: string;
  climate?: string;
  hook?: string;
}

function RelocationBanner({ summary }: { summary: RelocationSummary }) {
  const badgeClass = summary.active
    ? "bg-[var(--good)] text-slate-900"
    : "bg-[var(--soft)] text-[var(--muted)]";
  return (
    <div className="flex justify-center border-b border-[var(--line)] bg-[var(--panel)] px-3 py-2">
      <div className="flex w-full max-w-[900px] flex-col gap-1 text-[12px] text-[var(--text)]">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeClass}`}
          >
            {summary.active ? "Relocation on" : "Relocation off"}
          </span>
          <span className="font-medium text-[var(--text)]">
            {summary.disclosure}
          </span>
        </div>
        {summary.status && (
          <div className="text-[11px] text-[var(--muted)]">{summary.status}</div>
        )}
        {summary.invariants && (
          <div className="text-[11px] text-[var(--muted)]">{summary.invariants}</div>
        )}
        {summary.coordinates?.timezone && (
          <div className="text-[10px] text-[var(--muted)]">
            Timezone: {summary.coordinates.timezone}
          </div>
        )}
        {summary.confidence === "low" && (
          <div className="text-[11px] text-[var(--warn)]">
            Symbolic midpoint lens — diagnostic confidence reduced.
          </div>
        )}
      </div>
    </div>
  );
}

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-[rgba(0,0,0,0.7)] flex items-center justify-center z-[1000]">
      <div className="relative w-full max-w-[420px] rounded-[12px] bg-[#181c24] p-8 text-[#e0e6f0] shadow-[0_8px_32px_#0008]">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 cursor-pointer border-0 bg-transparent text-[24px] text-[#94a3b8]"
        >
          ×
        </button>
        <h2 className="mt-0 text-[20px] text-slate-100">Help & Button Guide</h2>
        <ul className="list-none pl-0 text-[15px] leading-7">
          <li>
            <b>🪞 Mirror</b>: Upload a Mirror report (personal reflection data)
            for analysis.
          </li>
          <li>
            <b>🌡️ Balance</b>: Upload a Balance Meter report (energetic state
            snapshot).
          </li>
          <li>
            <b>📔 Journal</b>: Upload a Journal entry (narrative or notes for
            context).
          </li>
          <li>
            <b>🎭 Poetic</b>: Generate a poetic interpretation of your Mirror
            data (unlocked after uploading a Mirror).
          </li>
          <li>
            <b>🎴 Card</b>: Create a visual Poetic Index Card from your Mirror
            data (unlocked after uploading a Mirror).
          </li>
          <li>
            <b>🎴 Demo</b>: Preview a sample Poetic Index Card (no data
            required).
          </li>
          <li>
            <b>🎭 Reveal</b>: Generate your Actor/Role composite from session
            feedback (shows after enough pings).
          </li>
          <li>
            <b>ℹ️ About</b>: Learn about Raven Calder and the project’s
            philosophy.
          </li>
          <li>
            <b>❓ Help</b>: Show this help dialog.
          </li>
        </ul>
        <div className="mt-4 text-[13px] text-[#94a3b8]">
          <b>Tip:</b> Hover on any button for a tooltip. For best results, give
          feedback on several mirrors before using <b>Reveal</b>.
        </div>
      </div>
    </div>
  );
}

export default function ChatClient() {
  const [showHelp, setShowHelp] = useState(false);
  const [showPoeticMenu, setShowPoeticMenu] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "raven",
      html: `I’m a clean mirror. I put what you share next to the pattern I see and speak it back in plain language. No fate talk, no certainty—just useful reflections you can test.`,
      climate: generateDynamicClimate("supportive clear mirror"),
      hook: "Atmosphere · Creator ∠ Mirror",
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<
    "mirror" | "balance" | "journal" | null
  >(null);
  const [hasMirrorData, setHasMirrorData] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const streamContainerRef = useRef<HTMLElement | null>(null);
  const [ravenSessionId, setRavenSessionId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const [relocation, setRelocation] = useState<RelocationSummary | null>(null);
  const [reportContexts, setReportContexts] = useState<ReportContext[]>([]);
  const [showWrapUpCard, setShowWrapUpCard] = useState(false);
  const [showPendingReview, setShowPendingReview] = useState(false);
  const [showReadingSummary, setShowReadingSummary] = useState(false);
  // Post-seal guidance state
  const [awaitingNewReadingGuide, setAwaitingNewReadingGuide] = useState(false);
  const [priorFocusKeywords, setPriorFocusKeywords] = useState<string[]>([]);

  // Developer-only session download functionality
  const [devMode, setDevMode] = useState<boolean>(false);
  const [isDeveloperAuthenticated, setIsDeveloperAuthenticated] = useState<boolean>(false);

  // One canonical, explicit gate (presentation consumes this—not raw internals)
  const devGate = devMode && isDeveloperAuthenticated;

  // Protocol guardrails for FIELD→MAP→VOICE gating
  const hasNamedContext = (contextName: string) => {
    return reportContexts.some(ctx => ctx.name === contextName);
  };

  const mapVoiceArmed = hasNamedContext('Mirror') || hasNamedContext('Balance');

  // Check developer authentication
  const checkDevAuth = () => {
    // Check if user is DHCross via Auth0 or use fallback
    if (typeof window !== "undefined") {
      const auth0User = (window as any).__auth0_user;
      const isDHCross =
        auth0User?.email === "dhcross@example.com" ||
        auth0User?.name === "DHCross";

      if (isDHCross) {
        setIsDeveloperAuthenticated(true);
        return true;
      }

      // Fallback developer login
      const username = prompt("Developer Username:");
      const password = prompt("Developer Password:");

      if (username === "DHCross" && password === "RAVENCALDER") {
        setIsDeveloperAuthenticated(true);
        setToast("Developer authenticated");
        setTimeout(() => setToast(null), 1500);
        return true;
      }
    }

    setToast("Developer authentication failed");
    setTimeout(() => setToast(null), 1500);
    return false;
  };
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);
  // Math Brain handoff resume (v1.7)
  interface MBLastSession {
    createdAt?: string;
    from?: string;
    inputs?: {
      mode?: string;
      step?: string;
      startDate?: string;
      endDate?: string;
      includePersonB?: boolean;
      relationship?: {
        type?: string;
        intimacy_tier?: string;
        role?: string;
        ex_estranged?: boolean;
        notes?: string;
      };
      personA?: { name?: string } & Record<string, any>;
      personB?: { name?: string } & Record<string, any>;
    };
    summary?: {
      magnitude?: number;
      valence?: number;
      volatility?: number;
      magnitudeLabel?: string;
      valenceLabel?: string;
      volatilityLabel?: string;
    };
    resultPreview?: { hasDaily?: boolean };
  }
  const [mbLastSession, setMbLastSession] = useState<MBLastSession | null>(
    null,
  );
  const [showMbResume, setShowMbResume] = useState(false);
  const [showMbBanner, setShowMbBanner] = useState(false);

  // Session tracking for journal generation
  const [sessionContext, setSessionContext] = useState(() => ({
    sessionStart: Date.now(),
    actorProfile: null,
    wbHits: [],
    abeHits: [],
    osrMisses: [],
    actorWeighting: 0,
    roleWeighting: 0,
    driftIndex: 0,
    currentComposite: undefined,
    sessionActive: true,
  }));

  // Navigation state for Raven messages
  const [currentRavenIndex, setCurrentRavenIndex] = useState(0);

  // Check for report data from Math Brain integration
  useEffect(() => {
    // v1.7: Detect Math Brain last session in localStorage for resume banner
    try {
      const raw = localStorage.getItem("mb.lastSession");
      if (raw) {
        const parsed: MBLastSession = JSON.parse(raw);
        setMbLastSession(parsed);
        setShowMbResume(true);
        // If navigated via deep link, show an extra tiny banner confirming hand-off
        try {
          const params = new URLSearchParams(window.location.search);
          if (params.get("from") === "math-brain") {
            setShowMbBanner(true);
          }
        } catch {}
      }
    } catch {}

    const reportData = sessionStorage.getItem("woven_report_for_raven");
    if (reportData) {
      try {
        const parsed = JSON.parse(reportData);

        // Clear the sessionStorage so it doesn't auto-load again
        sessionStorage.removeItem("woven_report_for_raven");

        // Create a welcome message with the report data
        const reportMessage: Message = {
          id: generateId(),
          role: "user",
          html: `Hi Raven! I've generated a chart analysis and would love your interpretation. Here's my information: ${parsed.meta?.person?.name || "Name not provided"}, born ${parsed.meta?.person?.birthDate || "unknown date"} at ${parsed.meta?.person?.birthTime || "unknown time"} in ${parsed.meta?.person?.birthLocation || "unknown location"}. Context: ${parsed.meta?.context || "general reading"}.`,
          isReport: true,
          reportType: "mirror",
          reportName: `Chart Analysis - ${parsed.meta?.person?.name || "Unknown"}`,
          reportSummary: `Math Brain report from ${parsed.meta?.timestamp ? new Date(parsed.meta.timestamp).toLocaleDateString() : "today"}`,
          fullContent: JSON.stringify(parsed.reportData, null, 2),
        };

        // Add the report message to the conversation
        setMessages((prev) => [...prev, reportMessage]);

        // Auto-send a request for interpretation
        setTimeout(() => {
          const interpretationRequest = `Please provide your interpretation of this chart data. I'm particularly interested in understanding the key patterns and what they might reveal about my current life dynamics.`;
          setInput(interpretationRequest);
          // Auto-submit after a brief delay to let the user see what's happening
          setTimeout(() => {
            const submitEvent = new Event("submit", {
              bubbles: true,
              cancelable: true,
            });
            document.querySelector("form")?.dispatchEvent(submitEvent);
          }, 1000);
        }, 500);
      } catch (error) {
        console.error(
          "Failed to parse report data from sessionStorage:",
          error,
        );
      }
    }
  }, []); // Run once on component mount

  // Developer authentication check on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const auth0User = (window as any).__auth0_user;
      const isDHCross = auth0User?.email === "dhcross@example.com" || auth0User?.name === "DHCross";
      if (isDHCross) {
        setIsDeveloperAuthenticated(true);
      }
    }
  }, []);

  // Developer-only keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+D = Toggle dev mode (requires auth)
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        e.preventDefault();
        if (checkDevAuth()) {
          setDevMode((prev: boolean) => !prev);
          setToast(devMode ? "Dev mode disabled" : "Dev mode enabled");
          setTimeout(() => setToast(null), 1500);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [devGate, checkDevAuth, devMode, setToast]);

  // Close poetic menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowPoeticMenu(false);
    if (showPoeticMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showPoeticMenu]);

  // Helper: strip HTML to plain text
  const stripHtml = (s: string) =>
    s
      .replace(/<[^>]*>/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  const firstSentenceOf = (s: string) =>
    (s.match(/[^.!?]+[.!?]?/)?.[0] || s).trim();

  // Function to generate journal entry with a narrative paraphrase of the conversation
  const generateJournalEntry = async () => {
    // Extract user name from messages or use default
    const userMessages = messages.filter(
      (m) => m.role === "user" && !m.isReport,
    );
    const firstUserMessage = userMessages[0]?.html || "";
    const nameMatch =
      firstUserMessage.match(/my name is (\w+)/i) ||
      firstUserMessage.match(/i'm (\w+)/i) ||
      firstUserMessage.match(/i am (\w+)/i);
    const userName = nameMatch ? nameMatch[1] : "the user";

    // Base journal from protocol engine
    const base = await naturalFollowUpFlow.generateJournalSummary(
      sessionContext,
      userName,
    );

    // Build a concise narrative paraphrase from the last few turns
    const recent = messages.slice(-12); // last ~6 exchanges
    const userLines = recent
      .filter((m) => m.role === "user" && !m.isReport)
      .map((m) => stripHtml(m.html))
      .filter(Boolean);
    const ravenLines = recent
      .filter((m) => m.role === "raven")
      .map((m) => stripHtml(m.html))
      .filter(Boolean);

    const open = ravenLines[0] ? firstSentenceOf(ravenLines[0]) : "";
    const userPulse =
      userLines.length > 0
        ? `They brought ${userLines.length === 1 ? "one note" : userLines.length + " notes"} of focus, including: "${firstSentenceOf(userLines[0])}"`
        : "";
    const mirrorPulse =
      ravenLines.length > 1
        ? `Raven mirrored with lines like: "${firstSentenceOf(ravenLines[1])}"`
        : "";
    const closer = ravenLines[ravenLines.length - 1]
      ? `We closed on: "${firstSentenceOf(ravenLines[ravenLines.length - 1])}"`
      : "";

    const thread = [
      open && `Opening read: ${open}`,
      userPulse,
      mirrorPulse,
      closer,
    ]
      .filter(Boolean)
      .join(" \n\n");

    const conversationParaphrase = thread
      ? `Conversation Thread (Paraphrase)\n\n${thread}`
      : "";

    // Merge: append conversation paraphrase beneath the base narrative if present
    if (conversationParaphrase) {
      base.narrative =
        `${base.narrative}\n\n---\n${conversationParaphrase}`.trim();
    }

    return base;
  };

  // Function to handle session end
  const handleEndReading = () => {
    setShowWrapUpCard(true);
  };

  // Function to generate reading summary data
  const generateReadingSummaryData = () => {
    // Extract user name from messages or use default
    const userMessages = messages.filter((m) => m.role === "user");
    const firstUserMessage = userMessages[0]?.html || "";
    const nameMatch =
      firstUserMessage.match(/my name is (\w+)/i) ||
      firstUserMessage.match(/i'm (\w+)/i) ||
      firstUserMessage.match(/i am (\w+)/i);
    const userName = nameMatch ? nameMatch[1] : "the user";

    // Calculate resonance fidelity
    const wb = sessionContext.wbHits.length;
    const abe = sessionContext.abeHits.length;
    const osr = sessionContext.osrMisses.length;

    const numerator = wb + 0.5 * abe;
    const denominator = wb + abe + osr;
    const percentage =
      denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;

    let band: "HIGH" | "MIXED" | "LOW" = "LOW";
    let label = "Extensive New Territory";

    if (percentage >= 70) {
      band = "HIGH";
      label = "Strong Harmonic Alignment";
    } else if (percentage >= 40) {
      band = "MIXED";
      label = "Mixed Alignment";
    }

    return {
      bigVectors: [
        {
          tension: "restless-contained",
          polarity: "Visionary Driver / Cutting Truth Style",
          charge: 4,
          source: "personal-outer" as const,
        },
      ],
      resonanceSnapshot: {
        affirmedParadoxes: sessionContext.wbHits
          .slice(0, 3)
          .map((hit: any) => hit.content || "Pattern recognized"),
        poemLines: [
          "The compass spins, a restless heart",
          "A whispered promise, barely heard",
        ],
        symbolicImages: [
          "spinning compass",
          "restless energy",
          "whispered truth",
        ],
        keyMoments: sessionContext.wbHits
          .slice(0, 2)
          .map((hit: any) => hit.content || "Key moment"),
      },
      actorRoleComposite: {
        actor: "Visionary Driver",
        role: "Cutting Truth Style",
        composite: "Visionary Driver / Cutting Truth Style",
        confidence: "emerging" as const,
      },
      resonanceFidelity: {
        percentage,
        band,
        label,
        wb,
        abe,
        osr,
      },
      explanation: `You recognized the restless pull more than the steadying hand. That leans the weight toward your inner Driver. Raven reads this as a sidereal lean.`,
      balanceMeterClimate: {
        magnitude: 3,
        valence: "drag" as const,
        volatility: "mixed" as const,
        sfdVerdict: "Stirring with Drag",
        housePlacement: "House of Maintenance (work/health rhythm)",
        narrative:
          "The week trends at ⚡⚡⚡ 3 Stirring with 🌑 Drag—steady pull with a headwind in routines.",
      },
      poemLine:
        "The compass spins, a restless heart. A whispered promise, barely heard.",
      sessionId: generateId(),
    };
  };

  // Function to handle ping feedback
  const handlePingFeedback = (
    messageId: string,
    response: PingResponse,
    note?: string,
  ) => {
    // Get checkpoint type for analytics
    const message = messages.find((m) => m.id === messageId);
    const checkpointType = message
      ? getPingCheckpointType(message.html)
      : "general";
    const messageContent = message ? message.html : "";

    pingTracker.recordFeedback(
      messageId,
      response,
      note,
      checkpointType,
      messageContent,
    );

    // Update messages state to mark feedback as recorded
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, pingFeedbackRecorded: true } : msg,
      ),
    );

    // Automatically trigger follow-up response from Raven based on feedback
    setTimeout(() => {
      let followUpText = "";

      if (response === "yes") {
        followUpText = "yes, that resonates with me";
      } else if (response === "no") {
        followUpText = "that doesn't feel familiar to me";
      } else if (response === "maybe") {
        followUpText = "that partially resonates, but not completely";
      } else if (response === "unclear") {
        followUpText = "that feels confusing or unclear to me";
      }

      if (note) {
        followUpText += `. ${note}`;
      }

      // Send the feedback to trigger Raven's follow-up
      sendProgrammatic(followUpText);
    }, 500); // Small delay to let the "feedback recorded" state show
  };

  // Register pending items for initial probes if not answered
  useEffect(() => {
    messages.forEach((m) => {
      if (m.role === "raven" && containsInitialProbe(m.html)) {
        const existing = pingTracker.getFeedback(m.id);
        if (!existing) {
          pingTracker.registerPending(
            m.id,
            getPingCheckpointType(m.html),
            m.html,
          );
        }
      }
    });
  }, [messages]);

  // Get Raven messages for navigation
  const ravenMessages = messages.filter((m) => m.role === "raven");

  // Auto-advance to latest Raven message when it appears
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last && last.role === "raven") {
      const idx = ravenMessages.findIndex((r) => r.id === last.id);
      if (idx !== -1) setCurrentRavenIndex(idx);
    }
  }, [messages, ravenMessages.length]);

  const SCROLL_OFFSET = 120; // header + nav panel padding
  const scrollMessageElementIntoView = (el: HTMLElement) => {
    const container = streamContainerRef.current;
    if (container) {
      const target = el.offsetTop - SCROLL_OFFSET;
      container.scrollTo({ top: target < 0 ? 0 : target, behavior: "smooth" });
    } else {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const scrollToRavenMessage = (index: number) => {
    const ravenMessage = ravenMessages[index];
    if (!ravenMessage) return;
    const element = document.getElementById(`message-${ravenMessage.id}`);
    if (element) {
      scrollMessageElementIntoView(element);
      setCurrentRavenIndex(index);
    }
  };

  const scrollToTop = () => {
    streamContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollHint(false);
  };

  // Position Raven responses optimally for reading, user messages scroll to bottom
  useEffect(() => {
    if (!typing) {
      // Skip auto-scroll on very first mount so intro card is not obscured by sticky header
      if (messages.length === 1 && messages[0]?.id === "init") return;
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === "raven") {
        const element = document.getElementById(`message-${lastMessage.id}`);
        if (element) scrollMessageElementIntoView(element);
      }
    }
  }, [typing, messages]);

  // Auto-scroll immediately for new user messages to bottom
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "user") {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  // Auto-scroll to new Raven messages when they start (empty content means just created)
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "raven" && lastMessage.html === "") {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        const element = document.getElementById(`message-${lastMessage.id}`);
        if (element) scrollMessageElementIntoView(element);
      }, 100);
    }
  }, [messages.length]);

  // Check if user has manually scrolled away from reading position during streaming
  useEffect(() => {
    if (!streamContainerRef.current) return;

    const container = streamContainerRef.current;

    const handleScroll = () => {
      if (typing) {
        // More lenient check - only show hint if user scrolls significantly up from current content
        const isSignificantlyScrolledUp =
          container.scrollTop + container.clientHeight <
          container.scrollHeight - 200;
        setShowScrollHint(isSignificantlyScrolledUp);
      }
    };

    container.addEventListener("scroll", handleScroll);

    // Don't show hint initially when typing starts - let Raven position naturally
    if (!typing) {
      setShowScrollHint(false);
    }

    return () => container.removeEventListener("scroll", handleScroll);
  }, [typing]);

  function toggleReportCollapse(messageId: string) {
    setMessages((m) =>
      m.map((msg) =>
        msg.id === messageId ? { ...msg, collapsed: !msg.collapsed } : msg,
      ),
    );
  }

  function removeReport(messageId: string) {
    setMessages((m) => m.filter((msg) => msg.id !== messageId));
  }

  async function analyzeReportContext(
    reportContext: ReportContext,
    contextsForPayload?: ReportContext[],
  ) {
    if (typing) return; // Don't start if already processing

    setTyping(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    // Create optimistic placeholder for Raven's response
    const ravenId = generateId();
    setMessages((m: Message[]) => [
      ...m,
      {
        id: ravenId,
        role: "raven",
        html: "",
        climate: "",
        hook: "",
        intent: undefined,
        probe: null,
        draft: null,
        prov: null,
      },
    ]);

    try {
      const relocationPayload = mapRelocationToPayload(reportContext.relocation);
      const baseContexts = contextsForPayload ?? reportContexts;
      const contextsToSend = baseContexts.some((ctx) => ctx.id === reportContext.id)
        ? baseContexts
        : [...baseContexts, reportContext];
      const payload = {
        input: reportContext.content,
        sessionId: ravenSessionId ?? undefined,
        options: {
          reportType: reportContext.type,
          reportId: reportContext.id,
          reportName: reportContext.name,
          reportSummary: reportContext.summary,
          ...(relocationPayload ? { relocation: relocationPayload } : {}),
          reportContexts: contextsToSend.map((rc) => {
            const ctxRelocation = mapRelocationToPayload(rc.relocation);
            return {
              id: rc.id,
              type: rc.type,
              name: rc.name,
              summary: rc.summary,
              content: rc.content,
              ...(ctxRelocation ? { relocation: ctxRelocation } : {}),
            };
          }),
        },
      };
      const res = await fetch("/api/raven", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      const data: RavenDraftResponse = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        const fallback =
          typeof data?.error === "string"
            ? data.error
            : res.ok
              ? "Raven could not analyze that report."
              : `Request failed (${res.status})`;
        commitRavenError(ravenId, fallback);
        return;
      }
      applyRavenResponse(ravenId, data, "No mirror returned for this report.");
    } catch (e: any) {
      if (e?.name === "AbortError") {
        commitRavenError(ravenId, "Report analysis cancelled.");
      } else {
        console.error("Report analysis failed:", e);
        commitRavenError(ravenId, "Analysis error. Try again.");
      }
    } finally {
      setTyping(false);
      abortRef.current = null;
    }
  }

  function removeReportContext(contextId: string) {
    setReportContexts((prev) => prev.filter((ctx) => ctx.id !== contextId));
    // Update relocation from remaining reports
    const remaining = reportContexts.filter((ctx) => ctx.id !== contextId);
    if (remaining.length > 0) {
      setRelocation(remaining[remaining.length - 1].relocation || null);
    } else {
      setRelocation(null);
    }
  }

  async function analyzeUploadedReport(fileMessage: Message) {
    if (typing) return; // Don't start if already processing

    setTyping(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    // Create optimistic placeholder for Raven's response
    const ravenId = generateId();
    setMessages((m: Message[]) => [
      ...m,
      {
        id: ravenId,
        role: "raven",
        html: "",
        climate: "",
        hook: "",
        intent: undefined,
        probe: null,
        draft: null,
        prov: null,
      },
    ]);

    try {
      const payload = {
        input: fileMessage.fullContent || fileMessage.html,
        sessionId: ravenSessionId ?? undefined,
        options: {
          reportContexts: reportContexts.map((rc) => {
            const ctxRelocation = mapRelocationToPayload(rc.relocation);
            return {
              id: rc.id,
              type: rc.type,
              name: rc.name,
              summary: rc.summary,
              content: rc.content,
              ...(ctxRelocation ? { relocation: ctxRelocation } : {}),
            };
          }),
        },
      };
      const res = await fetch("/api/raven", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      const data: RavenDraftResponse = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        const fallback =
          typeof data?.error === "string"
            ? data.error
            : res.ok
              ? "Raven could not process that upload."
              : `Request failed (${res.status})`;
        commitRavenError(ravenId, fallback);
        return;
      }
      applyRavenResponse(ravenId, data, "No mirror returned for this upload.");
    } catch (e: any) {
      if (e?.name === "AbortError") {
        commitRavenError(ravenId, "Upload analysis cancelled.");
      } else {
        console.error("Upload analysis error:", e);
        commitRavenError(ravenId, "Analysis error. Try again.");
      }
    } finally {
      setTyping(false);
      abortRef.current = null;
    }
  }

  // Function to send a message programmatically (for automatic follow-ups)
  async function sendProgrammatic(text: string) {
    if (!text.trim()) return;

    // Abort any in-flight stream before starting new one
    if (abortRef.current) {
      try {
        abortRef.current.abort();
      } catch {}
    }

    const userMsg: Message = {
      id: generateId(),
      role: "user",
      html: escapeHtml(text),
    };
    setMessages((m: Message[]) => [...m, userMsg]);
    setTyping(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const ravenId = generateId();
    setMessages((m: Message[]) => [
      ...m,
      {
        id: ravenId,
        role: "raven",
        html: "",
        climate: "",
        hook: "",
        intent: undefined,
        probe: null,
        draft: null,
        prov: null,
      },
    ]);

    try {
      const relocationPayload = mapRelocationToPayload(relocation);
      const payload = {
        input: text,
        sessionId: ravenSessionId ?? undefined,
        options: {
          reportContexts: reportContexts.map((rc) => {
            const ctxRelocation = mapRelocationToPayload(rc.relocation);
            return {
              id: rc.id,
              type: rc.type,
              name: rc.name,
              summary: rc.summary,
              content: rc.content,
              ...(ctxRelocation ? { relocation: ctxRelocation } : {}),
            };
          }),
          ...(relocationPayload ? { relocation: relocationPayload } : {}),
        },
      };
      const res = await fetch("/api/raven", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      const data: RavenDraftResponse = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        const fallback =
          typeof data?.error === "string"
            ? data.error
            : res.ok
              ? "Raven could not complete that request."
              : `Request failed (${res.status})`;
        commitRavenError(ravenId, fallback);
        return;
      }
      applyRavenResponse(ravenId, data, "No mirror returned for this lane.");
    } catch (error: any) {
      if (error?.name === "AbortError") {
        commitRavenError(ravenId, "Request cancelled.");
      } else {
        console.error("Raven request failed:", error);
        commitRavenError(ravenId, "Error: Failed to reach Raven API.");
      }
    } finally {
      setTyping(false);
      abortRef.current = null;
    }
  }

  async function send() {
    const text = input.trim();
    if (!text) return;
    // If sealing just happened, provide contextual nudge before sending
    if (awaitingNewReadingGuide) {
      const plain = text.toLowerCase();
      const kw = plain.replace(/<[^>]*>/g, "");
      const sameThread = (() => {
        const tokens = kw.split(/\s+/).filter(Boolean);
        let overlap = 0;
        const setPrev = new Set(priorFocusKeywords);
        for (const t of tokens)
          if (setPrev.has(t)) {
            overlap++;
            if (overlap >= 2) break;
          }
        const hint =
          /(same|continue|resume|again|back to|still on|pick up|that topic|previous)/i;
        return overlap >= 2 || hint.test(text);
      })();
      const line = sameThread
        ? "We can open a fresh reading on the same thread—say the word and I’ll start a new mirror."
        : "Got it—starting a new reading for this.";
      const guideId = generateId();
      setMessages((m: Message[]) => [
        ...m,
        { id: guideId, role: "raven", html: line, climate: "", hook: "" },
      ]);
      setAwaitingNewReadingGuide(false);
    }
    // Abort any in-flight stream before starting new one
    if (abortRef.current) {
      try {
        abortRef.current.abort();
      } catch {}
    }
    const userMsg: Message = {
      id: generateId(),
      role: "user",
      html: escapeHtml(text),
    };
    setMessages((m: Message[]) => [...m, userMsg]);
    setInput("");
    setTyping(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const ravenId = generateId();
    setMessages((m: Message[]) => [
      ...m,
      {
        id: ravenId,
        role: "raven",
        html: "",
        climate: "",
        hook: "",
        intent: undefined,
        probe: null,
        draft: null,
        prov: null,
      },
    ]);
    try {
      const relocationPayload = mapRelocationToPayload(relocation);
      const payload = {
        input: text,
        sessionId: ravenSessionId ?? undefined,
        options: {
          reportContexts: reportContexts.map((rc) => {
            const ctxRelocation = mapRelocationToPayload(rc.relocation);
            return {
              id: rc.id,
              type: rc.type,
              name: rc.name,
              summary: rc.summary,
              content: rc.content,
              ...(ctxRelocation ? { relocation: ctxRelocation } : {}),
            };
          }),
          ...(relocationPayload ? { relocation: relocationPayload } : {}),
        },
      };
      const res = await fetch("/api/raven", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      const data: RavenDraftResponse = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        const fallback =
          typeof data?.error === "string"
            ? data.error
            : res.ok
              ? "Raven could not complete that request."
              : `Request failed (${res.status})`;
        commitRavenError(ravenId, fallback);
        return;
      }
      applyRavenResponse(ravenId, data, "No mirror returned for this lane.");
    } catch (e: any) {
      if (e?.name === "AbortError") {
        commitRavenError(ravenId, "Request cancelled.");
      } else {
        console.error("Raven request failed:", e);
        commitRavenError(ravenId, "Error: Failed to reach Raven API.");
      }
    } finally {
      setTyping(false);
      abortRef.current = null;
    }
  }

  const handleFileSelect = (type: "mirror" | "balance" | "journal") => {
    setUploadType(type);
    fileInputRef.current?.click();
  };

  const requestPoeticInsert = () => {
    const poeticText =
      "Please create a Symbol-to-Poem translation based on the Mirror data you have. Follow the strict Symbol-to-Song Translation protocol with pure poem first, then explanation table with planetary emoji codes.";
    sendProgrammatic(poeticText);
  };

  const requestPoeticCard = () => {
    const cardText =
      "Please create a Poetic Index Card for download. Generate both the symbol-to-poem translation AND the visual card data with title, poetic phrase, mirror prompt, and dominant planetary theme for a portrait-format card.";
    sendProgrammatic(cardText);
  };

  const generateVisualCard = async (cardData?: PoeticIndexCard) => {
    // Lazy import parser/generator only when needed in the browser
    const { parseCardFromResponse, createSampleCard } = await import(
      "../lib/poetics/parser"
    );
    const { generateCardHTML } = await import(
      "../lib/poetics/card-generator"
    );

    // If no card data provided, try to parse from last Raven response
    let card = cardData;

    if (!card) {
      const lastRavenMessage = messages.filter((m) => m.role === "raven").pop();
      if (lastRavenMessage) {
        // Strip HTML before parsing into a PoeticIndexCard structure
        const parsed = parseCardFromResponse(stripHtml(lastRavenMessage.html));
        if (parsed) card = parsed;
      }
    }

    // If still no card, create a sample card for demonstration
    if (!card) {
      card = createSampleCard();
    }

    const html = generateCardHTML(card);

    // Try to open in new window first
    const newWindow = window.open("", "_blank");
    if (newWindow) {
      newWindow.document.write(html);
      newWindow.document.close();
    } else {
      // Fallback: show modal if popup blocked
      showCardModal(html);
    }
  };

  const showCardModal = (cardHTML: string) => {
    // Create modal overlay
    const modal = document.createElement("div");
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;

    // Create modal content
    const modalContent = document.createElement("div");
    modalContent.style.cssText = `
      max-width: 90%;
      max-height: 90%;
      overflow: auto;
      background: white;
      border-radius: 12px;
      position: relative;
    `;

    // Create close button
    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "✕";
    closeBtn.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(0,0,0,0.8);
      color: white;
      border: none;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      cursor: pointer;
      z-index: 10001;
      font-size: 16px;
    `;

    // Create iframe for card
    const iframe = document.createElement("iframe");
    iframe.style.cssText = `
      width: 480px;
      height: 680px;
      border: none;
      border-radius: 12px;
    `;
    iframe.srcdoc = cardHTML;

    modalContent.appendChild(closeBtn);
    modalContent.appendChild(iframe);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Close handlers
    const closeModal = () => document.body.removeChild(modal);
    closeBtn.onclick = closeModal;
    modal.onclick = (e) => {
      if (e.target === modal) closeModal();
    };
  };

  const requestDemoCard = async () => {
    // Generate a demo card directly without requiring mirror data
    const { createDemoCard } = await import("../lib/poetics/card-generator");
    const demoCard = createDemoCard();
    generateVisualCard(demoCard);
  };

  const requestAbout = () => {
    const aboutMessage: Message = {
      id: generateId(),
      role: "raven",
      html: "I am the creation of Dan Cross, born from his compulsion to systematize survival into something transferable. I read the symbolic patterns of your reality without imposing my creator's story on yours.",
      climate: "🔍 Truth · 🌐 Origin · 🎯 Purpose",
      hook: "Creator & Created · Pattern ↔ Recognition",
    };
    setMessages((m) => [...m, aboutMessage]);
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    let content: string;
    let relocationSummary: RelocationSummary | null = null;

    // Handle PDF files using PDF.js
    if (
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf")
    ) {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        // Use CDN worker or host locally if you prefer
        (pdfjsLib as any).GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .filter((item) => "str" in item)
            .map((item) => (item as any).str)
            .join(" ");
          fullText += pageText + "\n\n";
        }

        content = fullText.trim();
      } catch (error) {
        console.error("Error extracting PDF text:", error);
        alert("Failed to extract text from PDF. Please try a different file.");
        return;
      }
    } else {
      // Handle text files using FileReader
      content = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
      });
    }

    // Try to parse as JSON for better formatting
    let displayContent = content;
    let reportInfo = "";
    let inferredType: "mirror" | "balance" | "journal" | null = null;

    try {
      const jsonData = JSON.parse(content);
      if (jsonData.context && jsonData.balance_meter) {
        // This is a WovenWebApp JSON report
        const { context, balance_meter } = jsonData;
        // compute relocation summary if available
        try {
          const provenance = jsonData.provenance || context.provenance || null;
          if (context?.translocation || provenance?.relocation_mode) {
            const trans = context?.translocation || {};
            relocationSummary = summarizeRelocation({
              // @ts-ignore allow flexible json
              type: jsonData.type || "balance",
              natal: context.natal || {
                name: "",
                birth_date: "",
                birth_time: "",
                birth_place: "",
              },
              translocation: {
                applies: Boolean(trans?.applies ?? provenance?.relocation_mode),
                method: trans?.method || trans?.mode,
                mode: trans?.mode,
                current_location: trans?.current_location || "Natal Base",
                label: trans?.label,
                house_system: trans?.house_system,
                tz: trans?.tz,
                timezone: trans?.timezone,
                coords: trans?.coords || null,
                coordinates: trans?.coordinates || null,
                zodiac_type: trans?.zodiac_type,
              },
              provenance,
              relocation_mode:
                provenance?.relocation_mode || trans?.mode || trans?.method || null,
              relocation_label:
                provenance?.relocation_label ||
                trans?.label ||
                trans?.current_location ||
                null,
            } as any);
            setRelocation(relocationSummary);
          } else {
            setRelocation(null);
          }
        } catch {
          setRelocation(null);
        }
        reportInfo = `JSON Report for ${context.natal?.name || "Unknown"} | Magnitude: ${balance_meter.magnitude?.value} (${balance_meter.magnitude?.term}) | Valence: ${balance_meter.valence?.emoji} ${balance_meter.valence?.term}`;
        displayContent = JSON.stringify(jsonData, null, 2);
        // Heuristic: presence of 'reports.templates.solo_mirror' or 'mirror' wording indicates mirror vs balance
        if (
          jsonData.reports?.templates?.solo_mirror ||
          /solo mirror/i.test(content)
        ) {
          inferredType = "mirror";
        } else {
          inferredType = "balance";
        }
      }
    } catch {
      // Not JSON or invalid JSON, use original content
      setRelocation(null);
    }

    // Apply frontstage cleanse for non-JSON plain text (avoid mutating raw JSON structures)
    const isLikelyJson =
      displayContent.trim().startsWith("{") &&
      displayContent.trim().endsWith("}");
    const frontstageDisplay = !isLikelyJson
      ? cleanseFrontstage(displayContent)
      : displayContent;
    const resolvedType = uploadType || inferredType || "balance";

    // Create report context entry
    const reportContext: ReportContext = {
      id: generateId(),
      type: resolvedType,
      name: reportInfo
        ? reportInfo.split("|")[0].trim()
        : `${uploadType || "Balance"} Report`,
      summary: [
        reportInfo,
        relocationSummary?.disclosure || null,
        relocationSummary?.status || null,
      ]
        .filter(Boolean)
        .join(" • "),
      content: content,
      relocation: relocationSummary || undefined,
    };

    // Add to contexts (allow multiple reports) and include immediately for analysis
    const contextsForAnalysis = [
      ...reportContexts.filter((ctx) => ctx.id !== reportContext.id),
      reportContext,
    ];
    setReportContexts(contextsForAnalysis);

    // Update relocation from most recent report
    setRelocation(relocationSummary);

    // Automatically trigger analysis for the new report context
    await analyzeReportContext(reportContext, contextsForAnalysis);

    // No longer create a message - reports are now just context
    // Track mirror data for poetic insert availability
    if (
      resolvedType === "mirror" ||
      (reportInfo && reportInfo.includes("JSON Report"))
    ) {
      setHasMirrorData(true);
    }

    // Reset file input to allow uploading the same file again
    if (event.target) {
      (event.target as HTMLInputElement).value = "";
    }
  };

  function stop() {
    abortRef.current?.abort();
  }

  function pickHook(text: string) {
    if (/dream|sleep/i.test(text)) return "Duty & Dreams · Saturn ↔ Neptune";
    if (/private|depth|shadow/i.test(text))
      return "Private & Piercing · Mercury ↔ Pluto";
    if (/restless|ground/i.test(text))
      return "Restless & Grounded · Pluto ↔ Moon";
    return undefined;
  }

  function pushIntentToast(intent?: Intent) {
    const message = getIntentToast(intent);
    if (!message) return;
    setToast(message);
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), 3200);
  }

  function commitRavenResult(
    ravenId: string,
    response: RavenDraftResponse,
    fallbackMessage?: string,
  ) {
    const guidance =
      typeof response?.guidance === "string" ? response.guidance.trim() : "";
    const html = response?.draft
      ? formatShareableDraft(response.draft, response.prov ?? null)
      : guidance
        ? `<div class="raven-guard" style="font-size:13px; line-height:1.5; color:var(--muted); white-space:pre-line;">${escapeHtml(guidance)}</div>`
        : fallbackMessage
          ? `<p>${escapeHtml(fallbackMessage)}</p>`
          : "<i>No mirror returned.</i>";
    const climateDisplay = formatClimate(response?.climate ?? undefined);
    const hook = formatIntentHook(response?.intent, response?.prov ?? null);
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== ravenId) return msg;
        return {
          ...msg,
          html,
          climate: climateDisplay ?? msg.climate,
          hook: hook ?? msg.hook,
          intent: response.intent ?? msg.intent,
          probe: response.probe ?? null,
          draft: response.draft ?? null,
          prov: response.prov ?? null,
        };
      }),
    );
  }

  function applyRavenResponse(
    ravenId: string,
    response: RavenDraftResponse,
    fallbackMessage?: string,
  ) {
    if (response.sessionId) {
      setRavenSessionId(response.sessionId);
    }
    pushIntentToast(response.intent);
    commitRavenResult(ravenId, response, fallbackMessage);
  }

  function commitRavenError(ravenId: string, message: string) {
    const html = `<i>${escapeHtml(message)}</i>`;
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === ravenId
          ? { ...msg, html, climate: undefined, hook: undefined }
          : msg,
      ),
    );
  }

  // (legacy local escapeHtml retained above for global use)
  function wait(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  return (
    <div
      className="app"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        maxWidth: 980,
        margin: "0 auto",
      }}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
        accept=".txt, .md, .json, .pdf"
      />
      <Header
        onFileSelect={handleFileSelect}
        hasMirrorData={hasMirrorData}
        onPoeticInsert={requestPoeticInsert}
        onAbout={requestAbout}
        onToggleSidebar={() => {}}
        sidebarOpen={false}
        reportContexts={reportContexts}
        onRemoveReportContext={removeReportContext}
        onPoeticCard={() => {
          generateVisualCard();
        }}
        onDemoCard={() => {
          requestDemoCard();
        }}
        onShowWrapUp={() => setShowWrapUpCard(true)}
        onShowPendingReview={() => setShowPendingReview(true)}
        onShowHelp={() => setShowHelp(true)}
        devMode={devMode}
      showPoeticMenu={showPoeticMenu}
      setShowPoeticMenu={setShowPoeticMenu}
    />
      {relocation && <RelocationBanner summary={relocation} />}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 76,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(30, 41, 59, 0.92)",
            color: "#e2e8f0",
            padding: "10px 16px",
            borderRadius: 12,
            border: "1px solid rgba(148, 163, 184, 0.28)",
            boxShadow: "0 12px 32px rgba(15, 23, 42, 0.35)",
            fontSize: 13,
            zIndex: 1200,
            letterSpacing: "0.02em",
          }}
        >
          {toast}
        </div>
      )}
      {/* Tiny hand-off banner confirming FIELD → MAP → VOICE context with Balance Meter terms */}
      {showMbBanner && mbLastSession && (
        <div className="flex items-center justify-center gap-3 px-3 py-2 bg-[var(--panel)] border-b border-[var(--line)] text-[13px]">
          {(() => {
            const s = mbLastSession.summary || {};
            const start = mbLastSession.inputs?.startDate;
            const end = mbLastSession.inputs?.endDate;
            const range =
              start && end ? `${start} → ${end}` : start || end || "recent";
            const mag =
              typeof s.magnitude === "number" ? s.magnitude : undefined;
            const magLabel =
              (s as any).magnitudeLabel ||
              (mag !== undefined ? `M${mag}` : "M·");
            const valLabel = (s as any).valenceLabel || "Valence";
            const volLabel = (s as any).volatilityLabel || "Volatility";
            return (
              <div className="flex items-center gap-2 text-[var(--muted)]">
                <span className="text-[var(--text)]">
                  Balance Meter hand‑off
                </span>
                <span>•</span>
                <span className="text-[var(--text)]">{magLabel}</span>
                <span>·</span>
                <span>{valLabel}</span>
                <span>·</span>
                <span>{volLabel}</span>
                <span>•</span>
                <span>{range}</span>
                <span>•</span>
                <span>Clear Mirror — OSR valid if it doesn’t land</span>
                <button
                  onClick={() => setShowMbBanner(false)}
                  className="ml-2 rounded px-2 py-0.5 text-[12px] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]"
                  aria-label="Dismiss hand-off banner"
                >
                  ×
                </button>
              </div>
            );
          })()}
        </div>
      )}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {/* Resume from Math Brain pill (v1.7) */}
      {showMbResume && mbLastSession?.summary && (
        <div className="flex justify-center px-3 py-2 bg-[var(--panel)] border-b border-[var(--line)]">
          {(() => {
            const mag = Number(mbLastSession.summary?.magnitude || 0);
            const val = Number(mbLastSession.summary?.valence || 0);
            const vol = Number(mbLastSession.summary?.volatility || 0);
            const climate = formatFullClimateDisplay({
              magnitude: mag,
              valence: val,
              volatility: vol,
            } as ClimateData);
            const start = mbLastSession.inputs?.startDate;
            const end = mbLastSession.inputs?.endDate;
            const a = mbLastSession.inputs?.personA?.name || "Person A";
            const b =
              mbLastSession.inputs?.includePersonB &&
              mbLastSession.inputs?.personB?.name
                ? ` · with ${mbLastSession.inputs?.personB?.name}`
                : "";
            const range =
              start && end ? `${start} → ${end}` : start || end || "recent";
            const loadContext = () => {
              const prompt = `Resume from Math Brain (${range}). Climate: ${climate}. Continue with a concise mirror in Raven Calder style for ${a}${b}.`;
              setInput(prompt);
              const preface: Message = {
                id: generateId(),
                role: "raven",
                html: `<i>Loaded Math Brain context • ${climate} • ${range}</i>`,
                climate,
                hook: "Math Brain → Poetic Brain",
              };
              setMessages((prev) => [...prev, preface]);
              setShowMbResume(false);
            };
            return (
              <div className="flex items-center gap-2 border border-[var(--line)] bg-[var(--soft)] rounded-lg px-3 py-2 max-w-[900px] w-full">
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-[var(--muted)]">
                    Resume from Math Brain
                  </div>
                  <div className="text-[13px] text-[var(--text)] truncate">
                    {climate} · {range}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={loadContext}
                    className="btn text-[12px] px-2 py-1"
                  >
                    Load context
                  </button>
                  <button
                    onClick={() => setShowMbResume(false)}
                    className="btn text-[12px] px-2 py-1 bg-transparent"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}
      <NavigationPanel
        ravenMessages={ravenMessages}
        scrollToTop={scrollToTop}
        scrollToRavenMessage={scrollToRavenMessage}
        currentRavenIndex={currentRavenIndex}
        scrollToBottom={scrollToBottom}
      />
      <main className="relative grid flex-1 grid-cols-[270px_1fr] gap-3 overflow-hidden p-3 min-h-0">
        <Sidebar
          onInsert={(m) => {
            // Send the message programmatically to trigger Raven's response
            const text = m.html || m.content || "";
            if (text) {
              sendProgrammatic(text);
            }
          }}
          hasMirrorData={hasMirrorData}
        />
        <Stream
          messages={messages}
          typing={typing}
          endRef={endRef}
          containerRef={streamContainerRef}
          onToggleCollapse={toggleReportCollapse}
          onRemove={removeReport}
          onPingFeedback={handlePingFeedback}
        />
        {/* Scroll hint button */}
        {showScrollHint && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-5 right-5 z-[1000] flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-[0_4px_12px_rgba(124,92,255,0.3)]"
            title="Return to current response"
          >
            ↓
          </button>
        )}
      </main>

      {/* End Current Reading Button - Subtle placement */}
      <div className="flex items-center justify-end border-t border-[var(--line)] bg-[var(--bg)] px-[18px] py-2">
        <button
          className="btn cursor-pointer rounded-[10px] border border-[var(--line)] bg-transparent px-2 py-1 text-[11px] text-[var(--muted)] opacity-60 transition-opacity hover:opacity-100"
          onClick={() => setShowReadingSummary(true)}
          title="End current reading and show comprehensive summary"
        >
          🔮 End Reading
        </button>
      </div>

      <Composer
        input={input}
        setInput={setInput}
        onSend={send}
        onStop={stop}
        disabled={typing}
      />
      {/* Actor/Role Wrap-Up Card (appears only at wrap-up; offers optional rubric) */}
      {showWrapUpCard && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
        >
          <WrapUpCard
            onClose={() => setShowWrapUpCard(false)}
            onSealed={(sealedId, nextId) => {
              // Drop a gentle Raven line post-seal
              const ravenId = crypto.randomUUID();
              setMessages((m: Message[]) => [
                ...m,
                {
                  id: ravenId,
                  role: "raven",
                  html: `Thanks for scoring. I’ve sealed that reading. If you want to look at something new, we’ll start fresh from here.`,
                  climate: "",
                  hook: "",
                },
              ]);
              // Capture prior focus keywords from last 6 user messages
              const lastUsers = [...messages]
                .filter((m) => m.role === "user")
                .slice(-6);
              const textBlob = lastUsers
                .map((u) => u.html.replace(/<[^>]*>/g, "").toLowerCase())
                .join(" ");
              const tokens = textBlob
                .replace(/[^a-z0-9\s\-]/g, " ")
                .split(/\s+/)
                .filter((t) => t.length > 2);
              const freq: Record<string, number> = {};
              for (const t of tokens) freq[t] = (freq[t] || 0) + 1;
              const top = Object.entries(freq)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 12)
                .map(([k]) => k);
              setPriorFocusKeywords(top);
              setAwaitingNewReadingGuide(true);
            }}
          />
        </div>
      )}
      {/* Pending Review Sheet */}
      {showPendingReview && (
        <PendingReviewSheet onClose={() => setShowPendingReview(false)} />
      )}

      {/* Reading Summary Card */}
      {showReadingSummary && (
        <ReadingSummaryCard
          data={generateReadingSummaryData()}
          onClose={() => setShowReadingSummary(false)}
          onGenerateJournal={generateJournalEntry}
          onStartNewReading={() => {
            setShowReadingSummary(false);
            // Reset session context for new reading while preserving conversation
            setSessionContext({
              sessionStart: Date.now(),
              actorProfile: null,
              wbHits: [],
              abeHits: [],
              osrMisses: [],
              actorWeighting: 0,
              roleWeighting: 0,
              driftIndex: 0,
              currentComposite: undefined,
              sessionActive: true,
            });
          }}
        />
      )}
    </div>
  );
}

function Header({
  onFileSelect,
  hasMirrorData,
  onPoeticInsert,
  onPoeticCard,
  onDemoCard,
  onAbout,
  onToggleSidebar,
  sidebarOpen,
  reportContexts,
  onRemoveReportContext,
  onShowWrapUp,
  onShowPendingReview,
  onShowHelp,
  devMode,
  showPoeticMenu,
  setShowPoeticMenu,
}: {
  onFileSelect: (type: "mirror" | "balance" | "journal") => void;
  hasMirrorData: boolean;
  onPoeticInsert: () => void;
  onPoeticCard: () => void;
  onDemoCard: () => void;
  onAbout: () => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  reportContexts: ReportContext[];
  onRemoveReportContext: (contextId: string) => void;
  onShowWrapUp: () => void;
  onShowPendingReview: () => void;
  onShowHelp: () => void;
  devMode?: boolean;
  showPoeticMenu: boolean;
  setShowPoeticMenu: (show: boolean) => void;
}) {
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    setPendingCount(pingTracker.getPendingCount(true));
    const id = setInterval(
      () => setPendingCount(pingTracker.getPendingCount(true)),
      5000,
    );
    return () => clearInterval(id);
  }, []);

  // Close poetic menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowPoeticMenu(false);
    if (showPoeticMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showPoeticMenu]);

  /* TEMPORARILY DISABLED FOR DEPLOYMENT
  const downloadSessionReport = async (format: "json" | "pdf" = "json") => {
    try {
      const sessionId = pingTracker.getCurrentSessionId();
      const diagnostics = pingTracker.exportSessionDiagnostics();
      const stats = pingTracker.getHitRateStats(true);
      const allFeedback = pingTracker.getAllFeedback();

      // Generate comprehensive developer report
      const reportData = {
        metadata: {
          sessionId,
          exportDate: new Date().toISOString(),
          exportedBy: "DH Cross (Developer)",
          version: "1.0.0",
          totalMessages: messages.length,
          ravenMessages: messages.filter((m) => m.role === "raven").length,
          userMessages: messages.filter((m) => m.role === "user").length,
        },
        sessionDiagnostics: diagnostics,
        resonanceStats: stats,
        messages: messages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          timestamp: new Date().toISOString(),
          content: msg.html.replace(/<[^>]*>/g, ""), // Strip HTML for analysis
          isReport: msg.isReport || false,
          reportType: msg.reportType || null,
          climate: msg.climate || "",
          hook: msg.hook || "",
          pingFeedbackRecorded: msg.pingFeedbackRecorded || false,
        })),
        feedbackData: allFeedback.filter((f) => f.sessionId === sessionId),
        reportContexts: reportContexts.map((rc) => ({
          id: rc.id,
          type: rc.type,
          name: rc.name,
          summary: rc.summary,
          contentLength: rc.content.length,
          relocation: mapRelocationToPayload(rc.relocation) ?? null,
        })),
        relocationContext: mapRelocationToPayload(relocation) ?? null,
        sessionFlags: {
          hasMirrorData,
          awaitingNewReadingGuide,
          priorFocusKeywords,
        },
      };

      if (format === "pdf") {
        // Generate PDF report
        await generatePDFReport(reportData, sessionId);
      } else {
        // Download as JSON
        const blob = new Blob([JSON.stringify(reportData, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `raven-dev-session-${sessionId.slice(-8)}-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      setToast(`Session report (${format.toUpperCase()}) downloaded`);
      setTimeout(() => setToast(null), 2000);

      console.log("[DEV] Session report exported:", {
        sessionId,
        messagesCount: messages.length,
        feedbackCount: allFeedback.filter((f) => f.sessionId === sessionId)
          .length,
        accuracy: stats.accuracyRate,
        resonanceFidelity:
          stats.total > 0
            ? (
                ((stats.breakdown.yes + stats.breakdown.maybe * 0.5) /
                  stats.total) *
                100
              ).toFixed(1) + "%"
            : "N/A",
      });
    } catch (error) {
      console.error("[DEV] Session export failed:", error);
      setToast("Export failed - check console");
      setTimeout(() => setToast(null), 2000);
    }
  };

  const generatePDFReport = async (reportData: any, sessionId: string) => {
    try {
      // Create HTML content for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Raven Session Report - ${sessionId.slice(-8)}</title>
          <style>
            body { font-family: 'Inter', Arial, sans-serif; margin: 40px; color: #333; line-height: 1.6; }
            .header { border-bottom: 3px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: 700; color: #1e293b; margin: 0; }
            .subtitle { color: #64748b; margin: 5px 0 0 0; font-size: 14px; }
            .section { margin: 25px 0; }
            .section-title { font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 15px; border-left: 4px solid #3b82f6; padding-left: 12px; }
            .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
            .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; }
            .stat-label { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 5px; }
            .stat-value { font-size: 24px; font-weight: 700; color: #1e293b; }
            .message { margin: 10px 0; padding: 12px; border-radius: 6px; }
            .message.user { background: #dbeafe; border-left: 3px solid #3b82f6; }
            .message.raven { background: #f3e8ff; border-left: 3px solid #8b5cf6; }
            .message-role { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
            .feedback-item { background: #fef3c7; border: 1px solid #fbbf24; border-radius: 4px; padding: 8px; margin: 5px 0; font-size: 12px; }
            .metadata { background: #f1f5f9; border-radius: 6px; padding: 15px; font-size: 12px; color: #475569; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">🎭 Raven Session Report</h1>
            <p class="subtitle">Developer Research Export • Session ${sessionId.slice(-8)} • ${new Date().toLocaleDateString()}</p>
          </div>

          <div class="section">
            <h2 class="section-title">📊 Session Overview</h2>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-label">Total Messages</div>
                <div class="stat-value">${reportData.metadata.totalMessages}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Raven Responses</div>
                <div class="stat-value">${reportData.metadata.ravenMessages}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">User Messages</div>
                <div class="stat-value">${reportData.metadata.userMessages}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Accuracy Rate</div>
                <div class="stat-value">${reportData.resonanceStats.accuracyRate.toFixed(1)}%</div>
              </div>
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">🎯 Resonance Analysis</h2>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-label">✅ WB (Within Boundary)</div>
                <div class="stat-value">${reportData.resonanceStats.breakdown.yes}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">🟡 ABE (At Boundary Edge)</div>
                <div class="stat-value">${reportData.resonanceStats.breakdown.maybe}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">❌ OSR (Outside Range)</div>
                <div class="stat-value">${reportData.resonanceStats.breakdown.no + reportData.resonanceStats.breakdown.unclear}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Edge Capture Rate</div>
                <div class="stat-value">${reportData.resonanceStats.edgeCapture.toFixed(1)}%</div>
              </div>
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">💬 Session Transcript</h2>
            ${reportData.messages
              .slice(0, 10)
              .map(
                (msg: any) => `
              <div class="message ${msg.role}">
                <div class="message-role">${msg.role}</div>
                <div>${msg.content.length > 300 ? msg.content.substring(0, 300) + "..." : msg.content}</div>
              </div>
            `,
              )
              .join("")}
            ${reportData.messages.length > 10 ? `<p><em>... ${reportData.messages.length - 10} more messages (see JSON export for full transcript)</em></p>` : ""}
          </div>

          <div class="section">
            <h2 class="section-title">📋 Feedback Data</h2>
            ${reportData.feedbackData
              .slice(0, 5)
              .map(
                (feedback: any) => `
              <div class="feedback-item">
                <strong>${feedback.response.toUpperCase()}</strong> • ${feedback.checkpointType || "general"} • ${new Date(feedback.timestamp).toLocaleTimeString()}
                ${feedback.note ? `<br><em>${feedback.note}</em>` : ""}
              </div>
            `,
              )
              .join("")}
            ${reportData.feedbackData.length > 5 ? `<p><em>... ${reportData.feedbackData.length - 5} more feedback items</em></p>` : ""}
          </div>

          <div class="section">
            <h2 class="section-title">🔧 Technical Metadata</h2>
            <div class="metadata">
              <strong>Session ID:</strong> ${reportData.metadata.sessionId}<br>
              <strong>Export Date:</strong> ${reportData.metadata.exportDate}<br>
              <strong>Has Mirror Data:</strong> ${reportData.sessionFlags.hasMirrorData ? "Yes" : "No"}<br>
              <strong>Report Contexts:</strong> ${reportData.reportContexts.length}<br>
              <strong>Relocation:</strong> ${(() => {
                const ctx = reportData.relocationContext;
                if (!ctx) {
                  return 'Relocation: None (birthplace houses/angles).';
                }
                const disclosure = escapeHtml(ctx.disclosure || 'Relocation on: Selected city. Houses/angles move; planets stay fixed.');
                const status = ctx.status ? `<em>${escapeHtml(ctx.status)}</em>` : '';
                const invariants = ctx.invariants ? `<small>${escapeHtml(ctx.invariants)}</small>` : '';
                const tz = ctx.coordinates?.timezone ? `<small>Timezone: ${escapeHtml(ctx.coordinates.timezone)}</small>` : '';
                return `${disclosure}${status ? `<br>${status}` : ''}${invariants ? `<br>${invariants}` : ''}${tz ? `<br>${tz}` : ''}`;
              })()}
            </div>
          </div>

          <div class="footer">
            <p>🎭 Raven Calder Research Export • Generated for DH Cross • This data is for research purposes only</p>
            <p>Session patterns help refine symbolic accuracy • "You are the validator"</p>
          </div>
        </body>
        </html>
      `;

      // Check if html2pdf is available
      if (typeof window !== "undefined" && (window as any).html2pdf) {
        const opt = {
          margin: 0.5,
          filename: `raven-dev-session-${sessionId.slice(-8)}-${new Date().toISOString().slice(0, 10)}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
        };

        await (window as any).html2pdf().from(htmlContent).set(opt).save();
      } else {
        // Fallback: create a temporary HTML file and use browser print
        const newWindow = window.open("", "_blank");
        if (newWindow) {
          newWindow.document.write(htmlContent);
          newWindow.document.close();
          setTimeout(() => {
            newWindow.print();
            newWindow.close();
          }, 500);
        }
      }
    } catch (error) {
      console.error("[DEV] PDF generation failed:", error);
      throw error;
    }
  };

  */

  const getReportIcon = (type: "mirror" | "balance" | "journal") => {
    switch (type) {
      case "mirror":
        return "🪞";
      case "balance":
        return "🌡️";
      case "journal":
        return "📔";
      default:
        return "📄";
    }
  };

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-[18px] py-3 bg-[rgba(20,24,33,.9)] backdrop-blur border-b border-[var(--line)]">
      <div className="flex items-center gap-3">
        <div
          className="grid h-9 w-9 place-items-center rounded-full [background-image:radial-gradient(120%_120%_at_50%_20%,#262a36,#12151c)] shadow-[inset_0_0_18px_rgba(124,92,255,.25)] text-[20px]"
          aria-hidden
        >
          🐦‍⬛
        </div>
        <div className="flex flex-col">
          <span className="font-bold">{APP_NAME}</span>
          <div className="flex items-center gap-2 text-[12px] text-[var(--muted)]">
            <span className="w-2 h-2 rounded-full bg-[var(--good)] shadow-[0_0_10px_var(--good)]"></span>
            <span>{STATUS_CONNECTED}</span>
            {reportContexts.length > 0 && (
              <div className="ml-2 flex items-center gap-1">
                <span className="text-[10px] text-[var(--accent)]">•</span>
                {reportContexts.map((ctx, index) => (
                  <div key={ctx.id} className="flex items-center gap-[2px]">
                    <span className="text-[10px]" title={ctx.summary}>
                      {getReportIcon(ctx.type)} {ctx.name}
                    </span>
                    <button
                      onClick={() => onRemoveReportContext(ctx.id)}
                      className="cursor-pointer border-0 bg-transparent p-0 text-[8px] text-[var(--muted)]"
                      title="Remove context"
                    >
                      ✕
                    </button>
                    {index < reportContexts.length - 1 && (
                      <span className="text-[8px] text-[var(--muted)]">|</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <HitRateDisplay className="hidden sm:block" />
        <UsageMeter compact={true} className="hidden sm:block" />
        {pendingCount > 0 && (
          <button
            className="btn rounded-[10px] border border-[var(--line)] bg-[rgba(255,255,255,0.04)] px-2 py-1 text-[12px]"
            onClick={onShowPendingReview}
            title={`${pendingCount} pending mirrors`}
          >
            ● {pendingCount} pending
          </button>
        )}
      </div>

      {/* Core File Upload Buttons - Always Visible */}
      <div className="flex gap-2">
        <button
          className="btn rounded-[10px] border border-[var(--line)] bg-[var(--soft)] px-[10px] py-2 text-[13px] text-[var(--text)]"
          onClick={() => onFileSelect("mirror")}
        >
          🪞 Mirror
        </button>
        <button
          className="btn rounded-[10px] border border-[var(--line)] bg-[var(--soft)] px-[10px] py-2 text-[13px] text-[var(--text)]"
          onClick={() => onFileSelect("balance")}
        >
          🌡️ Balance
        </button>
        <button
          className="btn rounded-[10px] border border-[var(--line)] bg-[var(--soft)] px-[10px] py-2 text-[13px] text-[var(--text)]"
          onClick={() => onFileSelect("journal")}
        >
          📔 Journal
        </button>

        {/* Poetic Options Dropdown */}
        <div className="relative">
          <button
            className="btn rounded-[10px] bg-gradient-to-br from-[#6a53ff] to-[#9c27b0] px-[10px] py-2 text-[13px] text-white"
            onClick={(e) => {
              e.stopPropagation();
              setShowPoeticMenu(!showPoeticMenu);
            }}
            title="Poetic analysis and reading tools"
          >
            🎭 Poetic ▼
          </button>

          {showPoeticMenu && (
            <div
              className="absolute right-0 top-full mt-1 min-w-[180px] rounded-[8px] border border-[var(--line)] bg-[var(--bg)] p-2 shadow-[0_4px_12px_rgba(0,0,0,0.15)] z-[1000]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="btn mb-1 w-full justify-start rounded-[10px] border border-[var(--line)] bg-[var(--soft)] px-[10px] py-2 text-[13px] text-[var(--text)]"
                onClick={() => {
                  onShowWrapUp();
                  setShowPoeticMenu(false);
                }}
                title="Generate Actor/Role composite from session feedback"
              >
                🎭 Actor/Role Reveal
              </button>
              {hasMirrorData && (
                <>
                  <button
                    className="btn mb-1 w-full justify-start rounded-[10px] border border-[var(--line)] bg-[var(--soft)] px-[10px] py-2 text-[13px] text-[var(--text)]"
                    onClick={() => {
                      onPoeticInsert();
                      setShowPoeticMenu(false);
                    }}
                  >
                    📝 Poetic Insert
                  </button>
                  <button
                    className="btn mb-1 w-full justify-start rounded-[10px] border border-[var(--line)] bg-[var(--soft)] px-[10px] py-2 text-[13px] text-[var(--text)]"
                    onClick={() => {
                      onPoeticCard();
                      setShowPoeticMenu(false);
                    }}
                  >
                    🎴 Create Card
                  </button>
                </>
              )}
              <button
                className="btn mb-1 w-full justify-start rounded-[10px] border border-[var(--line)] bg-[var(--soft)] px-[10px] py-2 text-[13px] text-[var(--text)]"
                onClick={() => {
                  onDemoCard();
                  setShowPoeticMenu(false);
                }}
                title="Generate demo poetic card"
              >
                🎴 Demo Card
              </button>
            </div>
          )}
        </div>

        <Link
          href="/math-brain"
          className="btn rounded-[10px] border border-[var(--line)] bg-transparent px-[10px] py-2 text-[13px] text-[var(--text)] hover:bg-[var(--soft)]"
        >
          ↩︎ Math Brain
        </Link>
        <button
          className="btn rounded-[10px] border border-[var(--line)] bg-transparent px-[10px] py-2 text-[13px] text-[var(--text)]"
          onClick={onAbout}
        >
          ℹ️ About
        </button>
        {devMode && (
          <div
            className="dev-indicator"
            style={{
              background: "linear-gradient(45deg, #ff6b6b, #4ecdc4)",
              color: "white",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "10px",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              border: "1px solid rgba(255,255,255,0.3)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
            title="Developer Mode Active - Ctrl+Shift+S for JSON export, Ctrl+Shift+P for PDF export"
          >
            🔧 DEV
          </div>
        )}
        <button
          className="btn rounded-[10px] border border-[var(--line)] bg-transparent px-[10px] py-2 text-[13px] text-[var(--text)]"
          onClick={onShowHelp}
          title="Help & Button Guide"
        >
          ❓ Help
        </button>
      </div>
    </header>
  );
}

// HelpModal component moved outside of Header and other components

const btnStyle: React.CSSProperties = {
  background: "var(--soft)",
  color: "var(--text)",
  border: "1px solid var(--line)",
  padding: "8px 10px",
  borderRadius: 10,
  fontSize: 13,
  cursor: "pointer",
};

const navBtnStyle: React.CSSProperties = {
  background: "none",
  border: "1px solid var(--line)",
  borderRadius: 6,
  color: "var(--text)",
  padding: "6px 10px",
  fontSize: 11,
  cursor: "pointer",
  transition: "all 0.2s ease",
};

function Sidebar({
  onInsert,
  hasMirrorData,
}: {
  onInsert: (m: any) => void;
  hasMirrorData: boolean;
}) {
  const [activeSection, setActiveSection] = useState<
    "glossary" | "hooks" | "poetic"
  >("glossary");

  return (
    <aside
      style={{
        background: "var(--panel)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
        padding: 14,
        height: "100%",
        overflow: "auto",
      }}
    >
      {/* Section Navigation */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        <button
          onClick={() => setActiveSection("glossary")}
          style={{
            ...tabStyle,
            ...(activeSection === "glossary" ? activeTabStyle : {}),
          }}
        >
          📖 Glossary
        </button>
        <button
          onClick={() => setActiveSection("hooks")}
          style={{
            ...tabStyle,
            ...(activeSection === "hooks" ? activeTabStyle : {}),
          }}
        >
          🎣 Hooks
        </button>
        <button
          onClick={() => setActiveSection("poetic")}
          style={{
            ...tabStyle,
            ...(activeSection === "poetic" ? activeTabStyle : {}),
          }}
        >
          🎭 Poetic
        </button>
      </div>

      {/* Data Upload Instruction */}
      {!hasMirrorData && (
        <div
          style={{
            background: "rgba(103, 103, 193, 0.1)",
            border: "1px solid rgba(103, 103, 193, 0.3)",
            borderRadius: "6px",
            padding: "12px",
            marginBottom: "16px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              color: "var(--text)",
              fontSize: "13px",
              lineHeight: "1.4",
            }}
          >
            Upload Math Brain Mirror or Balance Report for a Raven Calder Read
          </div>
        </div>
      )}

      {/* Glossary Section */}
      {activeSection === "glossary" && (
        <div>
          <div style={sectionTitle}>Balance Meter Framework</div>

          <GlossaryItem
            symbol="⚡"
            title="Magnitude"
            description="Symbolic intensity scale"
            details={[
              "0 = Latent",
              "1 = Murmur",
              "2 = Pulse",
              "3 = Stirring",
              "4 = Convergence",
              "5 = Threshold",
            ]}
          />

          <GlossaryItem
            symbol="🌞"
            title="Valence"
            description="Energy direction & quality"
            details={[
              "🌞 supportive = helping/scaffolding",
              "🌗 mixed = complex blend",
              "🌑 restrictive = constraining",
            ]}
          />

          <GlossaryItem
            symbol="🌪"
            title="Volatility"
            description="Pressure distribution pattern"
            details={[
              "Low = steady, concentrated",
              "Medium = variable flow",
              "High = scattered turbulence",
              "Storm-class = maximum dispersal",
            ]}
          />

          <GlossaryItem
            symbol="🌡️"
            title="Four-Channel Architecture"
            description="Complete energetic snapshot"
            details={[
              "Combines Magnitude + Valence + Volatility",
              "Creates real-time symbolic weather",
              "Tracks field conditions over time",
              "Provides actionable guidance",
            ]}
          />

          <div style={sectionTitle}>Valence Indicators</div>

          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>
            Positive Valence Modes
          </div>
          <GlossaryItem
            symbol="🌱"
            title="Fertile Field"
            description="Growth-supportive conditions"
          />
          <GlossaryItem
            symbol="✨"
            title="Harmonic Resonance"
            description="Natural alignment and flow"
          />
          <GlossaryItem
            symbol="💎"
            title="Expansion Lift"
            description="Elevating, broadening energy"
          />
          <GlossaryItem
            symbol="🔥"
            title="Combustion Clarity"
            description="Clear, focused intensity"
          />
          <GlossaryItem
            symbol="🦋"
            title="Liberation/Release"
            description="Freedom from constraints"
          />
          <GlossaryItem
            symbol="⚖️"
            title="Integration"
            description="Balanced synthesis"
          />
          <GlossaryItem
            symbol="🌊"
            title="Flow Tide"
            description="Natural momentum"
          />
          <GlossaryItem
            symbol="🌈"
            title="Visionary Spark"
            description="Inspirational breakthrough"
          />

          <div
            style={{
              fontSize: 11,
              color: "var(--muted)",
              marginBottom: 8,
              marginTop: 12,
            }}
          >
            Negative Valence Modes
          </div>
          <GlossaryItem
            symbol="♾️"
            title="Recursion Pull"
            description="Repetitive patterns drawing back"
          />
          <GlossaryItem
            symbol="⚔️"
            title="Friction Clash"
            description="Opposing forces in conflict"
          />
          <GlossaryItem
            symbol="↔️"
            title="Cross Current"
            description="Contradictory energies"
          />
          <GlossaryItem
            symbol="🌫️"
            title="Fog/Dissolution"
            description="Unclear, dissolving boundaries"
          />
          <GlossaryItem
            symbol="🌋"
            title="Pressure/Eruption"
            description="Building tension seeking release"
          />
          <GlossaryItem
            symbol="⏳"
            title="Saturn Weight"
            description="Heavy, restrictive pressure"
          />
          <GlossaryItem
            symbol="🧩"
            title="Fragmentation"
            description="Scattered, disconnected pieces"
          />
          <GlossaryItem
            symbol="🕳️"
            title="Entropy Drift"
            description="Dissolving structure"
          />

          <div style={sectionTitle}>Sources of Force</div>

          <GlossaryItem
            symbol="🎯"
            title="Orb"
            description="Proximity factor in aspects"
          />
          <GlossaryItem
            symbol="🌀"
            title="Aspect"
            description="Angular relationship type"
          />
          <GlossaryItem
            symbol="🪐"
            title="Potency"
            description="Planet speed and strength"
          />
          <GlossaryItem
            symbol="📡"
            title="Resonance"
            description="Natal chart activation"
          />

          <div style={sectionTitle}>Planetary Forces</div>

          <GlossaryItem
            symbol="☽"
            title="Moon"
            description="Emotional tides, instinctive patterns"
          />
          <GlossaryItem
            symbol="☿"
            title="Mercury"
            description="Communication, thought processing"
          />
          <GlossaryItem
            symbol="♀"
            title="Venus"
            description="Values, relationships, beauty"
          />
          <GlossaryItem
            symbol="♂"
            title="Mars"
            description="Action, drive, assertion"
          />
          <GlossaryItem
            symbol="♃"
            title="Jupiter"
            description="Expansion, wisdom, growth"
          />
          <GlossaryItem
            symbol="♄"
            title="Saturn"
            description="Structure, discipline, limits"
          />
          <GlossaryItem
            symbol="♅"
            title="Uranus"
            description="Innovation, rebellion, awakening"
          />
          <GlossaryItem
            symbol="♆"
            title="Neptune"
            description="Dreams, spirituality, illusion"
          />
          <GlossaryItem
            symbol="♇"
            title="Pluto"
            description="Transformation, depth, power"
          />

          <div style={sectionTitle}>Core Dynamics</div>

          <GlossaryItem
            symbol="↔"
            title="Polarity"
            description="Dynamic tension between forces"
          />
          <GlossaryItem
            symbol="🪞"
            title="Mirror"
            description="Reflection of inner patterns"
          />
          <GlossaryItem
            symbol="🌡️"
            title="Balance"
            description="Current energetic state"
          />
          <GlossaryItem
            symbol="📔"
            title="Journal"
            description="Personal narrative tracking"
          />
          <GlossaryItem
            symbol="⚡"
            title="Symbolic Quake"
            description="Energetic disturbance measurement"
            details={[
              "Seismograph-style intensity scale",
              "Tracks symbolic rather than literal events",
              "Measures psychological/spiritual impact",
            ]}
          />
          <GlossaryItem
            symbol="🎭"
            title="Poetic Insert"
            description="Artistic interpretation of patterns"
            details={[
              "Transforms analysis into poetry",
              "Captures essence beyond literal meaning",
              "Bridges symbolic and creative expression",
            ]}
          />
        </div>
      )}

      {/* Quick Hooks Section */}
      {activeSection === "hooks" && (
        <div>
          {hasMirrorData ? (
            <>
              <div style={sectionTitle}>Quick Insights</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Chip
                  label="🔮 Generate Polarity Reading"
                  onClick={() =>
                    onInsert({
                      id: generateId(),
                      role: "user",
                      html: "generate polarity reading",
                    })
                  }
                />
                <Chip
                  label="⚖️ Balance Check"
                  onClick={() =>
                    onInsert({
                      id: generateId(),
                      role: "user",
                      html: "balance check",
                    })
                  }
                />
                <Chip
                  label="🌊 Flow State Reading"
                  onClick={() =>
                    onInsert({
                      id: generateId(),
                      role: "user",
                      html: "flow state reading",
                    })
                  }
                />
              </div>
            </>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "20px",
                color: "var(--muted)",
              }}
            >
              <div style={{ fontSize: "13px", lineHeight: "1.4" }}>
                Quick Insights become available after uploading Math Brain data
              </div>
            </div>
          )}
        </div>
      )}

      {/* Poetic Inserts Section */}
      {activeSection === "poetic" && (
        <div>
          <div style={sectionTitle}>Creative Commands</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Chip
              label="✍️ Write my poem"
              onClick={() =>
                onInsert({
                  id: generateId(),
                  role: "user",
                  html: "write my poem",
                })
              }
            />
            <Chip
              label="🎭 Poetic interpretation"
              onClick={() =>
                onInsert({
                  id: generateId(),
                  role: "user",
                  html: "poetic interpretation",
                })
              }
            />
            <Chip
              label="🌟 Symbolic weather report"
              onClick={() =>
                onInsert({
                  id: generateId(),
                  role: "user",
                  html: "symbolic weather report",
                })
              }
            />
            <Chip
              label="📿 Daily mantra"
              onClick={() =>
                onInsert({
                  id: generateId(),
                  role: "user",
                  html: "daily mantra",
                })
              }
            />
          </div>
        </div>
      )}
    </aside>
  );
}
const sectionTitle: React.CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: ".14em",
  color: "var(--muted)",
  margin: "8px 0 10px",
};

const tabStyle: React.CSSProperties = {
  background: "none",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "var(--line)",
  borderRadius: "6px",
  color: "var(--muted)",
  padding: "4px 8px",
  fontSize: 11,
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const activeTabStyle: React.CSSProperties = {
  background: "var(--soft)",
  color: "var(--text)",
  borderColor: "var(--accent)",
};

function GlossaryItem({
  symbol,
  title,
  description,
  details,
}: {
  symbol: string;
  title: string;
  description: string;
  details?: string[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="glossary-item"
      style={{
        marginBottom: 12,
        padding: 8,
        border: "1px solid var(--line)",
        borderRadius: 6,
        background: "var(--soft)",
      }}
      title={`${title}: ${description}`} // Tooltip with title and description
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: details ? "pointer" : "default",
        }}
        onClick={() => details && setExpanded(!expanded)}
      >
        <span
          style={{ fontSize: 16 }}
          title={`${symbol} ${title} - ${description}`} // Enhanced tooltip for the symbol
        >
          {symbol}
        </span>
        <div style={{ flex: 1 }}>
          <div
            style={{ fontSize: 12, fontWeight: "bold", color: "var(--text)" }}
          >
            {title}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>
            {description}
          </div>
        </div>
        {details && (
          <span style={{ fontSize: 10, color: "var(--muted)" }}>
            {expanded ? "▼" : "▶"}
          </span>
        )}
      </div>
      {details && expanded && (
        <div
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: "1px solid var(--line)",
          }}
        >
          {details.map((detail, i) => (
            <div
              key={i}
              style={{ fontSize: 10, color: "var(--muted)", marginBottom: 2 }}
            >
              • {detail}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 8,
        fontSize: 12,
        padding: "8px 12px",
        borderRadius: 8,
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "var(--line)",
        background: "var(--soft)",
        color: "var(--text)", // Ensure white text
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--panel)";
        e.currentTarget.style.borderColor = "var(--accent)";
        e.currentTarget.style.color = "var(--text)"; // Keep white on hover
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--soft)";
        e.currentTarget.style.borderColor = "var(--line)";
        e.currentTarget.style.color = "var(--text)"; // Keep white
      }}
    >
      {label}
    </button>
  );
}

function Stream({
  messages,
  typing,
  endRef,
  containerRef,
  onToggleCollapse,
  onRemove,
  onPingFeedback,
}: {
  messages: Message[];
  typing: boolean;
  endRef: React.Ref<HTMLDivElement>;
  containerRef: React.Ref<HTMLElement>;
  onToggleCollapse: (messageId: string) => void;
  onRemove: (messageId: string) => void;
  onPingFeedback: (
    messageId: string,
    response: PingResponse,
    note?: string,
  ) => void;
}) {
  return (
    <section
      ref={containerRef}
      aria-label="Conversation"
      role="log"
      style={{
        background: "var(--panel)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        overflow: "auto",
        height: "100%",
      }}
    >
      {messages.map((m) => (
        <Bubble
          key={m.id}
          msg={m}
          onToggleCollapse={onToggleCollapse}
          onRemove={onRemove}
          onPingFeedback={onPingFeedback}
        />
      ))}
      {typing && (
        <div style={{ opacity: 0.6, fontSize: 12 }}>
          <span className="dots">
            <span /> <span /> <span />
          </span>{" "}
          typing…
        </div>
      )}
      <div ref={endRef} />
    </section>
  );
}

function Bubble({
  msg,
  onToggleCollapse,
  onRemove,
  onPingFeedback,
}: {
  msg: Message;
  onToggleCollapse: (messageId: string) => void;
  onRemove: (messageId: string) => void;
  onPingFeedback: (
    messageId: string,
    response: PingResponse,
    note?: string,
  ) => void;
}) {
  const [isCopied, setIsCopied] = useState(false);
  const [showMirror, setShowMirror] = useState(false);
  const base: React.CSSProperties = {
    maxWidth: "82%",
    padding: "12px 14px",
    borderRadius: 16,
    position: "relative",
    boxShadow: "0 6px 16px rgba(0,0,0,.25)",
    border: "1px solid #1f2533",
    scrollMarginTop: 120,
  };
  const style =
    msg.role === "user"
      ? {
          alignSelf: "flex-end",
          background: "linear-gradient(180deg,#1f2432,#171b25)",
        }
      : {
          alignSelf: "flex-start",
          background: "linear-gradient(180deg,#171b25,#131824)",
          borderLeft: "2px solid #2b3244",
        };

  // Copy functionality for Raven messages
  const copyToClipboard = async (text: string) => {
    try {
      // Strip HTML tags for plain text copy
      const plainText = text
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .trim();
      await navigator.clipboard.writeText(plainText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Hide after 2 seconds
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  // Special handling for reports
  if (msg.isReport) {
    return (
      <article id={`message-${msg.id}`} style={{ ...base, ...style }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: msg.collapsed ? 0 : 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 12,
                color: "#8b94a6",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {msg.reportType} REPORT
            </span>
            <span style={{ fontSize: 14, color: "#cbd4e4", fontWeight: 500 }}>
              {msg.reportName}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => onToggleCollapse(msg.id)}
              style={{
                background: "none",
                border: "1px solid #2a3143",
                borderRadius: 4,
                color: "#8b94a6",
                padding: "4px 8px",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              {msg.collapsed ? "Expand" : "Collapse"}
            </button>
            <button
              onClick={() => onRemove(msg.id)}
              style={{
                background: "none",
                border: "1px solid #4a3143",
                borderRadius: 4,
                color: "#c47a7a",
                padding: "4px 8px",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              Remove
            </button>
          </div>
        </div>
        {msg.reportSummary && !msg.collapsed && (
          <div
            style={{
              fontSize: 11,
              color: "#8b94a6",
              marginBottom: 8,
              fontStyle: "italic",
            }}
          >
            {msg.reportSummary}
          </div>
        )}
        {!msg.collapsed && (
          <div
            className={msg.role === "raven" ? "raven-response" : ""}
            dangerouslySetInnerHTML={{ __html: msg.html }}
          />
        )}
      </article>
    );
  }

  // Determine primary HTML to display: prefer draft.raw (LLM output) for Raven messages
  let primaryHtml = "";
  if (msg.role === "raven") {
    if (
      msg.draft &&
      typeof msg.draft.raw === "string" &&
      msg.draft.raw.trim()
    ) {
      const cleaned = cleanseFrontstage(String(msg.draft.raw || ""));
      // escape and preserve line breaks
      primaryHtml = `<div class="raven-raw">${escapeHtml(cleaned).replace(/\n/g, "<br/>")}</div>`;
    } else {
      primaryHtml = msg.html || "";
    }
  } else {
    primaryHtml =
      msg.role === "user" && !msg.isReport ? escapeHtml(msg.html) : msg.html;
  }

  // Regular message display
  const baseClass =
    "max-w-[82%] px-4 py-3 rounded-[16px] relative shadow-[0_6px_16px_rgba(0,0,0,0.25)] border border-[#1f2533] scroll-mt-[120px]";
  const userClass = "self-end bg-gradient-to-b from-[#1f2432] to-[#171b25]";
  const ravenClass =
    "self-start bg-gradient-to-b from-[#171b25] to-[#131824] border-l-2 border-l-[#2b3244]";

  return (
    <article
      id={`message-${msg.id}`}
      className={`${baseClass} ${msg.role === "user" ? userClass : ravenClass}`}
    >
      {/* Top climate/hook header for Raven messages */}
      {msg.role === "raven" && (msg.climate || msg.hook) && (
        <div className="mb-2 pb-1 border-b border-[#2a3143]">
          {msg.climate && (
            <div className="text-[10px] text-[#8b94a6]">{msg.climate}</div>
          )}
          {msg.hook && (
            <div className="text-[10px] text-[#8b94a6]">{msg.hook}</div>
          )}
        </div>
      )}
      <div
        className={msg.role === "raven" ? "raven-response" : ""}
        dangerouslySetInnerHTML={{ __html: primaryHtml }}
      />

      {/* Structured mirror (collapsible) when available from draft */}
      {msg.draft && (
        <div className="mt-2">
          <button
            onClick={() => setShowMirror((s) => !s)}
            className="bg-none border border-[#2a3143] rounded-[6px] text-[#8b94a6] px-2 py-1 text-[12px] mb-2"
          >
            {showMirror ? "Hide Mirror" : "Show Mirror"}
          </button>
          {showMirror && (
            <div
              dangerouslySetInnerHTML={{
                __html: formatShareableDraft(msg.draft, msg.prov),
              }}
            />
          )}
        </div>
      )}
      {msg.role === "raven" &&
        containsInitialProbe(msg.html) &&
        !pingTracker.getFeedback(msg.id) && (
          <div className="mt-1 text-[10px] text-[#94a3b8]">
            <span className="inline-block w-[6px] h-[6px] rounded-[3px] bg-[#94a3b8] mr-2"></span>
            Pending
          </div>
        )}

      {/* Add ping feedback ONLY for repair validation requests, not initial probes */}
      {msg.role === "raven" && containsRepairValidation(msg.html) && (
        <PingFeedback
          messageId={msg.id}
          onFeedback={onPingFeedback}
          disabled={msg.pingFeedbackRecorded}
          checkpointType="repair"
        />
      )}

      {/* Add ping feedback for other initial probes (non-repair) */}
      {msg.role === "raven" &&
        containsInitialProbe(msg.html) &&
        !containsRepairValidation(msg.html) && (
          <div className="mt-2 px-3 py-2 bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.2)] rounded-[6px] text-[12px] text-[#93c5fd]">
            💭{" "}
            <em>
              Raven will classify your response and provide repair if needed -
              no grading required
            </em>
          </div>
        )}

      {msg.role === "raven" && (
        <div className="flex gap-1 mt-2 justify-end">
          <button
            onClick={() => copyToClipboard(msg.html)}
            className={`${isCopied ? "bg-[var(--good)] text-white" : "bg-[var(--soft)] text-[var(--muted)]"} px-2 py-1 border border-[var(--line)] rounded-[6px] text-[10px]`}
          >
            {isCopied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
      {msg.climate && (
        <div className="text-[10px] text-[#8b94a6] mt-2 border-t border-[#2a3143] pt-1">
          {msg.climate}
        </div>
      )}
      {msg.hook && <div className="text-[10px] text-[#8b94a6]">{msg.hook}</div>}
    </article>
  );
}

function Composer({
  input,
  setInput,
  onSend,
  onStop,
  disabled,
}: {
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  disabled: boolean;
}) {
  return (
    <div className="px-[18px] py-3 bg-[rgba(20,24,33,.9)] backdrop-blur border-t border-[var(--line)] flex gap-[10px] items-end">
      <button
        className="inline-flex items-center justify-center w-10 h-10 bg-[var(--soft)] text-[var(--text)] border border-[var(--line)] rounded-[10px] text-[13px] cursor-pointer"
        title="Attach"
      >
        📎
      </button>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        placeholder={INPUT_PLACEHOLDER}
        className="flex-1 min-h-[48px] max-h-40 resize-y rounded-[14px] border border-[var(--line)] bg-[var(--panel)] text-[var(--text)] px-[14px] py-3 text-[14px]"
      />
      <div className="font-mono text-[11px] text-[var(--muted)]" aria-hidden>
        Enter ↵
      </div>
      {disabled && (
        <button
          onClick={onStop}
          className="px-[10px] py-2 bg-[#442b2b] text-[var(--text)] border border-[#663] rounded-[10px] text-[13px] cursor-pointer shadow-[var(--shadow)]"
        >
          Stop
        </button>
      )}
      <button
        disabled={disabled}
        onClick={onSend}
        className="px-[10px] py-2 bg-[linear-gradient(180deg,#8d78ff,#6a53ff)] text-[var(--text)] border-0 rounded-[10px] text-[13px] cursor-pointer shadow-[var(--shadow)] disabled:opacity-50"
      >
        Send
      </button>
    </div>
  );
}

function NavigationPanel({
  ravenMessages,
  scrollToTop,
  scrollToRavenMessage,
  currentRavenIndex,
  scrollToBottom,
}: {
  ravenMessages: Message[];
  scrollToTop: () => void;
  scrollToRavenMessage: (index: number) => void;
  currentRavenIndex: number;
  scrollToBottom: () => void;
}) {
  if (ravenMessages.length === 0) return null;

  return (
    <div className="flex items-center justify-center gap-2 px-[18px] py-2 bg-[var(--panel)] border-t border-b border-[var(--line)] text-[12px]">
      <button
        onClick={scrollToTop}
        className="bg-transparent border border-[var(--line)] rounded-[6px] text-[var(--text)] px-[10px] py-[6px] text-[11px] cursor-pointer transition-all"
        title="Jump to top"
      >
        ⬆️ Top
      </button>

      <button
        onClick={() => scrollToRavenMessage(Math.max(0, currentRavenIndex - 1))}
        disabled={currentRavenIndex <= 0 || ravenMessages.length <= 1}
        className="bg-transparent border border-[var(--line)] rounded-[6px] text-[var(--text)] px-[10px] py-[6px] text-[11px] cursor-pointer transition-all disabled:opacity-50"
        title="Previous Raven response"
      >
        ← Prev
      </button>

      <span className="text-[var(--muted)]">
        {currentRavenIndex + 1} / {ravenMessages.length}
      </span>

      <button
        onClick={() =>
          scrollToRavenMessage(
            Math.min(ravenMessages.length - 1, currentRavenIndex + 1),
          )
        }
        disabled={
          currentRavenIndex >= ravenMessages.length - 1 ||
          ravenMessages.length <= 1
        }
        className="bg-transparent border border-[var(--line)] rounded-[6px] text-[var(--text)] px-[10px] py-[6px] text-[11px] cursor-pointer transition-all disabled:opacity-50"
        title="Next Raven response"
      >
        Next →
      </button>

      <button
        onClick={scrollToBottom}
        className="bg-transparent border border-[var(--line)] rounded-[6px] text-[var(--text)] px-[10px] py-[6px] text-[11px] cursor-pointer transition-all"
        title="Jump to bottom"
      >
        ⬇️ Bottom
      </button>
    </div>
  );
}

function PendingReviewSheet({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState(() =>
    pingTracker.getPendingItems(true).slice(0, 3),
  );
  const [responses, setResponses] = useState<Record<string, PingResponse>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    (window as any).__openPendingReview = () => {
      setItems(pingTracker.getPendingItems(true).slice(0, 3));
    };
  }, []);

  const submit = () => {
    items.forEach((it) => {
      const resp = responses[it.messageId];
      if (resp) {
        pingTracker.recordFeedback(
          it.messageId,
          resp,
          notes[it.messageId],
          it.checkpointType,
          it.messageContent,
        );
      }
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[rgba(0,0,0,0.7)] flex items-center justify-center z-[1000]">
      <div className="w-[520px] bg-[linear-gradient(135deg,#1e293b,#0f172a)] border border-[rgba(148,163,184,0.2)] rounded-[12px] p-4">
        <div className="flex justify-between items-center mb-2">
          <div className="text-[#e2e8f0] font-semibold">
            Review pending mirrors?
          </div>
          <button
            onClick={onClose}
            className="bg-transparent border-0 text-[#94a3b8] text-[18px]"
          >
            ×
          </button>
        </div>
        <div className="text-[#94a3b8] text-[12px] mb-3">
          Up to three, highest-charge first. One tap each. Optional note.
        </div>
        {items.length === 0 && (
          <div className="text-[#94a3b8] text-[12px]">No pending mirrors.</div>
        )}
        {items.map((it) => (
          <div
            key={it.messageId}
            className="mb-3 p-3 border border-[rgba(148,163,184,0.2)] rounded-[8px]"
          >
            <div
              className="text-[12px] text-[#e2e8f0] mb-2"
              dangerouslySetInnerHTML={{ __html: it.messageContent || "" }}
            />
            <div className="flex gap-2 flex-wrap mb-2">
              {(["yes", "maybe", "no", "unclear"] as PingResponse[]).map(
                (r) => {
                  const selected = responses[it.messageId] === r;
                  return (
                    <button
                      key={r}
                      onClick={() =>
                        setResponses((prev) => ({ ...prev, [it.messageId]: r }))
                      }
                      className={`px-2 py-1 text-[12px] rounded-[10px] border border-[var(--line)] ${selected ? "bg-[rgba(59,130,246,0.2)]" : "bg-[var(--soft)]"}`}
                    >
                      {r === "yes"
                        ? "✅ Yes"
                        : r === "maybe"
                          ? "🟡 Sort of"
                          : r === "no"
                            ? "❌ No"
                            : "❓ Not clear"}
                    </button>
                  );
                },
              )}
            </div>
            {(responses[it.messageId] === "no" ||
              responses[it.messageId] === "unclear") && (
              <textarea
                value={notes[it.messageId] || ""}
                onChange={(e) =>
                  setNotes((n) => ({ ...n, [it.messageId]: e.target.value }))
                }
                placeholder="Optional note (what didn’t fit?)"
                className="w-full bg-[rgba(0,0,0,0.3)] text-[#e2e8f0] border border-[rgba(148,163,184,0.2)] rounded-[6px] p-2 text-[12px]"
              />
            )}
          </div>
        ))}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-[10px] py-2 bg-[var(--soft)] text-[var(--text)] border border-[var(--line)] rounded-[10px] text-[13px] cursor-pointer"
          >
            Snooze
          </button>
          <button
            onClick={submit}
            className="px-[10px] py-2 bg-[linear-gradient(180deg,#8d78ff,#6a53ff)] text-[var(--text)] border-0 rounded-[10px] text-[13px] cursor-pointer"
          >
            Review
          </button>
        </div>
      </div>
    </div>
  );
}
