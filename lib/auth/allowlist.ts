/**
 * Simple allowlist helper for server-side enforcement.
 * Reads environment variables `ALLOWED_EMAILS` (comma-separated) and/or
 * `ALLOWED_DOMAIN` (single domain) and validates decoded tokens.
 */

export interface AllowlistResult {
  allowed: boolean;
  reason?: string;
}

export function checkAllowlist(decoded: any): AllowlistResult {
  try {
    const email = (decoded?.email || decoded?.user?.email || decoded?.sub || '').toString().toLowerCase();
    // Normalize email from token claims - prefer `email` claim
    const normalizedEmail = (decoded?.email || decoded?.user?.email) ? String(decoded?.email || decoded?.user?.email).toLowerCase() : undefined;

    const allowedEmailsRaw = (process.env.ALLOWED_EMAILS || '').trim();
    const allowedDomain = (process.env.ALLOWED_DOMAIN || '').trim().toLowerCase();

    if (allowedEmailsRaw) {
      const allowedSet = new Set(allowedEmailsRaw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
      if (!normalizedEmail || !allowedSet.has(normalizedEmail)) {
        return { allowed: false, reason: 'email_not_in_allowlist' };
      }
      return { allowed: true };
    }

    if (allowedDomain) {
      const candidate = normalizedEmail || email;
      if (!candidate || candidate.indexOf('@') === -1) return { allowed: false, reason: 'email_missing' };
      const domain = candidate.split('@')[1];
      if (domain !== allowedDomain) return { allowed: false, reason: 'domain_mismatch' };
      return { allowed: true };
    }

    // No allowlist configured → allow by default (matches current behavior)
    return { allowed: true };
  } catch (err: any) {
    return { allowed: false, reason: 'allowlist_check_error' };
  }
}
