// (Removed duplicated first block; keeping single canonical implementation below)
// Simple in-memory usage tracking for Perplexity API
// Note: This resets on server restart. For production, consider using a database.

interface UsageStats {
  requestsToday: number;
  tokensToday: number;
  lastResetDate: string;
  requestsThisMinute: number;
  lastMinuteReset: number;
}

// Perplexity API limits (example free tier defaults)
export const PERPLEXITY_LIMITS = {
  requestsPerMinute: 15,
  requestsPerDay: 1500,
  tokensPerMinute: 32000,
  tokensPerDay: 50000
};

let usage: UsageStats = {
  requestsToday: 0,
  tokensToday: 0,
  lastResetDate: new Date().toDateString(),
  requestsThisMinute: 0,
  lastMinuteReset: Date.now()
};

function resetIfNeeded() {
  const today = new Date().toDateString();
  const now = Date.now();
  
  // Reset daily counters if it's a new day
  if (usage.lastResetDate !== today) {
    usage.requestsToday = 0;
    usage.tokensToday = 0;
    usage.lastResetDate = today;
  }
  
  // Reset minute counters if a minute has passed
  if (now - usage.lastMinuteReset > 60000) {
    usage.requestsThisMinute = 0;
    usage.lastMinuteReset = now;
  }
}

export function trackRequest(estimatedTokens: number = 1000) {
  resetIfNeeded();
  
  usage.requestsToday++;
  usage.requestsThisMinute++;
  usage.tokensToday += estimatedTokens;
  
  console.log(`Perplexity API Usage - Requests today: ${usage.requestsToday}/${PERPLEXITY_LIMITS.requestsPerDay}, This minute: ${usage.requestsThisMinute}/${PERPLEXITY_LIMITS.requestsPerMinute}`);
}

export function getUsageStats() {
  resetIfNeeded();
  
  return {
    ...usage,
    limits: PERPLEXITY_LIMITS,
    percentages: {
      dailyRequests: Math.round((usage.requestsToday / PERPLEXITY_LIMITS.requestsPerDay) * 100),
      dailyTokens: Math.round((usage.tokensToday / PERPLEXITY_LIMITS.tokensPerDay) * 100),
      minuteRequests: Math.round((usage.requestsThisMinute / PERPLEXITY_LIMITS.requestsPerMinute) * 100)
    }
  };
}

export function canMakeRequest(): { allowed: boolean; reason?: string; retryAfterMs?: number } {
  resetIfNeeded();
  
  if (usage.requestsThisMinute >= PERPLEXITY_LIMITS.requestsPerMinute) {
    const timeUntilReset = 60000 - (Date.now() - usage.lastMinuteReset);
    return { 
      allowed: false, 
      reason: `Rate limit exceeded (${usage.requestsThisMinute}/${PERPLEXITY_LIMITS.requestsPerMinute} requests/min)`,
      retryAfterMs: Math.max(1000, timeUntilReset)
    };
  }
  
  if (usage.requestsToday >= PERPLEXITY_LIMITS.requestsPerDay) {
    return { 
      allowed: false, 
      reason: `Daily quota exceeded (${usage.requestsToday}/${PERPLEXITY_LIMITS.requestsPerDay} requests/day)`,
      retryAfterMs: 86400000 // retry tomorrow
    };
  }
  
  return { allowed: true };
}

// Enforce rate limiting - throws if limit exceeded
export function enforceRateLimit(): void {
  const check = canMakeRequest();
  if (!check.allowed) {
    throw new Error(`[RateLimit] ${check.reason}`);
  }
}
