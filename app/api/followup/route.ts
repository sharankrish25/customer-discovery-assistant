import { NextRequest, NextResponse } from "next/server";
import { useStore } from "@/lib/store";
import { generateEmail } from "@/lib/agents-advanced";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { interviewId, desiredCommitment, chosenInsightTitle } = body;

    if (!interviewId) {
      return NextResponse.json(
        { error: "interviewId is required" },
        { status: 400 }
      );
    }

    // Get interview from store
    const interview = useStore.getState().getInterview(interviewId);

    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    if (!interview.insights) {
      return NextResponse.json(
        { error: "Interview must be analyzed first (insights required)" },
        { status: 400 }
      );
    }

    // Get customer
    const customers = useStore.getState().customers;
    const customer = customers.find((c) => c.id === interview.customerId);

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Find the chosen insight or pick the first pain
    let chosenInsight = interview.insights.insights.find(
      (i) => i.title === chosenInsightTitle
    );

    if (!chosenInsight) {
      // Default to first pain if no specific insight chosen
      chosenInsight =
        interview.insights.insights.find((i) => i.type === "pain") ||
        interview.insights.insights[0];
    }

    if (!chosenInsight) {
      return NextResponse.json(
        { error: "No insights found to reference in email" },
        { status: 400 }
      );
    }

    // Pick the first quote from the chosen insight
    const quote = chosenInsight.quotes[0]?.text || "No specific quote available";

    // Generate follow-up email using advanced agent
    const followUpEmail = await generateEmail(
      {
        name: customer.name,
        role: customer.stakeholderType,
      },
      {
        title: chosenInsight.title,
        quote: quote,
      },
      desiredCommitment || "15m call"
    );

    // Update interview with follow-up email
    useStore.getState().updateInterview(interviewId, {
      followUpEmail,
    });

    return NextResponse.json({
      success: true,
      followUpEmail,
    });
  } catch (error) {
    console.error("Follow-up email generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate follow-up email",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
