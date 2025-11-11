const globalScope = globalThis as typeof globalThis & {
  __wovenAuditRegistry__?: Map<string, { lastRun: number; interval: number }>;
};

const auditRegistry: Map<string, { lastRun: number; interval: number }> =
  globalScope.__wovenAuditRegistry__ ?? new Map();

globalScope.__wovenAuditRegistry__ = auditRegistry;

const DAY = 24 * 60 * 60 * 1000;

export { DAY };

/**
 * Record a governance audit schedule. Persists in-memory per runtime.
 */
export function scheduleAudit(resource: string, intervalMs: number): void {
  const now = Date.now();
  const existing = auditRegistry.get(resource);
  if (existing && now - existing.lastRun < intervalMs) {
    return;
  }
  auditRegistry.set(resource, { lastRun: now, interval: intervalMs });
  if (process.env.NODE_ENV !== 'test') {
    console.info(
      `[Governance] Audit scheduled for ${resource}. Next check on ${new Date(
        now + intervalMs,
      ).toISOString()}`,
    );
  }
}
