import type { AlignmentOutput, InsightsOutput, SummaryOutput } from "@/types/ai";
import { callClaude } from "./ai";

export interface AutoAnalysisResult {
  summary: SummaryOutput;
  insights: InsightsOutput;
  alignment: AlignmentOutput;
}

function buildAnalysisPrompt(transcript: string, productIdea: string): string {
  const safeTranscript = transcript.trim();
  const safeIdea = productIdea.trim();

  return `You are an expert customer discovery analyst. Review the interview transcript and return a JSON object with three keys: summary, insights, and alignment.\n\nFollow this schema exactly:\n{\n  "summary": {\n    "summary": {\n      "bullets": string[],\n      "tone": "neutral",\n      "confidence": number (0-1)\n    }\n  },\n  "insights": {\n    "insights": [\n      {\n        "title": string,\n        "type": "existing_process" | "motivation" | "unmet_need" | "pain_magnitude" | "past_attempt",\n        "quotes": [{ "text": string, "start_sec": number | null }],\n        "why_it_matters": string,\n        "evidence_level": "low" | "med" | "high"\n      }\n    ],\n    "confidence": number (0-1)\n  },\n  "alignment": {\n    "alignment": {\n      "supports": [{ "insight_title": string, "quote": string, "rationale": string }],\n      "contradicts": [{ "insight_title": string, "quote": string, "rationale": string }],\n      "neutral": [{ "insight_title": string, "rationale": string }]\n    }\n  }\n}\n\nRules:\n- Use the transcript to ground every bullet, insight, and alignment entry.\n- Confidence values must be between 0 and 1.\n- Provide at least three summary bullets when possible.\n- Output ONLY the JSON object with no commentary.\n\nProduct idea: ${safeIdea}\n\nTranscript:\n"""\n${safeTranscript}\n"""`;
}

export async function runAutoAnalysis(
  transcript: string,
  productIdea: string
): Promise<AutoAnalysisResult> {
  const prompt = buildAnalysisPrompt(transcript, productIdea);
  const raw = await callClaude(prompt);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Claude response was not valid JSON for analysis: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("summary" in parsed) ||
    !("insights" in parsed) ||
    !("alignment" in parsed)
  ) {
    throw new Error("Claude response was missing required analysis fields");
  }

  const result = parsed as AutoAnalysisResult;
  return result;
}
