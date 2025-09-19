// netlify/functions/astrology-mathbrain.ts
import type { Handler, HandlerEvent } from "@netlify/functions";
import { z } from "zod";
import { CORS_HEADERS, json, noContent, safeParseJson } from "./_shared";

// ---- Zod schema: edit to match your actual API contract ----
const BodySchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),

  name: z.string().min(1),
  city: z.string().min(1),
  nation: z.string().min(1),

  latitude: z.number(),     // decimal degrees
  longitude: z.number(),    // decimal degrees

  zodiac_type: z.enum(["tropical", "sidereal"]),
  timezone: z.string().min(1),
});

type Body = z.infer<typeof BodySchema>;

export const handler: Handler = async (event: HandlerEvent) => {
  // Deprecation notice: This Netlify function is scheduled for removal once Next API route is fully validated.
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn('[DEPRECATION] netlify/functions/astrology-mathbrain.ts invoked. Prefer /api/astrology-mathbrain (Next API route).');
  }
  // CORS preflight
  if (event.httpMethod === "OPTIONS") return noContent();

  // Method gating
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method Not Allowed. Use POST." });
  }

  // Env check
  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
  if (!RAPIDAPI_KEY) {
    return json(500, { error: "Server misconfiguration: RAPIDAPI_KEY is not set" });
  }

  // Parse + validate
  const parsed = safeParseJson<unknown>(event.body);
  if (!parsed.ok) {
    return json(400, { error: "Invalid JSON in request body" });
  }

  const result = BodySchema.safeParse(parsed.data);
  if (!result.success) {
    const issues = result.error.issues.map(i => ({ path: i.path.join("."), message: i.message }));
    return json(400, { error: "Missing or invalid fields", issues });
  }

  const body = result.data;

  try {
    // This is a placeholder. Replace with your actual API call logic.
    const resp = await fetch("https://astrologer.p.rapidapi.com/api/v2/natal-chart", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": "astrologer.p.rapidapi.com"
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      return json(resp.status, { error: "Upstream API error", detail: errorText });
    }

    const data = await resp.json();
    // Attach deprecation header so clients can detect migration status
    return json(200, { ok: true, data }, {
      'X-Deprecated-Function': 'true',
      'X-Preferred-Endpoint': '/api/astrology-mathbrain'
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return json(500, { error: "Internal error", detail: msg });
  }
};
