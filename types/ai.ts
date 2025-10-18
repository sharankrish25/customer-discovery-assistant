export interface SummaryOutput {
  summary: {
    bullets: string[];
    tone: "neutral";
    confidence: number;
  };
}

export type InsightType = "existing_process" | "motivation" | "unmet_need" | "pain_magnitude" | "past_attempt";

export interface InsightsOutput {
  insights: {
    title: string;
    type: InsightType;
    quotes: {
      text: string;
      start_sec: number | null;
    }[];
    why_it_matters: string;
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

export type CoachingBook =
  | "Talking to Humans"
  | "The Mom Test"
  | "Lean Customer Development"
  | "The Lean Startup";

export type CoachingReason =
  | "hypothetical-question"
  | "leading-question"
  | "pitching-solution"
  | "past-behavior-good"
  | "missed-probe"
  | "too-broad"
  | "segment-mismatch"
  | "no-evidence-ask"
  | "seeking-compliment"
  | "request-for-opinion"
  | "fluff-generic-claim"
  | "fluff-future-tense"
  | "fluff-hypothetical";

export interface CoachingHighlight {
  span_text: string;
  reason: CoachingReason;
  book: CoachingBook;
  suggestion: string;
  start_char: number;
  end_char: number;
}

export interface CoachingAdvice {
  book: CoachingBook;
  what_to_improve: string;
  example_rewrite: string;
}

export interface CoachingOutput {
  highlights: CoachingHighlight[];
  advice: CoachingAdvice[];
}

export interface BetterQuestion {
  text: string;
  linked_to: string; // insight_title | gap
  why: string; // Accept any string for flexibility
  style: string; // Accept any string for flexibility
}

export interface BetterQuestionsOutput {
  questions: BetterQuestion[];
}

export interface FollowUpEmailOutput {
  subject: string;
  body: string;
  raw_markdown?: string; // Markdown version of the email
}
