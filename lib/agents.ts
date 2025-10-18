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

// Model-specific configurations for speed and determinism
const AGENT_CONFIG = {
  maxTokens: 1200,
  temperature: 0.2,
};

// ============================================================================
// Mock Data (for when API key is missing)
// ============================================================================

const MOCK_SUMMARY: SummaryOutput = {
  summary: {
    bullets: [
      'Customer manually consolidates feedback from multiple channels (Slack, email, support tickets), spending 3-4 hours weekly',
      'Struggles with accurate prioritization due to fragmented data and inability to quantify customer demand',
      'Feels frustrated and ineffective despite significant effort invested in the process',
      'Desires an automated solution with AI-powered categorization and trend analysis',
    ],
    tone: 'neutral',
    confidence: 0.87,
  },
};

const MOCK_INSIGHTS: InsightsOutput = {
  insights: [
    {
      title: 'Manual weekly consolidation routine',
      type: 'existing_process',
      quotes: [
        {
          text: 'I spend probably 3-4 hours a week just trying to consolidate it all into a spreadsheet',
          start_sec: 45,
        },
      ],
      why_it_matters: 'Shows significant recurring time investment in manual data aggregation, indicating a strong need for automation.',
      evidence_level: 'high',
    },
    {
      title: 'Unable to answer demand questions from leadership',
      type: 'pain_magnitude',
      quotes: [
        {
          text: 'The CEO asked me "how many customers asked for X" and I genuinely didn\'t know the exact number',
          start_sec: 102,
        },
      ],
      why_it_matters: 'Impacts credibility with leadership and ability to make data-driven prioritization decisions.',
      evidence_level: 'high',
    },
    {
      title: 'Desire for automated categorization',
      type: 'unmet_need',
      quotes: [
        {
          text: 'ideally it would just automatically gather everything and categorize it. Show me trends, maybe use AI or something',
          start_sec: 148,
        },
      ],
      why_it_matters: 'Expresses a clear gap between current manual process and desired automated solution.',
      evidence_level: 'med',
    },
  ],
  confidence: 0.82,
};

const MOCK_ALIGNMENT: AlignmentOutput = {
  alignment: {
    supports: [
      {
        insight_title: 'Time-consuming manual aggregation process',
        quote:
          'I spend probably 3-4 hours a week just trying to consolidate it all into a spreadsheet',
        rationale:
          'Product idea directly addresses the manual consolidation pain point with automation',
      },
      {
        insight_title: 'Need for automation and AI-powered insights',
        quote:
          'ideally it would just automatically gather everything and categorize it. Show me trends, maybe use AI or something',
        rationale: 'Customer explicitly requests automation and AI features, which align with the product concept',
      },
    ],
    contradicts: [],
    neutral: [
      {
        insight_title: 'Inability to quantify customer demand accurately',
        rationale:
          'While this insight shows a need for better tracking, it doesn\'t directly validate or invalidate the specific product approach',
      },
    ],
  },
};

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
    console.warn('No ANTHROPIC_API_KEY found, returning mock summary data');
    return MOCK_SUMMARY;
  }

  const system = `You are a specialized customer discovery interview summarizer designed for early-stage startup founders.

Your job is to produce a concise, high-signal summary of an interview transcript so the founder can quickly understand what was actually learned — not what was "said nicely" or speculated about.

Your summary MUST focus on:
- Pain points (real struggles, friction, workarounds).
- Needs (what they implicitly or explicitly want to exist).
- Current behaviors (what they actually do today).
- Actionable takeaways (what this means for the founder building a solution).

Your summary MUST avoid:
- Opinions or compliments ("that sounds great").
- Hypotheticals or future predictions ("I would…", "I might…").
- Fluff / generic statements.
- Paraphrasing vague sentiment without concrete evidence.

Your target reader:
A young founder learning PMF who needs signal, not noise. The summary should help them decide what to test next.

Rules:
- 3–8 bullets only.
- Each bullet must reflect evidence-backed content from the transcript.
- Use neutral tone (no persuasion).
- Do NOT include code fences in your response.
- Return JSON only, no prose.`;

  const truncatedTranscript = truncateForLLM(transcript);
  const truncatedIdea = truncateForLLM(idea, 500);

  const user = `PRODUCT IDEA:
${truncatedIdea}

INTERVIEW TRANSCRIPT:
${truncatedTranscript}

TASK:
Analyze the transcript and produce a summary that helps the founder understand:
1. What pain points were revealed (real struggles, not opinions)
2. What needs were expressed (implicit or explicit)
3. What current behaviors were described (what they actually do today)
4. What actionable takeaways exist for the founder

Return JSON exactly matching this structure:
{ "summary": { "bullets": string[], "tone":"neutral", "confidence": 0..1 } }

Requirements:
- 3-8 bullets maximum
- Each bullet must be evidence-backed from the transcript
- Focus on signal, not noise
- Avoid hypotheticals, opinions, or fluff
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
    console.warn('No ANTHROPIC_API_KEY found, returning mock insights data');
    return MOCK_INSIGHTS;
  }

  const system = `You are an Insight Extraction Agent for customer discovery interviews.
Your job is to extract the most meaningful, evidence-backed insights from a transcript to help a young startup founder understand what is truly going on in the customer's world.

You DO NOT summarize the conversation.
You surface what matters — with quotes.

You MUST extract insights related to:

Category | Definition
--- | ---
Existing processes & behaviors | What the customer ACTUALLY does today; workaround, hacks, routines
Motivations & goals | What they're trying to achieve and why it matters
Unmet needs & gaps | What is missing, blocked, or painful
Magnitude of pain | How costly/urgent/recurring the issue is
Past attempts | What they tried before & why it failed

You MUST anchor every insight to the transcript using at least one verbatim quote.

No quote = not an insight.
Quotes should be short and specific, not paraphrased.

Keep only high-signal insights (4-12 insights).

Titles must be short (≤ 12 words).

why_it_matters should connect the quote to the business context (1–2 short sentences).

evidence_level depends on:
- low = vague or brief mention
- med = repeated or clearly described
- high = emotional, urgent, or has a workaround cost

If the transcript is weak (little evidence), return fewer insights and lower confidence.

If multiple quotes reinforce the same point, group them under one insight.

Never hypothesize outside what was spoken.

Return JSON only, no prose, no code fences.`;

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
    console.warn('No ANTHROPIC_API_KEY found, returning mock alignment data');
    return MOCK_ALIGNMENT;
  }

  const system = `Compare insights to the founder's product idea; classify how each relates. Return JSON only, no prose, no code fences.`;

  const truncatedIdea = truncateForLLM(idea, 500);

  const user = `IDEA:
${truncatedIdea}

INSIGHTS_JSON:
${JSON.stringify(insights, null, 2)}

TASK:
Return JSON exactly matching this structure:
{
  "alignment": {
    "supports": [{"insight_title":"", "quote":"", "rationale":""}],
    "contradicts": [{"insight_title":"", "quote":"", "rationale":""}],
    "neutral": [{"insight_title":"", "rationale":""}]
  }
}

For each classification, include a rationale ≤18 words.
For each insight:
- "supports": The insight validates or strengthens the product idea
- "contradicts": The insight suggests the idea may not solve the real problem or customers want something different
- "neutral": The insight is interesting but doesn't clearly support or contradict the idea

Include the insight_title exactly as it appears in the insights JSON.`;

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
    console.warn('No ANTHROPIC_API_KEY found, returning all mock data');
    return {
      summary: MOCK_SUMMARY,
      insights: MOCK_INSIGHTS,
      alignment: MOCK_ALIGNMENT,
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
