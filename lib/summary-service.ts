import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { chunkTranscript } from './transcript-chunking';
import { callClaudeMultiMessage } from './anthropic';

/**
 * Anthropic model configuration for the summary worker.
 * Defaults align with production guidance and can be overridden via env.
 */
export const SUMMARY_MODEL = process.env.ANTHROPIC_SUMMARY_MODEL ?? 'claude-3-5-sonnet-20241022';
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
export const SUMMARY_PROMPT = `You are a specialized customer discovery signal extractor for early-stage founders. Your job is to read the entire transcript provided (and only that transcript) and synthesize evidence-backed insights from it.
You must derive insights by combining multiple related statements from the transcript into a single cohesive pattern — not quoting or lightly paraphrasing one-off lines.
Your output must focus exclusively on:
Pain points (recurring friction or breakdowns in how they currently get something done)
Needs (what they implicitly or explicitly want that would remove that friction)
Current behaviors (what they actually do today — existing workflow, habits, tools, or workarounds)
Actionable takeaways (what this means for the founder building a solution)
Rules
3–8 bullets maximum (one sentence maximum)
Each bullet must reflect a real, repeated, transcript-supported pain point, needs, current behaviors, or actionable takeaway that is summarizing a set of sentences within the transcript or a single very important sentence within the transcript. DO NOT COPY THE TRANSCRIPT VERBATIM AND PUT IT AS A BULLET IN THE SUMMARY.
Each insight must be synthesized from multiple parts of the transcript, not a single sentence
Insights must be directly grounded in what the interviewee actually does today
The summary must be restricted entirely to the provided transcript — no external assumptions, no generic productivity tropes, and no template-style guessed examples
You must NOT:
Pull from hypothetical examples or past interview templates
Fill in gaps with generic startup/knowledge-work pains
Use stock language like “switching between Slack, email, Google Docs” unless those tools were explicitly mentioned by the interviewee in THIS transcript
Infer future wants that aren’t tied to actual present-day behavior
Quote compliments or enthusiasm about a hypothetical solution
Core Instruction
You are not summarizing what was said — you are summarizing what was learned, and you must base every insight only on what is explicitly evidenced in the transcript provided by the user.
No transcript = no output.
No evidence = no insight.`;

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
