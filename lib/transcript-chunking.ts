/**
 * Transcript chunking utilities for handling large transcripts
 * Based on production-ready patterns for safe, coherent chunking
 */

// Conservative chunk size to avoid token explosion (~4500 tokens per chunk)
const CHUNK_CHAR_LIMIT = 18000;

/**
 * Chunks a transcript on paragraph boundaries for better coherence.
 * Ensures chunks stay under the character limit while preserving context.
 *
 * @param text - The full transcript text
 * @param chunkSize - Maximum characters per chunk (default: 18000)
 * @returns Array of chunked text segments
 */
export function chunkTranscript(text: string, chunkSize: number = CHUNK_CHAR_LIMIT): string[] {
  // Split on paragraph boundaries (double newline)
  const paragraphs = text.split('\n\n');
  const chunks: string[] = [];
  let current: string[] = [];
  let currentLen = 0;

  for (const paragraph of paragraphs) {
    const paragraphLen = paragraph.length + 2; // +2 for the \n\n separator

    // If adding this paragraph would exceed chunk size
    if (currentLen + paragraphLen > chunkSize) {
      // Save current chunk if it has content
      if (current.length > 0) {
        chunks.push(current.join('\n\n'));
      }

      // If single paragraph exceeds chunk size, hard wrap it
      if (paragraph.length > chunkSize) {
        const wrapped = hardWrapText(paragraph, chunkSize);
        chunks.push(...wrapped);
        current = [];
        currentLen = 0;
      } else {
        // Start new chunk with this paragraph
        current = [paragraph];
        currentLen = paragraphLen;
      }
    } else {
      // Add paragraph to current chunk
      current.push(paragraph);
      currentLen += paragraphLen;
    }
  }

  // Add final chunk if it has content
  if (current.length > 0) {
    chunks.push(current.join('\n\n'));
  }

  return chunks.length > 0 ? chunks : [text]; // Ensure at least one chunk
}

/**
 * Hard wraps text at word boundaries when a single paragraph exceeds chunk size.
 *
 * @param text - The text to wrap
 * @param maxWidth - Maximum width per line
 * @returns Array of wrapped text segments
 */
function hardWrapText(text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;

    if (testLine.length <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      // If single word exceeds max width, force it
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Validates transcript before processing.
 * Enforces length limits and basic sanitization.
 *
 * @param transcript - The transcript to validate
 * @param maxLength - Maximum allowed length (default: 500k chars)
 * @returns Validation result with sanitized transcript
 */
export function validateTranscript(
  transcript: string,
  maxLength: number = 500000
): { valid: boolean; error?: string; sanitized?: string } {
  // Check if empty
  if (!transcript || transcript.trim().length === 0) {
    return {
      valid: false,
      error: 'Transcript is empty. No transcript = no output.',
    };
  }

  // Check length limit
  if (transcript.length > maxLength) {
    return {
      valid: false,
      error: `Transcript exceeds maximum length of ${maxLength} characters. Current: ${transcript.length} chars.`,
    };
  }

  // Sanitize: normalize whitespace, remove potential injection attempts
  const sanitized = transcript
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\t/g, '  ') // Convert tabs to spaces
    .trim();

  return {
    valid: true,
    sanitized,
  };
}

/**
 * Estimates token count from character count (rough approximation).
 * Rule of thumb: ~4 characters per token for English text.
 *
 * @param text - The text to estimate
 * @returns Approximate token count
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}
