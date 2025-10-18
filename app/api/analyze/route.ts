import { NextRequest, NextResponse } from "next/server";
import { callClaude, DEFAULT_ANTHROPIC_MODEL } from "@/lib/anthropic";
import { normalizeAIError, isRateLimitError } from "@/lib/errors";

const SYSTEM_PROMPT = `You are an expert customer discovery analyst. Study the product vision and transcript to produce a single, cohesive analysis for founders. Focus on the most important pains, motivations, and evidence. Respond with plain text only.`;

function buildUserMessage(transcript: string, productIdea: string): string {
  return `Product idea:\n${productIdea}\n\nInterview transcript:\n${transcript}\n\nInstructions:\n- Write a concise, insight-rich analysis (3-5 sentences).\n- Highlight validated pains, motivations, and risks grounded in the interview.\n- Avoid bullet points, sections, or markdown.\n- Speak directly to the founder running the interview.`;
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "PARSE_ERR", message: "Invalid JSON in request body" },
      },
      { status: 400 }
    );
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERR",
          message: "Request body must be a JSON object",
        },
      },
      { status: 400 }
    );
  }

  const payload = body as {
    transcript?: unknown;
    productIdea?: unknown;
  };

  const transcript =
    typeof payload.transcript === "string" ? payload.transcript.trim() : "";
  const productIdea =
    typeof payload.productIdea === "string" ? payload.productIdea.trim() : "";

  if (!transcript) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "VALIDATION_ERR", message: "transcript is required and must be a non-empty string" },
      },
      { status: 400 }
    );
  }

  if (!productIdea) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "VALIDATION_ERR", message: "productIdea is required and must be a non-empty string" },
      },
      { status: 400 }
    );
  }

  try {
    const analysis = await callClaude(
      DEFAULT_ANTHROPIC_MODEL,
      SYSTEM_PROMPT,
      buildUserMessage(transcript, productIdea),
      { maxTokens: 900, temperature: 0.2 }
    );

    return NextResponse.json(
      {
        ok: true,
        data: {
          analysis: analysis.trim(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const normalized = normalizeAIError(error);
    const statusCode = isRateLimitError(normalized) ? 429 : 502;

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: normalized.code || "AI_ERR",
          message: normalized.message,
        },
      },
      { status: statusCode }
    );
  }
}
