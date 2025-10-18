import { readFileSync } from 'fs';
import { join } from 'path';
import {
  callClaude,
  extractJson,
  truncateForLLM,
  type AnthropicModel,
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_FAST_ANTHROPIC_MODEL,
  resolveAnthropicModelFromEnv,
} from './anthropic';
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

// Use Sonnet 3.5 for coaching (quality matters) - reliable with strong JSON support
const SONNET_MODEL: AnthropicModel = resolveAnthropicModelFromEnv(
  ['ANTHROPIC_COACH_MODEL', 'CLAUDE_COACH_MODEL', 'CLAUDE_MODEL'],
  DEFAULT_ANTHROPIC_MODEL
);
// Use Haiku 3.5 for questions and emails (speed matters)
const HAIKU_MODEL: AnthropicModel = resolveAnthropicModelFromEnv(
  ['ANTHROPIC_FAST_MODEL', 'CLAUDE_FAST_MODEL', 'CLAUDE_MODEL'],
  DEFAULT_FAST_ANTHROPIC_MODEL
);

// Model-specific configurations
const SONNET_CONFIG = {
  maxTokens: 4096, // Increased for coaching highlights and advice
  temperature: 0.2, // Lower for consistent, deterministic JSON output
};

const HAIKU_CONFIG = {
  maxTokens: 2048, // Increased for better questions (3-12 items) and follow-up emails
  temperature: 0.2, // Lower for consistent, deterministic JSON output
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
    return `Be a coach that analyzes the interviewer's questions and ways they are extracting information using 4 books that are based on strong customer discovery principles. Listed below are the diagnostic rubrics that the transcripts should be examined in for the coaching. Highlight the specific quotes within the annotated transcript and in a white text box that shows when you hover over the specific quote, show the coaching behind that specific interviewer sentence.

Diagnostic Rubric for Customer Discovery Interviews (Textual Format)
1. The Mom Test
Principle (What Good Interviewing Looks Like)
The interviewer must focus on collecting concrete facts about the customers' lives and world views by discussing specific actions taken in the past. The conversation should be leveraged to gain insights that allow the business to improve. The interviewer should try to "show, not tell" by prompting customers to recount past experiences, moving away from opinions and moving toward actions. Good interviewing relies on asking good questions that even a biased person cannot lie about.
Failure Modes (What Goes Wrong)
A key failure mode is inviting bad data, which comes in three forms: compliments, fluff (generics, hypotheticals, and the future), and ideas. Teams commonly use "heavy-handed questions" that force people to say something nice about the business. This includes asking hypothetical questions or questions rooted in the future, as anything involving the future is an over-optimistic lie. Another serious failure mode is exposing the interviewer's ego or pitching the solution, which causes the customer to stop talking about their problems. Finally, accepting compliments is dangerous because they are the "fool's gold of customer learning: shiny, distracting, and entirely worthless".
Detectable Textual Signals (For AI Detection)
• ego-exposure / seeking-compliment: Presence of the exact phrases: "do you think it's a good idea", "do you like it?", or instances where the interviewer uses phrases like, "I had an awesome idea for an app", or starts pitching by saying, "No no, I don't think you get it..." or "Yes, but it also does this!".
• fluff-future-tense / fluff-hypothetical: Customer uses words like "I would," "I will," "I might," or "I could" when describing future behavior or usage. Interviewer asks questions starting with "Would you ever buy...".
• fluff-generic-claim: Customer uses vague quantifiers like "I usually," "I always," or "I never".
• closed-question / request-for-opinion: Interviewer asks a question that invites simple affirmation or opinion rather than fact (e.g., asking "How much would you pay for X?" because the number makes it feel rigorous but is actually bad data).
Examples of Bad Phrasing and Their Corrected Version
1. Bad Phrasing (Opinion/Hypothetical): "Do you think it's a good idea?". Corrected Phrasing (Past Behavior): "Talk me through the last time that happened.".
2. Bad Phrasing (Future Promise/Price Guess): "How much would you pay for X?". Corrected Phrasing (Current Expenditure/Budget): "How much does the problem cost them? How much do they currently pay to solve it?".
List of Label Names (AI Output Codes)
ego-exposure, seeking-compliment, fluff-generic-claim, fluff-future-tense, fluff-hypothetical, pitching-solution, biasing-question, request-for-opinion, asking-about-past-specifics, deflecting-compliment, closed-question.

--------------------------------------------------------------------------------
2. Talking to Humans
Principle (What Good Interviewing Looks Like)
The interviewer should focus on having a meaningful dialogue where the customer's stories illuminate the path the business might take. It is effective to ask the subject to share an experience, aiming for deep insights into their emotional journeys. Successful engagement should begin with an open-ended question that invites the interviewee to share authentic experiences and pain points in detail.
Failure Modes (What Goes Wrong)
A major failure is jumping straight to pointed questions that lead the customer to give the interviewer the answers they want to hear. Relying on simple yes-or-no questions limits dialogue depth and results in less valuable insights. Furthermore, interviews conducted using text-based mediums like email or chat should be entirely avoided if possible, as a significant portion of communication is non-verbal.
Detectable Textual Signals (For AI Detection)
• closed-question: Interrogative sentences where the likely answer is "yes," "no," or a short affirmation, indicating a lack of elaboration space.
• seeking-validation: Interviewer asks a question that steers the customer towards confirming a pre-existing belief.
• open-ended-elaboration: Customer response begins with a detailed story or lengthy recounting of an experience.
• avoid-text-medium-documented: Notes or meta-data indicating the interview format was email or chat, which is discouraged due to the loss of non-verbal cues.
Examples of Bad Phrasing and Their Corrected Version
1. Bad Phrasing (Closed/Leading): "Do you agree that it's usually hard to find time to research challenging products?" (Inferred from generic failure to ask open-ended questions). Corrected Phrasing (Open-ended): "Can you tell me about a time you faced challenges with similar products?".
2. Bad Phrasing (Solution Focus): "If we gave you a simplified app for this task, would you use it daily?" (Inferred poor practice from principle of needing authentic experience, not hypotheticals). Corrected Phrasing (Motive/Empathy): "What are your needs, frustrations, and desires that currently prevent you from completing that task efficiently?".
List of Label Names (AI Output Codes)
closed-question, seeking-validation, open-ended-elaboration, asking-about-past-specifics, avoid-text-medium-documented, customer-positive-feedback-fluff.

--------------------------------------------------------------------------------
3. Lean Customer Development
Principle (What Good Interviewing Looks Like)
Customer development is an approach to reduce business risks by challenging assumptions about who customers are and what they need, focusing on building products customers will buy. The best predictor of future behavior is current behavior. The interviewer must listen for emotion when taking notes, as emotion is prioritization. You should be trying to find people who have the specific problem you are trying to solve.
Failure Modes (What Goes Wrong)
A major failure is falling victim to confirmatory bias, where interviewers naturally see what confirms their assumptions and tune out what invalidates them. Another failure is asking customers for a list of what they want, as this reveals what they intellectually think ought to be important, not what they prioritize emotionally. Entrepreneurs are often biased toward their own great ideas. Feature requests should not be accepted at face value but must be dug into, otherwise they risk mistaking wants for will.
Detectable Textual Signals (For AI Detection)
• emotional-indicator-missing: Discussion of a problem point (lightning bolt symbol, ☇) without accompanying emotional text indicators like Angry (:( ) or Excited (:) ).
• wishing-question: Interviewer uses the phrase, "If you could wave a magic wand".
• feature-request-superficial: Customer requests a feature (e.g., "I need X feature"), and the interviewer fails to follow up with questions about the underlying motive (e.g., "walk me through when and how you would use it?").
• seeking-current-behavior: Interviewer asks: "What Tools Do You Use for ______?" or "How Often Do You Do ______?".
• cost-or-time-pain-check: Interviewer asks questions revealing financial implications, such as: "How Much Additional Time or Money Does It Cost You?".
Examples of Bad Phrasing and Their Corrected Version
1. Bad Phrasing (Feature Request Follow-up Fail): "You're saying that you'd like [feature]?". Corrected Phrasing (Probing Motive/Value): "If we built this data export feature, what would you be able to do that you aren't able to do today?".
2. Bad Phrasing (Unconstrained Wish): "If you could wave a magic wand and solve anything, what would you do?". Corrected Phrasing (Constrained Wish/Pain): "If you could wave a magic wand and change anything—doesn't matter if it's possible or not—about [problem area], what would it be?".
List of Label Names (AI Output Codes)
emotional-indicator-detected, wishing-question, feature-request-superficial, probing-question-for-motive, seeking-current-behavior, cost-or-time-pain-check, confirmatory-bias-detected.

--------------------------------------------------------------------------------
4. The Lean Startup
Principle (What Good Interviewing Looks Like)
The purpose of the startup is to achieve validated learning—the process of demonstrating objectively that the business is learning how to grow a sustainable business. The ultimate goal is to find the right thing to build as quickly as possible. Success is defined as learning how to solve the customer's problem, not merely delivering a feature. Interviewing should test the fundamental leap-of-faith assumptions (Value Hypothesis and Growth Hypothesis). Learning milestones must rely on actionable metrics, such as cohort analysis, rather than vanity metrics.
Failure Modes (What Goes Wrong)
The biggest waste of all is building a product that customers refuse to use. A common failure is achieving failure, which means successfully executing a flawed plan (building a product to specification that does not solve the underlying customer need). Falling prey to vanity metrics (like gross revenue or total registered users) is a key danger, as they give the false impression of progress without revealing whether the company's growth engine is working effectively. Optimization efforts (e.g., split-testing) are worthless unless they are tied directly to validated learning regarding a core hypothesis.
Detectable Textual Signals (For AI Detection)
• vanity-metric-citation: Interviewer or customer cites metrics focused on total/gross top-line numbers, such as: "total registered users", "total paying customers", or "40,000 hits this month".
• optimization-without-learning: The discussion focuses primarily on incremental technical tweaks (e.g., A/B testing copy, improving product performance) without a clear statement of which core assumption or hypothesis (Value or Growth) is being tested or refuted.
• achieving-failure: Customer praises the technical execution or design of a product, but the interview reveals the team missed the underlying problem (e.g., product was "technically and aesthetically lovely" but 90% was irrelevant).
• actionable-metric-focus: Interviewer discusses performance in terms of conversion rates across cohorts or customer flow sequences (e.g., "percentage of customers who logged in at least one time").
Examples of Bad Phrasing and Their Corrected Version
1. Bad Phrasing (Measuring Execution, not Learning): "We successfully delivered the feature to specification; the code is running perfectly.". Corrected Phrasing (Measuring Learning): "The initial product confirmed that users did have the desire to [solve problem X], which validates our core hypothesis.".
2. Bad Phrasing (Vanity Focus): "We saw a record increase in sign-ups this month. Our growth engine is working.". Corrected Phrasing (Actionable Focus): "Among the users acquired last month (cohort analysis), what percentage are actively engaged (retention rate)?".`;
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

TASK: Return JSON per schema. Limit highlights to 20 max.

CRITICAL: Return ONLY valid JSON - no markdown headers, no code fences, no explanatory text. Start with { and end with }.`;

  try {
    const response = await callClaude(SONNET_MODEL, system, user, { ...SONNET_CONFIG, enforceJson: true });
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

  const system = `You are developing further questions based on the interview transcript that they should have asked that specific interviewee in the first interview. I want the better questions to focus on probing the details and emotions behind a customer's stated problems and expanding upon previously missed opportunities within the transcript. These questions should be further elaborating upon stated customer pain points, customer needs, behaviors, and actionable takeaways in the transcript.`;

  const truncatedTranscript = truncateForLLM(transcript, 3000);
  const coachingGaps = coaching
    ? coaching.advice.map(a => `${a.book}: ${a.what_to_improve}`).join('\n')
    : 'No coaching gaps provided.';

  const user = `You are a Customer Discovery Further Question Generator
 Your job is to analyze an interview transcript and generate better follow-up questions that the founder could have asked that specific interviewee.
 These questions help founders go beyond surface-level answers — revealing motivations, emotions, workflows, and decision triggers.

🎯 Objective
Help early-stage founders improve their interviewing craft by generating questions that:
Probe deeper into pain points and needs stated by the customer.


Expand missed opportunities where the interviewer failed to explore important cues.


Uncover emotions, context, and behavior — not opinions or hypotheticals.


Are written in a natural, neutral tone using past-behavior framing.


Can be directly reused in the founder's next interview.



🧠 Rules for Good Discovery Questions
Always:
Anchor in past experiences, not future hypotheticals.


Focus on specific stories, not opinions or guesses.


Explore frequency, intensity, and emotional impact.


Ask for examples ("Can you walk me through the last time…?").


Be short and human, not academic.


Never:
Ask, "Would you use this?" or "Do you think it's a good idea?"


Ask about prices, future promises, or compliments.


Pitch the product or lead the witness.
🧩 Method
Review the transcript and insights.


Identify strong or ambiguous signals around pain, behavior, and motivation.


Note where the interviewer missed opportunities (based on transcript patterns or coaching highlights).


For each unresolved or emotional area, write 1–2 better questions that:


Invite storytelling or concrete examples.


Seek emotional or contextual clarity.


Stay neutral, non-leading, and grounded in the customer's past.


Mix question types:


Emotion probes: "How did that make you feel when that happened?"


Frequency checks: "How often does this issue come up in a typical week?"


Workflow expansion: "What steps do you take right after this problem occurs?"


Decision triggers: "What finally made you decide to try fixing it?"


Language style:


Plain, founder-friendly English.


Sound natural — like a thoughtful follow-up, not an academic survey.


Max 20 words per question.



🧭 Prioritization
Prioritize gaps labeled as: missed-probe, fluff-hypothetical, feature-request-superficial, seeking-validation, confirmatory-bias-detected.


Prefer insights from Contradicts and Neutral buckets — these reveal learning opportunities.


When multiple signals overlap, generate questions that could clarify both.
Fail-safe Behavior
If transcript is too short (< 300 chars) or contains no discernible customer pain:
Return an empty questions array.


Include "meta": {"reason": "Transcript too short or lacks concrete data"}.



✅ Validation
Each question must contain only one idea.


No question starts with "Would", "Will", "Do you think", or "Could you see yourself…".


Questions should make sense when read aloud conversationally.


Return strictly valid JSON — no markdown or prose.

TRANSCRIPT:
${truncatedTranscript}

PRODUCT_VISION:
${productIdea}

ALIGNMENT_JSON:
${JSON.stringify(alignment, null, 2)}

OPTIONAL_COACHING_GAPS:
${coachingGaps}

TASK: Generate 3-12 past-behavior questions that address the above criteria. Return JSON matching schema.

CRITICAL: Return ONLY valid JSON - no markdown headers, no code fences, no explanatory text. Start with { and end with }.`;

  try {
    const response = await callClaude(HAIKU_MODEL, system, user, { ...HAIKU_CONFIG, enforceJson: true });
    const parsed = extractJson(response);
    return BetterQuestionsSchema.parse(parsed);
  } catch (error) {
    throw new Error(
      `Failed to generate better questions: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generates a follow-up email based on free-form specifications.
 * Uses Claude Sonnet 4.5 for high-quality generation.
 *
 * @param specifications - Free-form user specs (e.g., "ask to set up interview in 3 weeks, clarify insight #3")
 * @param context - Optional context including profile, insights, prior summary
 * @returns Follow-up email output with subject and body
 *
 * @example
 * const email = await generateEmail(
 *   "ask to set up interview in 3 weeks, mention their pain about manual data consolidation",
 *   {
 *     profile: { name: "Sarah Chen", role: "Product Manager" },
 *     priorSummary: "Discussed feedback consolidation pain points",
 *     insights: ["Manual process takes 3-4 hours weekly", "Currently using spreadsheets"]
 *   }
 * );
 */
export async function generateEmail(
  specifications: string,
  context?: {
    profile?: { name: string; role?: string };
    priorSummary?: string;
    insights?: string[];
    tone?: 'professional' | 'friendly' | 'casual';
    length?: 'short' | 'medium' | 'long';
    includePlaceholders?: boolean;
  }
): Promise<FollowUpEmailOutput> {
  // Return mock if no API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('No ANTHROPIC_API_KEY found, using fallback email');
    const profile = context?.profile || { name: 'there' };
    return deriveEmailFallback(
      profile,
      { title: 'follow-up', quote: specifications },
      'a brief conversation'
    );
  }

  const system = `You draft professional follow-up emails to customer-discovery interviewees. You strictly follow user instructions, keep copy concise, reflect prior context accurately, add specific scheduling windows if asked, and avoid filler. Output only valid JSON with keys subject, body, raw_markdown.`;

  const today = new Date().toISOString().split('T')[0];
  const tone = context?.tone || 'professional';
  const length = context?.length || 'medium';
  const includePlaceholders = context?.includePlaceholders ?? false;

  const user = `INTERVIEWEE PROFILE:
Name: ${context?.profile?.name || '[Name]'}
Role: ${context?.profile?.role || '[Role]'}

LAST CONTACT DATE:
${today}

PRIOR SUMMARY:
${context?.priorSummary || 'Previous interview discussion'}

INSIGHTS:
${context?.insights?.join('\n') || 'No specific insights provided'}

SPECIFICATIONS:
${specifications}

TONE: ${tone}
LENGTH: ${length}
INCLUDE_PLACEHOLDERS: ${includePlaceholders}
TODAY: ${today}

Return JSON with keys subject, body, and raw_markdown (markdown version of the same email). Do not return extra keys.

CRITICAL: Return ONLY valid JSON - no markdown headers, no code fences, no explanatory text. Start with { and end with }.`;

  try {
    const response = await callClaude(SONNET_MODEL, system, user, { ...SONNET_CONFIG, enforceJson: true });
    const parsed = extractJson(response);
    return FollowupSchema.parse(parsed);
  } catch (error) {
    throw new Error(
      `Failed to generate follow-up email: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Edits an existing follow-up email draft based on edit instructions.
 * Uses Claude Sonnet 4.5 to surgically apply edits while preserving correct details.
 *
 * @param draft - The current email draft with subject and body
 * @param editInstructions - Free-form edit instructions (e.g., "shorter subject, friendlier tone, add 2 new time slots")
 * @param context - Optional context to help with edits
 * @returns Modified follow-up email
 *
 * @example
 * const edited = await editEmail(
 *   { subject: "Following up on our conversation", body: "Hi Sarah,\n\nThanks for..." },
 *   "make the subject shorter and add 2 specific time slots for next week",
 *   { profile: { name: "Sarah Chen" } }
 * );
 */
export async function editEmail(
  draft: { subject: string; body: string },
  editInstructions: string,
  context?: {
    profile?: { name: string; role?: string };
    priorSummary?: string;
    insights?: string[];
    tone?: 'professional' | 'friendly' | 'casual';
    length?: 'short' | 'medium' | 'long';
    includePlaceholders?: boolean;
  }
): Promise<FollowUpEmailOutput> {
  // Return draft if no API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('No ANTHROPIC_API_KEY found, returning original draft');
    return draft;
  }

  const system = `You draft professional follow-up emails to customer-discovery interviewees. You strictly follow user instructions, keep copy concise, reflect prior context accurately, add specific scheduling windows if asked, and avoid filler. Output only valid JSON with keys subject, body, raw_markdown.`;

  const today = new Date().toISOString().split('T')[0];
  const tone = context?.tone || 'professional';
  const length = context?.length || 'medium';
  const includePlaceholders = context?.includePlaceholders ?? false;

  const user = `ORIGINAL DRAFT:
Subject: ${draft.subject}
Body:
${draft.body}

EDIT INSTRUCTIONS:
${editInstructions}

OPTIONAL CONTEXT:
Interviewee: ${context?.profile?.name || '[Name]'}${context?.profile?.role ? ` (${context.profile.role})` : ''}
Prior Summary: ${context?.priorSummary || 'N/A'}
Insights: ${context?.insights?.join('; ') || 'N/A'}

TONE: ${tone}
LENGTH: ${length}
INCLUDE_PLACEHOLDERS: ${includePlaceholders}
TODAY: ${today}

Apply the edits directly to the given draft. Keep helpful existing content. Follow the edit instructions exactly. Return JSON with keys subject, body, raw_markdown only.`;

  try {
    const response = await callClaude(SONNET_MODEL, system, user, SONNET_CONFIG);
    const parsed = extractJson(response);
    return FollowupSchema.parse(parsed);
  } catch (error) {
    throw new Error(
      `Failed to edit follow-up email: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
