"use client";
import React, { useEffect, useRef, useState } from 'react';
import { generateId } from '../lib/id';
import { formatFullClimateDisplay, ClimateData } from '../lib/climate-renderer';
import UsageMeter from './UsageMeter';
import { summarizeRelocation, RelocationSummary } from '../lib/relocation';
import { generateCardHTML, downloadCardAsImage, PoeticIndexCard, createDemoCard } from '../lib/poetics/card-generator';
import { parseCardFromResponse, createSampleCard } from '../lib/poetics/parser';
import PingFeedback, { PingResponse } from './PingFeedback';
import HitRateDisplay from './HitRateDisplay';
import WrapUpCard from './WrapUpCard';
import PoeticCard from './PoeticCard';
import ReadingSummaryCard from './ReadingSummaryCard';
import { pingTracker } from '../lib/ping-tracker';
import { naturalFollowUpFlow } from '../lib/natural-followup-flow';
// simple HTML escaper for user-originated plain text rendering safety
const escapeHtml = (s:string) => s.replace(/[&<>]/g, c => (({"&":"&amp;","<":"&lt;",">":"&gt;"} as Record<string,string>)[c] || c));

// Generate dynamic climate display based on context
function generateDynamicClimate(context?: string): string {
  let valence = 0; // -5 to +5 scale
  let magnitude = 1; // default murmur level
  let volatility = 0; // default aligned
  
  if (context) {
    const text = context.toLowerCase();
    
    // Valence Analysis: map context to -5 to +5 scale
    // Collapse indicators (-5): crisis, break, fail, crash, end, stuck, impossible
    if (/(crisis|break|fail|crash|end|stuck|impossible|collapse|destroy|catastrophe)/i.test(text)) {
      valence = -5;
    }
    // Grind indicators (-4): difficult, struggle, resist, fight, hard, burden, exhaust
    else if (/(difficult|struggle|resist|fight|hard|burden|exhaust|grind|strain|wear)/i.test(text)) {
      valence = -4;
    }
    // Friction indicators (-3): conflict, disagree, argue, oppose, clash, tension
    else if (/(conflict|disagree|argue|oppose|clash|tension|friction|dispute|against)/i.test(text)) {
      valence = -3;
    }
    // Contraction indicators (-2): narrow, limit, reduce, shrink, constrain, block
    else if (/(narrow|limit|reduce|shrink|constrain|block|contract|restrict|close)/i.test(text)) {
      valence = -2;
    }
    // Drag indicators (-1): slow, delay, hesitate, doubt, unclear, minor issues
    else if (/(slow|delay|hesitate|doubt|unclear|minor|slight|drag|hinder|small)/i.test(text)) {
      valence = -1;
    }
    // Liberation indicators (+5): breakthrough, freedom, achieve, breakthrough, transform, unlimited
    else if (/(breakthrough|freedom|achieve|transform|unlimited|liberate|soar|transcend)/i.test(text)) {
      valence = 5;
    }
    // Expansion indicators (+4): growth, opportunity, develop, advance, expand, progress
    else if (/(growth|opportunity|develop|advance|expand|progress|flourish|thrive)/i.test(text)) {
      valence = 4;
    }
    // Harmony indicators (+3): balance, align, connect, unite, coherent, synergy
    else if (/(balance|align|connect|unite|coherent|synergy|harmony|integrate|blend)/i.test(text)) {
      valence = 3;
    }
    // Flow indicators (+2): smooth, adapt, flexible, easy, natural, fluid
    else if (/(smooth|adapt|flexible|easy|natural|fluid|flow|graceful|effortless)/i.test(text)) {
      valence = 2;
    }
    // Lift indicators (+1): begin, start, improve, hope, gentle, positive
    else if (/(begin|start|improve|hope|gentle|positive|lift|rise|encourage)/i.test(text)) {
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

// --- Frontstage Cleaners & Prompt (enhanced per review) ---
const RECOGNITION_PROMPTS = [
  'Did any of this feel true?',
  'Does this fit your experience today?',
  'Did this land at all?',
  'Anything here feel off?'
];
let promptIndex = 0;
let lastPromptAt = 0; // cooldown timer
function nextRecognitionPrompt(){
  const p = RECOGNITION_PROMPTS[promptIndex % RECOGNITION_PROMPTS.length];
  promptIndex++;
  return p;
}

function cleanseFrontstage(raw: string): string {
  if (!raw) return '';
  let text = raw;
  
  // Remove balance meter data dumps and report headers
  text = text.replace(/\{I've received.*?\}[\s\S]*?(?=\n\n|$)/gi, '');
  text = text.replace(/The Balance Meter shows.*?(?=\n|$)/gi, '');
  text = text.replace(/.*magnitude.*?valence.*?volatility.*?(?=\n|$)/gi, '');
  text = text.replace(/.*glyphs are.*?(?=\n|$)/gi, '');
  text = text.replace(/.*report already contains.*?(?=\n|$)/gi, '');
  
  // Remove symbolic weather headers when used as opening
  text = text.replace(/^\s*\*\*Symbolic Weather Header:\*\*.*?(?=\n|$)/gmi, '');
  
  // Remove any known backstage headings/blocks
  text = text.replace(/(##\s*SST[_\s-]*Clause[\s\S]*?$)|(^.*SST[_\s-]*Prompt.*$)|(^.*Resonance[_\s-]*Rule.*$)|(^.*Conditional[_\s-]*Language.*$)/gim, '');
  
  // Clean inline acronyms and technical notation
  text = text
    .replace(/\bSST\b/g, '')
    .replace(/\bWB\s*\/\s*ABE\s*\/\s*OSR\b/gi, '')
    .replace(/\b(magnitude|valence)\s*[-:]?\s*\d+\.?\d*/gi, '') // remove numeric data
    .replace(/\[[^\]]*operator[^\]]*\]/gi, '')
    .replace(/\[Operator.*?\]/gi, '')
    .replace(/[\u260d\u2642\u263d\u26a1\ud83c\udf11\ud83c\udf1e]\s*and\s*[\u260d\u2642\u263d\u26a1\ud83c\udf11\ud83c\udf1e]/g, '') // remove glyph lists
    .replace(/The glyphs are [^.]*\./gi, ''); // remove glyph declarations
    
  // Detect and handle OSR mentions with user-friendly language
  const mentionsOSR = /Outside\s+Symbolic\s+Range\b/i.test(raw) || /\bOSR\b/.test(raw);
  if (mentionsOSR) {
    const addendum = 'If none of this felt familiar, treat it as valid null data—your experience sets the boundary.';
    if (!text.trim().endsWith(addendum)) {
      text = text.trim() + (/[.!?]$/.test(text.trim()) ? ' ' : '. ') + addendum;
    }
    text = text.replace(/\bOSR\b/g, 'null data'); // replace standalone only
  }
  
  // Clean clinical prompts
  text = text.replace(/Did this land\?\s*Mark\.?/gi, 'Does any of this feel familiar?');
  text = text.replace(/Mark\s*(WB|ABE|OSR)\.?/gi, '');
  
  return text.replace(/\s{2,}/g, ' ').replace(/^\s*[-*]\s*$/gm, '').trim();
}

function maybeAppendRecognitionPrompt(html: string, isReport?: boolean, lastUserMessage?: string): string {
  if (isReport) return html;
  const plain = html.replace(/<[^>]*>/g, ' ').trim();
  if (!plain) return html;
  if (plain.length < 40) return html; // skip very short blurbs
  if (/[?]\s*$/.test(plain)) return html;
  if (/(did this (land|resonate)|fit your experience|feel true|feel off)/i.test(plain)) return html;
  
  // Skip adding recognition prompts if the response already contains WB confirmation language
  if (/(logged as wb|resonance confirmed|that lands|confirmed as wb)/i.test(plain)) return html;
  
  // CRITICAL: Skip recognition prompt if previous user message clearly confirmed
  if (lastUserMessage) {
    const userText = lastUserMessage.toLowerCase();
    // meta-signal detection (complaints about repetition)
    const metaPhrases = [
      'you asked', 'why are you asking', 'i already said', 'i just said', 'as i said',
      'what i had just explained', 'repeating myself', 'asked again', "i've already answered"
    ];
    if (metaPhrases.some(p => userText.includes(p))) {
      return html; // don't append a recognition prompt on meta-complaints
    }
    const clearConfirmations = [
      'that\'s familiar', 'feels familiar', 'that resonates', 'exactly',
      'that\'s me', 'spot on', 'so true', 'absolutely', 'i just said it was',
      'it was', 'it is', 'that is', 'yes it is', 'yes that is',
      'that\'s right', 'correct', 'true'
    ];
    
    if (/^yes\b/i.test(userText.trim()) || 
        clearConfirmations.some(phrase => userText.includes(phrase))) {
      return html; // Skip prompt - user already confirmed
    }
  }
  
  const now = Date.now();
  if (now - lastPromptAt < 12_000) return html; // shorter cooldown so accuracy prompts surface
  lastPromptAt = now;
  const prompt = nextRecognitionPrompt();
  return html.endsWith('</p>')
    ? html.replace(/<\/p>\s*$/, ' ' + prompt + '</p>')
    : html + `\n\n<p>${prompt}</p>`;
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
    /feel accurate/i
  ];
  
  // Exclude repair validations from being treated as initial probes
  if (containsRepairValidation(text)) {
    return false;
  }
  
  return probePatterns.some(pattern => pattern.test(text));
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
    /i'm logging that probe as osr/i
  ];
  
  return repairValidationPatterns.some(pattern => pattern.test(text));
}

// Function to detect different types of ping checkpoints for appropriate messaging
function getPingCheckpointType(text: string): 'hook' | 'vector' | 'aspect' | 'repair' | 'general' {
  if (containsRepairValidation(text)) return 'repair';
  if (/hook stack|paradox.*tags|rock.*spark/i.test(text)) return 'hook';
  if (/hidden push|counterweight|vector signature/i.test(text)) return 'vector';
  if (/mars.*saturn|personal.*outer|hard aspect/i.test(text)) return 'aspect';
  return 'general';
}

interface Message { 
  id: string; 
  role: 'user' | 'raven'; 
  html: string; 
  climate?: string; 
  hook?: string;
  isReport?: boolean;
  reportType?: 'mirror' | 'balance' | 'journal';
  reportName?: string;
  reportSummary?: string;
  collapsed?: boolean;
  pingFeedbackRecorded?: boolean;
  fullContent?: string; // Store complete file content for analysis (separate from display HTML)
}

interface ReportContext {
  id: string;
  type: 'mirror' | 'balance' | 'journal';
  name: string;
  summary: string;
  content: string;
  relocation?: RelocationSummary;
}

interface StreamState { ravenId: string; acc: string; climate?: string; hook?: string; }


function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000}}>
  <div style={{background:'#181c24',borderRadius:12,padding:'32px 28px',boxShadow:'0 8px 32px #0008',maxWidth:420,width:'100%',position:'relative',color:'#e0e6f0'}}>
        <button onClick={onClose} style={{position:'absolute', top:12, right:12, background:'none', border:'none', color:'#94a3b8', fontSize:24, cursor:'pointer'}}>×</button>
        <h2 style={{marginTop:0, fontSize:20, color:'#f1f5f9'}}>Help & Button Guide</h2>
        <ul style={{fontSize:15, lineHeight:1.7, paddingLeft:0, listStyle:'none'}}>
          <li><b>🪞 Mirror</b>: Upload a Mirror report (personal reflection data) for analysis.</li>
          <li><b>🌡️ Balance</b>: Upload a Balance Meter report (energetic state snapshot).</li>
          <li><b>📔 Journal</b>: Upload a Journal entry (narrative or notes for context).</li>
          <li><b>🎭 Poetic</b>: Generate a poetic interpretation of your Mirror data (unlocked after uploading a Mirror).</li>
          <li><b>🎴 Card</b>: Create a visual Poetic Index Card from your Mirror data (unlocked after uploading a Mirror).</li>
          <li><b>🎴 Demo</b>: Preview a sample Poetic Index Card (no data required).</li>
          <li><b>🎭 Reveal</b>: Generate your Actor/Role composite from session feedback (shows after enough pings).</li>
          <li><b>ℹ️ About</b>: Learn about Raven Calder and the project’s philosophy.</li>
          <li><b>❓ Help</b>: Show this help dialog.</li>
        </ul>
        <div style={{fontSize:13, color:'#94a3b8', marginTop:16}}>
          <b>Tip:</b> Hover on any button for a tooltip. For best results, give feedback on several mirrors before using <b>Reveal</b>.
        </div>
      </div>
    </div>
  );
}

