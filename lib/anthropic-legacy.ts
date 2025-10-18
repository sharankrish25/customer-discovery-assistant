/**
 * Legacy mock implementations for optional coaching/questions/followup features.
 * These are kept separate from the main agents.ts file which handles the 3 automatic agents.
 */

import type {
  CoachingOutput,
  BetterQuestionsOutput,
  FollowUpEmailOutput,
} from "@/types/ai";

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
        reason: "hypothetical-question",
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
  insights?: unknown
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
  insights?: unknown
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
