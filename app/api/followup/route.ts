import { NextRequest, NextResponse } from "next/server";
import { useStore } from "@/lib/store";
import { generateFollowupMock } from "@/lib/anthropic-legacy";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { interviewId } = body;

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

    // Get customer name
    const customers = useStore.getState().customers;
    const customer = customers.find((c) => c.id === interview.customerId);

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Call mock follow-up email generation
    const followUpEmail = await generateFollowupMock(
      customer.name,
      interview.transcript,
      interview.insights
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
