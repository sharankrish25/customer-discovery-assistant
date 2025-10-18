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
  analysis: string | null;
  analysisStatus: 'pending' | 'processing' | 'complete' | 'error';
  error?: string;
}
