// netlify/functions/health.ts
import type { Handler } from "@netlify/functions";

export const handler: Handler = async () => ({
  statusCode: 200,
  headers: {
    "Content-Type": "application/json",
    "X-Deprecated-Function": "true",
    "X-Preferred-Endpoint": "/api/health"
  },
  body: JSON.stringify({ ok: true, ts: Date.now() }),
});
