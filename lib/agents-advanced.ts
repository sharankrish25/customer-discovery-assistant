import { readFileSync } from 'fs';
import { join } from 'path';
import { callClaude, extractJson, truncateForLLM } from './anthropic';
import { CoachingSchema, BetterQuestionsSchema, FollowupSchema } from './zod-advanced';
import type {
  CoachingOutput,
  BetterQuestionsOutput,
  FollowUpEmailOutput,
  AlignmentOutput,
  CoachingBook,
  CoachingReason,
} from '@/types/ai';

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
// Transcript-derived fallback helpers (used when API key is unavailable)
// ============================================================================

interface QuestionMetadata {
  reason: CoachingReason;
  book: CoachingBook;
  suggestion: string;
  advice: {
    book: CoachingBook;
    what_to_improve: string;
    example_rewrite: string;
  };
}

const WHY_SEQUENCE: BetterQuestionsOutput['questions'][number]['why'][] = [
  'TMT: past-behavior',
  'LCD: frequency/workflow/alternative',
  'TH: story depth',
];

function stripSpeakerLabel(line: string): string {
  return line.replace(/^[A-Za-z\s]{1,30}:\s*/, '').trim();
}

function splitIntoSentences(transcript: string): string[] {
  const normalized = transcript.replace(/\r\n/g, '\n');
  const lines = normalized
    .split('\n')
    .map((line) => stripSpeakerLabel(line.trim()))
    .filter(Boolean);

  const sentences: string[] = [];
  for (const line of lines) {
    const parts = line
      .replace(/([.!?])\s+/g, '$1|')
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length === 0) {
      sentences.push(line);
    } else {
      sentences.push(...parts);
    }
  }

  const seen = new Set<string>();
  return sentences.filter((sentence) => {
    const key = sentence.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function truncateSentence(sentence: string, maxLength = 160): string {
  if (sentence.length <= maxLength) return sentence;
  return `${sentence.slice(0, maxLength - 3).trimEnd()}...`;
}

function classifyQuestion(question: string): QuestionMetadata {
  const lower = question.toLowerCase();

  if (/(would|could|might|will you|if you|imagine)/.test(lower)) {
    return {
      reason: 'fluff-hypothetical',
      book: 'The Mom Test',
      suggestion:
        'Swap hypotheticals for past behavior: ask about the last time this situation happened and what they did.',
      advice: {
        book: 'The Mom Test',
        what_to_improve: 'Avoid hypothetical solution talk. Anchor on specific past events.',
        example_rewrite:
          'Instead of "Would you use this?", ask "Walk me through the last time you tried to solve this. What happened?"',
      },
    };
  }

  if (/(do you think|does that sound good|is that helpful|would you buy|do you like)/.test(lower)) {
    return {
      reason: 'seeking-compliment',
      book: 'The Mom Test',
      suggestion:
        'Compliment-seeking invites polite lies. Ask what they currently do and why instead.',
      advice: {
        book: 'The Mom Test',
        what_to_improve: 'Stop asking if the idea sounds good. Probe for facts about their workflow.',
        example_rewrite:
          'Instead of "Do you think this is helpful?", ask "How are you handling this today? What is frustrating about it?"',
      },
    };
  }

  if (/(how much|would you pay|price|pricing|cost you)/.test(lower)) {
    return {
      reason: 'request-for-opinion',
      book: 'Lean Customer Development',
      suggestion:
        'Rather than price opinions, uncover current spending or alternatives they pay for.',
      advice: {
        book: 'Lean Customer Development',
        what_to_improve: 'Avoid pricing hypotheticals. Investigate actual spend and existing solutions.',
        example_rewrite:
          'Instead of "How much would you pay?", ask "What do you pay for this problem today? What happens if you ignore it?"',
      },
    };
  }

  if (/(shouldn\'t you|don\'t you think|isn\'t it better|right\?)/.test(lower)) {
    return {
      reason: 'leading-question',
      book: 'Talking to Humans',
      suggestion:
        'Let the customer tell the story without steering. Use open prompts like "Tell me about...".',
      advice: {
        book: 'Talking to Humans',
        what_to_improve: 'Remove the pitch from your questions. Open with context-free prompts.',
        example_rewrite:
          'Instead of "Don’t you think a dashboard would help?", ask "How do you keep track of this today?"',
      },
    };
  }

  if (/(tell me more|walk me through|what happened next|how did that go)/.test(lower)) {
    return {
      reason: 'past-behavior-good',
      book: 'Talking to Humans',
      suggestion: 'Great job digging into past behavior. Keep following the timeline step by step.',
      advice: {
        book: 'Talking to Humans',
        what_to_improve: 'Continue chaining past-behavior follow-ups to maximize learning depth.',
        example_rewrite:
          'Nice job. Next ask: "When that happened, what did you do first? What did you evaluate next?"',
      },
    };
  }

  return {
    reason: 'too-broad',
    book: 'Talking to Humans',
    suggestion:
      'Narrow the question to a specific recent moment so the customer gives concrete details.',
    advice: {
      book: 'Talking to Humans',
      what_to_improve: 'Broad prompts lead to vague answers. Ask for the last specific time instead.',
      example_rewrite:
        'Instead of "How do you handle support?", ask "Tell me about the last support escalation that got messy."',
    },
  };
}

function deriveCoachingFallback(transcript: string): CoachingOutput {
  const normalized = transcript.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const highlights: CoachingOutput['highlights'] = [];
  const adviceMap = new Map<CoachingReason, CoachingOutput['advice'][number]>();

  let cursor = 0;
  for (const rawLine of lines) {
    const lineLength = rawLine.length;
    const lineStart = cursor;
    cursor += lineLength + 1; // include newline

    const trimmed = rawLine.trim();
    if (!trimmed.includes('?')) continue;

    const questionRegex = /([^?.!]*?\?)/g;
    let match: RegExpExecArray | null;
    while ((match = questionRegex.exec(trimmed)) !== null) {
      const segment = match[1];
      const clean = segment.trim();
      if (clean.length < 4) continue;

      const leadingWhitespace = segment.length - segment.trimStart().length;
      const start = normalized.indexOf(clean, lineStart + (match.index ?? 0) + leadingWhitespace);
      if (start === -1) continue;
      const end = start + clean.length;

      const meta = classifyQuestion(clean);

      highlights.push({
        span_text: truncateSentence(clean, 220),
        reason: meta.reason,
        book: meta.book,
        suggestion: meta.suggestion,
        start_char: start,
        end_char: end,
      });

      if (!adviceMap.has(meta.reason)) {
        adviceMap.set(meta.reason, meta.advice);
      }
    }
  }

  if (highlights.length === 0 && transcript.trim()) {
    const sample = truncateSentence(stripSpeakerLabel(transcript.trim()), 140);
    const meta = classifyQuestion('Can you tell me more about that?');
    highlights.push({
      span_text: sample || 'No interviewer questions detected in transcript.',
      reason: meta.reason,
      book: meta.book,
      suggestion: 'Ensure the transcript includes the interviewer’s questions so we can coach specific moments.',
      start_char: 0,
      end_char: Math.min(sample.length, transcript.length),
    });
    adviceMap.set(meta.reason, meta.advice);
  }

  const advice = Array.from(adviceMap.values()).slice(0, 4);

  return {
    highlights: highlights.slice(0, 20),
    advice,
  };
}

function extractKeywords(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((word) => word.length >= 4)
    )
  );
}

function buildQuestionsFromTranscript(
  transcript: string,
  alignment: AlignmentOutput
): BetterQuestionsOutput['questions'] {
  const sentences = splitIntoSentences(transcript).filter((sentence) => sentence.length > 25);
  const anchors = sentences.slice(0, 6);

  const linked: string[] = [
    ...alignment.alignment.supports.map((item) => item.insight_title),
    ...alignment.alignment.neutral.map((item) => item.insight_title),
    ...alignment.alignment.contradicts.map((item) => item.insight_title),
  ].filter(Boolean);

  const questions: BetterQuestionsOutput['questions'] = [];

  anchors.forEach((sentence, index) => {
    if (questions.length >= 6) return;

    const lower = sentence.toLowerCase();
    let prompt = sentence;

    if (lower.startsWith('i ') || lower.startsWith('we ')) {
      prompt = sentence.replace(/^(I|We)\s+/i, '');
    }

    const questionText = `Can you walk me through the last time ${prompt.replace(
      /[.?!"]+$/g,
      ''
    )}?`;

    const linkedTo = linked[index] || truncateSentence(sentence, 80);
    const why = WHY_SEQUENCE[index % WHY_SEQUENCE.length];

    questions.push({
      text: truncateSentence(questionText, 220),
      linked_to: linkedTo,
      why,
      style: 'past-behavior',
    });
  });

  return questions;
}

function deriveQuestionsFallback(
  transcript: string,
  productIdea: string,
  alignment: AlignmentOutput,
  coaching: CoachingOutput | null
): BetterQuestionsOutput {
  let questions = buildQuestionsFromTranscript(transcript, alignment);

  const keywords = extractKeywords(productIdea);

  if (questions.length < 3) {
    const extras: BetterQuestionsOutput['questions'] = [];
    for (const keyword of keywords) {
      if (extras.length + questions.length >= 6) break;
      extras.push({
        text: `Walk me through the last time ${keyword} came up. What triggered it and what did you do?`,
        linked_to: `Explore ${keyword}`,
        why: WHY_SEQUENCE[(questions.length + extras.length) % WHY_SEQUENCE.length],
        style: 'past-behavior',
      });
    }
    questions = [...questions, ...extras];
  }

  if (coaching && coaching.highlights.some((h) => h.reason === 'missed-probe')) {
    questions.unshift({
      text: 'Earlier you mentioned a part of the story that moved quickly. What happened right after the first sign of trouble?',
      linked_to: coaching.highlights.find((h) => h.reason === 'missed-probe')?.span_text || 'Missed probe',
      why: 'TH: story depth',
      style: 'past-behavior',
    });
  }

  const uniqueQuestions = new Map<string, BetterQuestionsOutput['questions'][number]>();
  for (const question of questions) {
    if (uniqueQuestions.size >= 6) break;
    const key = question.text.toLowerCase();
    if (!uniqueQuestions.has(key)) {
      uniqueQuestions.set(key, question);
    }
  }

  const result = Array.from(uniqueQuestions.values());
  while (result.length < 3) {
    const fallback = productIdea
      ? `Walk me through the most recent moment when you evaluated ${productIdea}. What did you compare it against?`
      : 'Tell me about the last time you worked around this problem. What steps did you take?';
    result.push({
      text: fallback,
      linked_to: productIdea || 'Recent workaround',
      why: WHY_SEQUENCE[result.length % WHY_SEQUENCE.length],
      style: 'past-behavior',
    });
  }

  return { questions: result.slice(0, 12) };
}

function deriveEmailFallback(
  profile: { name: string; role?: string },
  insight: { title: string; quote: string },
  desiredCommitment: string
): FollowUpEmailOutput {
  const firstName = profile.name ? profile.name.split(' ')[0] : 'there';
  const quote = truncateSentence(insight.quote || insight.title, 140);
  const commitment = desiredCommitment || 'a short follow-up conversation';

  const subjectBase = insight.title || 'our interview';
  const subject = truncateSentence(`Following up on ${subjectBase.toLowerCase()}`, 80);

  const body = [
    `Hi ${firstName},`,
    '',
    `Thanks again for sharing your experience about "${quote}".`,
    `I'd love to continue the conversation and dig into the specifics you mentioned. Would you be open to ${commitment}?`,
    '',
    'Best,',
    'Your interview partner',
  ].join('\n');

  return {
    subject,
    body,
  };
}

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
    console.warn('No ANTHROPIC_API_KEY found, using transcript-derived coaching fallback');
    return deriveCoachingFallback(transcript);
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
    console.warn('No ANTHROPIC_API_KEY found, using transcript-derived question fallback');
    return deriveQuestionsFallback(transcript, productIdea, alignment, coaching);
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
    console.warn('No ANTHROPIC_API_KEY found, using transcript-derived email fallback');
    return deriveEmailFallback(profile, insight, desiredCommitment);
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