export default function ChatClient(){
  const [showHelp, setShowHelp] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{
    id: 'init',
    role: 'raven',
    html: `I’m a clean mirror. I put what you share next to the pattern I see and speak it back in plain language. No fate talk, no certainty—just useful reflections you can test.`,
    climate: generateDynamicClimate('supportive clear mirror'),
    hook: 'Atmosphere · Creator ∠ Mirror'
  }]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastUpdateRef = useRef<number>(0);
  const throttleDelay = 150; // Update every 150ms for smoother reading
  const [uploadType, setUploadType] = useState<'mirror' | 'balance' | 'journal' | null>(null);
  const [hasMirrorData, setHasMirrorData] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const streamContainerRef = useRef<HTMLDivElement>(null);
  const [relocation, setRelocation] = useState<RelocationSummary | null>(null);
  const [reportContexts, setReportContexts] = useState<ReportContext[]>([]);
  const [showWrapUpCard, setShowWrapUpCard] = useState(false);
  const [showPendingReview, setShowPendingReview] = useState(false);
  const [showReadingSummary, setShowReadingSummary] = useState(false);
  // Post-seal guidance state
  const [awaitingNewReadingGuide, setAwaitingNewReadingGuide] = useState(false);
  const [priorFocusKeywords, setPriorFocusKeywords] = useState<string[]>([]);
  
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
    sessionActive: true
  }));

  // Navigation state for Raven messages
  const [currentRavenIndex, setCurrentRavenIndex] = useState(0);
  
  // Check for report data from Math Brain integration
  useEffect(() => {
    const reportData = sessionStorage.getItem('woven_report_for_raven');
    if (reportData) {
      try {
        const parsed = JSON.parse(reportData);
        
        // Clear the sessionStorage so it doesn't auto-load again
        sessionStorage.removeItem('woven_report_for_raven');
        
        // Create a welcome message with the report data
        const reportMessage: Message = {
          id: generateId(),
          role: 'user',
          html: `Hi Raven! I've generated a chart analysis and would love your interpretation. Here's my information: ${parsed.meta?.person?.name || 'Name not provided'}, born ${parsed.meta?.person?.birthDate || 'unknown date'} at ${parsed.meta?.person?.birthTime || 'unknown time'} in ${parsed.meta?.person?.birthLocation || 'unknown location'}. Context: ${parsed.meta?.context || 'general reading'}.`,
          isReport: true,
          reportType: 'mirror',
          reportName: `Chart Analysis - ${parsed.meta?.person?.name || 'Unknown'}`,
          reportSummary: `Math Brain report from ${parsed.meta?.timestamp ? new Date(parsed.meta.timestamp).toLocaleDateString() : 'today'}`,
          fullContent: JSON.stringify(parsed.reportData, null, 2)
        };
        
        // Add the report message to the conversation
        setMessages(prev => [...prev, reportMessage]);
        
        // Auto-send a request for interpretation
        setTimeout(() => {
          const interpretationRequest = `Please provide your interpretation of this chart data. I'm particularly interested in understanding the key patterns and what they might reveal about my current life dynamics.`;
          setInput(interpretationRequest);
          // Auto-submit after a brief delay to let the user see what's happening
          setTimeout(() => {
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            document.querySelector('form')?.dispatchEvent(submitEvent);
          }, 1000);
        }, 500);
        
      } catch (error) {
        console.error('Failed to parse report data from sessionStorage:', error);
      }
    }
  }, []); // Run once on component mount
  
  // Helper: strip HTML to plain text
  const stripHtml = (s: string) => s.replace(/<[^>]*>/g, ' ').replace(/\s{2,}/g, ' ').trim();
  const firstSentenceOf = (s: string) => (s.match(/[^.!?]+[.!?]?/)?.[0] || s).trim();

  // Function to generate journal entry with a narrative paraphrase of the conversation
  const generateJournalEntry = async () => {
    // Extract user name from messages or use default
    const userMessages = messages.filter(m => m.role === 'user' && !m.isReport);
    const firstUserMessage = userMessages[0]?.html || '';
    const nameMatch = firstUserMessage.match(/my name is (\w+)/i) || 
                     firstUserMessage.match(/i'm (\w+)/i) ||
                     firstUserMessage.match(/i am (\w+)/i);
    const userName = nameMatch ? nameMatch[1] : 'the user';

    // Base journal from protocol engine
    const base = await naturalFollowUpFlow.generateJournalSummary(sessionContext, userName);

    // Build a concise narrative paraphrase from the last few turns
    const recent = messages.slice(-12); // last ~6 exchanges
    const userLines = recent.filter(m => m.role === 'user' && !m.isReport).map(m => stripHtml(m.html)).filter(Boolean);
    const ravenLines = recent.filter(m => m.role === 'raven').map(m => stripHtml(m.html)).filter(Boolean);

    const open = ravenLines[0] ? firstSentenceOf(ravenLines[0]) : '';
    const userPulse = userLines.length > 0 ? `They brought ${userLines.length === 1 ? 'one note' : userLines.length + ' notes'} of focus, including: "${firstSentenceOf(userLines[0])}"` : '';
    const mirrorPulse = ravenLines.length > 1 ? `Raven mirrored with lines like: "${firstSentenceOf(ravenLines[1])}"` : '';
    const closer = ravenLines[ravenLines.length - 1] ? `We closed on: "${firstSentenceOf(ravenLines[ravenLines.length - 1])}"` : '';

    const thread = [open && `Opening read: ${open}`, userPulse, mirrorPulse, closer]
      .filter(Boolean)
      .join(' \n\n');

    const conversationParaphrase = thread
      ? `Conversation Thread (Paraphrase)\n\n${thread}`
      : '';

    // Merge: append conversation paraphrase beneath the base narrative if present
    if (conversationParaphrase) {
      base.narrative = `${base.narrative}\n\n---\n${conversationParaphrase}`.trim();
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
    const userMessages = messages.filter(m => m.role === 'user');
    const firstUserMessage = userMessages[0]?.html || '';
    const nameMatch = firstUserMessage.match(/my name is (\w+)/i) || 
                     firstUserMessage.match(/i'm (\w+)/i) ||
                     firstUserMessage.match(/i am (\w+)/i);
    const userName = nameMatch ? nameMatch[1] : 'the user';

    // Calculate resonance fidelity
    const wb = sessionContext.wbHits.length;
    const abe = sessionContext.abeHits.length;
    const osr = sessionContext.osrMisses.length;
    
    const numerator = wb + (0.5 * abe);
    const denominator = wb + abe + osr;
    const percentage = denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
    
    let band: 'HIGH' | 'MIXED' | 'LOW' = 'LOW';
    let label = 'Extensive New Territory';
    
    if (percentage >= 70) {
      band = 'HIGH';
      label = 'Strong Harmonic Alignment';
    } else if (percentage >= 40) {
      band = 'MIXED';
      label = 'Mixed Alignment';
    }

    return {
      bigVectors: [
        {
          tension: "restless-contained",
          polarity: "Visionary Driver / Cutting Truth Style",
          charge: 4,
          source: 'personal-outer' as const
        }
      ],
      resonanceSnapshot: {
        affirmedParadoxes: sessionContext.wbHits.slice(0, 3).map((hit: any) => hit.content || 'Pattern recognized'),
        poemLines: ["The compass spins, a restless heart", "A whispered promise, barely heard"],
        symbolicImages: ["spinning compass", "restless energy", "whispered truth"],
        keyMoments: sessionContext.wbHits.slice(0, 2).map((hit: any) => hit.content || 'Key moment')
      },
      actorRoleComposite: {
        actor: "Visionary Driver",
        role: "Cutting Truth Style", 
        composite: "Visionary Driver / Cutting Truth Style",
        confidence: 'emerging' as const
      },
      resonanceFidelity: {
        percentage,
        band,
        label,
        wb,
        abe,
        osr
      },
      explanation: `You recognized the restless pull more than the steadying hand. That leans the weight toward your inner Driver. Raven reads this as a sidereal lean.`,
      balanceMeterClimate: {
        magnitude: 3,
        valence: 'drag' as const,
        volatility: 'mixed' as const,
        sfdVerdict: "Stirring with Drag",
        housePlacement: "House of Maintenance (work/health rhythm)",
        narrative: "The week trends at ⚡⚡⚡ 3 Stirring with 🌑 Drag—steady pull with a headwind in routines."
      },
      poemLine: "The compass spins, a restless heart. A whispered promise, barely heard.",
      sessionId: generateId()
    };
  };
  
  // Function to handle ping feedback
  const handlePingFeedback = (messageId: string, response: PingResponse, note?: string) => {
    // Get checkpoint type for analytics
    const message = messages.find(m => m.id === messageId);
    const checkpointType = message ? getPingCheckpointType(message.html) : 'general';
    const messageContent = message ? message.html : '';
    
    pingTracker.recordFeedback(messageId, response, note, checkpointType, messageContent);
    
    // Update messages state to mark feedback as recorded
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, pingFeedbackRecorded: true }
        : msg
    ));

    // Automatically trigger follow-up response from Raven based on feedback
    setTimeout(() => {
      let followUpText = '';
      
      if (response === 'yes') {
        followUpText = 'yes, that resonates with me';
      } else if (response === 'no') {
        followUpText = 'that doesn\'t feel familiar to me';
      } else if (response === 'maybe') {
        followUpText = 'that partially resonates, but not completely';
      } else if (response === 'unclear') {
        followUpText = 'that feels confusing or unclear to me';
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
    messages.forEach(m => {
      if (m.role === 'raven' && containsInitialProbe(m.html)) {
        const existing = pingTracker.getFeedback(m.id);
        if (!existing) {
          pingTracker.registerPending(m.id, getPingCheckpointType(m.html), m.html);
        }
      }
    });
  }, [messages]);

  // Get Raven messages for navigation
  const ravenMessages = messages.filter(m => m.role === 'raven');
  
  // Auto-advance to latest Raven message when it appears
  useEffect(()=>{
    const last = messages[messages.length - 1];
    if(last && last.role === 'raven'){
      const idx = ravenMessages.findIndex(r => r.id === last.id);
      if(idx !== -1) setCurrentRavenIndex(idx);
    }
  }, [messages, ravenMessages.length]);
  
  const SCROLL_OFFSET = 120; // header + nav panel padding
  const scrollMessageElementIntoView = (el: HTMLElement) => {
    const container = streamContainerRef.current;
    if (container) {
      const target = el.offsetTop - SCROLL_OFFSET;
      container.scrollTo({ top: target < 0 ? 0 : target, behavior: 'smooth' });
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    streamContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollHint(false);
  };

  // Position Raven responses optimally for reading, user messages scroll to bottom
  useEffect(() => {
    if (!typing) {
      // Skip auto-scroll on very first mount so intro card is not obscured by sticky header
      if (messages.length === 1 && messages[0]?.id === 'init') return;
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === 'raven') {
  const element = document.getElementById(`message-${lastMessage.id}`);
  if (element) scrollMessageElementIntoView(element);
      }
    }
  }, [typing, messages]);

  // Auto-scroll immediately for new user messages to bottom
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'user') {
      endRef.current?.scrollIntoView({behavior:'smooth'});
    }
  }, [messages.length]);

  // Auto-scroll to new Raven messages when they start (empty content means just created)
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'raven' && lastMessage.html === '') {
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
        const isSignificantlyScrolledUp = container.scrollTop + container.clientHeight < container.scrollHeight - 200;
        setShowScrollHint(isSignificantlyScrolledUp);
      }
    };
    
    container.addEventListener('scroll', handleScroll);
    
    // Don't show hint initially when typing starts - let Raven position naturally
    if (!typing) {
      setShowScrollHint(false);
    }
    
    return () => container.removeEventListener('scroll', handleScroll);
  }, [typing]);

  function toggleReportCollapse(messageId: string) {
    setMessages(m => m.map(msg => 
      msg.id === messageId 
        ? { ...msg, collapsed: !msg.collapsed }
        : msg
    ));
  }

  function removeReport(messageId: string) {
    setMessages(m => m.filter(msg => msg.id !== messageId));
  }

  async function analyzeReportContext(reportContext: ReportContext) {
    if (typing) return; // Don't start if already processing
    
    setTyping(true);
    const ctrl = new AbortController(); 
    abortRef.current = ctrl;
    
    // Create optimistic placeholder for Raven's response
    const ravenId = generateId();
    setMessages((m: Message[]) => [...m, {id: ravenId, role: 'raven', html: '', climate: '', hook: ''}]);
    
    try {
      const res = await fetch('/api/chat', {
        method: 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify({
          messages: [
            ...messages.slice(-5), // Include recent context
            {role: 'user', content: reportContext.content} // Use report content for analysis
          ],
          reportContexts: reportContexts.map(rc => ({
            id: rc.id,
            type: rc.type,
            name: rc.name,
            summary: rc.summary,
            content: rc.content
          }))
        }), 
        signal: ctrl.signal
      });
      
      if (!res.body) throw new Error('No stream');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = ''; 
      let climate: string | undefined; 
      let hook: string | undefined;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) { 
          // Final flush ensures prompt injection happens only once
          updateRaven(ravenId, acc, climate, hook, true); 
          break; 
        }
        const lines = decoder.decode(value, {stream: true}).split('\n').filter(Boolean);
        for (const ln of lines) {
          try {
            const obj = JSON.parse(ln);
            if (obj.delta) {
              acc += obj.delta;
              climate = obj.climate || climate;
              hook = obj.hook || hook;
              updateRaven(ravenId, acc, climate, hook, false);
            }
          } catch {/* ignore partial */}
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        updateRaven(ravenId, '<i>Analysis error. Try again.</i>', undefined, undefined);
      }
    } finally {
      setTyping(false); 
      abortRef.current = null;
    }
  }

  function removeReportContext(contextId: string) {
    setReportContexts(prev => prev.filter(ctx => ctx.id !== contextId));
    // Update relocation from remaining reports
    const remaining = reportContexts.filter(ctx => ctx.id !== contextId);
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
    setMessages((m: Message[]) => [...m, {id: ravenId, role: 'raven', html: '', climate: '', hook: ''}]);
    
    try {
      const res = await fetch('/api/chat', {
        method: 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify({
          messages: [
            ...messages.slice(-5), // Include recent context
            {role: 'user', content: fileMessage.fullContent || fileMessage.html} // Use full content for analysis
          ],
          reportContexts: reportContexts.map(rc => ({
            id: rc.id,
            type: rc.type,
            name: rc.name,
            summary: rc.summary,
            content: rc.content
          }))
        }), 
        signal: ctrl.signal
      });
      
      if (!res.body) throw new Error('No stream');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = ''; 
      let climate: string | undefined; 
      let hook: string | undefined;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) { 
          // Final flush ensures prompt injection happens only once
          updateRaven(ravenId, acc, climate, hook, true); 
          break; 
        }
        const lines = decoder.decode(value, {stream: true}).split('\n').filter(Boolean);
        for (const ln of lines) {
          try {
            const obj = JSON.parse(ln);
            if (obj.delta) {
              acc += obj.delta;
              climate = obj.climate || climate;
              hook = obj.hook || hook;
              updateRaven(ravenId, acc, climate, hook, false);
            }
          } catch {/* ignore partial */}
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        updateRaven(ravenId, '<i>Analysis error. Try again.</i>', undefined, undefined);
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
      try { abortRef.current.abort(); } catch {}
    }
    
    const userMsg: Message = { id: generateId(), role: 'user', html: escapeHtml(text) };
    setMessages((m: Message[]) => [...m, userMsg]);
    setTyping(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const ravenId = generateId();
    setMessages((m: Message[]) => [...m, { id: ravenId, role: 'raven', html: '', climate: '', hook: '' }]);
    
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, { role: 'user', content: text }] }),
        signal: ctrl.signal
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error('No response body');
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let partialChunk = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        partialChunk += decoder.decode(value, { stream: true });
        const lines = partialChunk.split('\n');
        partialChunk = lines.pop() || '';
        
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            setMessages((m: Message[]) => m.map(msg => 
              msg.id === ravenId ? { ...msg, html: msg.html + (parsed.delta || ''), climate: parsed.climate || msg.climate, hook: parsed.hook || msg.hook } : msg
            ));
          } catch (e) {
            console.warn('Failed to parse streaming chunk:', e);
          }
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Stream error:', error);
        setMessages((m: Message[]) => m.map(msg => 
          msg.id === ravenId ? { ...msg, html: 'Error: Failed to get response from Raven.' } : msg
        ));
      }
    } finally {
      setTyping(false);
      abortRef.current = null;
    }
  }

  async function send(){
    const text = input.trim();
    if(!text) return;
    // If sealing just happened, provide contextual nudge before sending
    if (awaitingNewReadingGuide) {
      const plain = text.toLowerCase();
      const kw = plain.replace(/<[^>]*>/g,'');
      const sameThread = (()=>{
        const tokens = kw.split(/\s+/).filter(Boolean);
        let overlap = 0; const setPrev = new Set(priorFocusKeywords);
        for (const t of tokens) if (setPrev.has(t)) { overlap++; if (overlap>=2) break; }
        const hint = /(same|continue|resume|again|back to|still on|pick up|that topic|previous)/i;
        return overlap >= 2 || hint.test(text);
      })();
      const line = sameThread
        ? "We can open a fresh reading on the same thread—say the word and I’ll start a new mirror."
        : "Got it—starting a new reading for this.";
      const guideId = generateId();
      setMessages((m:Message[])=>[...m, { id: guideId, role:'raven', html: line, climate:'', hook:'' }]);
      setAwaitingNewReadingGuide(false);
    }
    // Abort any in-flight stream before starting new one
    if (abortRef.current) {
      try { abortRef.current.abort(); } catch {}
    }
  const userMsg:Message={id:generateId(), role:'user', html:escapeHtml(text)};
    setMessages((m:Message[])=>[...m, userMsg]);
    setInput('');
    setTyping(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
  const ravenId = generateId();
    setMessages((m:Message[])=>[...m, {id:ravenId, role:'raven', html:'', climate:'', hook:''}]);
    try {
      const res = await fetch('/api/chat', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({
        messages: [...messages, {role:'user', content:text}],
        reportContexts: reportContexts.map(rc => ({
          id: rc.id,
          type: rc.type,
          name: rc.name,
          summary: rc.summary,
          content: rc.content
        }))
      }), signal: ctrl.signal});
      if(!res.body) throw new Error('No stream');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc=''; let climate: string|undefined; let hook: string|undefined;
      while(true){
        const {value, done} = await reader.read();
        if(done){
          updateRaven(ravenId, acc, climate, hook, true);
          break;
        }
        const chunk = decoder.decode(value, {stream:true});
        const lines = chunk.split(/\n+/).filter(Boolean);
        for(const ln of lines){
          try {
            const obj = JSON.parse(ln);
            if(obj.delta){
              acc += obj.delta;
              climate = obj.climate || climate;
              hook = obj.hook || hook;
              updateRaven(ravenId, acc, climate, hook, false);
            }
          } catch {/* ignore partial */}
        }
      }
    } catch(e:any){
      if(e.name !== 'AbortError') updateRaven(ravenId, '<i>Stream error. Try again.</i>', undefined, undefined);
    } finally {
      setTyping(false); abortRef.current = null;
    }
  }

  const handleFileSelect = (type: 'mirror' | 'balance' | 'journal') => {
    setUploadType(type);
    fileInputRef.current?.click();
  };

  const requestPoeticInsert = () => {
    const poeticText = 'Please create a Symbol-to-Poem translation based on the Mirror data you have. Follow the strict Symbol-to-Song Translation protocol with pure poem first, then explanation table with planetary emoji codes.';
    sendProgrammatic(poeticText);
  };

  const requestPoeticCard = () => {
    const cardText = 'Please create a Poetic Index Card for download. Generate both the symbol-to-poem translation AND the visual card data with title, poetic phrase, mirror prompt, and dominant planetary theme for a portrait-format card.';
    sendProgrammatic(cardText);
  };

  const generateVisualCard = (cardData?: PoeticIndexCard) => {
    // If no card data provided, try to parse from last Raven response
    let card = cardData;
    
    if (!card) {
      const lastRavenMessage = messages.filter(m => m.role === 'raven').pop();
      if (lastRavenMessage) {
        const parsed = parseCardFromResponse(lastRavenMessage.html);
        if (parsed) card = parsed;
      }
    }
    
    // If still no card, create a sample card for demonstration
    if (!card) {
      card = createSampleCard();
    }
    
    const html = generateCardHTML(card);
    
    // Try to open in new window first
    const newWindow = window.open('', '_blank');
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
    const modal = document.createElement('div');
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
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      max-width: 90%;
      max-height: 90%;
      overflow: auto;
      background: white;
      border-radius: 12px;
      position: relative;
    `;

    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
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
    const iframe = document.createElement('iframe');
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

  const requestDemoCard = () => {
    // Generate a demo card directly without requiring mirror data
    const demoCard = createDemoCard();
    generateVisualCard(demoCard);
  };

  const requestAbout = () => {
    const aboutMessage: Message = {
  id: generateId(),
      role: 'raven',
      html: 'I am the creation of Dan Cross, born from his compulsion to systematize survival into something transferable. I read the symbolic patterns of your reality without imposing my creator\'s story on yours.',
      climate: '🔍 Truth · 🌐 Origin · 🎯 Purpose',
      hook: 'Creator & Created · Pattern ↔ Recognition'
    };
    setMessages(m => [...m, aboutMessage]);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    let content: string;
    let relocationSummary: RelocationSummary | null = null;

    // Handle PDF files using PDF.js
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        // Set worker source to the CDN version
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .filter(item => 'str' in item)
            .map(item => (item as any).str)
            .join(' ');
          fullText += pageText + '\n\n';
        }
        
        content = fullText.trim();
      } catch (error) {
        console.error('Error extracting PDF text:', error);
        alert('Failed to extract text from PDF. Please try a different file.');
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
    let reportInfo = '';
    let inferredType: 'mirror' | 'balance' | 'journal' | null = null;
    
    try {
      const jsonData = JSON.parse(content);
      if (jsonData.context && jsonData.balance_meter) {
        // This is a WovenWebApp JSON report
        const { context, balance_meter } = jsonData;
        // compute relocation summary if available
        try {
          if (context?.translocation) {
            relocationSummary = summarizeRelocation({
              // @ts-ignore allow flexible json
              type: jsonData.type || 'balance',
              natal: context.natal || { name: '', birth_date: '', birth_time: '', birth_place: '' },
              translocation: {
                applies: !!context.translocation.applies,
                current_location: context.translocation.current_location || 'Natal Base',
                house_system: context.translocation.house_system,
                tz: context.translocation.tz
              }
            } as any);
            setRelocation(relocationSummary);
          } else {
            setRelocation(null);
          }
        } catch {
          setRelocation(null);
        }
        reportInfo = `JSON Report for ${context.natal?.name || 'Unknown'} | Magnitude: ${balance_meter.magnitude?.value} (${balance_meter.magnitude?.term}) | Valence: ${balance_meter.valence?.emoji} ${balance_meter.valence?.term}`;
        displayContent = JSON.stringify(jsonData, null, 2);
        // Heuristic: presence of 'reports.templates.solo_mirror' or 'mirror' wording indicates mirror vs balance
        if (jsonData.reports?.templates?.solo_mirror || /solo mirror/i.test(content)) {
          inferredType = 'mirror';
        } else {
          inferredType = 'balance';
        }
      }
    } catch {
      // Not JSON or invalid JSON, use original content
      setRelocation(null);
    }
    
    // Apply frontstage cleanse for non-JSON plain text (avoid mutating raw JSON structures)
    const isLikelyJson = displayContent.trim().startsWith('{') && displayContent.trim().endsWith('}');
    const frontstageDisplay = !isLikelyJson ? cleanseFrontstage(displayContent) : displayContent;
  const resolvedType = uploadType || inferredType || 'balance';
  
  // Create report context entry
  const reportContext: ReportContext = {
    id: generateId(),
    type: resolvedType,
    name: reportInfo ? reportInfo.split('|')[0].trim() : `${uploadType || 'Balance'} Report`,
    summary: [
      reportInfo,
      relocationSummary?.disclosure || null
    ].filter(Boolean).join(' • '),
    content: content,
    relocation: relocationSummary || undefined
  };
  
  // Add to contexts (allow multiple reports)
  setReportContexts(prev => [...prev, reportContext]);
  
  // Update relocation from most recent report
  setRelocation(relocationSummary);
  
  // Automatically trigger analysis for the new report context
  await analyzeReportContext(reportContext);
  
  // No longer create a message - reports are now just context
  // Track mirror data for poetic insert availability
  if (resolvedType === 'mirror' || (reportInfo && reportInfo.includes('JSON Report'))) {
    setHasMirrorData(true);
  }

  // Reset file input to allow uploading the same file again
  if (event.target) {
    (event.target as HTMLInputElement).value = '';
  }
};

  function stop(){
    abortRef.current?.abort();
  }

  function formatResponseText(text: string): string {
    if (!text) return '';
    const raw = text.replace(/\r/g, '').trim();
    const blocks = raw.split(/\n{2,}/); // user-intent paragraphs
    const paragraphs: string[] = [];
    for (const block of blocks) {
      const sentences = (block.match(/[^.!?]+[.!?]?/g) || [block]).map(s => s.trim()).filter(Boolean);
      let acc = '';
      for (const s of sentences) {
        // Merge very short sentences to avoid choppy paragraphs
        if ((acc + ' ' + s).trim().length > 320) {
          if (acc) paragraphs.push(acc.trim());
          acc = s;
        } else {
          acc = acc ? acc + ' ' + s : s;
        }
      }
      if (acc) paragraphs.push(acc.trim());
    }
    return paragraphs.map(p => `<p>${p}</p>`).join('\n');
  }

  // Refinement: coherence, de-duplication, gentle confidence tuning
  function refineResponseText(text: string, userAffirmed: boolean): string {
    let t = text;
    // Fix common streaming typos / mashed tokens
    t = t.replace(/surprsing/gi, 'surprising')
         .replace(/coorlleation/gi, 'correlation')
         .replace(/correllation/gi, 'correlation');
    // Insert sentence boundary where a lowercase letter is immediately followed by capital start
    t = t.replace(/([a-z])([A-Z][a-z])/g, '$1. $2');
    // Remove duplicated opening acknowledgement fragments
    t = t.replace(/^\s*(it does|yes|yeah|yep|indeed|sure)\b[\s\.,;:-]*/i, '');
    // If we have a mashed echo + explanation (e.g., "It does. That may surprising.Does what fit") fix punctuation spacing
    t = t.replace(/\.([A-Z])/g, '. $1');
    // Collapse accidental duplicate starts (e.g., "It does. It does.")
    t = t.replace(/^(It does\.)\s+It does\./i, '$1');
    // Confidence adjustment: only if user affirmed and early sentence references correlation / balance meter
    if (userAffirmed) {
      t = t.replace(/\bmay be showing up\b/i, 'is likely showing up');
      t = t.replace(/\bmay reflect\b/i, 'likely reflects');
      // Upgrade a single cautious modal in first 180 chars
      const head = t.slice(0, 180);
      const upgraded = head.replace(/\b(may|might|could)\b(?! have)/i, 'likely');
      t = upgraded + t.slice(180);
    }
    // Guard against over-confidence: ensure no absolute deterministic claims
    t = t.replace(/\bwill certainly\b/gi, 'will likely');
    return t.trim();
  }

  function updateRaven(id: string, html: string, climate?: string, hook?: string, final: boolean = false) {
    const now = Date.now();
    const boundaryPunct = /[.!?]$/;
    const enoughTime = now - lastUpdateRef.current > throttleDelay;
    const atSentenceBoundary = boundaryPunct.test(html.trim());
    // Only push partial updates at sentence boundaries or when sufficient time elapsed
    if (!(final || atSentenceBoundary || enoughTime)) return;
    lastUpdateRef.current = now;

    // Cleaning & formatting pipeline
    let cleaned = cleanseFrontstage(html);

    // Remove accidental echo of short user acknowledgement at start
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (lastUser) {
      const ack = lastUser.html.replace(/<[^>]*>/g, '').trim().toLowerCase();
      if (ack && ack.length <= 18) {
        const lowerClean = cleaned.trimStart().toLowerCase();
        if (lowerClean.startsWith(ack + '.') || lowerClean.startsWith(ack + ' ')) {
          cleaned = cleaned.trimStart().slice(ack.length).replace(/^\.?\s*/, '');
        }
      }
    }

    // Grammar / spacing fixes before paragraph formatting
    cleaned = cleaned
      // Ensure space after punctuation if followed by a letter
      .replace(/([.!?])(\w)/g, '$1 $2')
      // Collapse triple dots spacing issues
      .replace(/\.\.\./g, '…')
      // Fix duplicate spaces
      .replace(/ {2,}/g, ' ');

  // Determine if last user message was an affirmative acknowledgement
  const lastUserPlain = lastUser ? lastUser.html.replace(/<[^>]*>/g, '').toLowerCase() : '';
  const userAffirmed = /\b(yes|yeah|yep|it does|it did|correct|right|exactly|true|that matches|i agree)\b/.test(lastUserPlain);
  cleaned = refineResponseText(cleaned, userAffirmed);
  const formattedHtml = formatResponseText(cleaned);

    // Determine if this is the first substantive Raven message (only the intro existed before)
  const priorRavenCount = messages.filter(m => m.role === 'raven' && m.id !== id).length;
  const isFirstSubstantiveRaven = priorRavenCount <= 1; // suppress only for very first mirror

    setMessages((m: Message[]) => 
      m.map(msg => {
        if (msg.id !== id) return msg;
        // Only append recognition prompt on final commit (avoid appearing mid-stream)
        const finalHtml = final 
          ? (isFirstSubstantiveRaven ? formattedHtml : maybeAppendRecognitionPrompt(formattedHtml, msg.isReport, lastUserPlain))
          : formattedHtml;
        return {
          ...msg,
            html: finalHtml,
            climate: climate || msg.climate,
            hook: hook || msg.hook
        };
      })
    );
  }

  function pickHook(text:string){
    if(/dream|sleep/i.test(text)) return 'Duty & Dreams · Saturn ↔ Neptune';
    if(/private|depth|shadow/i.test(text)) return 'Private & Piercing · Mercury ↔ Pluto';
    if(/restless|ground/i.test(text)) return 'Restless & Grounded · Pluto ↔ Moon';
    return undefined;
  }

  // (legacy local escapeHtml retained above for global use)
  function wait(ms:number){ return new Promise(r=>setTimeout(r,ms)); }


  return (
    <div className="app" style={{display:'flex', flexDirection:'column', height:'100vh', maxWidth:980, margin:'0 auto'}}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
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
  onPoeticCard={() => {}}
  onDemoCard={() => {}}
  onShowWrapUp={() => setShowWrapUpCard(true)}
  onShowPendingReview={() => setShowPendingReview(true)}
  onShowHelp={() => setShowHelp(true)}
      />
      {showHelp && (
        <HelpModal onClose={() => setShowHelp(false)} />
      )}
      <NavigationPanel
        ravenMessages={ravenMessages}
        scrollToTop={scrollToTop}
        scrollToRavenMessage={scrollToRavenMessage}
        currentRavenIndex={currentRavenIndex}
        scrollToBottom={scrollToBottom}
      />
      <main style={{flex: 1, display:'grid', gridTemplateColumns:'270px 1fr', gap:12, padding:12, position:'relative', minHeight: 0, overflow: 'hidden'}}>
        <Sidebar 
          onInsert={(m)=> {
            // Send the message programmatically to trigger Raven's response
            const text = m.html || m.content || '';
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
            style={{
              position: 'absolute',
              bottom: 20,
              right: 20,
              background: 'var(--accent)',
              border: 'none',
              borderRadius: '50%',
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 18,
              color: 'white',
              boxShadow: '0 4px 12px rgba(124, 92, 255, 0.3)',
              zIndex: 1000,
              animation: 'pulse 2s infinite'
            }}
            title="Return to current response"
          >
            ↓
          </button>
        )}
      </main>
      
      {/* End Current Reading Button - Subtle placement */}
      <div style={{
        padding: '8px 18px',
        borderTop: '1px solid var(--line)',
        background: 'var(--bg)',
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center'
      }}>
        <button
          className="btn"
          style={{
            ...btnStyle,
            background: 'transparent',
            border: '1px solid var(--line)',
            color: 'var(--muted)',
            fontSize: 11,
            padding: '4px 8px',
            opacity: 0.6,
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
          onClick={() => setShowReadingSummary(true)}
          title="End current reading and show comprehensive summary"
        >
          🔮 End Reading
        </button>
      </div>
      
      <Composer input={input} setInput={setInput} onSend={send} onStop={stop} disabled={typing} />
  {/* Actor/Role Wrap-Up Card (appears only at wrap-up; offers optional rubric) */}
      {showWrapUpCard && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
      <WrapUpCard 
            onClose={() => setShowWrapUpCard(false)} 
            onSealed={(sealedId, nextId) => {
              // Drop a gentle Raven line post-seal
              const ravenId = crypto.randomUUID();
              setMessages((m:Message[]) => [...m, { id: ravenId, role:'raven', html: `Thanks for scoring. I’ve sealed that reading. If you want to look at something new, we’ll start fresh from here.`, climate:'', hook:'' }]);
        // Capture prior focus keywords from last 6 user messages
        const lastUsers = [...messages].filter(m=>m.role==='user').slice(-6);
        const textBlob = lastUsers.map(u=>u.html.replace(/<[^>]*>/g,'').toLowerCase()).join(' ');
        const tokens = textBlob.replace(/[^a-z0-9\s\-]/g,' ').split(/\s+/).filter(t=>t.length>2);
        const freq:Record<string,number> = {};
        for(const t of tokens) freq[t]=(freq[t]||0)+1;
        const top = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([k])=>k);
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
              sessionActive: true
            });
          }}
        />
      )}
    </div>
  );
}

function Header({ onFileSelect, hasMirrorData, onPoeticInsert, onPoeticCard, onDemoCard, onAbout, onToggleSidebar, sidebarOpen, reportContexts, onRemoveReportContext, onShowWrapUp, onShowPendingReview, onShowHelp }:{
  onFileSelect: (type: 'mirror' | 'balance' | 'journal') => void;
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
}){
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [showPoeticMenu, setShowPoeticMenu] = useState(false);
  
  useEffect(() => {
    setPendingCount(pingTracker.getPendingCount(true));
    const id = setInterval(() => setPendingCount(pingTracker.getPendingCount(true)), 5000);
    return () => clearInterval(id);
  }, []);

  // Close poetic menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowPoeticMenu(false);
    if (showPoeticMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showPoeticMenu]);

  const getReportIcon = (type: 'mirror' | 'balance' | 'journal') => {
    switch(type) {
      case 'mirror': return '🪞';
      case 'balance': return '🌡️';
      case 'journal': return '📔';
      default: return '📄';
    }
  };

  return (
    <header style={{position:'sticky', top:0, zIndex:10, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 18px', background:'rgba(20,24,33,.9)', backdropFilter:'blur(10px)', borderBottom:'1px solid var(--line)'}}>
      <div style={{display:'flex', alignItems:'center', gap:12}}>
        <div style={{width:36,height:36,display:'grid',placeItems:'center',borderRadius:'50%',background:'radial-gradient(120% 120% at 50% 20%, #262a36, #12151c)', boxShadow:'inset 0 0 18px rgba(124,92,255,.25)', fontSize:20}} aria-hidden>🐦‍⬛</div>
        <div style={{display:'flex', flexDirection:'column'}}>
          <b>Raven Calder</b>
          <div style={{display:'flex', alignItems:'center', gap:8, fontSize:12, color:'var(--muted)'}}>
            <span style={{width:8,height:8,borderRadius:'50%',background:'var(--good)', boxShadow:'0 0 10px var(--good)'}}></span>
            <span>Connected</span>
            {reportContexts.length > 0 && (
              <div style={{display:'flex', alignItems:'center', gap:4, marginLeft:8}}>
                <span style={{color:'var(--accent)', fontSize:10}}>•</span>
                {reportContexts.map((ctx, index) => (
                  <div key={ctx.id} style={{display:'flex', alignItems:'center', gap:2}}>
                    <span style={{fontSize:10}} title={ctx.summary}>
                      {getReportIcon(ctx.type)} {ctx.name}
                    </span>
                    <button 
                      onClick={() => onRemoveReportContext(ctx.id)}
                      style={{background:'none', border:'none', color:'var(--muted)', fontSize:8, cursor:'pointer', padding:0}}
                      title="Remove context"
                    >
                      ✕
                    </button>
                    {index < reportContexts.length - 1 && <span style={{color:'var(--muted)', fontSize:8}}>|</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div style={{display:'flex', alignItems:'center', gap:10}}>
        <HitRateDisplay className="hidden sm:block" />
        <UsageMeter compact={true} className="hidden sm:block" />
    {pendingCount > 0 && (
          <button
            className="btn"
            style={{...btnStyle, fontSize:12, padding:'4px 8px', background:'rgba(255,255,255,0.04)'}}
      onClick={onShowPendingReview}
            title={`${pendingCount} pending mirrors`}
          >
            ● {pendingCount} pending
          </button>
        )}
      </div>
      
      {/* Core File Upload Buttons - Always Visible */}
      <div style={{display:'flex', gap:8}}>
        <button className="btn" style={btnStyle} onClick={() => onFileSelect('mirror')}>🪞 Mirror</button>
        <button className="btn" style={btnStyle} onClick={() => onFileSelect('balance')}>🌡️ Balance</button>
        <button className="btn" style={btnStyle} onClick={() => onFileSelect('journal')}>📔 Journal</button>
        
        {/* Poetic Options Dropdown */}
        <div style={{position: 'relative'}}>
          <button 
            className="btn" 
            style={{...btnStyle, background: 'linear-gradient(135deg, #6a53ff, #9c27b0)'}} 
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
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 4,
                background: 'var(--bg)',
                border: '1px solid var(--line)',
                borderRadius: 8,
                padding: 8,
                minWidth: 180,
                zIndex: 1000,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                className="btn" 
                style={{...btnStyle, width: '100%', marginBottom: 4, justifyContent: 'flex-start'}} 
                onClick={() => { onShowWrapUp(); setShowPoeticMenu(false); }}
                title="Generate Actor/Role composite from session feedback"
              >
                🎭 Actor/Role Reveal
              </button>
              {hasMirrorData && (
                <>
                  <button 
                    className="btn" 
                    style={{...btnStyle, width: '100%', marginBottom: 4, justifyContent: 'flex-start'}} 
                    onClick={() => { onPoeticInsert(); setShowPoeticMenu(false); }}
                  >
                    📝 Poetic Insert
                  </button>
                  <button 
                    className="btn" 
                    style={{...btnStyle, width: '100%', marginBottom: 4, justifyContent: 'flex-start'}} 
                    onClick={() => { onPoeticCard(); setShowPoeticMenu(false); }}
                  >
                    🎴 Create Card
                  </button>
                </>
              )}
              <button 
                className="btn" 
                style={{...btnStyle, width: '100%', marginBottom: 4, justifyContent: 'flex-start'}} 
                onClick={() => { onDemoCard(); setShowPoeticMenu(false); }}
                title="Generate demo poetic card"
              >
                🎴 Demo Card
              </button>
            </div>
          )}
        </div>
        
        <button className="btn" style={{...btnStyle, background:'transparent'}} onClick={onAbout}>ℹ️ About</button>
        <button className="btn" style={{...btnStyle, background:'transparent'}} onClick={onShowHelp} title="Help & Button Guide">❓ Help</button>
      </div>
    </header>
  );
}

// HelpModal component moved outside of Header and other components

const btnStyle:React.CSSProperties={background:'var(--soft)', color:'var(--text)', border:'1px solid var(--line)', padding:'8px 10px', borderRadius:10, fontSize:13, cursor:'pointer'};

const navBtnStyle:React.CSSProperties={
  background:'none', 
  border:'1px solid var(--line)', 
  borderRadius:6, 
  color:'var(--text)', 
  padding:'6px 10px', 
  fontSize:11, 
  cursor:'pointer',
  transition: 'all 0.2s ease'
};

function Sidebar({ onInsert, hasMirrorData }:{ onInsert:(m:any)=>void; hasMirrorData: boolean }){
  const [activeSection, setActiveSection] = useState<'glossary' | 'hooks' | 'poetic'>('glossary');
  
  return (
    <aside style={{background:'var(--panel)', border:'1px solid var(--line)', borderRadius:'var(--radius)', padding:14, height:'100%', overflow:'auto'}}>
      {/* Section Navigation */}
      <div style={{display:'flex', gap:4, marginBottom:16}}>
        <button 
          onClick={() => setActiveSection('glossary')} 
          style={{...tabStyle, ...(activeSection === 'glossary' ? activeTabStyle : {})}}
        >
          📖 Glossary
        </button>
        <button 
          onClick={() => setActiveSection('hooks')} 
          style={{...tabStyle, ...(activeSection === 'hooks' ? activeTabStyle : {})}}
        >
          🎣 Hooks
        </button>
        <button 
          onClick={() => setActiveSection('poetic')} 
          style={{...tabStyle, ...(activeSection === 'poetic' ? activeTabStyle : {})}}
        >
          🎭 Poetic
        </button>
      </div>

      {/* Data Upload Instruction */}
      {!hasMirrorData && (
        <div style={{
          background: 'rgba(103, 103, 193, 0.1)', 
          border: '1px solid rgba(103, 103, 193, 0.3)',
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '16px',
          textAlign: 'center'
        }}>
          <div style={{color: 'var(--text)', fontSize: '13px', lineHeight: '1.4'}}>
            Upload Math Brain Mirror or Balance Report for a Raven Calder Read
          </div>
        </div>
      )}

      {/* Glossary Section */}
      {activeSection === 'glossary' && (
        <div>
          <div style={sectionTitle}>Balance Meter Framework</div>
          
          <GlossaryItem 
            symbol="⚡" 
            title="Magnitude" 
            description="Symbolic intensity scale"
            details={[
              "0 = Latent", "1 = Murmur", "2 = Pulse", 
              "3 = Stirring", "4 = Convergence", "5 = Threshold"
            ]}
          />
          
          <GlossaryItem 
            symbol="🌞" 
            title="Valence" 
            description="Energy direction & quality"
            details={[
              "🌞 supportive = helping/scaffolding",
              "🌗 mixed = complex blend", 
              "🌑 restrictive = constraining"
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
              "Storm-class = maximum dispersal"
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
              "Provides actionable guidance"
            ]}
          />

          <div style={sectionTitle}>Valence Indicators</div>
          
          <div style={{fontSize: 11, color: 'var(--muted)', marginBottom: 8}}>Positive Valence Modes</div>
          <GlossaryItem symbol="🌱" title="Fertile Field" description="Growth-supportive conditions" />
          <GlossaryItem symbol="✨" title="Harmonic Resonance" description="Natural alignment and flow" />
          <GlossaryItem symbol="💎" title="Expansion Lift" description="Elevating, broadening energy" />
          <GlossaryItem symbol="🔥" title="Combustion Clarity" description="Clear, focused intensity" />
          <GlossaryItem symbol="🦋" title="Liberation/Release" description="Freedom from constraints" />
          <GlossaryItem symbol="⚖️" title="Integration" description="Balanced synthesis" />
          <GlossaryItem symbol="🌊" title="Flow Tide" description="Natural momentum" />
          <GlossaryItem symbol="🌈" title="Visionary Spark" description="Inspirational breakthrough" />
          
          <div style={{fontSize: 11, color: 'var(--muted)', marginBottom: 8, marginTop: 12}}>Negative Valence Modes</div>
          <GlossaryItem symbol="♾️" title="Recursion Pull" description="Repetitive patterns drawing back" />
          <GlossaryItem symbol="⚔️" title="Friction Clash" description="Opposing forces in conflict" />
          <GlossaryItem symbol="↔️" title="Cross Current" description="Contradictory energies" />
          <GlossaryItem symbol="🌫️" title="Fog/Dissolution" description="Unclear, dissolving boundaries" />
          <GlossaryItem symbol="🌋" title="Pressure/Eruption" description="Building tension seeking release" />
          <GlossaryItem symbol="⏳" title="Saturn Weight" description="Heavy, restrictive pressure" />
          <GlossaryItem symbol="🧩" title="Fragmentation" description="Scattered, disconnected pieces" />
          <GlossaryItem symbol="🕳️" title="Entropy Drift" description="Dissolving structure" />

          <div style={sectionTitle}>Sources of Force</div>
          
          <GlossaryItem symbol="🎯" title="Orb" description="Proximity factor in aspects" />
          <GlossaryItem symbol="🌀" title="Aspect" description="Angular relationship type" />
          <GlossaryItem symbol="🪐" title="Potency" description="Planet speed and strength" />
          <GlossaryItem symbol="📡" title="Resonance" description="Natal chart activation" />

          <div style={sectionTitle}>Planetary Forces</div>
          
          <GlossaryItem symbol="☽" title="Moon" description="Emotional tides, instinctive patterns" />
          <GlossaryItem symbol="☿" title="Mercury" description="Communication, thought processing" />
          <GlossaryItem symbol="♀" title="Venus" description="Values, relationships, beauty" />
          <GlossaryItem symbol="♂" title="Mars" description="Action, drive, assertion" />
          <GlossaryItem symbol="♃" title="Jupiter" description="Expansion, wisdom, growth" />
          <GlossaryItem symbol="♄" title="Saturn" description="Structure, discipline, limits" />
          <GlossaryItem symbol="♅" title="Uranus" description="Innovation, rebellion, awakening" />
          <GlossaryItem symbol="♆" title="Neptune" description="Dreams, spirituality, illusion" />
          <GlossaryItem symbol="♇" title="Pluto" description="Transformation, depth, power" />

          <div style={sectionTitle}>Core Dynamics</div>
          
          <GlossaryItem symbol="↔" title="Polarity" description="Dynamic tension between forces" />
          <GlossaryItem symbol="🪞" title="Mirror" description="Reflection of inner patterns" />
          <GlossaryItem symbol="🌡️" title="Balance" description="Current energetic state" />
          <GlossaryItem symbol="📔" title="Journal" description="Personal narrative tracking" />
          <GlossaryItem 
            symbol="⚡" 
            title="Symbolic Quake" 
            description="Energetic disturbance measurement"
            details={[
              "Seismograph-style intensity scale",
              "Tracks symbolic rather than literal events",
              "Measures psychological/spiritual impact"
            ]}
          />
          <GlossaryItem 
            symbol="🎭" 
            title="Poetic Insert" 
            description="Artistic interpretation of patterns"
            details={[
              "Transforms analysis into poetry",
              "Captures essence beyond literal meaning",
              "Bridges symbolic and creative expression"
            ]}
          />
        </div>
      )}

      {/* Quick Hooks Section */}
      {activeSection === 'hooks' && (
        <div>
          {hasMirrorData ? (
            <>
              <div style={sectionTitle}>Quick Insights</div>
              <div style={{display:'flex', flexDirection: 'column', gap:8}}>
                <Chip label="🔮 Generate Polarity Reading" onClick={()=> onInsert({id:generateId(), role:'user', html:'generate polarity reading'})} />
                <Chip label="⚖️ Balance Check" onClick={()=> onInsert({id:generateId(), role:'user', html:'balance check'})} />
                <Chip label="🌊 Flow State Reading" onClick={()=> onInsert({id:generateId(), role:'user', html:'flow state reading'})} />
              </div>
            </>
          ) : (
            <div style={{textAlign: 'center', padding: '20px', color: 'var(--muted)'}}>
              <div style={{fontSize: '13px', lineHeight: '1.4'}}>
                Quick Insights become available after uploading Math Brain data
              </div>
            </div>
          )}
        </div>
      )}

      {/* Poetic Inserts Section */}
      {activeSection === 'poetic' && (
        <div>
          <div style={sectionTitle}>Creative Commands</div>
          <div style={{display:'flex', flexDirection: 'column', gap:8}}>
            <Chip label="✍️ Write my poem" onClick={()=> onInsert({id:generateId(), role:'user', html:'write my poem'})} />
            <Chip label="🎭 Poetic interpretation" onClick={()=> onInsert({id:generateId(), role:'user', html:'poetic interpretation'})} />
            <Chip label="🌟 Symbolic weather report" onClick={()=> onInsert({id:generateId(), role:'user', html:'symbolic weather report'})} />
            <Chip label="📿 Daily mantra" onClick={()=> onInsert({id:generateId(), role:'user', html:'daily mantra'})} />
          </div>
        </div>
      )}
    </aside>
  );
}
const sectionTitle:React.CSSProperties={fontSize:12, textTransform:'uppercase', letterSpacing:'.14em', color:'var(--muted)', margin:'8px 0 10px'};

const tabStyle: React.CSSProperties = {
  background: 'none',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'var(--line)',
  borderRadius: '6px',
  color: 'var(--muted)',
  padding: '4px 8px',
  fontSize: 11,
  cursor: 'pointer',
  transition: 'all 0.2s ease'
};

const activeTabStyle: React.CSSProperties = {
  background: 'var(--soft)',
  color: 'var(--text)',
  borderColor: 'var(--accent)'
};

function GlossaryItem({ symbol, title, description, details }: {
  symbol: string;
  title: string; 
  description: string;
  details?: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div 
      className="glossary-item"
      style={{marginBottom: 12, padding: 8, border: '1px solid var(--line)', borderRadius: 6, background: 'var(--soft)'}}
      title={`${title}: ${description}`} // Tooltip with title and description
    >
      <div 
        style={{display: 'flex', alignItems: 'center', gap: 8, cursor: details ? 'pointer' : 'default'}}
        onClick={() => details && setExpanded(!expanded)}
      >
        <span 
          style={{fontSize: 16}} 
          title={`${symbol} ${title} - ${description}`} // Enhanced tooltip for the symbol
        >
          {symbol}
        </span>
        <div style={{flex: 1}}>
          <div style={{fontSize: 12, fontWeight: 'bold', color: 'var(--text)'}}>{title}</div>
          <div style={{fontSize: 11, color: 'var(--muted)'}}>{description}</div>
        </div>
        {details && (
          <span style={{fontSize: 10, color: 'var(--muted)'}}>
            {expanded ? '▼' : '▶'}
          </span>
        )}
      </div>
      {details && expanded && (
        <div style={{marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--line)'}}>
          {details.map((detail, i) => (
            <div key={i} style={{fontSize: 10, color: 'var(--muted)', marginBottom: 2}}>
              • {detail}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({label,onClick}:{label:string;onClick:()=>void}){
  return (
    <button 
      onClick={onClick} 
      style={{
        display:'flex', 
        alignItems:'center', 
        justifyContent: 'flex-start',
        gap:8, 
        fontSize:12, 
        padding:'8px 12px', 
        borderRadius:8, 
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'var(--line)', 
        background:'var(--soft)', 
        color:'var(--text)', // Ensure white text
        cursor:'pointer',
        textAlign: 'left',
        width: '100%',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--panel)';
        e.currentTarget.style.borderColor = 'var(--accent)';
        e.currentTarget.style.color = 'var(--text)'; // Keep white on hover
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--soft)';
        e.currentTarget.style.borderColor = 'var(--line)';
        e.currentTarget.style.color = 'var(--text)'; // Keep white
      }}
    >
      {label}
    </button>
  );
}

function Stream({messages, typing, endRef, containerRef, onToggleCollapse, onRemove, onPingFeedback}:{
  messages: Message[]; 
  typing: boolean; 
  endRef: React.RefObject<HTMLDivElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  onToggleCollapse: (messageId: string) => void;
  onRemove: (messageId: string) => void;
  onPingFeedback: (messageId: string, response: PingResponse, note?: string) => void;
}){
  return (
    <section 
      ref={containerRef}
      aria-label="Conversation" 
      role="log" 
      style={{
        background:'var(--panel)', 
        border:'1px solid var(--line)', 
        borderRadius:'var(--radius)', 
        padding:12, 
        display:'flex', 
        flexDirection:'column', 
        gap:12, 
        overflow:'auto',
        height: '100%'
      }}
    >
      {messages.map(m=> <Bubble key={m.id} msg={m} onToggleCollapse={onToggleCollapse} onRemove={onRemove} onPingFeedback={onPingFeedback} />)}
      {typing && <div style={{opacity:.6, fontSize:12}}><span className="dots"><span/> <span/> <span/></span> typing…</div>}
      <div ref={endRef} />
    </section>
  );
}

function Bubble({msg, onToggleCollapse, onRemove, onPingFeedback}:{
  msg: Message;
  onToggleCollapse: (messageId: string) => void;
  onRemove: (messageId: string) => void;
  onPingFeedback: (messageId: string, response: PingResponse, note?: string) => void;
}){
  const [isCopied, setIsCopied] = useState(false);
  const base:React.CSSProperties={maxWidth:'82%', padding:'12px 14px', borderRadius:16, position:'relative', boxShadow:'0 6px 16px rgba(0,0,0,.25)', border:'1px solid #1f2533', scrollMarginTop:120};
  const style = msg.role==='user' ? {alignSelf:'flex-end', background:'linear-gradient(180deg,#1f2432,#171b25)'} : {alignSelf:'flex-start', background:'linear-gradient(180deg,#171b25,#131824)', borderLeft:'2px solid #2b3244'};
  
  // Copy functionality for Raven messages
  const copyToClipboard = async (text: string) => {
    try {
      // Strip HTML tags for plain text copy
      const plainText = text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      await navigator.clipboard.writeText(plainText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Hide after 2 seconds
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  // Special handling for reports
  if (msg.isReport) {
    return (
      <article id={`message-${msg.id}`} style={{...base, ...style}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: msg.collapsed ? 0 : 8}}>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <span style={{fontSize:12, color:'#8b94a6', textTransform:'uppercase', letterSpacing:'0.5px'}}>
              {msg.reportType} REPORT
            </span>
            <span style={{fontSize:14, color:'#cbd4e4', fontWeight:500}}>
              {msg.reportName}
            </span>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <button 
              onClick={() => onToggleCollapse(msg.id)}
              style={{
                background:'none', 
                border:'1px solid #2a3143', 
                borderRadius:4, 
                color:'#8b94a6', 
                padding:'4px 8px', 
                fontSize:11, 
                cursor:'pointer'
              }}
            >
              {msg.collapsed ? 'Expand' : 'Collapse'}
            </button>
            <button 
              onClick={() => onRemove(msg.id)}
              style={{
                background:'none', 
                border:'1px solid #4a3143', 
                borderRadius:4, 
                color:'#c47a7a', 
                padding:'4px 8px', 
                fontSize:11, 
                cursor:'pointer'
              }}
            >
              Remove
            </button>
          </div>
        </div>
        {msg.reportSummary && !msg.collapsed && (
          <div style={{fontSize:11, color:'#8b94a6', marginBottom:8, fontStyle:'italic'}}>
            {msg.reportSummary}
          </div>
        )}
        {!msg.collapsed && (
          <div className={msg.role === 'raven' ? 'raven-response' : ''} dangerouslySetInnerHTML={{__html: msg.html}} />
        )}
      </article>
    );
  }
  
  // Regular message display
  return (
    <article id={`message-${msg.id}`} style={{...base, ...style}}>
      {/* Top climate/hook header for Raven messages */}
      {msg.role === 'raven' && (msg.climate || msg.hook) && (
        <div style={{marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid #2a3143'}}>
          {msg.climate && (
            <div style={{fontSize:10, color:'#8b94a6'}}>{msg.climate}</div>
          )}
          {msg.hook && (
            <div style={{fontSize:10, color:'#8b94a6'}}>{msg.hook}</div>
          )}
        </div>
      )}
      <div className={msg.role === 'raven' ? 'raven-response' : ''} dangerouslySetInnerHTML={{__html: (msg.role === 'user' && !msg.isReport) ? escapeHtml(msg.html) : msg.html}} />
      {msg.role==='raven' && containsInitialProbe(msg.html) && !pingTracker.getFeedback(msg.id) && (
        <div style={{marginTop:6, fontSize:10, color:'#94a3b8'}}>
          <span style={{display:'inline-block', width:6, height:6, borderRadius:3, background:'#94a3b8', marginRight:6}}></span>
          Pending
        </div>
      )}
      
      {/* Add ping feedback ONLY for repair validation requests, not initial probes */}
      {msg.role === 'raven' && containsRepairValidation(msg.html) && (
        <PingFeedback 
          messageId={msg.id}
          onFeedback={onPingFeedback}
          disabled={msg.pingFeedbackRecorded}
          checkpointType="repair"
        />
      )}
      
      {/* Add ping feedback for other initial probes (non-repair) */}
      {msg.role === 'raven' && containsInitialProbe(msg.html) && !containsRepairValidation(msg.html) && (
        <div style={{marginTop: 8, padding: '8px 12px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '6px', fontSize: '12px', color: '#93c5fd'}}>
          💭 <em>Raven will classify your response and provide repair if needed - no grading required</em>
        </div>
      )}
      
      {msg.role === 'raven' && (
        <div style={{display: 'flex', gap: 4, marginTop: 8, justifyContent: 'flex-end'}}>
          <button 
            onClick={() => copyToClipboard(msg.html)}
            style={{
              background: isCopied ? 'var(--good)' : 'var(--soft)',
              color: isCopied? 'white' : 'var(--muted)',
              border: '1px solid var(--line)',
              borderRadius: 6,
              padding: '2px 8px',
              fontSize: 10,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {isCopied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}
      {msg.climate && <div style={{fontSize:10, color:'#8b94a6', marginTop:8, borderTop:'1px solid #2a3143', paddingTop:6}}>{msg.climate}</div>}
      {msg.hook && <div style={{fontSize:10, color:'#8b94a6'}}>{msg.hook}</div>}
    </article>
  );
}

function Composer({input,setInput,onSend,onStop,disabled}:{input:string; setInput:(v:string)=>void; onSend:()=>void; onStop:()=>void; disabled:boolean}){
  return (
    <div style={{padding:'12px 18px', background:'rgba(20,24,33,.9)', backdropFilter:'blur(10px)', borderTop:'1px solid var(--line)', display:'flex', gap:10, alignItems:'flex-end'}}>
      <button style={{...btnStyle, width:40, padding:0}} title="Attach">📎</button>
      <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); onSend(); } }} placeholder="Ask or paste here. Enter to send, Shift+Enter newline" style={{flex:1, minHeight:48, maxHeight:160, resize:'vertical', borderRadius:14, border:'1px solid var(--line)', background:'var(--panel)', color:'var(--text)', padding:'12px 14px', fontSize:14}} />
      <div style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)'}} aria-hidden>Enter ↵</div>
  {disabled && <button onClick={onStop} style={{...btnStyle, background:'#442b2b', border:'1px solid #663', boxShadow:'var(--shadow)'}}>Stop</button>}
  <button disabled={disabled} onClick={onSend} style={{...btnStyle, background:'linear-gradient(180deg,#8d78ff,#6a53ff)', border:'none', boxShadow:'var(--shadow)'}}>Send</button>
    </div>
  );
}

function NavigationPanel({ ravenMessages, scrollToTop, scrollToRavenMessage, currentRavenIndex, scrollToBottom }: {
  ravenMessages: Message[];
  scrollToTop: () => void;
  scrollToRavenMessage: (index: number) => void;
  currentRavenIndex: number;
  scrollToBottom: () => void;
}) {
  if (ravenMessages.length === 0) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: '8px 18px',
      background: 'var(--panel)',
      borderTop: '1px solid var(--line)',
      borderBottom: '1px solid var(--line)',
      fontSize: 12
    }}>
      <button
        onClick={scrollToTop}
        style={{ ...navBtnStyle }}
        title="Jump to top"
      >
        ⬆️ Top
      </button>

      <button
        onClick={() => scrollToRavenMessage(Math.max(0, currentRavenIndex - 1))}
        disabled={currentRavenIndex <= 0 || ravenMessages.length <= 1}
        style={{ ...navBtnStyle, opacity: (currentRavenIndex <= 0 || ravenMessages.length <= 1) ? 0.5 : 1 }}
        title="Previous Raven response"
      >
        ← Prev
      </button>

      <span style={{ color: 'var(--muted)' }}>
        {currentRavenIndex + 1} / {ravenMessages.length}
      </span>

      <button
        onClick={() => scrollToRavenMessage(Math.min(ravenMessages.length - 1, currentRavenIndex + 1))}
        disabled={currentRavenIndex >= ravenMessages.length - 1 || ravenMessages.length <= 1}
        style={{ ...navBtnStyle, opacity: (currentRavenIndex >= ravenMessages.length - 1 || ravenMessages.length <= 1) ? 0.5 : 1 }}
        title="Next Raven response"
      >
        Next →
      </button>

      <button
        onClick={scrollToBottom}
        style={{ ...navBtnStyle }}
        title="Jump to bottom"
      >
        ⬇️ Bottom
      </button>
    </div>
  );
}

function PendingReviewSheet({ onClose }: { onClose: () => void }){
  const [items, setItems] = useState(() => pingTracker.getPendingItems(true).slice(0,3));
  const [responses, setResponses] = useState<Record<string, PingResponse>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    (window as any).__openPendingReview = () => {
      setItems(pingTracker.getPendingItems(true).slice(0,3));
    };
  }, []);

  const submit = () => {
    items.forEach(it => {
      const resp = responses[it.messageId];
      if (resp) {
        pingTracker.recordFeedback(it.messageId, resp, notes[it.messageId], it.checkpointType, it.messageContent);
      }
    });
    onClose();
  };

  return (
    <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000}}>
      <div style={{width:520, background:'linear-gradient(135deg, #1e293b, #0f172a)', border:'1px solid rgba(148,163,184,0.2)', borderRadius:12, padding:16}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
          <div style={{color:'#e2e8f0', fontWeight:600}}>Review pending mirrors?</div>
          <button onClick={onClose} style={{background:'none', border:'none', color:'#94a3b8', fontSize:18}}>×</button>
        </div>
        <div style={{color:'#94a3b8', fontSize:12, marginBottom:12}}>Up to three, highest-charge first. One tap each. Optional note.</div>
        {items.length === 0 && (
          <div style={{color:'#94a3b8', fontSize:12}}>No pending mirrors.</div>
        )}
        {items.map(it => (
          <div key={it.messageId} style={{marginBottom:12, padding:12, border:'1px solid rgba(148,163,184,0.2)', borderRadius:8}}>
            <div style={{fontSize:12, color:'#e2e8f0', marginBottom:8}} dangerouslySetInnerHTML={{__html: it.messageContent || ''}} />
            <div style={{display:'flex', gap:8, flexWrap:'wrap', marginBottom:8}}>
              {(['yes','maybe','no','unclear'] as PingResponse[]).map(r => (
                <button key={r} onClick={() => setResponses(prev => ({...prev, [it.messageId]: r}))} style={{...btnStyle, fontSize:12, padding:'4px 8px', background: responses[it.messageId]===r ? 'rgba(59,130,246,0.2)' : 'var(--soft)'}}>
                  {r === 'yes' ? '✅ Yes' : r === 'maybe' ? '🟡 Sort of' : r === 'no' ? '❌ No' : '❓ Not clear'}
                </button>
              ))}
            </div>
            {(responses[it.messageId] === 'no' || responses[it.messageId] === 'unclear') && (
              <textarea value={notes[it.messageId] || ''} onChange={e => setNotes(n => ({...n, [it.messageId]: e.target.value}))} placeholder="Optional note (what didn’t fit?)" style={{width:'100%', background:'rgba(0,0,0,0.3)', color:'#e2e8f0', border:'1px solid rgba(148,163,184,0.2)', borderRadius:6, padding:8, fontSize:12}} />
            )}
          </div>
        ))}
        <div style={{display:'flex', justifyContent:'flex-end', gap:8}}>
          <button onClick={onClose} style={{...btnStyle}}>Snooze</button>
          <button onClick={submit} style={{...btnStyle, background:'linear-gradient(180deg,#8d78ff,#6a53ff)', border:'none'}}>Review</button>
        </div>
      </div>
    </div>
  );
}
