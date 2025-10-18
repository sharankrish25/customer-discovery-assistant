import { z } from "zod";

export const CoachingSchema = z.object({
  highlights: z.array(z.object({
    span_text: z.string().min(1).max(300),
    reason: z.enum([
      "hypothetical-question","leading-question","pitching-solution","past-behavior-good",
      "missed-probe","too-broad","segment-mismatch","no-evidence-ask",
      "seeking-compliment","request-for-opinion","fluff-generic-claim","fluff-future-tense","fluff-hypothetical"
    ]),
    book: z.enum(["Talking to Humans","The Mom Test","Lean Customer Development","The Lean Startup"]),
    suggestion: z.string().min(1),
    start_char: z.number().int().min(0),
    end_char: z.number().int().min(0)
  })).max(100),
  advice: z.array(z.object({
    book: z.enum(["Talking to Humans","The Mom Test","Lean Customer Development","The Lean Startup"]),
    what_to_improve: z.string().min(1),
    example_rewrite: z.string().min(1)
  })).max(20)
});

export const BetterQuestionsSchema = z.object({
  questions: z.array(z.object({
    text: z.string().min(5),
    linked_to: z.string().min(1),
    why: z.string(), // Accept any string for why field to be more flexible
    style: z.string() // Accept any string for style field
  })).min(3).max(12)
});

export const FollowupSchema = z.object({
  subject: z.string().min(3).max(120),
  body: z.string().min(20).max(1000),
  raw_markdown: z.string().optional() // Markdown version of the email
});
