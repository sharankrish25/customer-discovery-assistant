import { NextRequest, NextResponse } from "next/server";
import { callClaude, loadPrompt, parseClaudeJSON } from "@/lib/anthropic";

interface EmailOutput {
  subject: string;
  body: string;
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerName,
      customerContext,
      conversationHighlights,
      productIdea,
      nextSteps,
      tone,
      includeFollowupQuestions,
    } = body;

    if (!customerName || typeof customerName !== "string") {
      return NextResponse.json(
        { error: "customerName is required and must be a string" },
        { status: 400 }
      );
    }

    if (!conversationHighlights || typeof conversationHighlights !== "string") {
      return NextResponse.json(
        { error: "conversationHighlights is required and must be a string" },
        { status: 400 }
      );
    }

    // Load the followup email prompt
    const systemPrompt = loadPrompt("followup-email");

    // Build user message with all context
    const userMessage = `
Generate a follow-up email with these details:

Customer Name: ${customerName}
${customerContext ? `Customer Context: ${customerContext}` : ""}

Conversation Highlights:
${conversationHighlights}

${productIdea ? `Your Product Idea: ${productIdea}` : ""}

${nextSteps ? `Desired Next Steps: ${nextSteps}` : "Next Steps: Just thank them, no specific ask."}

Tone: ${tone || "friendly"}

Include follow-up questions request: ${includeFollowupQuestions ? "Yes" : "No"}

Generate the email now.
`.trim();

    // Call Claude
    const response = await callClaude(systemPrompt, userMessage);

    // Parse JSON response
    const email = parseClaudeJSON<EmailOutput>(response);

    // Validate structure
    if (!email.subject || !email.body) {
      throw new Error("Invalid email output structure - missing subject or body");
    }

    return NextResponse.json({
      ok: true,
      data: email,
    });
  } catch (error) {
    console.error("Followup email API error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to generate follow-up email";

    return NextResponse.json(
      {
        ok: false,
        error: { message },
      },
      { status: 500 }
    );
  }
}
