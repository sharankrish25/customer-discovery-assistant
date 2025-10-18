import { z } from 'zod';
import { callClaude } from './anthropic';
import { parseJsonSafely } from './parseJson';

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
  type: z.enum(['pain', 'need', 'motivation']),
  quotes: z.array(QuoteSchema).min(1),
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

const MODEL = 'claude-3-5-sonnet-20241022';

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
      title: 'Time-consuming manual aggregation process',
      type: 'pain',
      quotes: [
        {
          text: 'I spend probably 3-4 hours a week just trying to consolidate it all into a spreadsheet',
          start_sec: 45,
        },
      ],
      evidence_level: 'high',
    },
    {
      title: 'Inability to quantify customer demand accurately',
      type: 'pain',
      quotes: [
        {
          text: 'The CEO asked me "how many customers asked for X" and I genuinely didn\'t know the exact number',
          start_sec: 102,
        },
      ],
      evidence_level: 'high',
    },
    {
      title: 'Need for automation and AI-powered insights',
      type: 'need',
      quotes: [
        {
          text: 'ideally it would just automatically gather everything and categorize it. Show me trends, maybe use AI or something',
          start_sec: 148,
        },
      ],
      evidence_level: 'low',
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

  const system = `You are a customer discovery analyst. Produce concise, factual learnings from interview transcripts. Avoid opinions.`;

  const user = `IDEA:
${idea}

TRANSCRIPT:
${transcript}

TASK:
Return JSON exactly matching this structure:
{ "summary": { "bullets": string[], "tone":"neutral", "confidence": 0..1 } }

Use only transcript evidence. Each bullet should be a complete, factual statement about what was learned.`;

  try {
    const response = await callClaude(MODEL, system, user);
    const parsed = parseJsonSafely(response);
    return SummarySchema.parse(parsed);
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

  const system = `Extract only evidence-backed pains/needs/motivations with verbatim quotes.`;

  const user = `TRANSCRIPT:
${transcript}

TASK:
Return JSON exactly matching this structure:
{
  "insights":[{
    "title":"",
    "type":"pain|need|motivation",
    "quotes":[{"text":"","start_sec":null}],
    "evidence_level":"low|med|high"
  }],
  "confidence": 0..1
}

Each insight MUST include ≥1 verbatim quote from the transcript.
- "pain": Problems, frustrations, obstacles the customer faces
- "need": Explicit requirements or desires expressed
- "motivation": Underlying drivers, emotions, or goals
- evidence_level: "high" = multiple quotes + specific examples, "med" = one clear quote, "low" = implied or weak evidence`;

  try {
    const response = await callClaude(MODEL, system, user);
    const parsed = parseJsonSafely(response);
    return InsightsSchema.parse(parsed);
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

  const system = `Compare insights to the founder's product idea; classify how each relates.`;

  const user = `IDEA:
${idea}

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

For each insight:
- "supports": The insight validates or strengthens the product idea
- "contradicts": The insight suggests the idea may not solve the real problem or customers want something different
- "neutral": The insight is interesting but doesn't clearly support or contradict the idea

Include the insight_title exactly as it appears in the insights JSON.`;

  try {
    const response = await callClaude(MODEL, system, user);
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
