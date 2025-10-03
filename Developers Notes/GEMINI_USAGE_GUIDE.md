# GEMINI USAGE GUIDE (Raven Calder / WovenWebApp Context)

Status: Draft v1 (2025-10-02)
Owner: Platform / AI Integration
Related Docs: `API_INTEGRATION_GUIDE.md`, `MAINTENANCE_GUIDE.md`, `MATH_BRAIN_COMPLIANCE.md`, `Raven Calder Output Protocol Handbook.md`

---
## 1. Purpose
This guide prevents three recurring friction points when using Google Gemini (aka GEM / Vertex AI) with Woven outputs:
1. "Sealed map / can’t take it in hand" style monologues (file handle failures).
2. Confusion between **weekly-sampled Balance Meter exports** and **full backstage geometry** JSON.
3. Persona drift / chain-of-thought leakage (theatrical inner narration, over-explanation of tool failures).

It defines: correct file selection, parsing strategies, sampling interpretation, PDF / directive handling, and chain-of-thought suppression.

---
## 2. TL;DR Playbook
| Goal | Use | Why |
|------|-----|-----|
| Get 5 weekly pulses for a month | `chart-data-*.json` → `indices_window.days` | Balance Meter export (weekly sampling) |
| Get day-by-day transit seismograph | `mathbrain-backstage-*.json` → `person_a.chart.transitsByDate` | Full geometry & daily stacks |
| Avoid file handle I/O errors | Paste JSON literal into a single code cell (Option A) | Bypasses sandbox mount / fetch IDs |
| Ensure persona directive is present | Upload PDF separately (not only inside a project folder) | Code project mount may exclude PDF |
| Prevent chain-of-thought leakage | Use concise directive: “No internal monologue. Output VOICE only.” | Cuts reasoning spillover |
| Convert seismograph values | Divide magnitude/valence/volatility (0–500) by 100 | Normalizes to 0–5 (magnitude) / ±5 (valence) |

---
## 3. File Types & Their Roles
### 3.1 `chart-data-*.json` (Meter-Friendly Export)
Contains:
- `indices_window.days[]` (usually 4–5 weekly pulses for a ~30–35 day window depending on anchor weekday)
- Seismograph slices: `seismograph.magnitude|valence|volatility` scaled 0–500
- Aggregated / minimal narrative context
**Use for:** Quick plotting of Balance Meter trend, low-latency visual summaries.

### 3.2 `mathbrain-backstage-*.json` (Backstage Geometry)
Contains:
- `labels.*` (long aspect identification lists)
- Daily transit frames: `person_a.chart.transitsByDate[YYYY-MM-DD]`
- Raw geometry structures, readiness flags, relocation, provenance
**Use for:** Detailed per-day narrative synthesis, aspect heat, advanced debugging.
**Avoid for:** Direct weekly pulse plotting without filtering (too dense). 

### 3.3 PDF Directive (Raven Calder Execution Directive)
- Enforces persona: FIELD → MAP → VOICE, agency-first language.
- MUST remain accessible to model if persona fidelity is needed.
- Sometimes excluded if only a code folder is mounted. Upload separately to guarantee availability.

---
## 4. Sampling Semantics
| Mode | Source | Data Points (≈ Month) | Interpretation |
|------|--------|-----------------------|----------------|
| Weekly (Current Meter Default) | `indices_window.days` | 4–5 pulses | Snapshot of higher-charge temporal inflection points |
| Daily (Planned Toggle) | Derived from `transitsByDate` | 28–31 rows | Fine-grain volatility & microtrend resolution |

Why you saw “5 days analyzed” → The meter was *correctly* showing weekly-sampled points (one per anchor weekday), not missing data.

---
## 5. Sandbox & File Handle Model
Gemini has **two layers**:
1. Chat model (can read what you paste into the message stream).
2. Code runner / tools sandbox (requires a mounted file or a `contentFetchId`).

Failure Pattern:
- You upload a project folder → sandbox mounts code-like assets → large JSON or PDF may be skipped.
- Chat model *mentions* the file (it saw the filename in conversation) but runner has no bytes → it narrates access failure (“sealed map”).

Resolution Ladder:
1. Paste raw JSON literal (Option A) – guaranteed success.
2. Use File Fetcher / content manager to retrieve by `contentFetchId` and pass bytes explicitly.
3. Last resort: Re-upload as single file (not bundled) so the sandbox mounts it.

---
## 6. The Three Proven Parsing Options
### Option A – Paste & Parse (Recommended)
```python
import json, pandas as pd
raw = r'''<PASTE FULL JSON HERE>'''
data = json.loads(raw)
# Weekly pulses (chart-data)
# weekly_rows = data["indices_window"]["days"]
# Daily frames (backstage)
transits = data["person_a"]["chart"]["transitsByDate"]
rows = []
for day, payload in transits.items():
    s = payload.get("seismograph", {})
    if s:
        rows.append({
            "date": day,
            "magnitude": s.get("magnitude", 0)/100.0,
            "valence": s.get("valence", 0)/100.0,
            "volatility": s.get("volatility", 0)/100.0,
        })

df = pd.DataFrame(rows).sort_values("date")
print(df.head())
```
Pros: No file I/O complexity. Cons: Manual copy/paste for very large JSON (>5–10MB) can be unwieldy.

