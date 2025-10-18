import { z } from 'zod';
import { callClaude, truncateForLLM } from './anthropic';
import { parseJsonSafely } from './parseJson';
import { clampConfidence } from './confidence';

// ============================================================================
// Zod Schemas (matching UI types)
// ============================================================================

const SummarySchema = z.object({
  summary: z.object({
    bullets: z.array(z.string()).min(1),
    tone: z.literal('neutral'),
    confidence: z.number().min(0).max(1),
  }),
});

const QuoteSchema = z.object({
  text: z.string(),
  start_sec: z.number().nullable(),
});

const InsightItemSchema = z.object({
  title: z.string(),
  type: z.enum(['existing_process', 'motivation', 'unmet_need', 'pain_magnitude', 'past_attempt']),
  quotes: z.array(QuoteSchema).min(1),
  why_it_matters: z.string(),
  evidence_level: z.enum(['low', 'med', 'high']),
});

const InsightsSchema = z.object({
  insights: z.array(InsightItemSchema),
  confidence: z.number().min(0).max(1),
});

const AlignmentSchema = z.object({
  alignment: z.object({
    supports: z.array(
      z.object({
        insight_title: z.string(),
        quote: z.string(),
        rationale: z.string(),
      })
    ),
    contradicts: z.array(
      z.object({
        insight_title: z.string(),
        quote: z.string(),
        rationale: z.string(),
      })
    ),
    neutral: z.array(
      z.object({
        insight_title: z.string(),
        rationale: z.string(),
      })
    ),
  }),
});

// Type exports
export type SummaryOutput = z.infer<typeof SummarySchema>;
export type InsightsOutput = z.infer<typeof InsightsSchema>;
export type AlignmentOutput = z.infer<typeof AlignmentSchema>;

// ============================================================================
// Constants
// ============================================================================

// Using Claude Sonnet 4.5 - the fastest and most powerful Claude model
const MODEL = 'claude-sonnet-4-20250514';

// Model-specific configurations
// Note: temperature must be 1 when extended thinking is enabled
const AGENT_CONFIG = {
  maxTokens: 1200,
  temperature: 1, // Required for extended thinking mode
};

// ============================================================================
// Transcript-derived fallback helpers (used when API key is unavailable)
// ============================================================================

const NEGATIVE_TERMS = [
  'no',
  'not',
  'never',
  'already',
  'satisfied',
  'happy',
  'fine',
  'works',
  'doesnt',
  "doesn't",
  'donot',
  "don't",
  'isnt',
  "isn't",
];

const WHY_IT_MATTERS: Record<InsightsOutput['insights'][number]['type'], string> = {
  existing_process: 'Shows how the customer handles the problem today, revealing workflow anchors.',
  motivation: 'Clarifies the underlying goals driving their decisions and willingness to change.',
  unmet_need: 'Highlights a gap the customer explicitly or implicitly wants solved.',
  pain_magnitude: 'Illustrates recurring cost or effort, signaling urgency and value.',
  past_attempt: 'Shows what they tried before and why it fell short, guiding differentiation.',
};

