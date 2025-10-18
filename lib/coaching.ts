import type { CoachingOutput } from "@/types/ai";
import { callClaude } from "./ai";

function buildCoachingPrompt(transcript: string): string {
  return `You are a customer interview coach. Review the transcript and highlight opportunities to improve questioning technique.\nReturn ONLY JSON with keys highlights and advice.\n\nSchema:\n{\n  "highlights": [\n    {\n      "span_text": string,\n      "reason": string,\n      "book": string,\n      "suggestion": string,\n      "start_char": number,\n      "end_char": number\n    }\n  ],\n  "advice": [\n    {\n      "book": string,\n      "what_to_improve": string,\n      "example_rewrite": string\n    }\n  ]\n}\n\nUse excerpts directly from the transcript. Reasons should match one of the coaching tags provided to the product (e.g., past-behavior-good, fluff-hypothetical). Provide at least two highlights when possible.\n\nTranscript:\n"""\n${transcript.trim()}\n"""`;
}

export async function analyzeQuality(transcript: string): Promise<CoachingOutput> {
  const prompt = buildCoachingPrompt(transcript);
  const raw = await callClaude(prompt);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Claude response was not valid JSON for coaching: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Claude response for coaching was empty");
  }

  const result = parsed as CoachingOutput;
  if (!Array.isArray(result.highlights) || !Array.isArray(result.advice)) {
    throw new Error("Claude response for coaching was missing required arrays");
  }

  return result;
}