### Option B – Explicit File Handle
Use GEM platform File Fetcher; obtain a `contentFetchId`; fetch inside code cell; decode bytes.

### Option C – Direct Mount (Fragile)
Rely on sandbox’s automatic project mount; frequently fails for non-code assets (PDF, large JSON). Not recommended.

---
## 7. Scaling & Normalization
Balance Meter / Seismograph raw values (0–500) → divide by 100.
- Magnitude: 0–5 scale (intensity amplitude)
- Valence: -500..+500 raw → often already sign-correct; divide by 100 to get -5..+5
- Volatility: 0–5 after divide

Check for absent days: Some dates skip if no meaningful transit delta (especially in weekly-sampled output). Do **not** treat absence as error.

---
## 8. Chain-of-Thought & Persona Leakage Mitigation
Observed Leakage Symptoms:
- Excessive “I will now attempt…” procedural narration.
- Thematic metaphors (“sealed map”) describing plain I/O failures.

Mitigations:
1. System / preface directive: “You are Raven Calder. Output FIELD → MAP → VOICE. No internal monologue. No step narration. If a tool fails, respond with one concise diagnostic sentence plus a remedy.”
2. Strip / redact internal debug tokens before user display (if piping through middleware).
3. Avoid asking the model to describe its future steps (invites chain-of-thought).
4. Provide explicit max length for diagnostic sections (< 200 chars).
5. Keep PDF directive accessible—loss elevates drift probability.

---
## 9. Ensuring PDF Directive Inclusion
When exporting from Woven:
- Include the directive PDF inside the ZIP.
- ALSO upload the PDF separately into Gemini if relying on persona continuity.
- Label inside PDF: “No internal monologue or reasoning steps beyond final VOICE synthesis.” (Planned addition.)

---
## 10. Weekly vs Daily Toggle (Forthcoming Implementation Notes)
Frontend will add `sampling_frequency` = `weekly` | `daily`.
- Propagated to math brain payload.
- PDF will include a “Sampling Mode” section:
  - Weekly: “High-signal aggregate pulses. Not every calendar date is shown.”
  - Daily: “Full-resolution temporal trace.”

---
## 11. FAQ
Q: Why only 5 points in a 30‑day chart?  
A: Weekly sampling—one anchor weekday per week.

Q: The model says it can’t ‘open’ the file. Broken?  
A: Sandbox didn’t mount it. Use Option A or fetch handle.

Q: Why did the tone turn theatrical?  
A: Chain-of-thought leakage + repeated tool retries.

Q: Can I interpolate to daily from weekly pulses?  
A: Yes, but label clearly as *interpolated*; don’t claim genuine daily geometry.

Q: Where are composite or relational aspects?  
A: Those live in relational exports; backstage solo file focuses on Person A (and Person B if included by that run config).

---
## 12. Minimal Diagnostic Template (When Tool Fails)
```
File access failed: no bytes for backstage JSON. Remedy: Re-upload single file or paste JSON literal.
```
Keep it boring. No metaphors.

---
## 13. Compliance Checklist (Use Before Analysis)
- [ ] Correct file chosen (chart-data vs backstage) for task
- [ ] Sampling mode understood & declared
- [ ] Values normalized (÷100)
- [ ] Persona directive loaded (PDF present or inline system prompt)
- [ ] Chain-of-thought suppression clause active
- [ ] No raw internal reasoning in output

---
## 14. Future Enhancements
| Item | Rationale | Status |
|------|-----------|--------|
| Automatic sampling mode banner in PDF | Reduce confusion | Planned |
| Inline seismograph normalization helper | Prevent scaling errors | Planned |
| Middleware reasoning scrubber | Enforce no-internal-monologue | Planned |
| Automated file type detector (heuristic) | Warn if misuse (e.g., backstage for weekly plot) | Consider |
| Backstage → derived daily dataset endpoint | Convenience | Consider |

---
## 15. Reference Snippets
### Extract Weekly Pulses (chart-data)
```python
weekly = [
  {
    'date': d['date'],
    'mag': d['seismograph']['magnitude']/100.0,
    'val': d['seismograph']['valence']/100.0,
    'vol': d['seismograph']['volatility']/100.0,
  }
  for d in data['indices_window']['days'] if d.get('seismograph')
]
```

### Extract Daily (backstage)
```python
rows = []
for day, frame in data['person_a']['chart']['transitsByDate'].items():
    s = frame.get('seismograph')
    if not s: continue
    rows.append({
        'date': day,
        'mag': s.get('magnitude',0)/100.0,
        'val': s.get('valence',0)/100.0,
        'vol': s.get('volatility',0)/100.0,
    })
```

---
## 16. Glossary
FIELD → Raw geometric climate (angles, orbs, houses).  
MAP → Structural pattern recognition (loops, overlays, activation vectors).  
VOICE → Narrative mirror (agency-first, non-deterministic).  
Balance Meter → Two-Axis Symbolic Seismograph (Magnitude X, Valence Y, Volatility index).  

---
## 17. Contact / Escalation
- Geometry / Data Integrity: Math Brain maintainer
- Persona / Directive: Raven Calder content steward
- Platform / Sandbox Issues: AI Integration engineer

---
## 18. Change Log (Guide Only)
- 2025-10-02: Initial draft capturing sampling + sandbox + chain-of-thought mitigation.

---
End of document.
