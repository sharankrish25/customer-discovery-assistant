import { z } from 'zod';
import { callClaude, parseClaudeJSON, loadPrompt } from './anthropic';

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
// Utility Functions
// ============================================================================

function truncateForLLM(text: string, maxLength: number = 8000): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '\n[TRUNCATED]';
}

function validateTranscript(transcript: string): { valid: boolean; sanitized?: string; error?: string } {
  const sanitized = transcript.trim();
  if (!sanitized) {
    return { valid: false, error: 'Transcript is empty' };
  }
  if (sanitized.length < 50) {
    return { valid: false, error: 'Transcript is too short (minimum 50 characters)' };
  }
  return { valid: true, sanitized };
}

function clampConfidence(confidence: number, transcript: string): number {
  const wordCount = transcript.trim().split(/\s+/).length;
  let maxConfidence = 0.85;
  
  if (wordCount < 200) maxConfidence = 0.3;
  else if (wordCount < 500) maxConfidence = 0.55;
  else if (wordCount < 900) maxConfidence = 0.7;
  
  return Math.min(confidence, maxConfidence);
}

// ============================================================================
// Constants
// ============================================================================

const MODEL = 'claude-3-5-sonnet-20241022';
const AGENT_CONFIG = {
  maxTokens: 4096,
  temperature: 0.2,
};

// ============================================================================
// Agent Functions
// ============================================================================

/**
 * Analyzes interview transcript and generates a summary with key learnings.
 * Uses the specialized summary-agent.txt prompt for consistent, high-quality analysis.
 */
export async function analyzeSummary(
  transcript: string,
  idea: string,
  options: {
    interviewId?: string;
    transcriptFetcher?: unknown;
  } = {}
): Promise<SummaryOutput> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  const { valid, sanitized, error } = validateTranscript(transcript);
  if (!valid || !sanitized) {
    throw new Error(error || 'Transcript is empty. No transcript = no output.');
  }

  const system = loadPrompt('summary-agent');
  const truncatedIdea = truncateForLLM(idea, 500).trim();
  const truncatedTranscript = truncateForLLM(sanitized);
  
  // Log options for debugging if needed
  if (options.interviewId) {
    console.log(`Analyzing summary for interview: ${options.interviewId}`);
  }

  const user = `PRODUCT IDEA CONTEXT:
${truncatedIdea}

TRANSCRIPT:
${truncatedTranscript}

TASK: Analyze this transcript and return a summary following the instructions in your system prompt. Return only valid JSON.`;

  try {
    const response = await callClaude(system, user, {
      model: MODEL,
      maxTokens: AGENT_CONFIG.maxTokens,
      temperature: AGENT_CONFIG.temperature,
    });
    
    const parsed = parseClaudeJSON(response);
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
 * Extracts evidence-backed insights from transcript.
 * Uses the specialized insights-agent.txt prompt for consistent insight extraction.
 */
export async function extractInsights(transcript: string): Promise<InsightsOutput> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  const { valid, sanitized, error } = validateTranscript(transcript);
  if (!valid || !sanitized) {
    throw new Error(error || 'Transcript is empty. No transcript = no output.');
  }

  const system = loadPrompt('insights-agent');
  const truncatedTranscript = truncateForLLM(sanitized);

  const user = `TRANSCRIPT:
${truncatedTranscript}

TASK: Extract insights from this transcript following the instructions in your system prompt. Return only valid JSON.`;

  try {
    const response = await callClaude(system, user, {
      model: MODEL,
      maxTokens: AGENT_CONFIG.maxTokens,
      temperature: AGENT_CONFIG.temperature,
    });
    
    const parsed = parseClaudeJSON(response);
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
 * Uses the specialized alignment-agent.txt prompt for consistent alignment analysis.
 */
export async function analyzeAlignment(
  insights: InsightsOutput,
  idea: string
): Promise<AlignmentOutput> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  const system = loadPrompt('alignment-agent');
  const truncatedIdea = truncateForLLM(idea, 500);

  const user = `PRODUCT VISION:
${truncatedIdea}

INSIGHTS:
${JSON.stringify(insights, null, 2)}

TASK: Analyze how each insight aligns with the product vision following the instructions in your system prompt. Return only valid JSON.`;

  try {
    const response = await callClaude(system, user, {
      model: MODEL,
      maxTokens: AGENT_CONFIG.maxTokens,
      temperature: AGENT_CONFIG.temperature,
    });
    
    const parsed = parseClaudeJSON(response);
    return AlignmentSchema.parse(parsed);
  } catch (error) {
    throw new Error(
      `Failed to analyze alignment: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Runs the complete auto-analysis pipeline: summary → insights → alignment.
 * This is the main entry point for UI to get all three analysis outputs.
 */
export async function runAutoAnalysis(
  transcript: string,
  idea: string,
  options: {
    interviewId?: string;
    transcriptFetcher?: unknown;
  } = {}
): Promise<{
  summary: SummaryOutput;
  insights: InsightsOutput;
  alignment: AlignmentOutput;
}> {
  try {
    console.log('Starting auto-analysis pipeline...');
    
    // Step 1: Generate summary
    console.log('Step 1: Generating summary...');
    const summary = await analyzeSummary(transcript, idea, options);
    console.log('Summary generated:', summary.summary.bullets.length, 'bullets');

    // Step 2: Extract insights
    console.log('Step 2: Extracting insights...');
    const insights = await extractInsights(transcript);
    console.log('Insights extracted:', insights.insights.length, 'insights');

    // Step 3: Analyze alignment between insights and idea
    console.log('Step 3: Analyzing alignment...');
    const alignment = await analyzeAlignment(insights, idea);
    console.log('Alignment analyzed:', {
      supports: alignment.alignment.supports.length,
      contradicts: alignment.alignment.contradicts.length,
      neutral: alignment.alignment.neutral.length
    });

    console.log('Auto-analysis pipeline completed successfully');
    return {
      summary,
      insights,
      alignment,
    };
  } catch (error) {
    console.error('Auto-analysis pipeline failed:', error);
    throw new Error(
      `Auto-analysis pipeline failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}