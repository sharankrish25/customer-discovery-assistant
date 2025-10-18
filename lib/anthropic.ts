import Anthropic from '@anthropic-ai/sdk';

/**
 * Helper function to call Claude API with system and user messages.
 * Returns the text content from the first response block.
 *
 * @param model - The Claude model to use
 *   - "claude-sonnet-4-20250514" (Sonnet 4.5) - Fastest and most powerful (recommended)
 *   - "claude-3-5-sonnet-20241022" (Sonnet 3.5) - Previous version
 *   - "claude-3-5-haiku-20241022" (Haiku 3.5) - Fast and efficient
 * @param system - System prompt that sets the AI's role and behavior
 * @param user - User message with the actual task/question
 * @returns The text response from Claude
 */
export async function callClaude(
  model: string,
  system: string,
  user: string
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

  const message = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    system,
    messages: [
      {
        role: 'user',
        content: user,
      },
    ],
  });

  // Extract text from the first content block
  const firstBlock = message.content[0];
  if (firstBlock.type !== 'text') {
    throw new Error('Unexpected response type from Claude API');
  }

  return firstBlock.text;
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
