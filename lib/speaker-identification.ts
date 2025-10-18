import { callClaude } from "./ai";

export interface AnnotatedTranscript {
  annotated: string;
  confidence: number;
  speakers: {
    interviewer: number;
    stakeholder: number;
  };
}

const MAX_TRANSCRIPT_CHARS = 15000;

function truncateTranscript(transcript: string): string {
  if (transcript.length <= MAX_TRANSCRIPT_CHARS) {
    return transcript;
  }

  return `${transcript.slice(0, MAX_TRANSCRIPT_CHARS)}...`;
}

function buildSpeakerPrompt(transcript: string): string {
  const trimmed = truncateTranscript(transcript);

  return `You are labelling an interview transcript. For each line determine whether the Interviewer or Stakeholder is speaking.\nReturn only the annotated transcript with each line prefixed by "Interviewer:" or "Stakeholder:". Do not add commentary.\n\nTranscript:\n"""\n${trimmed}\n"""`;
}

export async function identifySpeakers(transcript: string): Promise<AnnotatedTranscript> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("No ANTHROPIC_API_KEY found, returning unannotated transcript");
    return {
      annotated: transcript,
      confidence: 0,
      speakers: {
        interviewer: 0,
        stakeholder: 0,
      },
    };
  }

  const prompt = buildSpeakerPrompt(transcript);
  const response = await callClaude(prompt);

  const lines = response.trim().split("\n");
  let interviewerCount = 0;
  let stakeholderCount = 0;

  for (const line of lines) {
    if (line.trim().startsWith("Interviewer:")) {
      interviewerCount += 1;
    } else if (line.trim().startsWith("Stakeholder:")) {
      stakeholderCount += 1;
    }
  }

  const totalLabeled = interviewerCount + stakeholderCount;
  const totalLines = lines.filter((line) => line.trim().length > 0).length;
  const confidence = totalLines > 0 ? Math.min(totalLabeled / totalLines, 1) : 0;

  return {
    annotated: response.trim(),
    confidence,
    speakers: {
      interviewer: interviewerCount,
      stakeholder: stakeholderCount,
    },
  };
}

export function extractStakeholderStatements(annotatedTranscript: string): string {
  const lines = annotatedTranscript.split("\n");
  const stakeholderLines: string[] = [];

  for (const line of lines) {
    if (line.trim().startsWith("Stakeholder:")) {
      stakeholderLines.push(line.replace(/^Stakeholder:\s*/, "").trim());
    }
  }

  return stakeholderLines.join("\n");
}

export function extractInterviewerQuestions(annotatedTranscript: string): string {
  const lines = annotatedTranscript.split("\n");
  const interviewerLines: string[] = [];

  for (const line of lines) {
    if (line.trim().startsWith("Interviewer:")) {
      interviewerLines.push(line.replace(/^Interviewer:\s*/, "").trim());
    }
  }

  return interviewerLines.join("\n");
}
