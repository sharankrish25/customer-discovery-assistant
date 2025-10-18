import type { AnalysisResult } from "@/types/ai";

const SENTENCE_SPLIT_REGEX = /(?<=[.!?])\s+/u;
const MAX_SENTENCES = 3;
const MAX_FALLBACK_LENGTH = 320;

export function generateAnalysis(transcript: string, productIdea: string): AnalysisResult {
  const normalizedTranscript = transcript.replace(/\s+/g, " ").trim();
  if (!normalizedTranscript) {
    return { analysis: "No transcript provided. Please add interview notes to generate an analysis." };
  }

  const sentences = normalizedTranscript
    .split(SENTENCE_SPLIT_REGEX)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .slice(0, MAX_SENTENCES);

  const summaryText = sentences.length > 0
    ? sentences.join(" ")
    : normalizedTranscript.slice(0, MAX_FALLBACK_LENGTH);

  const ideaContext = productIdea.trim();
  const prefix = ideaContext
    ? `Interview analysis for "${ideaContext}":`
    : "Interview analysis:";

  return {
    analysis: `${prefix} ${summaryText}`.trim(),
  };
}
