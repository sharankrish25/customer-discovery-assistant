import { readFileSync } from 'fs';
import { join } from 'path';
import { callClaude, extractJson, truncateForLLM } from './anthropic';
import { CoachingSchema, BetterQuestionsSchema, FollowupSchema } from './zod-advanced';
import type { CoachingOutput, BetterQuestionsOutput, FollowUpEmailOutput, AlignmentOutput } from '@/types/ai';

// ============================================================================
// Constants
// ============================================================================

// Use Sonnet 4.5 for coaching (quality matters)
const SONNET_MODEL = 'claude-sonnet-4-20250514';
// Use Haiku for questions and emails (speed matters)
const HAIKU_MODEL = 'claude-3-5-haiku-20241022';

// Model-specific configurations
const SONNET_CONFIG = {
  maxTokens: 1200,
  temperature: 0.2,
};

const HAIKU_CONFIG = {
  maxTokens: 700,
  temperature: 0.2,
};

// ============================================================================
// Mock Data (for when API key is missing)
// ============================================================================

const MOCK_COACHING: CoachingOutput = {
  highlights: [
    {
      span_text: "If you had a tool that could solve this, what would it look like?",
      reason: "hypothetical-question",
      book: "The Mom Test",
      suggestion: 'Focus on past behavior instead: "Walk me through the last time you tried to solve this problem. What tools or solutions did you try?"',
      start_char: 0,
      end_char: 66
    },
    {
      span_text: "How did that make you feel?",
      reason: "request-for-opinion",
      book: "The Mom Test",
      suggestion: 'Instead of asking about feelings, ask about specific actions: "What did you do next?" or "How did this impact your workflow?"',
      start_char: 100,
      end_char: 128
    }
  ],
  advice: [
    {
      book: "The Mom Test",
      what_to_improve: "Avoid hypothetical questions about potential solutions. Focus on past behavior and specific examples.",
      example_rewrite: 'Instead of "If you had a tool...", ask "What tools have you tried to solve this problem? What happened when you used them?"'
    },
    {
      book: "Talking to Humans",
      what_to_improve: "When you get a good past-behavior story, dig deeper into the workflow and decision-making process.",
      example_rewrite: 'Follow up with: "Walk me through each step of that process. Where did it break down? What took the most time?"'
    }
  ]
};

const MOCK_QUESTIONS: BetterQuestionsOutput = {
  questions: [
    {
      text: "Walk me through the last time you had to consolidate feedback for a prioritization decision. What was each step?",
      linked_to: "Time-consuming manual aggregation process",
      why: "LCD: frequency/workflow/alternative",
      style: "past-behavior"
    },
    {
      text: "What other tools or methods have you tried to solve the feedback consolidation problem? What happened with each one?",
      linked_to: "Time-consuming manual aggregation process",
      why: "LCD: frequency/workflow/alternative",
      style: "past-behavior"
    },
    {
      text: "Tell me about the conversation with your CEO when you couldn't answer how many customers wanted feature X. What happened next?",
      linked_to: "Inability to quantify customer demand accurately",
      why: "TH: story depth",
      style: "past-behavior"
    }
  ]
};

const MOCK_EMAIL: FollowUpEmailOutput = {
  subject: "Following up on our conversation about product feedback consolidation",
  body: `Thank you for taking the time to speak with me yesterday about your product feedback process. I really appreciated your candor about the challenges you're facing.

I was particularly struck by your example of spending hours consolidating feedback across Slack, email, and support tickets for prioritization decisions.

A few quick follow-up questions:

1. When you had to go through hundreds of messages for that feature prioritization decision, roughly how long did that take?
2. How often does your CEO or other stakeholders ask you for quantified customer demand data?

Would you be open to a 15-minute follow-up call next week to dig a bit deeper into your workflow?

Thanks again for your time and insights.`
};

// ============================================================================
// Helper: Load coaching system prompt
// ============================================================================

function loadCoachingSystemPrompt(): string {
  try {
    const path = join(process.cwd(), 'prompts', 'coaching-system.txt');
    return readFileSync(path, 'utf-8');
  } catch (error) {
    console.warn('Could not load coaching-system.txt, using inline version');
    return `You are an interview coach for early-stage founders. Evaluate transcripts using FOUR BOOKS, producing JSON only (no prose, no code fences):
1) Talking to Humans → real stories, correct target, deep context.
   Detect: too-broad, segment-mismatch, no-evidence-ask, missed-probe.
2) The Mom Test → past behavior, no hypotheticals, no pitching, avoid compliments/opinions.
   Detect: hypothetical-question, leading-question, pitching-solution, seeking-compliment, request-for-opinion, fluff-generic-claim, fluff-future-tense, fluff-hypothetical, past-behavior-good.
3) Lean Customer Development → frequency, workflow, alternatives, willingness/constraints.
   Detect: no-evidence-ask, missed-probe, too-broad, segment-mismatch.
4) The Lean Startup → convert learnings into testable experiments/commitments.
   Detect: no-evidence-ask, missed-probe (re next experiment).

Rules:
- Limit highlights to 20 maximum, prioritize worst issues
- Output spans <= 180 chars, precise boundaries via start_char/end_char char indices against the provided transcript string
- Each highlight MUST have exactly ONE 'book' and ONE 'reason' from allowed sets
- Also output 2–6 advice items (what_to_improve + example_rewrite) mapped to a book
Return JSON matching schema:
{ "highlights":[{ "span_text":"", "reason":"...", "book":"...", "suggestion":"", "start_char":0, "end_char":0 }], "advice":[{ "book":"...", "what_to_improve":"", "example_rewrite":"" }] }`;
  }
}

