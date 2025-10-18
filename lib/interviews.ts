import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceSupabaseClient, isSupabaseConfigured } from './supabase';

interface InterviewRow {
  id: string;
  transcript: string | null;
  product_idea: string | null;
  customer_id?: string | null;
}

export interface InterviewAnalysisRecord {
  interviewId: string;
  transcript: string;
  productIdea: string;
  customerId?: string;
}

function assertSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase service credentials are not configured.');
  }
  return getServiceSupabaseClient();
}

export async function fetchInterviewForAnalysis(interviewId: string): Promise<InterviewAnalysisRecord> {
  if (!interviewId || typeof interviewId !== 'string') {
    throw new Error('interviewId must be a non-empty string.');
  }

  const supabase = assertSupabaseClient();

  const { data, error } = await supabase
    .from('interviews')
    .select('id, transcript, product_idea, customer_id')
    .eq('id', interviewId)
    .maybeSingle<InterviewRow>();

  if (error) {
    throw new Error(`Unable to fetch interview ${interviewId}: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Interview ${interviewId} was not found in persistence.`);
  }

  const transcript = data.transcript?.trim();
  if (!transcript) {
    throw new Error(`Interview ${interviewId} has no stored transcript.`);
  }

  const productIdea = data.product_idea?.trim();
  if (!productIdea) {
    throw new Error(`Interview ${interviewId} is missing product idea context.`);
  }

  return {
    interviewId: data.id,
    transcript,
    productIdea,
    customerId: data.customer_id ?? undefined,
  };
}
