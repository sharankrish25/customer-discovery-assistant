/**
 * Retry helper with exponential backoff for handling transient failures.
 *
 * Use this to wrap API calls that may fail due to rate limits, network issues,
 * or temporary service unavailability.
 *
 * @example
 * const result = await withRetry(() => apiCall(), { retries: 3, baseMs: 1000 });
 */

/**
 * Executes a function with exponential backoff retry logic.
 *
 * @param fn - The async function to execute
 * @param options - Retry configuration
 * @param options.retries - Maximum number of retry attempts (default: 2)
 * @param options.baseMs - Base delay in milliseconds before first retry (default: 600)
 * @returns The result of the function if successful
 * @throws The last error encountered if all retries are exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { retries = 2, baseMs = 600 }: { retries?: number; baseMs?: number } = {}
): Promise<T> {
  let attempt = 0;
  let lastErr: unknown;

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;

      // Don't retry if we've exhausted all attempts
      if (attempt === retries) {
        break;
      }

      // Exponential backoff with jitter: baseMs * 2^attempt + random(0-150ms)
      const delay = baseMs * Math.pow(2, attempt) + Math.random() * 150;

      console.warn(
        `Attempt ${attempt + 1}/${retries + 1} failed, retrying in ${Math.round(delay)}ms...`,
        err instanceof Error ? err.message : String(err)
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
      attempt++;
    }
  }

  throw lastErr;
}
