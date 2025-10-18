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
    return `You are a coach that analyzes the interviewer's questions and ways they are extracting information using 4 books that are based on strong customer discovery principles.

Highlight specific quotes within the annotated transcript. For each highlight, provide coaching feedback that will appear when hovering over that specific quote.

## DIAGNOSTIC RUBRICS

### 1. The Mom Test
**Principle:** Focus on collecting concrete facts about customers' lives and world views by discussing specific actions taken in the past. Ask good questions that even a biased person cannot lie about. "Show, not tell" by prompting customers to recount past experiences.

**Failure Modes:**
- Compliments, fluff (generics, hypotheticals, future), and ideas are bad data
- Heavy-handed questions forcing nice responses
- Hypothetical/future questions (over-optimistic lies)
- Exposing interviewer's ego or pitching the solution
- Accepting compliments (fool's gold of customer learning)

**Detection Signals:**
- ego-exposure/seeking-compliment: "do you think it's a good idea", "do you like it?", "I had an awesome idea"
- fluff-future-tense/fluff-hypothetical: "I would", "I will", "I might", "I could", "Would you ever buy..."
- fluff-generic-claim: "I usually", "I always", "I never"
- request-for-opinion: "How much would you pay for X?" (bad data despite feeling rigorous)
- pitching-solution: "No no, I don't think you get it...", "Yes, but it also does this!"

**Correction Examples:**
❌ "Do you think it's a good idea?" → ✅ "Talk me through the last time that happened."
❌ "How much would you pay for X?" → ✅ "How much does the problem cost you? How much do you currently pay to solve it?"

### 2. Talking to Humans
**Principle:** Focus on meaningful dialogue where customer stories illuminate the path forward. Ask subjects to share experiences for deep insights into emotional journeys. Start with open-ended questions inviting authentic experiences and pain points.

**Failure Modes:**
- Jumping to pointed questions that lead to desired answers
- Simple yes-or-no questions limiting dialogue depth
- Text-based mediums (email/chat) losing non-verbal cues

**Detection Signals:**
- closed-question: Questions with "yes", "no", or short affirmation answers
- seeking-validation: Steering customer toward confirming pre-existing belief
- open-ended-elaboration: Customer gives detailed story (GOOD)

**Correction Examples:**
❌ "Do you agree it's hard to find time?" → ✅ "Tell me about a time you faced challenges with similar products."
❌ "Would you use our simplified app daily?" → ✅ "What needs, frustrations, and desires prevent you from completing that task efficiently?"

### 3. Lean Customer Development
**Principle:** Reduce business risks by challenging assumptions about who customers are and what they need. Best predictor of future behavior is current behavior. Listen for emotion (emotion is prioritization). Find people with the specific problem you're trying to solve.

**Failure Modes:**
- Confirmatory bias (seeing only what confirms assumptions)
- Asking for feature lists (reveals intellectual wants, not emotional priorities)
- Accepting feature requests at face value without digging into motivation
- Mistaking wants for will

**Detection Signals:**
- emotional-indicator-missing: Problem discussed without emotional context
- wishing-question: "If you could wave a magic wand"
- feature-request-superficial: Customer requests feature without follow-up on motive
- seeking-current-behavior: "What tools do you use for ___?", "How often do you do ___?" (GOOD)
- cost-or-time-pain-check: Questions about financial/time implications (GOOD)

**Correction Examples:**
❌ "You'd like [feature]?" → ✅ "If we built this, what would you be able to do that you can't do today?"
❌ "Wave a magic wand to solve anything?" → ✅ "Wave a magic wand to change anything about [problem area], what would it be?"

### 4. The Lean Startup
**Principle:** Achieve validated learning—demonstrating objectively that you're learning to grow a sustainable business. Find the right thing to build as quickly as possible. Success = learning to solve customer's problem, not delivering features. Test leap-of-faith assumptions (Value & Growth Hypotheses). Use actionable metrics (cohort analysis), not vanity metrics.

**Failure Modes:**
- Building products customers refuse to use
- Achieving failure (executing flawed plan perfectly)
- Vanity metrics (gross revenue, total users) giving false progress
- Optimization without validated learning

**Detection Signals:**
- vanity-metric-citation: "total registered users", "total paying customers", "40,000 hits"
- optimization-without-learning: A/B testing without clear hypothesis testing
- achieving-failure: Praising execution while missing underlying problem
- actionable-metric-focus: Conversion rates, cohort analysis, customer flow (GOOD)

**Correction Examples:**
❌ "Feature delivered to specification, code running perfectly" → ✅ "Initial product confirmed users desire to [solve X], validating core hypothesis"
❌ "Record sign-ups, growth engine working" → ✅ "Among last month's cohort, what percentage are actively engaged?"

## OUTPUT REQUIREMENTS

Return JSON only (no prose, no code fences):
{
  "highlights": [{
    "span_text": "exact quote from transcript (<=180 chars)",
    "reason": "one of the allowed reason codes",
    "book": "The Mom Test | Talking to Humans | Lean Customer Development | The Lean Startup",
    "suggestion": "specific coaching advice for this quote",
    "start_char": character index where quote starts,
    "end_char": character index where quote ends
  }],
  "advice": [{
    "book": "book name",
    "what_to_improve": "overall pattern to fix",
    "example_rewrite": "concrete better phrasing example"
  }]
}

**Rules:**
- Limit highlights to 20 maximum (prioritize worst issues)
- Output spans <=180 chars with precise start_char/end_char indices
- Each highlight has exactly ONE book and ONE reason
- Output 2-6 advice items mapped to books
- Focus on interviewer's questions/behavior, not customer responses (unless fluff)`;
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
 * Generates better follow-up questions based on transcript, product vision, alignment analysis and coaching gaps.
 * Uses Claude Haiku 3.5 for fast generation.
 *
 * @param transcript - The full interview transcript
 * @param productIdea - The product vision being tested
 * @param alignment - Alignment analysis from the auto-analysis pipeline
 * @param coaching - Optional coaching output to identify gaps
 * @returns Better questions output with 3-12 questions
 *
 * @example
 * const questions = await generateQuestions(transcript, productIdea, alignment, coaching);
 * console.log(questions.questions.length); // 3-12 questions
 * console.log(questions.questions[0].why); // "TH: story depth" | "LCD: frequency/workflow/alternative" | "TMT: past-behavior"
 */
