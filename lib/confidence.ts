/**
 * Confidence scoring heuristics for transcript analysis.
 *
 * These functions help prevent overconfident AI responses on short or low-quality inputs
 * by applying heuristic confidence caps based on objective metrics like word count.
 */

/**
 * Calculates a heuristic confidence score based on transcript length.
 *
 * Rationale:
 * - Short transcripts (<200 words) lack sufficient context for high-confidence analysis
 * - Medium transcripts (200-500 words) provide moderate confidence
 * - Longer transcripts (500-900 words) allow for good confidence
 * - Very long transcripts (900+ words) support high confidence
 *
 * @param transcript - The interview transcript text
 * @returns Confidence score between 0 and 1
 *
 * @example
 * const score = heuristicConfidenceForTranscript("short transcript...");
 * console.log(score); // 0.3 (low confidence for short input)
 */
export function heuristicConfidenceForTranscript(transcript: string): number {
  const wordCount = transcript.trim().split(/\s+/).length;

  if (wordCount < 200) return 0.3;
  if (wordCount < 500) return 0.55;
  if (wordCount < 900) return 0.7;
  return 0.85;
}

/**
 * Clamps a confidence score to not exceed the heuristic maximum.
 *
 * Use this to prevent the AI from being overconfident on short transcripts,
 * even if it thinks it has high confidence.
 *
 * @param aiConfidence - The confidence score returned by the AI model (0-1)
 * @param transcript - The transcript used for analysis
 * @returns The clamped confidence score (minimum of AI and heuristic)
 *
 * @example
 * const clamped = clampConfidence(0.95, shortTranscript);
 * console.log(clamped); // 0.3 (clamped to heuristic max for short input)
 */
export function clampConfidence(
  aiConfidence: number,
  transcript: string
): number {
  const heuristicMax = heuristicConfidenceForTranscript(transcript);
  return Math.min(aiConfidence, heuristicMax);
}
