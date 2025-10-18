export interface SummaryOutput {
  summary: {
    bullets: string[];
    tone: "neutral";
    confidence: number;
  };
}

export type InsightType = "pain" | "need" | "motivation";

export interface InsightsOutput {
  insights: {
    title: string;
    type: InsightType;
    quotes: {
      text: string;
      start_sec: number | null;
    }[];
    evidence_level: "low" | "med" | "high";
  }[];
  confidence: number;
}

export interface AlignmentOutput {
  alignment: {
    supports: {
      insight_title: string;
      quote: string;
      rationale: string;
    }[];
    contradicts: {
      insight_title: string;
      quote: string;
      rationale: string;
    }[];
    neutral: {
      insight_title: string;
      rationale: string;
    }[];
  };
}

export type BookReference =
  | "Talking to Humans"
  | "The Mom Test"
  | "Lean Customer Development"
  | "The Lean Startup";

export type HighlightReason =
  | "hypothetical"
  | "leading"
  | "pitching"
  | "past-behavior-good"
  | "missed-probe"
  | "too-broad"
  | "segment-mismatch"
  | "no-evidence-ask";

export type QuestionStyle = "past-behavior";

export type QuestionWhy =
  | "TH: story depth"
  | "LCD: frequency/workflow/alternative"
  | "TMT: past-behavior";

export interface CoachingOutput {
  highlights: {
    span_text: string;
    reason: HighlightReason;
    book: BookReference;
    suggestion: string;
    start_char: number;
    end_char: number;
  }[];
  advice: {
    book: BookReference;
    what_to_improve: string;
    example_rewrite: string;
  }[];
}

export interface BetterQuestionsOutput {
  questions: {
    text: string;
    linked_to: string;
    why: QuestionWhy;
    style: QuestionStyle;
  }[];
}

export interface FollowUpEmailOutput {
  subject: string;
  body: string;
}
