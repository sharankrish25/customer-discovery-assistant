export interface Interview {
  id: string;
  customerId: string;
  uploadedAt: Date;
  transcript: string;
  productIdea: string;
  analysis: string | null;
  analysisStatus: "pending" | "processing" | "complete" | "error";
  error?: string;
  // Agent outputs
  summary?: {
    bullets: string[];
    tone: 'neutral';
    confidence: number;
  };
  insights?: {
    insights: Array<{
      title: string;
      type: 'existing_process' | 'motivation' | 'unmet_need' | 'pain_magnitude' | 'past_attempt';
      quotes: Array<{
        text: string;
        start_sec: number | null;
      }>;
      why_it_matters: string;
      evidence_level: 'low' | 'med' | 'high';
    }>;
    confidence: number;
  };
  alignment?: {
    alignment: {
      supports: Array<{
        insight_title: string;
        quote: string;
        rationale: string;
      }>;
      contradicts: Array<{
        insight_title: string;
        quote: string;
        rationale: string;
      }>;
      neutral: Array<{
        insight_title: string;
        quote: string;
        rationale: string;
      }>;
    };
    confidence: number;
  };
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

export type Customer = CustomerProfile;
