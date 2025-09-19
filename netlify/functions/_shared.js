// netlify/functions/_shared.js
const ALLOW_ORIGIN = process.env.CORS_ALLOW_ORIGIN || "http://localhost:8888";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const json = (status, data, extra = {}) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json", ...CORS_HEADERS, ...extra },
  body: JSON.stringify(data),
});

const noContent = () => ({ statusCode: 204, headers: { ...CORS_HEADERS }, body: "" });

function safeParseJson(raw) {
  try {
    if (!raw) return { ok: false };
    return { ok: true, data: JSON.parse(raw) };
  } catch {
    return { ok: false };
  }
}

module.exports = { ALLOW_ORIGIN, CORS_HEADERS, json, noContent, safeParseJson };