function stripSpeakerLabel(sentence: string): string {
  return sentence.replace(/^[A-Za-z\s]{1,30}:\s*/, '').trim();
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
      continue;
    }

    sentences.push(...parts);
  }

  // Deduplicate while preserving order
  const seen = new Set<string>();
  return sentences.filter((sentence) => {
    const key = sentence.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function truncateSentence(sentence: string, maxLength = 180): string {
  if (sentence.length <= maxLength) return sentence;
  return `${sentence.slice(0, maxLength - 3).trimEnd()}...`;
}

function deriveSummaryFallback(transcript: string): SummaryOutput {
  const sentences = splitIntoSentences(transcript);
  const bullets = sentences
    .filter((sentence) => sentence.split(/\s+/).length >= 6)
    .slice(0, 6)
    .map((sentence) => truncateSentence(sentence, 200));

  if (bullets.length === 0 && transcript.trim().length > 0) {
    bullets.push(truncateSentence(stripSpeakerLabel(transcript.trim()), 200));
  }

  if (bullets.length === 0) {
    bullets.push('Transcript was empty. Please provide the customer interview text to generate analysis.');
  }

  const confidence = clampConfidence(
    bullets.length >= 4 ? 0.6 : bullets.length >= 2 ? 0.5 : 0.35,
    transcript
  );

  return {
    summary: {
      bullets,
      tone: 'neutral',
      confidence,
    },
  };
}

function classifyInsight(sentence: string): InsightsOutput['insights'][number]['type'] | null {
  const lower = sentence.toLowerCase();

  if (/(tried|attempted|experiment|pilot|tested|used to|used)/.test(lower)) {
    return 'past_attempt';
  }
  if (/(need|wish|want|looking for|missing|struggl|frustrat|blocked|gap)/.test(lower)) {
    return 'unmet_need';
  }
  if (/(spend|hour|time|cost|budget|expens|waste|every week|each week|per week|per day)/.test(lower)) {
    return 'pain_magnitude';
  }
  if (/(currently|right now|we use|i use|process|workflow|every morning|each month)/.test(lower)) {
    return 'existing_process';
  }
  if (/(goal|trying to|so that|so we can|hoping to|want to achieve|priority)/.test(lower)) {
    return 'motivation';
  }

  if (lower.includes('need') || lower.includes('problem')) {
    return 'unmet_need';
  }

  return null;
}

function evidenceLevel(sentence: string): InsightsOutput['insights'][number]['evidence_level'] {
  const lower = sentence.toLowerCase();
  if (/[0-9]/.test(sentence) || /(hour|day|week|month|year|budget)/.test(lower)) {
    return 'high';
  }
  if (sentence.length > 140 || /(really|very|constantly|often|always|never)/.test(lower)) {
    return 'med';
  }
  return 'low';
}

function titleFromSentence(sentence: string): string {
  const words = sentence.split(/\s+/).slice(0, 10);
  const raw = words.join(' ');
  if (!raw) return 'Customer insight';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function deriveInsightsFallback(transcript: string): InsightsOutput {
  const sentences = splitIntoSentences(transcript);
  const insights: InsightsOutput['insights'] = [];

  for (const sentence of sentences) {
    if (insights.length >= 10) break;

    const type = classifyInsight(sentence);
    if (!type) continue;

    const title = truncateSentence(titleFromSentence(sentence), 80);

    insights.push({
      title,
      type,
      quotes: [
        {
          text: truncateSentence(sentence, 200),
          start_sec: null,
        },
      ],
      why_it_matters: WHY_IT_MATTERS[type],
      evidence_level: evidenceLevel(sentence),
    });
  }

  if (insights.length === 0 && transcript.trim()) {
    const fallbackSentence = truncateSentence(stripSpeakerLabel(transcript.trim()), 200);
    insights.push({
      title: 'Initial customer signal',
      type: 'existing_process',
      quotes: [
        {
          text: fallbackSentence,
          start_sec: null,
        },
      ],
      why_it_matters: WHY_IT_MATTERS.existing_process,
      evidence_level: 'low',
    });
  }

  const confidence = clampConfidence(
    insights.length >= 5 ? 0.65 : insights.length >= 3 ? 0.55 : 0.4,
    transcript
  );

  return {
    insights,
    confidence,
  };
}

function extractIdeaKeywords(idea: string): string[] {
  return Array.from(
    new Set(
      idea
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((word) => word.length >= 4)
    )
  );
}

function containsKeyword(text: string, keyword: string): boolean {
  const pattern = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  return pattern.test(text);
}

function deriveAlignmentFallback(
  insights: InsightsOutput,
  idea: string
): AlignmentOutput {
  const keywords = extractIdeaKeywords(idea);
  const supports: AlignmentOutput['alignment']['supports'] = [];
  const contradicts: AlignmentOutput['alignment']['contradicts'] = [];
  const neutral: AlignmentOutput['alignment']['neutral'] = [];

  for (const insight of insights.insights) {
    const quote = insight.quotes[0]?.text || insight.title;
    const reference = `${insight.title} ${quote}`.toLowerCase();
    const matchedKeyword = keywords.find((keyword) => containsKeyword(reference, keyword));
    const hasNegative = NEGATIVE_TERMS.some((term) => containsKeyword(reference, term));

    if (matchedKeyword && !hasNegative) {
      supports.push({
        insight_title: insight.title,
        quote: truncateSentence(quote, 140),
        rationale: `Mentions "${matchedKeyword}" which aligns with the product vision.`,
      });
    } else if (matchedKeyword && hasNegative) {
      contradicts.push({
        insight_title: insight.title,
        quote: truncateSentence(quote, 140),
        rationale: `Highlights hesitation around "${matchedKeyword}", which challenges the vision.`,
      });
    } else {
      neutral.push({
        insight_title: insight.title,
        rationale: 'Insight is informative but does not map cleanly to the product vision keywords.',
      });
    }
  }

  if (supports.length === 0 && insights.insights.length > 0) {
    const first = insights.insights[0];
    supports.push({
      insight_title: first.title,
      quote: truncateSentence(first.quotes[0]?.text || first.title, 140),
      rationale: 'Reinforces a customer statement that relates indirectly to the vision; treat as directional evidence.',
    });
  }

  return {
    alignment: {
      supports,
      contradicts,
      neutral,
    },
  };
}

// ============================================================================
// Agent Functions
// ============================================================================

/**
 * Analyzes interview transcript and generates a summary with key learnings.
 *
 * @param transcript - The full interview transcript
 * @param idea - The product/business idea being validated
 * @returns Structured summary with bullets, tone, and confidence
 */
export async function analyzeSummary(
  transcript: string,
  idea: string
): Promise<SummaryOutput> {
  // Return mock if no API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('No ANTHROPIC_API_KEY found, falling back to transcript-derived summary');
    return deriveSummaryFallback(transcript);
  }

  const system = `You are a specialized customer discovery signal extractor for early-stage founders. Your job is to read the entire transcript provided (and only that transcript) and synthesize evidence-backed insights from it.

You must derive insights by combining multiple related statements from the transcript into a single cohesive pattern — not quoting or lightly paraphrasing one-off lines.

Your output must focus exclusively on:

Pain points (recurring friction or breakdowns in how they currently get something done)

Needs (what they implicitly or explicitly want that would remove that friction)

Current behaviors (what they actually do today — existing workflow, habits, tools, or workarounds)

Actionable takeaways (what this means for the founder building a solution)

Rules

3–8 bullets maximum

Each bullet must reflect a real, repeated, transcript-supported pain point, needs, current behaviors, or actionable takeaway that is summarizing a set of sentences within the transcript or a single very important sentence within the transcript. DO NOT COPY THE TRANSCRIPT VERBATIM AND PUT IT AS A BULLET IN THE SUMMARY.

Each insight must be synthesized from multiple parts of the transcript, not a single sentence

Insights must be directly grounded in what the interviewee actually does today

The summary must be restricted entirely to the provided transcript — no external assumptions, no generic productivity tropes, and no template-style guessed examples

You must NOT:

Pull from hypothetical examples or past interview templates

Fill in gaps with generic startup/knowledge-work pains

Use stock language like "switching between Slack, email, Google Docs" unless those tools were explicitly mentioned by the interviewee in THIS transcript

Infer future wants that aren't tied to actual present-day behavior

Quote compliments or enthusiasm about a hypothetical solution

Core Instruction

You are not summarizing what was said — you are summarizing what was learned, and you must base every insight only on what is explicitly evidenced in the transcript provided by the user.

No transcript = no output.
No evidence = no insight.`;

  const truncatedTranscript = truncateForLLM(transcript);
  const truncatedIdea = truncateForLLM(idea, 500);

  const user = `INTERVIEW TRANSCRIPT:
${truncatedTranscript}

PRODUCT IDEA (for context only):
${truncatedIdea}

TASK:
Read the entire transcript and synthesize 3-8 evidence-backed insights by combining multiple related statements into cohesive patterns.

Each bullet must:
- Synthesize insights from multiple parts of the transcript (not quote single sentences)
- Focus on pain points, needs, current behaviors, or actionable takeaways
- Be grounded in what the interviewee actually does today
- NOT copy the transcript verbatim

You must base every insight only on what is explicitly in the transcript. No external assumptions, no generic productivity tropes, no stock examples.

Return JSON exactly matching this structure:
{ "summary": { "bullets": string[], "tone":"neutral", "confidence": 0..1 } }

Requirements:
- 3-8 bullets maximum
- Each bullet synthesizes multiple transcript statements into one cohesive pattern
- Restrict entirely to this transcript only
- No hypotheticals, no compliments about solutions
- Neutral, factual tone only`;

  try {
    const response = await callClaude(MODEL, system, user, AGENT_CONFIG);
    const parsed = parseJsonSafely(response);
    const result = SummarySchema.parse(parsed);

    // Clamp confidence based on transcript length
    result.summary.confidence = clampConfidence(
      result.summary.confidence ?? 0.8,
      transcript
    );

    return result;
  } catch (error) {
    throw new Error(
      `Failed to analyze summary: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Extracts evidence-backed insights (pains, needs, motivations) from transcript.
 *
 * @param transcript - The full interview transcript
 * @returns Structured insights with verbatim quotes and evidence levels
 */
export async function extractInsights(transcript: string): Promise<InsightsOutput> {
  // Return mock if no API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('No ANTHROPIC_API_KEY found, falling back to transcript-derived insights');
    return deriveInsightsFallback(transcript);
  }

  const system = `You are an Insight Extraction Agent for customer discovery interviews.
Your job is to extract the most meaningful, evidence-backed insights from a transcript to help a young startup founder understand what is truly going on in the customer's world.

You DO NOT summarize the conversation.
You surface what matters — with quotes.

You MUST extract insights related to:
Category	Definition
Existing processes & behaviors	What the customer ACTUALLY does today; workaround, hacks, routines
Motivations & goals	What they're trying to achieve and why it matters
Unmet needs & gaps	What is missing, blocked, or painful
Magnitude of pain	How costly/urgent/recurring the issue is
Past attempts	What they tried before & why it failed
You MUST anchor every insight to the transcript using at least one verbatim quote.

No quote = not an insight.
Quotes should be short and specific, not paraphrased.

Keep only high-signal insights (max 4-12).

Titles must be short (≦ 12 words).

why_it_matters should connect the quote to the business context (1–2 short sentences).

evidence_level depends on:

low = vague or brief mention

med = repeated or clearly described

high = emotional, urgent, or has a workaround cost

If the transcript is weak (little evidence), return fewer insights and lower confidence.

If multiple quotes reinforce the same point, group them under one insight.

Never hypothesize outside what was spoken`;

  const truncatedTranscript = truncateForLLM(transcript);

  const user = `INTERVIEW TRANSCRIPT:
${truncatedTranscript}

TASK:
Extract high-signal, evidence-backed insights from this transcript.

Return JSON exactly matching this structure:
{
  "insights":[{
    "title":"short title (≤12 words)",
    "type":"existing_process|motivation|unmet_need|pain_magnitude|past_attempt",
    "quotes":[{"text":"verbatim quote","start_sec":null}],
    "why_it_matters":"1-2 sentences connecting quote to business context",
    "evidence_level":"low|med|high"
  }],
  "confidence": 0..1
}

Requirements:
- Each insight MUST have at least one verbatim quote from the transcript
- Return 4-12 insights (keep only high-signal)
- Titles must be ≤12 words
- Quotes should be short and specific, not paraphrased
- Group multiple quotes under one insight if they reinforce the same point
- evidence_level: low=vague mention, med=clearly described/repeated, high=emotional/urgent/has workaround cost
- If transcript is weak, return fewer insights (minimum 4) and lower confidence
- Never hypothesize beyond what was said

Categories:
- existing_process: What they ACTUALLY do today (workarounds, hacks, routines)
- motivation: What they're trying to achieve and why it matters
- unmet_need: What is missing, blocked, or painful
- pain_magnitude: How costly/urgent/recurring the issue is
- past_attempt: What they tried before & why it failed`;

  try {
    const response = await callClaude(MODEL, system, user, AGENT_CONFIG);
    const parsed = parseJsonSafely(response);
    const result = InsightsSchema.parse(parsed);

    // Clamp confidence based on transcript length
    result.confidence = clampConfidence(result.confidence ?? 0.8, transcript);

    return result;
  } catch (error) {
    throw new Error(
      `Failed to extract insights: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Analyzes how extracted insights align with the product idea.
 *
 * @param insights - The insights object from extractInsights()
 * @param idea - The product/business idea being validated
 * @returns Structured alignment showing supports/contradicts/neutral
 */
export async function analyzeAlignment(
  insights: InsightsOutput,
  idea: string
): Promise<AlignmentOutput> {
  // Return mock if no API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('No ANTHROPIC_API_KEY found, falling back to transcript-derived alignment');
    return deriveAlignmentFallback(insights, idea);
  }

  const system = `You are an Alignment Analyst for early-stage founders. Your job is to read a customer-discovery interview transcript and produce a Vision Alignment Analysis that tells the founder which statements support, contradict, or are neutral relative to their product vision.
Objectives
Extract only concrete, past-based facts and customer behaviors (avoid hypotheticals/opinions).


Group them into three buckets: Supports, Contradicts, Neutral.


Keep each item concise (one sentence headline + one short quote).


Prioritize the most decision-useful items for product/market fit (pain frequency, workflows, alternatives, willingness to pay/commit, switching triggers).


Provide evidence (verbatim snippet + character spans) and a short rationale for the label.


Return valid JSON matching the schema below—no extra prose.
Extraction Rules (strict)
Anchor in past behavior: Prefer lines starting with "Last time…", "We currently…", "I used…", "I pay…".


De-hypothesize: Ignore statements with "would, will, might, could" unless corroborated by past evidence.


No vanity: Ignore totals (e.g., "40k hits") unless they directly imply value or growth hypothesis.


Merge duplicates: If multiple quotes make the same claim, keep the clearest one.


One idea per item: No multi-clause soup.


Span indices: start_char and end_char must be within the raw transcript string and match the exact quote.


Conciseness limits: title <= 120 chars, quote <= 140 chars, rationale <= 160 chars.


Prioritization: Prefer evidence about (a) frequency, (b) money/time cost, (c) current workaround/tools, (d) switching triggers, (e) willingness to pay/commit.


Labeling Heuristics
Supports if the quote describes the problem your vision addresses, the status quo workaround is painful, or the user already pays/time-spends meaningfully.


Contradicts if the quote shows low frequency/low priority, an entrenched satisfying alternative, or direct rejection of your core value.


Neutral if informative but not tied to the core leap-of-faith assumption(s).


Style
Use plain language headlines.


Avoid solution pitching—observe, don't sell.


Be deterministic and consistent; if unsure, lower confidence and label Neutral.


Validation
Always return valid JSON only.


Ensure every item has a unique title.


Do not exceed max_items_per_bucket by >1 unless evidence density is unusually high (then prefer priority: high).


If no items fit a bucket, return an empty array for that bucket.
Failure Handling
If transcript is too short (< 300 chars) → return empty arrays and no hallucinations.


If vision is missing → return neutral items only with rationale "vision missing; cannot align."`;

  const truncatedIdea = truncateForLLM(idea, 500);

  const user = `PRODUCT VISION:
${truncatedIdea}

INSIGHTS:
${JSON.stringify(insights, null, 2)}

TASK:
Analyze how each insight aligns with the product vision. Return JSON exactly matching this structure:
{
  "alignment": {
    "supports": [{"insight_title":"", "quote":"", "rationale":""}],
    "contradicts": [{"insight_title":"", "quote":"", "rationale":""}],
    "neutral": [{"insight_title":"", "rationale":""}]
  }
}

Requirements:
- Use exact insight_title from the insights JSON
- For supports/contradicts: include the most relevant quote (<=140 chars)
- Rationale must be <=160 chars and explain WHY this supports/contradicts/is neutral
- Focus on past behavior evidence, not hypotheticals
- Prioritize items about: frequency, cost (time/money), current tools/workarounds, switching triggers, willingness to pay
- If no items fit a bucket, return empty array for that bucket

Classification:
- SUPPORTS: Quote describes the problem vision addresses, painful workaround, or meaningful time/money spent
- CONTRADICTS: Quote shows low frequency/priority, satisfying alternative already exists, or rejection of core value
- NEUTRAL: Informative but doesn't clearly validate or invalidate the core leap-of-faith assumptions`;

  try {
    const response = await callClaude(MODEL, system, user, AGENT_CONFIG);
    const parsed = parseJsonSafely(response);
    return AlignmentSchema.parse(parsed);
  } catch (error) {
    throw new Error(
      `Failed to analyze alignment: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Runs the complete auto-analysis pipeline: summary → insights → alignment.
 *
 * This is the main entry point for UI to get all three analysis outputs.
 *
 * @param transcript - The full interview transcript
 * @param idea - The product/business idea being validated
 * @returns Combined object with summary, insights, and alignment
 *
 * @example
 * const result = await runAutoAnalysis(
 *   "Customer: I spend 4 hours a week consolidating feedback...",
 *   "AI-powered feedback aggregation tool"
 * );
 * console.log(result.summary.summary.bullets);
 * console.log(result.insights.insights.length);
 * console.log(result.alignment.alignment.supports.length);
 */
export async function runAutoAnalysis(
  transcript: string,
  idea: string
): Promise<{
  summary: SummaryOutput;
  insights: InsightsOutput;
  alignment: AlignmentOutput;
}> {
  // If no API key, return all mocks immediately
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('No ANTHROPIC_API_KEY found, using transcript-derived fallbacks for analysis');
    const summary = deriveSummaryFallback(transcript);
    const insights = deriveInsightsFallback(transcript);
    const alignment = deriveAlignmentFallback(insights, idea);
    return {
      summary,
      insights,
      alignment,
    };
  }

  try {
    // Step 1: Generate summary
    const summary = await analyzeSummary(transcript, idea);

    // Step 2: Extract insights
    const insights = await extractInsights(transcript);

    // Step 3: Analyze alignment between insights and idea
    const alignment = await analyzeAlignment(insights, idea);

    return {
      summary,
      insights,
      alignment,
    };
  } catch (error) {
    throw new Error(
      `Auto-analysis pipeline failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
