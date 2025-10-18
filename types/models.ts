import type {
  SummaryOutput,
  InsightsOutput,
  AlignmentOutput,
  CoachingOutput,
  BetterQuestionsOutput,
  FollowUpEmailOutput,
} from "./ai";

export interface Interview {
  id: string;
  customerId: string;
  uploadedAt: Date;
  transcript: string;
  productIdea: string;
  summary: SummaryOutput | null;
  insights: InsightsOutput | null;
  alignment: AlignmentOutput | null;
  coaching: CoachingOutput | null;
  betterQuestions: BetterQuestionsOutput | null;
  followUpEmail: FollowUpEmailOutput | null;
  analysisStatus: "pending" | "processing" | "complete" | "error";
  error?: string;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email?: string;
  stakeholderType?: string;
  demographics?: string;
  createdAt: Date;
  updatedAt: Date;
  interviews: Interview[];
}
