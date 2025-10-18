import { NextRequest, NextResponse } from "next/server";
import { callClaude, loadPrompt } from "@/lib/anthropic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerName, customerEmail, productIdea, transcript } = body;

    if (!customerName || !productIdea || !transcript) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERR", message: "Missing required fields" } },
        { status: 400 }
      );
    }

    // Extract key insights from transcript for context
    const conversationHighlights = extractKeyInsights(transcript);
    
    const system = loadPrompt('followup-email');
    const user = `Generate a follow-up email with these details:

CUSTOMER NAME: ${customerName}
CUSTOMER EMAIL: ${customerEmail || 'Not provided'}
PRODUCT IDEA: ${productIdea}
CONVERSATION HIGHLIGHTS: ${conversationHighlights}

Generate a professional follow-up email that thanks them for their time and demonstrates you were listening.`;

    try {
      const response = await callClaude(system, user, {
        model: 'claude-3-5-sonnet-20241022',
        maxTokens: 1000,
        temperature: 0.3,
      });

      const parsed = JSON.parse(response);
      
      return NextResponse.json({
        ok: true,
        data: {
          email: parsed,
        },
      });
    } catch (error) {
      console.error("Follow-up email generation error:", error);
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "AI_ERR",
            message: "Failed to generate follow-up email",
          },
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("Follow-up route error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "SERVER_ERR",
          message: "Failed to generate follow-up email",
        },
      },
      { status: 500 }
    );
  }
}

function extractKeyInsights(transcript: string): string {
  // Simple extraction of key insights - in a real implementation, 
  // this could use the insights agent or more sophisticated NLP
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const keySentences = sentences.slice(0, 3).map(s => s.trim());
  return keySentences.join('. ') + '.';
}