// ============================================================================
// Agent Functions
// ============================================================================

/**
 * Analyzes interview quality using The Mom Test, Talking to Humans, etc.
 * Uses Claude Sonnet 3.5 to identify problematic questions and provide coaching.
 *
 * @param transcript - The full interview transcript
 * @returns Coaching output with highlights and advice
 *
 * @example
 * const coaching = await analyzeQuality(transcript);
 * console.log(coaching.highlights.length); // Number of issues found
 * console.log(coaching.advice.length); // Number of improvement suggestions
 */
export async function analyzeQuality(transcript: string): Promise<CoachingOutput> {
  // Return mock if no API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('No ANTHROPIC_API_KEY found, returning mock coaching data');
    return MOCK_COACHING;
  }

  const system = loadCoachingSystemPrompt();
  const truncatedTranscript = truncateForLLM(transcript);

  const user = `TRANSCRIPT:
${truncatedTranscript}

TASK: Return JSON per schema. Limit highlights to 20 max.`;

  try {
    const response = await callClaude(SONNET_MODEL, system, user, SONNET_CONFIG);
    const parsed = extractJson(response);
    return CoachingSchema.parse(parsed);
  } catch (error) {
    throw new Error(
      `Failed to analyze interview quality: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generates better follow-up questions based on alignment analysis and coaching gaps.
 * Uses Claude Haiku 3.5 for fast generation.
 *
 * @param alignment - Alignment analysis from the auto-analysis pipeline
 * @param coaching - Optional coaching output to identify gaps
 * @returns Better questions output with 3-12 questions
 *
 * @example
 * const questions = await generateQuestions(alignment, coaching);
 * console.log(questions.questions.length); // 3-12 questions
 * console.log(questions.questions[0].why); // "TH: story depth" | "LCD: frequency/workflow/alternative" | "TMT: past-behavior"
 */
export async function generateQuestions(
  alignment: AlignmentOutput,
  coaching: CoachingOutput | null
): Promise<BetterQuestionsOutput> {
  // Return mock if no API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('No ANTHROPIC_API_KEY found, returning mock questions data');
    return MOCK_QUESTIONS;
  }

  const system = `Generate non-leading, past-behavior questions to close gaps based on:
- Talking to Humans (stories)
- The Mom Test (avoid hypotheticals/pitch; anchor past)
- Lean Customer Development (frequency, workflow, alternatives, willingness/constraints)
Return JSON only, no prose, no code fences.
{questions:[{text, linked_to, why (TH/LCD/TMT labels), style:"past-behavior"}]}`;

  const coachingGaps = coaching
    ? coaching.advice.map(a => `${a.book}: ${a.what_to_improve}`).join('\n')
    : 'No coaching gaps provided.';

  const user = `ALIGNMENT_JSON:
${JSON.stringify(alignment, null, 2)}

OPTIONAL_COACHING_GAPS:
${coachingGaps}

TASK: Generate 3-12 past-behavior questions that dig deeper into insights or address coaching gaps. Return JSON matching schema.`;

  try {
    const response = await callClaude(HAIKU_MODEL, system, user, HAIKU_CONFIG);
    const parsed = extractJson(response);
    return BetterQuestionsSchema.parse(parsed);
  } catch (error) {
    throw new Error(
      `Failed to generate better questions: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generates a concise follow-up email referencing interview insights.
 * Uses Claude Haiku 3.5 for fast generation. Target: <=120 words.
 *
 * @param profile - Customer profile with name and optional role
 * @param insight - Key insight with title and supporting quote
 * @param desiredCommitment - The next step you want (e.g., "15m call", "prototype trial")
 * @returns Follow-up email output with subject and body
 *
 * @example
 * const email = await generateEmail(
 *   { name: "Sarah Chen", role: "Product Manager" },
 *   { title: "Manual feedback consolidation pain", quote: "I spend 3-4 hours weekly on this" },
 *   "15m call to discuss workflow"
 * );
 * console.log(email.subject);
 * console.log(email.body.split(' ').length); // Should be ~120 words or less
 */
export async function generateEmail(
  profile: { name: string; role?: string },
  insight: { title: string; quote: string },
  desiredCommitment: string
): Promise<FollowUpEmailOutput> {
  // Return mock if no API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('No ANTHROPIC_API_KEY found, returning mock email data');
    return MOCK_EMAIL;
  }

  const system = `Draft a concise, bias-free follow-up email that references one quote and proposes exactly ONE clear next step (commitment): e.g., 15m call / prototype trial / intro / share anonymized data sample. No pitching. Max 120 words.
Return JSON only, no prose, no code fences.
{subject, body}`;

  const truncatedQuote = truncateForLLM(insight.quote, 300);

  const user = `CUSTOMER:
Name: ${profile.name}
Role: ${profile.role || 'Not specified'}

KEY_PAIN/QUOTE:
Insight: ${insight.title}
Quote: "${truncatedQuote}"

DESIRED_COMMITMENT:
${desiredCommitment}

TASK: Generate a follow-up email (max 120 words) that references the quote and proposes the commitment. Be warm but professional, no sales pitch. Return JSON matching schema.`;

  try {
    const response = await callClaude(HAIKU_MODEL, system, user, HAIKU_CONFIG);
    const parsed = extractJson(response);
    return FollowupSchema.parse(parsed);
  } catch (error) {
    throw new Error(
      `Failed to generate follow-up email: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
