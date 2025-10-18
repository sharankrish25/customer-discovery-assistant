// Core data models for the Customer Discovery Interview Assistant
// This file provides simplified types for UI components and re-exports from types/ directory

import type {
  SummaryOutput as SummaryOutputDetailed,
  InsightsOutput,
  AlignmentOutput as AlignmentOutputDetailed,
  CoachingOutput as CoachingOutputDetailed,
  BetterQuestionsOutput,
  FollowUpEmailOutput,
} from '@/types/ai';
import type { CustomerProfile, Interview as InterviewDetailed } from '@/types/models';

// Re-export Customer type (CustomerProfile from types/models.ts)
export type Customer = CustomerProfile;

// Simplified SummaryOutput for UI components
export interface SummaryOutput {
  bullets: string[];
}

// Simplified InsightItem for UI components
export interface InsightItem {
  insight: string;
  supportingQuote: string;
}

// Simplified AlignmentOutput for UI components
export interface AlignmentOutput {
  supports: string[];
  contradicts: string[];
  neutral: string[];
}

// Simplified CoachingOutput for UI components
export interface CoachingOutput {
  overallQuality: string;
  suggestions: string[];
}

// Simplified NextQuestionsOutput for UI components
export interface NextQuestionsOutput {
  questions: string[];
}

// Simplified FollowupOutput for UI components
export interface FollowupOutput {
  emailBody: string;
}

// Simplified Interview type for UI components
export interface Interview {
  id: string;
  customerId: string;
  productIdea: string;
  transcript: string;
  uploadedAt: Date;

  // Auto-generated outputs (from /api/analyze)
  summary: SummaryOutput | null;
  insights: InsightItem[] | null;
  alignment: AlignmentOutput | null;

  // Optional outputs (generated on demand)
  coaching: CoachingOutput | null;
  nextQuestions: NextQuestionsOutput | null;
  followup: FollowupOutput | null;
}

// Form data types
export interface NewInterviewFormData {
  name: string;
  stakeholderType: string;
  demographics: string;
  productIdea: string;
  transcript: string;
}

// API request/response types
export interface AnalyzeRequest {
  interviewId: string;
}

export interface AnalyzeResponse {
  summary: SummaryOutput;
  insights: InsightItem[];
  alignment: AlignmentOutput;
}

export interface CoachRequest {
  interviewId: string;
}

export interface CoachResponse {
  coaching: CoachingOutput;
}

export interface NextQuestionsRequest {
  interviewId: string;
}

export interface NextQuestionsResponse {
  nextQuestions: NextQuestionsOutput;
}

export interface FollowupRequest {
  interviewId: string;
}

export interface FollowupResponse {
  followup: FollowupOutput;
}

// Utility functions to convert from detailed types to simplified types
export function convertSummaryToSimplified(detailed: SummaryOutputDetailed): SummaryOutput {
  return {
    bullets: detailed.summary.bullets,
  };
}

export function convertInsightsToSimplified(detailed: InsightsOutput): InsightItem[] {
  return detailed.insights.map((insight) => ({
    insight: insight.title,
    supportingQuote: insight.quotes[0]?.text || '',
  }));
}

export function convertAlignmentToSimplified(detailed: AlignmentOutputDetailed): AlignmentOutput {
  return {
    supports: detailed.alignment.supports.map((s) => s.quote),
    contradicts: detailed.alignment.contradicts.map((c) => c.quote),
    neutral: detailed.alignment.neutral.map((n) => n.rationale),
  };
}
