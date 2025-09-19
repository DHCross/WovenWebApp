Copy-paste ready. This version wires a **type-safe Zod schema** to match your Math-Brain payload, **maps it to a plausible Astrologer/Kerykeion request**, and emits **structured, copy-pastable BREAK/FIX entries** (to drop straight into your “Woven Map App Error/Break History Log”). If your upstream field names differ, tweak only the `toUpstream()` function and (if needed) the `BodySchema`—everything else stays put.

---

### `netlify/functions/_shared.ts`

Shared CORS + JSON + logging helpers (BREAK/FIX markdown lines to console).

```ts
// netlify/functions/_shared.ts
export const ALLOW_ORIGIN =
  process.env.CORS_ALLOW_ORIGIN ?? "http://localhost:8888";

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const json = (status: number, data: unknown, extra: Record<string, string> = {}) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json", ...CORS_HEADERS, ...extra },
  body: JSON.stringify(data),
});

export const noContent = () => ({ statusCode: 204, headers: CORS_HEADERS, body: "" });

// ---- Error/Change log emitters (copy output into your log doc) ----
function ts() {
  // local time, YYYY-MM-DD HH:MM
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function logBreak(symptom: string, suspected: string, diagnosed: string) {
  console.error(
`[${ts()}] BREAK
Symptom: ${symptom}
Suspected Cause: ${suspected}
How Diagnosed: ${diagnosed}`
  );
}
export function logFix(symptom: string, resolution: string) {
  console.log(
`[${ts()}] FIX
Symptom: ${symptom}
Resolution: ${resolution}`
  );
}

// Safe JSON parse (no throws)
export function safeParseJson<T = unknown>(raw: string | null | undefined): { ok: true; data: T } | { ok: false } {
  try {
    if (!raw) return { ok: false };
    return { ok: true, data: JSON.parse(raw) as T };
  } catch {
    return { ok: false };
  }
}
```

---

### `netlify/functions/astrology-mathbrain.ts`

Strict validation + upstream request + markdown BREAK/FIX logging.

```ts
// netlify/functions/astrology-mathbrain.ts
import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { CORS_HEADERS, json, noContent, safeParseJson, logBreak, logFix } from "./_shared";

/**
 * Payload expected from your Math Brain UI (FIELD-only data).
 * Adjust constraints to your exact form rules.
 */
const Coords = z.object({
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
});

const DateTime = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
  timezone: z.string().min(1), // IANA, e.g. "America/New_York"
});

const Subject = z.object({
  name: z.string().min(1),
  city: z.string().min(1),
  nation: z.string().min(1), // "US", "United States", etc.
}).and(Coords).and(DateTime);

const Options = z.object({
  zodiac_type: z.enum(["tropical", "sidereal"]),
  include_aspects: z.boolean().default(true),
  include_houses: z.boolean().default(true),
  orbs_profile: z.enum(["strict","standard","loose"]).default("standard"), // tune if you support it
}).partial().default({});

const BodySchema = z.object({
  subject: Subject,
  options: Options,
});

type Body = z.infer<typeof BodySchema>;

/**
 * Map your Math Brain request into the Astrologer/Kerykeion upstream format.
 * If your upstream expects a "BirthChartRequestModel" with nested SubjectModel/Location, shape it here.
 */
function toUpstream(input: Body) {
  const { subject, options } = input;
  // Example: plausible Kerykeion-like body (adjust keys to match your API_REFERENCE)
  return {
    subject: {
      name: subject.name,
      year: subject.year,
      month: subject.month,
      day: subject.day,
      hour: subject.hour,
      minute: subject.minute,
      city: subject.city,
      nation: subject.nation,
      latitude: subject.latitude,
      longitude: subject.longitude,
      timezone: subject.timezone,
    },
    theme: "default",
    system: options.zodiac_type ?? "tropical", // or "sidereal"
    include_aspects: options.include_aspects ?? true,
    include_houses: options.include_houses ?? true,
    orbs_profile: options.orbs_profile ?? "standard",
  };
}

/** Translate common upstream errors into crisp client errors. */
async function translateUpstreamError(res: Response) {
  const text = await res.text().catch(() => "");
  // Examples—tune to your provider’s messages:
  if (res.status === 401 || /api key/i.test(text)) {
    return json(502, { error: "Upstream auth error", detail: "Invalid or missing provider key." });
  }
  if (res.status === 400 && /date/i.test(text)) {
    return json(422, { error: "Invalid date/time for subject", detail: text });
  }
  if (res.status === 400 && /coordinates|latitude|longitude/i.test(text)) {
    return json(422, { error: "Invalid coordinates", detail: text });
  }
  return json(502, { error: "Upstream API error", status: res.status, detail: text.slice(0, 1000) });
}

export const handler: Handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") return noContent();

  // Method gating
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method Not Allowed. Use POST." });
  }

  // Env check
  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
  if (!RAPIDAPI_KEY) {
    logBreak("Compute failed for all requests", "Missing RAPIDAPI_KEY", "Checked process.env in Netlify Dev");
    return json(500, { error: "Server misconfiguration: RAPIDAPI_KEY is not set" });
  }

  // Parse + validate
  const parsed = safeParseJson<unknown>(event.body);
  if (!parsed.ok) {
    logBreak("Compute request rejected", "Invalid JSON", "Failed JSON.parse on request body");
    return json(400, { error: "Invalid JSON in request body" });
  }

  const result = BodySchema.safeParse(parsed.data);
  if (!result.success) {
    const issues = result.error.issues.map(i => ({ path: i.path.join("."), message: i.message }));
    logBreak("Schema validation failed", "Missing/invalid fields", "Zod BodySchema.safeParse issues[] emitted");
    return json(400, { error: "Missing or invalid fields", issues });
  }

  const body = result.data;
  const upstreamBody = toUpstream(body);

  try {
    // Replace with your real RapidAPI endpoint for Astrologer/Kerykeion
    const resp = await fetch("https://example-astrology-api.com/compute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RapidAPI-Key": RAPIDAPI_KEY,
      },
      body: JSON.stringify(upstreamBody),
    });

    if (!resp.ok) {
      const translated = await translateUpstreamError(resp);
      return translated;
    }

    const data = await resp.json();
    logFix("Compute returned successfully", "Received upstream data and normalized");
    return json(200, { ok: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logBreak("Compute threw exception", "Network/runtime error", `Caught error: ${msg}`);
    return json(500, { error: "Internal error", detail: msg });
  }
};
```

