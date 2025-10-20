// Shared helpers for legacy Netlify Functions. These modules used to live
// alongside the handlers which caused Netlify to treat them as standalone
// functions. Keeping them in a separate folder prevents packaging errors.

export const ALLOW_ORIGIN =
  process.env.CORS_ALLOW_ORIGIN ?? "http://localhost:8888";

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const json = (status: number, data: unknown, extraHeaders: Record<string, string> = {}) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json", ...CORS_HEADERS, ...extraHeaders },
  body: JSON.stringify(data),
});

export const noContent = () => ({
  statusCode: 204,
  headers: { ...CORS_HEADERS },
  body: "",
});

// Defensive JSON parse — never throws.
export function safeParseJson<T = unknown>(raw: string | null | undefined): { ok: true; data: T } | { ok: false } {
  try {
    if (!raw) return { ok: false };
    return { ok: true, data: JSON.parse(raw) as T };
  } catch {
    return { ok: false };
  }
}
