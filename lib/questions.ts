import type { AlignmentOutput, BetterQuestionsOutput, CoachingOutput } from "@/types/ai";
import { callClaude } from "./ai";

function buildQuestionsPrompt(
  transcript: string,
  productIdea: string,
  alignment: AlignmentOutput,
  coaching: CoachingOutput | null
): string {
  const alignmentJson = JSON.stringify(alignment, null, 2);
  const coachingJson = coaching ? JSON.stringify(coaching, null, 2) : "null";

  return `You are a customer discovery coach helping craft sharper follow-up questions.\nProduce JSON matching this schema:\n{\n  "questions": [\n    {\n      "text": string,\n      "linked_to": string,\n      "why": string,\n      "style": string\n    }\n  ]\n}\n\nGuidelines:\n- Use the transcript, product idea, alignment summary, and coaching feedback.\n- Each question must be grounded in the interview.\n- Provide 3-6 questions.\n- linked_to should reference an insight title or specify "gap".\n- Output ONLY the JSON.\n\nProduct idea: ${productIdea.trim()}\n\nAlignment summary:\n${alignmentJson}\n\nCoaching feedback:\n${coachingJson}\n\nTranscript:\n"""\n${transcript.trim()}\n"""`;
}

export async function generateQuestions(
  transcript: string,
  productIdea: string,
  alignment: AlignmentOutput,
  coaching: CoachingOutput | null
): Promise<BetterQuestionsOutput> {
  const prompt = buildQuestionsPrompt(transcript, productIdea, alignment, coaching);
  const raw = await callClaude(prompt);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Claude response was not valid JSON for questions: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (!parsed || typeof parsed !== "object" || !("questions" in parsed)) {
    throw new Error("Claude response was missing question results");
  }

  const result = parsed as BetterQuestionsOutput;
  return result;
}