---

### `netlify/functions/auth-config.ts`

Typed Auth0 bootstrap + CORS + logging.

```ts
// netlify/functions/auth-config.ts
import type { Handler } from "@netlify/functions";
import { json, noContent, logBreak, logFix } from "./_shared";

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return noContent();
  if (event.httpMethod !== "GET") return json(405, { error: "Method Not Allowed. Use GET." });

  const domain = process.env.AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_CLIENT_ID;
  const redirectUri = process.env.AUTH0_REDIRECT_URI ?? "http://localhost:8888/chat";

  if (!domain || !clientId) {
    logBreak("Auth bootstrap failed", "Missing AUTH0_DOMAIN/CLIENT_ID", "Checked env in Netlify Dev");
    return json(500, { error: "Auth misconfiguration: AUTH0_DOMAIN/CLIENT_ID missing" });
  }

  logFix("Auth bootstrap fetched", "Provided public config to client");
  return json(200, { domain, clientId, redirectUri });
};
```

---

### `netlify/functions/health.ts`

```ts
// netlify/functions/health.ts
import type { Handler } from "@netlify/functions";

export const handler: Handler = async () => ({
  statusCode: 200,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ ok: true, ts: Date.now() }),
});
```

---

### `.env` (local)

```
RAPIDAPI_KEY=your_real_key
CORS_ALLOW_ORIGIN=http://localhost:8888

AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your_client_id
AUTH0_REDIRECT_URI=http://localhost:8888/chat
```

After editing `.env`, **restart** `netlify dev`.

---

### Quick sanity checks

```bash
# up
curl -s -i http://localhost:8888/.netlify/functions/health

# auth boot
curl -s -i http://localhost:8888/.netlify/functions/auth-config

# validation error (should be 400 with issues[])
curl -s -i -X POST http://localhost:8888/.netlify/functions/astrology-mathbrain \
  -H "Content-Type: application/json" -d '{}'

# happy path (fill real values)
curl -s -i -X POST http://localhost:8888/.netlify/functions/astrology-mathbrain \
  -H "Content-Type: application/json" \
  -d '{
    "subject": {
      "name":"DH Cross","city":"Bryn Mawr","nation":"US",
      "latitude":40.023,"longitude":-75.315,
      "year":1973,"month":7,"day":24,"hour":9,"minute":20,
      "timezone":"America/New_York"
    },
    "options": {"zodiac_type":"tropical","orbs_profile":"standard"}
  }'
```

---

### Where to tweak for your exact Astrologer API

* **If your provider expects different keys** (e.g., `Mean_Node` vs `NorthNode`, `system: "topocentric"`, etc.), change them in **`toUpstream()`** only.
* **If you add transit windows** (start/end dates), add those fields to `BodySchema` and forward in `toUpstream()`.
* **If the upstream returns nested shapes you want to normalize**, do it right after `const data = await resp.json();`.

---

### Built-in BREAK/FIX notes (for your log)

On any failure/success, the function prints a ready-to-paste block to the Netlify dev console:

* **BREAK** with Symptom / Suspected Cause / How Diagnosed
* **FIX** with Symptom / Resolution

That dovetails with your **“Woven Map App Error/Break History Log”** template so you’re not trying to reconstruct incidents from memory later.

If you want me to **pin the exact upstream field names/enums** from your `API_REFERENCE.md` and `astrologerAPI.md`, say the word and I’ll wire `toUpstream()` and `BodySchema` precisely to those specs.
