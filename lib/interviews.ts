import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceSupabaseClient, isSupabaseConfigured } from './supabase';
import type { TranscriptFetcher } from './summary-service';

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

/**
 * Fetches the persisted interview transcript and metadata required for AI analysis.
 * Throws user-friendly errors when the record is missing or incomplete.
 */
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

/**
 * Transcript fetcher compatible with the summary service helper.
 */
export const supabaseTranscriptFetcher: TranscriptFetcher = async (interviewId: string) => {
  const record = await fetchInterviewForAnalysis(interviewId);
  return record.transcript;
};
