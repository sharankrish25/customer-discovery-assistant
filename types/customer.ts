export interface CustomerProfile {
  id: string;
  name: string;
  stakeholderType?: string;
  role?: string;
  demographics?: string;
  interviews: InterviewRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface InterviewRecord {
  id: string;
  customerId: string;
  productIdea: string;
  transcript: string;
  date: string;
  results: {
    summary: {
      bullets: string[];
      confidence?: number;
    };
    insights: {
      items: Array<{
        title: string;
        type: string;
        quotes: string[];
        evidence: "low" | "med" | "high";
      }>;
      confidence?: number;
    };
    alignment: {
      supports: string[];
      contradicts: string[];
      neutral: string[];
      confidence?: number;
    };
  };
}
