import Anthropic from '@anthropic-ai/sdk';
import { withRetry } from './retry';
import { normalizeAIError } from './errors';

/**
 * Truncates input text to prevent exceeding token limits.
 *
 * @param s - The string to truncate
 * @param max - Maximum character count (default: 12000, ~3000 tokens)
 * @returns Truncated string with indicator if truncated
 */
export function truncateForLLM(s: string, max = 12000): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + '\n[TRUNCATED]';
}

/**
 * Helper function to call Claude API with system and user messages.
 * Returns the text content from the first response block.
 *
 * Features:
 * - Automatic retry with exponential backoff on 429/5xx errors
 * - Input truncation to prevent token limit errors
 * - Request ID generation for debugging
 * - Normalized error handling
 *
 * @param model - The Claude model to use
 *   - "claude-sonnet-4-20250514" (Sonnet 4.5) - Fastest and most powerful (recommended)
 *   - "claude-3-5-sonnet-20241022" (Sonnet 3.5) - Previous version
 *   - "claude-3-5-haiku-20241022" (Haiku 3.5) - Fast and efficient
 * @param system - System prompt that sets the AI's role and behavior
 * @param user - User message with the actual task/question
 * @param options - Optional configuration
 * @param options.maxTokens - Maximum tokens in response (default: varies by call)
 * @param options.temperature - Sampling temperature 0-1 (default: 0.2 for consistency)
 * @returns The text response from Claude
 * @throws AIError on failure after retries
 */
export async function callClaude(
  model: string,
  system: string,
  user: string,
  options: {
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY environment variable is not set. Please add it to your .env.local file.'
    );
  }

  const anthropic = new Anthropic({
    apiKey,
  });

  // Truncate inputs to prevent token limit issues
  const truncatedSystem = truncateForLLM(system, 8000);
  const truncatedUser = truncateForLLM(user, 12000);

  // Generate unique request ID for debugging
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  try {
    const response = await withRetry(
      async () => {
        const message = await anthropic.messages.create({
          model,
          max_tokens: options.maxTokens ?? 4096,
          temperature: options.temperature ?? 0.2,
          system: truncatedSystem,
          messages: [
            {
              role: 'user',
              content: truncatedUser,
            },
          ],
          metadata: {
            user_id: requestId,
          },
        });

        // Extract text from the first content block
        const firstBlock = message.content[0];
        if (firstBlock.type !== 'text') {
          throw new Error('Unexpected response type from Claude API');
        }

        return firstBlock.text;
      },
      { retries: 2, baseMs: 600 }
    );

    return response;
  } catch (error) {
    const normalized = normalizeAIError(error);
    console.error(`[${requestId}] Claude API error:`, normalized);
    throw normalized;
  }
}

/**
 * Safely extracts and parses JSON from LLM responses.
 * Handles markdown code fences and finds JSON objects/arrays in text.
 *
 * @param text - Raw text response from Claude
 * @returns Parsed JSON object
 * @throws Error with descriptive message if parsing fails
 */
export function extractJson<T = unknown>(text: string): T {
  // Remove markdown code fences if present
  let cleaned = text.trim();

  // Match ```json...``` or ```...```
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  // Try to find JSON object or array in the text
  const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    cleaned = jsonMatch[1];
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch (error) {
    throw new Error(
      `Failed to parse JSON from Claude response. ` +
      `First 200 chars: ${text.slice(0, 200)}... ` +
      `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
