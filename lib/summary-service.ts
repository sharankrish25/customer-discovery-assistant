import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import {
  callClaudeMultiMessage,
  type AnthropicModel,
  DEFAULT_ANTHROPIC_MODEL,
  resolveAnthropicModelFromEnv,
} from './anthropic';
import { chunkTranscript } from './transcript-chunking';

/**
 * Anthropic model configuration for the summary worker.
 * Defaults align with production guidance and can be overridden via env.
 */
export const SUMMARY_MODEL: AnthropicModel = resolveAnthropicModelFromEnv(
  ['ANTHROPIC_SUMMARY_MODEL', 'CLAUDE_MODEL'],
  DEFAULT_ANTHROPIC_MODEL
);
export const SUMMARY_MAX_MODEL_TOKENS = Number(process.env.ANTHROPIC_SUMMARY_MAX_TOKENS ?? 20_000);
export const SUMMARY_CHUNK_CHAR_LIMIT = Number(process.env.ANTHROPIC_SUMMARY_CHUNK_LIMIT ?? 18_000);

/**
 * System prompt sent alongside the structured user instructions.
 * Keeps the model anchored on returning JSON without extra commentary.
 */
export const SUMMARY_SYSTEM_PROMPT =
  'You are the backend summary worker for customer discovery interviews. ' +
  'Follow the user-provided instructions exactly, and respond ONLY with JSON matching the requested schema. ' +
  'Never include markdown code fences or additional narrative.';

/**
 * The immutable Summary API prompt. Keep this string identical to the specification.
 * Store it in code (or a prompt store) so it cannot be edited at runtime.
 */
export const SUMMARY_PROMPT = `You are a specialized customer discovery signal extractor for early-stage founders. Your job is to read the entire transcript and identify the most important groupings of information (2-5 related sentences) that reveal context, pain points, needs, and directions.

For each grouping you identify, synthesize it into ONE clear, concise sentence that captures the essence of what was learned.

Your output must focus on:
- Context (important background about the customer's situation, environment, or role)
- Pain points (recurring friction or breakdowns in how they currently get something done)
- Needs (what they implicitly or explicitly want that would remove that friction)
- Current behaviors (what they actually do today — existing workflow, habits, tools, or workarounds)
- Future directions (what actionable takeaways exist for the founder building a solution)

CRITICAL RULES:
1. Produce 3-8 bullet points total
2. Each bullet MUST be exactly ONE sentence
3. Each bullet must SYNTHESIZE a grouping of 2-5 related sentences from the transcript, NOT copy verbatim text
4. DO NOT quote single sentences from the transcript directly
5. DO NOT paraphrase single sentences - you must combine multiple related statements
6. Focus on what was LEARNED from the grouping, not what was literally said

You must NOT:
- Copy transcript text verbatim into bullets
- Paraphrase single sentences from the transcript
- Pull from hypothetical examples or past interview templates
- Fill in gaps with generic startup/knowledge-work pains
- Use stock language unless explicitly mentioned in THIS transcript
- Infer future wants not tied to actual present-day behavior
- Quote compliments or enthusiasm about hypothetical solutions

Process:
1. Read the entire transcript
2. Identify 3-8 important groupings of related sentences (2-5 sentences each)
3. For each grouping, synthesize the key learning into ONE sentence
4. Ensure each bullet represents a synthesis, not a copy or simple paraphrase

Core Instruction:
You are summarizing what was LEARNED from groupings of sentences, not what was SAID in individual sentences. Every bullet must synthesize multiple related statements into a cohesive insight.

No transcript = no output.
No evidence = no insight.
No synthesis = no bullet.`;

/**
 * Sanitises interview IDs to prevent path traversal when using the filesystem fallback.
 */
function sanitizeInterviewId(interviewId: string): string {
  const trimmed = interviewId.trim();
  if (!trimmed) {
    throw new Error('interview_id is required to fetch a transcript.');
  }

  const safe = trimmed.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safe) {
    throw new Error('interview_id contains no safe characters after sanitization.');
  }

  return safe;
}

