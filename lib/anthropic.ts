import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { normalizeAIError } from './errors';
import { withRetry } from './retry';

export type AnthropicModel = `claude-${string}`;

export function ensureAnthropicModel(model: string, context?: string): AnthropicModel {
  if (!model.startsWith('claude-')) {
    const scope = context ? `${context}: ` : '';
    throw new Error(
      `${scope}Invalid Claude model "${model}". Anthropic model IDs must start with "claude-".`
    );
  }

  return model as AnthropicModel;
}

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
 * - Extended thinking available as opt-in feature (disabled by default)
 *
 * @param model - The Claude model to use
 *   - "claude-3.5-sonnet" (Sonnet 3.5) - Reliable with strong JSON support (recommended)
 *   - "claude-3.5-haiku-20241022" (Haiku 3.5) - Fast and efficient
 * @param system - System prompt that sets the AI's role and behavior
 * @param user - User message with the actual task/question
 * @param options - Optional configuration
 * @param options.maxTokens - Maximum tokens in response (default: varies by call)
 * @param options.temperature - Sampling temperature 0-1 (default: 0.2 for consistency)
 * @param options.thinking - Enable extended thinking (default: false, opt-in only)
 * @returns The text response from Claude
 * @throws AIError on failure after retries
 */
interface ClaudeCallOptions {
  maxTokens?: number;
  temperature?: number;
  thinking?: boolean;
  thinkingBudget?: number;
  enforceJson?: boolean; // If true, adds strict JSON-only instructions to system prompt
}

function resolveThinkingBudget(maxTokens: number, requested?: number): number {
  const safeMax = Math.max(maxTokens - 1, 1);
  const defaultBudget = Math.min(10_000, safeMax);
  const desired = requested ?? defaultBudget;
  const budget = Math.min(desired, safeMax);
  return Math.max(256, budget);
}

export async function callClaude(
  model: string,
  system: string,
  user: string,
  options: ClaudeCallOptions = {}
): Promise<string> {
  const resolvedModel = ensureAnthropicModel(model, 'callClaude');
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
  let truncatedSystem = truncateForLLM(system, 8000);
  const truncatedUser = truncateForLLM(user, 12000);

  // Add strict JSON-only enforcement if requested
  if (options.enforceJson) {
    truncatedSystem = `${truncatedSystem}

CRITICAL JSON-ONLY OUTPUT REQUIREMENT:
You MUST return ONLY a single valid JSON object or array.
- NO markdown headings (e.g., "# EXTRACTED INSIGHTS")
- NO code fences (\`\`\`json or \`\`\`)
- NO explanatory text before or after the JSON
- NO comments within the JSON
- Start your response directly with { or [
- End your response directly with } or ]
If a field expects an array and you have no items, return an empty array [].
If a field expects a string and you have nothing, return an empty string "".`;
  }

  // Generate unique request ID for debugging
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  try {
    const response = await withRetry(
      async () => {
        // Build the base request parameters
        const maxTokens = options.maxTokens ?? 4096;
        const baseParams = {
          model: resolvedModel,
          max_tokens: maxTokens,
          temperature: options.temperature ?? 0.2,
          system: truncatedSystem,
          messages: [
            {
              role: 'user' as const,
              content: truncatedUser,
            },
          ],
          metadata: {
            user_id: requestId,
          },
        };

        // Add thinking parameter if explicitly enabled (default: false)
        const requestParams = options.thinking === true
          ? {
              ...baseParams,
              thinking: {
                type: 'enabled' as const,
                budget_tokens: resolveThinkingBudget(maxTokens, options.thinkingBudget),
              },
            }
          : baseParams;

        const message = await anthropic.messages.create(requestParams);

        // Extract text from content blocks, skipping thinking blocks
        let textContent = '';
        for (const block of message.content) {
          if (block.type === 'text') {
            textContent += block.text;
          }
          // Skip 'thinking' type blocks as they contain internal reasoning
        }

        if (!textContent) {
          throw new Error('No text content in Claude API response');
        }

        return textContent;
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
 * Calls Claude API with multi-message support for chunked transcripts.
 * Useful for handling large transcripts that need to be sent in multiple parts.
 *
 * @param model - The Claude model to use
 * @param system - System prompt
 * @param messages - Array of message objects (user messages in sequence)
 * @param options - Optional configuration
 * @returns The text response from Claude
 * @throws AIError on failure after retries
 */
export async function callClaudeMultiMessage(
  model: string,
  system: string,
  messages: MessageParam[],
  options: ClaudeCallOptions = {}
): Promise<string> {
  const resolvedModel = ensureAnthropicModel(model, 'callClaudeMultiMessage');
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY environment variable is not set. Please add it to your .env.local file.'
    );
  }

  const anthropic = new Anthropic({
    apiKey,
  });

  // Truncate system prompt
  const truncatedSystem = truncateForLLM(system, 8000);

  // Generate unique request ID for debugging
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  try {
    const response = await withRetry(
      async () => {
        // Build the base request parameters
        const maxTokens = options.maxTokens ?? 20000; // Higher for summaries by default
        const baseParams = {
          model: resolvedModel,
          max_tokens: maxTokens,
          temperature: options.temperature ?? 1,
          system: truncatedSystem,
          messages,
          metadata: {
            user_id: requestId,
          },
        };

        // Add thinking parameter if explicitly enabled (default: false)
        const requestParams = options.thinking === true
          ? {
              ...baseParams,
              thinking: {
                type: 'enabled' as const,
                budget_tokens: resolveThinkingBudget(maxTokens, options.thinkingBudget),
              },
            }
          : baseParams;

        const message = await anthropic.messages.create(requestParams);

        // Extract text from content blocks, skipping thinking blocks
        let textContent = '';
        for (const block of message.content) {
          if (block.type === 'text') {
            textContent += block.text;
          }
        }

        if (!textContent) {
          throw new Error('No text content in Claude API response');
        }

        return textContent;
      },
      { retries: 2, baseMs: 600 }
    );

    return response;
  } catch (error) {
    const normalized = normalizeAIError(error);
    console.error(`[${requestId}] Claude API error (multi-message):`, normalized);
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
