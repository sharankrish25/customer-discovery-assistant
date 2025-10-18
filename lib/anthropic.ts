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
