export const fetchWithRetry = async (
  url: string,
  options: RequestInit,
  maxRetries: number = 3,
  timeoutMs: number = 30000,
): Promise<Response> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      lastError = error as Error;
      clearTimeout(0);

      if ((error as Error)?.name === "AbortError" && options.signal?.aborted) {
        throw error;
      }

      if (
        attempt < maxRetries &&
        ((error as Error)?.name === "TypeError" ||
          (error as Error)?.name === "AbortError")
      ) {
        const baseDelay = 100 * Math.pow(2, attempt);
        const jitter = baseDelay * 0.5 * Math.random();
        const delay = baseDelay + jitter;
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }

  throw (
    lastError ||
    new Error(`Request failed after ${maxRetries + 1} attempts`)
  );
};