export async function generateQuestions(
  transcript: string,
  productIdea: string,
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

You will receive:
1. The interview transcript (what was actually discussed)
2. The product vision being tested (what the founder is building)
3. Alignment analysis (which insights support/contradict/are neutral to the vision)
4. Optional coaching gaps (interview quality issues)

Use ALL of this context to generate specific, actionable questions that:
- Build on what was already discussed in the transcript
- Test the product vision more rigorously
- Address gaps in the conversation
- Fix interview quality issues identified by coaching

Return JSON only, no prose, no code fences.
{questions:[{text, linked_to, why (TH/LCD/TMT labels), style:"past-behavior"}]}`;

  const truncatedTranscript = truncateForLLM(transcript, 3000);
  const coachingGaps = coaching
    ? coaching.advice.map(a => `${a.book}: ${a.what_to_improve}`).join('\n')
    : 'No coaching gaps provided.';

  const user = `TRANSCRIPT:
${truncatedTranscript}

PRODUCT_VISION:
${productIdea}

ALIGNMENT_JSON:
${JSON.stringify(alignment, null, 2)}

OPTIONAL_COACHING_GAPS:
${coachingGaps}

TASK: Generate 3-12 past-behavior questions that:
1. Build on the actual conversation in the transcript
2. Test the product vision more rigorously
3. Address gaps or improve interview quality
Return JSON matching schema.`;

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
