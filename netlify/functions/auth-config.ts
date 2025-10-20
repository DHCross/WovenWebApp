// netlify/functions/auth-config.ts
import type { Handler } from "@netlify/functions";
import { CORS_HEADERS, json, noContent } from "../lib/function-helpers";

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return noContent();
  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method Not Allowed. Use GET." });
  }

  const domain = process.env.AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_CLIENT_ID;
  const redirectUri = process.env.AUTH0_REDIRECT_URI || "http://localhost:8888/chat";

  if (!domain || !clientId) {
    return json(500, { error: "Auth misconfiguration: AUTH0_DOMAIN/CLIENT_ID missing" });
  }

  return json(200, {
    domain,
    clientId,
    redirectUri
  }, {
    'X-Deprecated-Function': 'true',
    'X-Preferred-Endpoint': '/api/auth-config'
  });
};
