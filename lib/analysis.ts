export function generateAnalysis(transcript: string, productIdea: string): string {
  const normalizedTranscript = transcript.replace(/\s+/g, " ").trim();
  if (!normalizedTranscript) {
    return "No transcript provided. Please add interview notes to generate an analysis.";
  }

  const SENTENCE_SPLIT_REGEX = /(?<=[.!?])\s+/u;
  const MAX_SENTENCES = 3;

  const sentences = normalizedTranscript
    .split(SENTENCE_SPLIT_REGEX)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .slice(0, MAX_SENTENCES);

  const summaryText = sentences.length > 0
    ? sentences.join(" ")
    : normalizedTranscript.slice(0, 320);

  const ideaContext = productIdea.trim();
  const prefix = ideaContext
    ? `Interview analysis for "${ideaContext}":`
    : "Interview analysis:";

  return `${prefix} ${summaryText}`.trim();
}
