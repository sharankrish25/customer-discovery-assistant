import type { FollowUpEmailOutput } from "@/types/ai";
import { callClaude } from "./ai";

interface EmailProfile {
  name: string;
  role?: string;
}

export interface EmailContext {
  profile?: EmailProfile;
  priorSummary?: string;
  insights: string[];
  tone: string;
  length: string;
  includePlaceholders: boolean;
}

interface EmailDraft {
  subject: string;
  body: string;
}

function describeProfile(profile?: EmailProfile): string {
  if (!profile) {
    return "[Name]";
  }

  return profile.role ? `${profile.name} (${profile.role})` : profile.name;
}

function buildGenerateEmailPrompt(
  specifications: string,
  context: EmailContext
): string {
  return `You craft concise follow-up emails after customer discovery calls.\nReturn ONLY JSON with keys subject, body, and optional raw_markdown.\n\nRequirements:\n- Tone: ${context.tone}.\n- Length: ${context.length}.\n- Include placeholders (${context.includePlaceholders ? "yes" : "no"}).\n- Address the customer using ${describeProfile(context.profile)}.\n- Incorporate these insights: ${context.insights.join("; ") || "None"}.\n- Prior summary: ${context.priorSummary || "None provided"}.\n- Specifications: ${specifications.trim()}\n\nRespond with:\n{\n  "subject": string,\n  "body": string,\n  "raw_markdown"?: string\n}\n\nTranscript snippets or extra commentary should not be included. Return JSON only.`;
}

function buildEditEmailPrompt(
  draft: EmailDraft,
  editInstructions: string,
  context: EmailContext
): string {
  return `You edit follow-up emails for startup founders.\nModify the existing draft based on the instructions and respond with JSON (subject, body, optional raw_markdown).\n\nCurrent draft:\nSubject: ${draft.subject}\nBody:\n${draft.body}\n\nInstructions: ${editInstructions.trim()}\n\nTone: ${context.tone}. Length: ${context.length}. Include placeholders: ${context.includePlaceholders ? "yes" : "no"}.\nCustomer profile: ${describeProfile(context.profile)}.\nPrior summary: ${context.priorSummary || "None"}.\nInsights: ${context.insights.join("; ") || "None"}.\n\nReturn ONLY JSON with keys subject, body, and optional raw_markdown.`;
}

async function parseEmailResponse(raw: string, context: "generate" | "edit"): Promise<FollowUpEmailOutput> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Claude response was not valid JSON for ${context} email: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error(`Claude response for ${context} email was empty`);
  }

  const result = parsed as FollowUpEmailOutput;
  if (!result.subject || !result.body) {
    throw new Error(`Claude response for ${context} email was missing subject or body`);
  }

  return result;
}

export async function generateEmail(
  specifications: string,
  context: EmailContext
): Promise<FollowUpEmailOutput> {
  const prompt = buildGenerateEmailPrompt(specifications, context);
  const raw = await callClaude(prompt);
  return parseEmailResponse(raw, "generate");
}

export async function editEmail(
  draft: EmailDraft,
  editInstructions: string,
  context: EmailContext
): Promise<FollowUpEmailOutput> {
  const prompt = buildEditEmailPrompt(draft, editInstructions, context);
  const raw = await callClaude(prompt);
  return parseEmailResponse(raw, "edit");
}
