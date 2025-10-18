/**
 * Lightweight examples for the new AI helpers.
 */

import { runAutoAnalysis } from "./analysis";
import { generateQuestions } from "./questions";
import { analyzeQuality } from "./coaching";
import { generateEmail } from "./emails";
import type { AlignmentOutput } from "@/types/ai";

export async function demoAnalysis() {
  const transcript = "Interviewer: Tell me about the last time this was a problem.\nStakeholder: It happened yesterday...";
  const productIdea = "Dashboard that summarizes support escalations";

  const analysis = await runAutoAnalysis(transcript, productIdea);
  console.log("Summary bullets:", analysis.summary.summary.bullets);
}

export async function demoQuestions() {
  const transcript = "Interviewer: Walk me through...\nStakeholder: We struggled when...";
  const alignment: AlignmentOutput = {
    alignment: {
      supports: [],
      contradicts: [],
      neutral: [],
    },
  };

  const questions = await generateQuestions(transcript, "Idea", alignment, null);
  console.log("Questions:", questions.questions.length);
}

export async function demoCoaching() {
  const transcript = "Interviewer: Would you use this?\nStakeholder: Maybe";
  const coaching = await analyzeQuality(transcript);
  console.log("Coaching highlights:", coaching.highlights.length);
}

export async function demoEmail() {
  const email = await generateEmail("ask for another call", {
    profile: { name: "Alex" },
    priorSummary: "Discussed onboarding gaps",
    insights: ["Manual process takes too long"],
    tone: "professional",
    length: "medium",
    includePlaceholders: false,
  });
  console.log("Email subject:", email.subject);
}

// Uncomment to try locally
// demoAnalysis();
// demoQuestions();
// demoCoaching();
// demoEmail();
