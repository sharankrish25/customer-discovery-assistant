import { callClaude, truncateForLLM } from './anthropic';

// ============================================================================
// Constants
// ============================================================================

// Using Claude Sonnet 4.5 for speaker identification
const MODEL = 'claude-sonnet-4-20250514';

// Note: temperature must be 1 when extended thinking is enabled
const AGENT_CONFIG = {
  maxTokens: 4096, // Longer output for annotated transcripts
  temperature: 1, // Required for extended thinking mode
};

// ============================================================================
// Types
// ============================================================================

export interface AnnotatedTranscript {
  annotated: string; // The transcript with speaker labels
  confidence: number; // Confidence in the speaker identification (0-1)
  speakers: {
    interviewer: number; // Number of interviewer lines
    stakeholder: number; // Number of stakeholder lines
  };
}

// ============================================================================
// Speaker Identification Agent
// ============================================================================

/**
 * Identifies and annotates speakers in a raw interview transcript.
 * Uses Claude Sonnet 4.5 to parse when the interviewer vs stakeholder is speaking.
 *
 * @param transcript - The raw, unlabeled interview transcript
 * @returns Annotated transcript with speaker labels
 *
 * @example
 * const result = await identifySpeakers("So tell me about the last time you... Well I was...");
 * console.log(result.annotated);
 * // Output:
 * // Interviewer: So tell me about the last time you...
 * // Stakeholder: Well I was...
 */
export async function identifySpeakers(transcript: string): Promise<AnnotatedTranscript> {
  // Return simple fallback if no API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('No ANTHROPIC_API_KEY found, returning unannotated transcript');
    return {
      annotated: transcript,
      confidence: 0,
      speakers: {
        interviewer: 0,
        stakeholder: 0,
      },
    };
  }

  const system = `You should look through the transcripts and try to parse when the interviewer is speaking and when the interviewee/stakeholder is speaking. Annotate the annotated transcript by seperating the transcript based on who is speaking in the format below. Determine this from changes in tone
Stakeholder: (statement)
Interviewer: (statement)
Stakeholder: (statement)
Interviewer: (statement)
Use these lessons to determine when a change in person speaking occurs in the transcript.
Look for explicit clues
Self-reference and mentions: Search the transcript for speakers referring to themselves by name or mentioning other participants by name.
Unique phrases or verbal tics: Pay attention to filler words, unique turns of phrase, or other speech patterns. For example, one person might consistently say "like" or "um" while another does not.
Analyze the flow of conversation
Question-and-answer pairs: In an interview, the question is likely from the interviewer and the subsequent answer from the interviewee. Following these pairs can help identify the speakers.
Topic shifts: Look for when a new person or topic is introduced. For example, "Speaking of the project, let's turn to Jane for an update.".`;

  const truncatedTranscript = truncateForLLM(transcript);

  const user = `TRANSCRIPT:
${truncatedTranscript}

TASK:
Annotate this interview transcript by identifying who is speaking at each turn. Format each line as:

Interviewer: [statement]
Stakeholder: [statement]

Use the following clues:
1. Question-and-answer patterns (questions usually come from the Interviewer)
2. Self-references and names mentioned
3. Changes in tone and speaking style
4. Unique verbal tics or filler words
5. Topic shifts and conversational flow

Return ONLY the annotated transcript with speaker labels. Do not include any additional commentary or explanation.`;

  try {
    const response = await callClaude(MODEL, system, user, AGENT_CONFIG);

    // Count speaker lines
    const lines = response.trim().split('\n');
    let interviewerCount = 0;
    let stakeholderCount = 0;

    for (const line of lines) {
      if (line.trim().startsWith('Interviewer:')) {
        interviewerCount++;
      } else if (line.trim().startsWith('Stakeholder:')) {
        stakeholderCount++;
      }
    }

    const totalLabeled = interviewerCount + stakeholderCount;
    const totalLines = lines.filter(l => l.trim()).length;

    // Calculate confidence based on how many lines were successfully labeled
    const confidence = totalLines > 0 ? Math.min(totalLabeled / totalLines, 1) : 0;

    return {
      annotated: response.trim(),
      confidence,
      speakers: {
        interviewer: interviewerCount,
        stakeholder: stakeholderCount,
      },
    };
  } catch (error) {
    throw new Error(
      `Failed to identify speakers: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Helper function to extract only stakeholder statements from an annotated transcript.
 * Useful for focusing analysis on customer responses only.
 *
 * @param annotatedTranscript - The annotated transcript with speaker labels
 * @returns Only the stakeholder's statements
 */
export function extractStakeholderStatements(annotatedTranscript: string): string {
  const lines = annotatedTranscript.split('\n');
  const stakeholderLines: string[] = [];

  for (const line of lines) {
    if (line.trim().startsWith('Stakeholder:')) {
      stakeholderLines.push(line.replace(/^Stakeholder:\s*/, '').trim());
    }
  }

  return stakeholderLines.join('\n');
}

/**
 * Helper function to extract only interviewer questions from an annotated transcript.
 * Useful for analyzing interview quality and coaching.
 *
 * @param annotatedTranscript - The annotated transcript with speaker labels
 * @returns Only the interviewer's questions/statements
 */
export function extractInterviewerQuestions(annotatedTranscript: string): string {
  const lines = annotatedTranscript.split('\n');
  const interviewerLines: string[] = [];

  for (const line of lines) {
    if (line.trim().startsWith('Interviewer:')) {
      interviewerLines.push(line.replace(/^Interviewer:\s*/, '').trim());
    }
  }

  return interviewerLines.join('\n');
}