/**
 * Default transcript fetcher. Reads transcripts from a secure directory that can be overridden via env.
 * Rotate credentials and enforce ACLs upstream. Nothing is logged here to avoid leaking PHI or secrets.
 */
export async function defaultTranscriptFetcher(interviewId: string): Promise<string> {
  if (typeof process === 'undefined') {
    throw new Error('Transcript fetching is not supported in this runtime environment.');
  }

  const baseDir = process.env.CDA_TRANSCRIPTS_DIR ?? '/secure/transcripts';
  const safeId = sanitizeInterviewId(interviewId);
  const filePath = join(baseDir, `${safeId}.txt`);

  try {
    return await fs.readFile(filePath, { encoding: 'utf-8' });
  } catch {
    throw new Error(
      `Failed to read transcript for interview ${safeId}. Ensure the file exists and permissions are configured correctly.`
    );
  }
}

export type TranscriptFetcher = (interviewId: string) => Promise<string>;

/**
 * Builds the Anthropic message array by injecting the immutable instruction prompt followed by
 * labeled transcript chunks. Claude treats the sequence as a single conversation when chunk labels are used.
 *
 * @param transcript - Full transcript text (already validated/sanitized)
 * @returns Message array suitable for callClaudeMultiMessage()
 */
export function buildSummaryMessages(transcript: string): MessageParam[] {
  const trimmed = transcript.trim();
  if (!trimmed) {
    throw new Error('Transcript is empty. No transcript = no output.');
  }

  const chunks = chunkTranscript(trimmed, SUMMARY_CHUNK_CHAR_LIMIT);
  const total = chunks.length;

  const messages: MessageParam[] = [
    {
      role: 'user',
      content: SUMMARY_PROMPT,
    },
  ];

  chunks.forEach((chunk, index) => {
    messages.push({
      role: 'user',
      content: `[Transcript part ${index + 1}/${total}]\n\n${chunk}`,
    });
  });

  return messages;
}

interface CreateSummaryOptions {
  /**
   * Optional additional messages appended after the transcript chunks.
   * Useful for providing product context or output formatting instructions.
   */
  additionalMessages?: MessageParam[];
  /**
   * Override the system prompt. Defaults to SUMMARY_SYSTEM_PROMPT.
   */
  systemPrompt?: string;
  /**
   * Override max_tokens for the Claude call. Defaults to SUMMARY_MAX_MODEL_TOKENS.
   */
  maxTokens?: number;
  /**
   * Allow disabling extended thinking (rarely needed).
   */
  thinkingEnabled?: boolean;
}

/**
 * Calls Anthropic to create a summary from a raw transcript string.
 * This mirrors the production-ready single-call injection pattern.
 */
export async function createSummaryFromTranscript(
  transcript: string,
  options: CreateSummaryOptions = {}
): Promise<string> {
  const messages = buildSummaryMessages(transcript);

  if (options.additionalMessages && options.additionalMessages.length > 0) {
    messages.push(...options.additionalMessages);
  }

  return callClaudeMultiMessage(
    SUMMARY_MODEL,
    options.systemPrompt ?? SUMMARY_SYSTEM_PROMPT,
    messages,
    {
      maxTokens: options.maxTokens ?? SUMMARY_MAX_MODEL_TOKENS,
      temperature: 1,
      thinking: options.thinkingEnabled ?? true,
      thinkingBudget: SUMMARY_MAX_MODEL_TOKENS - 1000,
    }
  );
}

/**
 * Convenience helper that fetches the transcript first, then calls the summary worker.
 * Allows dependency injection of the transcript fetcher for tests or alternate storage backends.
 */
export async function createSummary(
  interviewId: string,
  fetcher: TranscriptFetcher = defaultTranscriptFetcher,
  options: CreateSummaryOptions = {}
): Promise<string> {
  const transcript = await fetcher(interviewId);
  return createSummaryFromTranscript(transcript, options);
}
