/**
 * Error normalization utilities for AI-related failures.
 *
 * Provides consistent error handling across all API routes that interact with
 * Anthropic's Claude API, making errors more debuggable and user-friendly.
 */

/**
 * Custom error class for AI-related failures.
 *
 * Includes an optional error code for categorizing failures (e.g., "429", "500", "PARSE_ERR").
 */
export class AIError extends Error {
  public code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'AIError';
    this.code = code;
  }
}

/**
 * Normalizes any error into a consistent AIError format.
 *
 * This helper extracts useful information from various error types:
 * - HTTP errors from Anthropic SDK (status codes like 429, 500)
 * - Network errors
 * - Parsing errors
 * - Generic JavaScript errors
 *
 * @param e - The error to normalize (any type)
 * @returns A normalized AIError with message and code
 *
 * @example
 * try {
 *   await callClaude(...);
 * } catch (e) {
 *   const aiError = normalizeAIError(e);
 *   console.log(aiError.code); // "429" or "500" or "AI_ERR"
 *   console.log(aiError.message); // Truncated, safe error message
 * }
 */
export function normalizeAIError(e: unknown): AIError {
  // Extract message, truncate to prevent huge error logs
  const rawMessage = (e as { message?: string })?.message || String(e);
  const message = rawMessage.slice(0, 300);

  // Extract error code
  // Try multiple common locations where error codes might be
  let code: string | undefined;

  // HTTP status code (e.g., from Anthropic SDK or fetch errors)
  if ((e as { status?: number })?.status) {
    code = String((e as { status: number }).status);
  }
  // Custom error code property
  else if ((e as { code?: string })?.code) {
    code = String((e as { code: string }).code);
  }
  // Generic AI error
  else {
    code = 'AI_ERR';
  }

  return new AIError(message, code);
}

/**
 * Checks if an error is a rate limit error (HTTP 429).
 *
 * @param error - The error to check
 * @returns True if error is a rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  return (error as { status?: number })?.status === 429 || (error as { code?: string })?.code === '429';
}

/**
 * Checks if an error is a server error (HTTP 5xx).
 *
 * @param error - The error to check
 * @returns True if error is a server error
 */
export function isServerError(error: unknown): boolean {
  const status = (error as { status?: number })?.status || (error as { code?: number })?.code;
  return typeof status === 'number' && status >= 500 && status < 600;
}
