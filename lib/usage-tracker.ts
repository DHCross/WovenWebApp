// (Removed duplicated first block; keeping single canonical implementation below)
// Simple in-memory usage tracking for Gemini API
// Note: This resets on server restart. For production, consider using a database.

interface UsageStats {
  requestsToday: number;
  tokensToday: number;
  lastResetDate: string;
  requestsThisMinute: number;
  lastMinuteReset: number;
}

// Gemini API limits (Free tier)
export const GEMINI_LIMITS = {
  requestsPerMinute: 15,    // Free tier: 15 RPM
  requestsPerDay: 1500,     // Free tier: 1,500 RPD  
  tokensPerMinute: 32000,   // Free tier: 32,000 TPM
  tokensPerDay: 50000       // Free tier: 50,000 TPD (estimated)
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
  
  console.log(`Gemini API Usage - Requests today: ${usage.requestsToday}/${GEMINI_LIMITS.requestsPerDay}, This minute: ${usage.requestsThisMinute}/${GEMINI_LIMITS.requestsPerMinute}`);
}

export function getUsageStats() {
  resetIfNeeded();
  
  return {
    ...usage,
    limits: GEMINI_LIMITS,
    percentages: {
      dailyRequests: Math.round((usage.requestsToday / GEMINI_LIMITS.requestsPerDay) * 100),
      dailyTokens: Math.round((usage.tokensToday / GEMINI_LIMITS.tokensPerDay) * 100),
      minuteRequests: Math.round((usage.requestsThisMinute / GEMINI_LIMITS.requestsPerMinute) * 100)
    }
  };
}

export function canMakeRequest(): { allowed: boolean; reason?: string } {
  resetIfNeeded();
  
  if (usage.requestsThisMinute >= GEMINI_LIMITS.requestsPerMinute) {
    return { allowed: false, reason: 'Rate limit exceeded (requests per minute)' };
  }
  
  if (usage.requestsToday >= GEMINI_LIMITS.requestsPerDay) {
    return { allowed: false, reason: 'Daily quota exceeded' };
  }
  
  return { allowed: true };
}
