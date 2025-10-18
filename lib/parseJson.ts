/**
 * Safely extract and parse JSON from text that may contain markdown code fences
 * or other surrounding text from LLM responses.
 */
export function parseJsonSafely(text: string): unknown {
  // Remove markdown code fences if present
  let cleaned = text.trim();

  // Remove ```json or ``` wrapper
  const codeBlockMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  // Try to find JSON object/array in the text
  // Look for the first { or [ and match to the last } or ]
  const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    cleaned = jsonMatch[1];
  }

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    throw new Error(
      `Failed to parse JSON from response: ${error instanceof Error ? error.message : 'Unknown error'}\n\nResponse text:\n${text.substring(0, 500)}...`
    );
  }
}
