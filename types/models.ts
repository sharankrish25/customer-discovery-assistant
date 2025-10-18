export interface Interview {
  id: string;
  customerId: string;
  uploadedAt: Date;
  transcript: string;
  productIdea: string;
  analysis: string | null;
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
