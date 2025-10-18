/**
 * Safely extract and parse JSON from text that may contain markdown code fences
 * or other surrounding text from LLM responses.
 *
 * Implements aggressive extraction strategy to handle cases where LLM
 * returns markdown headers or extra text despite being told not to.
 */
export function parseJsonSafely(text: string): unknown {
  // Remove markdown code fences if present
  let cleaned = text.trim();

  // Remove ```json or ``` wrapper
  const codeBlockMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  // Try direct parse first (best case - LLM followed instructions)
  try {
    return JSON.parse(cleaned);
  } catch {
    // Fallback: extract JSON from text that may have markdown headers or extra content

    // Find the first { or [ and the last matching } or ]
    const startBrace = cleaned.indexOf('{');
    const startBracket = cleaned.indexOf('[');

    let start = -1;
    if (startBrace >= 0 && startBracket >= 0) {
      start = Math.min(startBrace, startBracket);
    } else if (startBrace >= 0) {
      start = startBrace;
    } else if (startBracket >= 0) {
      start = startBracket;
    }

    const endBrace = cleaned.lastIndexOf('}');
    const endBracket = cleaned.lastIndexOf(']');
    const end = Math.max(endBrace, endBracket);

    if (start >= 0 && end > start) {
      try {
        const extracted = cleaned.slice(start, end + 1);
        return JSON.parse(extracted);
      } catch {
        // Continue to error
      }
    }

    // If all else fails, throw with helpful error
    throw new Error(
      `Failed to parse JSON from response: Could not find valid JSON object or array.\n\nResponse text (first 500 chars):\n${text.substring(0, 500)}...`
    );
  }
}
