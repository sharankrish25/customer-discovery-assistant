import type {
  SummaryOutput,
  InsightsOutput,
  AlignmentOutput,
  CoachingOutput,
  BetterQuestionsOutput,
  FollowUpEmailOutput,
} from "@/types/ai";

/**
 * Mock implementation of Anthropic API client
 * Returns deterministic mock data shaped according to AI interfaces
 * No real API calls are made
 */

export async function analyzeInterviewMock(
  productIdea: string,
  transcript: string
): Promise<{
  summary: SummaryOutput;
  insights: InsightsOutput;
  alignment: AlignmentOutput;
}> {
  // Simulate API latency
  await new Promise((resolve) => setTimeout(resolve, 500));

  const summary: SummaryOutput = {
    summary: {
      bullets: [
        "Customer manually consolidates feedback from multiple channels (Slack, email, support tickets), spending 3-4 hours weekly",
        "Struggles with accurate prioritization due to fragmented data and inability to quantify customer demand",
        "Feels frustrated and ineffective despite significant effort invested in the process",
        "Desires an automated solution with AI-powered categorization and trend analysis",
      ],
      tone: "neutral",
      confidence: 0.87,
    },
  };

  const insights: InsightsOutput = {
    insights: [
      {
        title: "Time-consuming manual aggregation process",
        type: "pain",
        quotes: [
          {
            text: "I spend probably 3-4 hours a week just trying to consolidate it all into a spreadsheet",
            start_sec: 45,
          },
          {
            text: "Last month we were deciding between two features. I had to go through literally hundreds of messages across different channels",
            start_sec: 78,
          },
        ],
        evidence_level: "high",
      },
      {
        title: "Inability to quantify customer demand accurately",
        type: "pain",
        quotes: [
          {
            text: 'The CEO asked me "how many customers asked for X" and I genuinely didn\'t know the exact number',
            start_sec: 102,
          },
        ],
        evidence_level: "high",
      },
      {
        title: "Emotional impact of inadequate tools",
        type: "motivation",
        quotes: [
          {
            text: "Like I'm not doing my job well, even though I'm working really hard at it",
            start_sec: 125,
          },
        ],
        evidence_level: "med",
      },
      {
        title: "Need for automation and AI-powered insights",
        type: "need",
        quotes: [
          {
            text: "ideally it would just automatically gather everything and categorize it. Show me trends, maybe use AI or something",
            start_sec: 148,
          },
        ],
        evidence_level: "low",
      },
    ],
    confidence: 0.82,
  };

  const alignment: AlignmentOutput = {
    alignment: {
      supports: [
        {
          insight_title: "Time-consuming manual aggregation process",
          quote:
            "I spend probably 3-4 hours a week just trying to consolidate it all into a spreadsheet",
          rationale:
            "Product idea (AI-powered aggregator) directly addresses the manual consolidation pain point with automation",
        },
        {
          insight_title: "Need for automation and AI-powered insights",
          quote:
            "ideally it would just automatically gather everything and categorize it. Show me trends, maybe use AI or something",
          rationale:
            "Customer explicitly requests automation and AI features, which align with the product concept",
        },
      ],
      contradicts: [],
      neutral: [
        {
          insight_title: "Emotional impact of inadequate tools",
          rationale:
            "While this insight shows motivation to solve the problem, it doesn't directly validate or invalidate the specific product approach",
        },
      ],
    },
  };

  return { summary, insights, alignment };
}

export async function coachInterviewMock(
  transcript: string
): Promise<CoachingOutput> {
  await new Promise((resolve) => setTimeout(resolve, 400));

  return {
    highlights: [
      {
        span_text: "How did that make you feel?",
        reason: "too-broad",
        book: "The Mom Test",
        suggestion:
          'Instead of asking about feelings, ask about specific actions: "What did you do next?" or "How did this impact your prioritization process?"',
        start_char: 542,
        end_char: 568,
      },
      {
        span_text: "If you had a tool that could solve this, what would it look like?",
        reason: "hypothetical",
        book: "The Mom Test",
        suggestion:
          'Focus on past behavior instead: "Walk me through the last time you tried to solve this problem. What tools or solutions did you try?"',
        start_char: 612,
        end_char: 678,
      },
      {
        span_text:
          "Last month we were deciding between two features. I had to go through literally hundreds of messages",
        reason: "past-behavior-good",
        book: "Talking to Humans",
        suggestion:
          "Great! This is a concrete example of past behavior. Consider following up with: 'How did you decide which messages were important?'",
        start_char: 285,
        end_char: 387,
      },
    ],
    advice: [
      {
        book: "The Mom Test",
        what_to_improve:
          "Avoid hypothetical questions about potential solutions. Focus on past behavior and specific examples.",
        example_rewrite:
          'Instead of "If you had a tool...", ask "What tools have you tried to solve this problem? What happened when you used them?"',
      },
      {
        book: "Talking to Humans",
        what_to_improve:
          "When you get a good past-behavior story, dig deeper into the workflow and decision-making process.",
        example_rewrite:
          'Follow up with: "Walk me through each step of that process. Where did it break down? What took the most time?"',
      },
    ],
  };
}

export async function generateQuestionsMock(
  productIdea: string,
  transcript: string,
  insights: InsightsOutput
): Promise<BetterQuestionsOutput> {
  await new Promise((resolve) => setTimeout(resolve, 350));

  return {
    questions: [
      {
        text: "Walk me through the last time you had to consolidate feedback for a prioritization decision. What was each step?",
        linked_to: "Time-consuming manual aggregation process",
        why: "LCD: frequency/workflow/alternative",
        style: "past-behavior",
      },
      {
        text: "What other tools or methods have you tried to solve the feedback consolidation problem? What happened with each one?",
        linked_to: "Time-consuming manual aggregation process",
        why: "LCD: frequency/workflow/alternative",
        style: "past-behavior",
      },
      {
        text: "Tell me about the conversation with your CEO when you couldn't answer how many customers wanted feature X. What happened next?",
        linked_to: "Inability to quantify customer demand accurately",
        why: "TH: story depth",
        style: "past-behavior",
      },
      {
        text: "How often do you need to answer questions about customer demand volume? What's your current workaround?",
        linked_to: "Inability to quantify customer demand accurately",
        why: "LCD: frequency/workflow/alternative",
        style: "past-behavior",
      },
      {
        text: "Describe your workflow for creating the feedback spreadsheet. Which steps take the longest?",
        linked_to: "Time-consuming manual aggregation process",
        why: "LCD: frequency/workflow/alternative",
        style: "past-behavior",
      },
    ],
  };
}

export async function generateFollowupMock(
  customerName: string,
  transcript: string,
  insights: InsightsOutput
): Promise<FollowUpEmailOutput> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  return {
    subject: "Following up on our conversation about product feedback consolidation",
    body: `Hi ${customerName},

Thank you for taking the time to speak with me yesterday about your product feedback process. I really appreciated your candor about the challenges you're facing.

I was particularly struck by your example of spending hours consolidating feedback across Slack, email, and support tickets for prioritization decisions, and how you couldn't give your CEO an accurate count of customer requests.

A few quick follow-up questions:

1. You mentioned trying to consolidate feedback into a spreadsheet - are there any other tools or methods you've experimented with? What happened with those?

2. When you had to go through hundreds of messages for that feature prioritization decision, roughly how long did that take? Did you have to do it in one sitting, or spread it out?

3. How often does your CEO or other stakeholders ask you for quantified customer demand data?

No pressure to answer right away - whenever is convenient for you works.

Thanks again for your time and insights.

Best regards`,
  };
}
