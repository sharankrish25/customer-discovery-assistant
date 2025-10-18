'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Summary } from '@/components/Panels/Summary';
import { Insights } from '@/components/Panels/Insights';
import { Alignment } from '@/components/Panels/Alignment';
import { OptionalActions } from '@/components/OptionalActions';
import { TranscriptCoachView } from '@/components/TranscriptCoachView';
import { BetterQuestions } from '@/components/BetterQuestions';
import { FollowupEmail } from '@/components/FollowupEmail';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SummaryOutput as SummaryOutputSimplified, InsightItem, AlignmentOutput as AlignmentOutputSimplified } from '@/lib/types';
import type { CoachingOutput, BetterQuestionsOutput, FollowUpEmailOutput } from '@/types/ai';
import { useStore } from '@/lib/store';

export default function InterviewDetailPage() {
  const params = useParams();
  const interviewId = params.id as string;

  const [showCoaching, setShowCoaching] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [showEmail, setShowEmail] = useState(false);

  // Get interview and customer from Zustand store
  const interviewData = useStore((state) => state.getInterview(interviewId));
  const updateInterview = useStore((state) => state.updateInterview);
  const customer = useStore((state) =>
    interviewData ? state.getCustomerById(interviewData.customerId) : null
  );

  const handleCoachingLoaded = (coaching: CoachingOutput) => {
    updateInterview(interviewId, { coaching });
    setShowCoaching(true);
  };

  const handleQuestionsLoaded = (betterQuestions: BetterQuestionsOutput) => {
    updateInterview(interviewId, { betterQuestions });
    setShowQuestions(true);
  };

  const handleEmailLoaded = (followUpEmail: FollowUpEmailOutput) => {
    updateInterview(interviewId, { followUpEmail });
    setShowEmail(true);
  };

  // Convert Interview to format expected by UI components
  const interview = interviewData && interviewData.summary && interviewData.insights && interviewData.alignment
    ? {
        id: interviewData.id,
        customerId: interviewData.customerId,
        productIdea: interviewData.productIdea,
        transcript: interviewData.transcript,
        uploadedAt: interviewData.uploadedAt,
        summary: ({ bullets: interviewData.summary.summary.bullets } as SummaryOutputSimplified),
        insights: (interviewData.insights.insights.map((item) => ({
          insight: item.title,
          supportingQuote: item.quotes[0]?.text || '',
        })) as InsightItem[]),
        alignment: ({
          supports: interviewData.alignment.alignment.supports.map(s => s.insight_title),
          contradicts: interviewData.alignment.alignment.contradicts.map(c => c.insight_title),
          neutral: interviewData.alignment.alignment.neutral.map(n => n.insight_title),
        } as AlignmentOutputSimplified),
      }
    : null;

  if (!interview) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">Interview not found</p>
          <Link href="/dashboard" className="mt-4 inline-block text-primary hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <Link
            href={`/customer/${interview.customerId}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Back to {customer?.name || 'Customer Profile'}
          </Link>
        </div>
        <h1 className="mb-2 text-3xl font-bold">Interview Detail</h1>
        <p className="text-sm text-muted-foreground">
          Uploaded: {new Date(interview.uploadedAt).toLocaleString()}
        </p>
        <div className="mt-4 rounded-lg bg-muted p-4">
          <p className="text-sm font-semibold">Vision being tested:</p>
          <p className="mt-1">{interview.productIdea}</p>
        </div>
      </div>

      {/* Analysis Panels (3 automatic agents) */}
      <div className="mb-8 space-y-6">
        <h2 className="text-2xl font-semibold">Analysis</h2>
        <div className="grid gap-6 lg:grid-cols-3">
          <Summary summary={interview.summary} />
          <Insights insights={interview.insights} />
          <Alignment alignment={interview.alignment} />
        </div>
      </div>

      {/* Optional Actions */}
      <div className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">Optional Actions</h2>
        <OptionalActions
          interviewId={interviewId}
          transcript={interviewData?.transcript || ''}
          alignment={interviewData?.alignment || null}
          insights={interviewData?.insights || null}
          coaching={interviewData?.coaching || null}
          customerName={customer?.name || ''}
          hasCoaching={!!interviewData?.coaching}
          hasQuestions={!!interviewData?.betterQuestions}
          hasEmail={!!interviewData?.followUpEmail}
          onCoachingLoaded={handleCoachingLoaded}
          onQuestionsLoaded={handleQuestionsLoaded}
          onEmailLoaded={handleEmailLoaded}
        />
      </div>

      {/* Optional Results */}
      {showCoaching && interviewData?.coaching && (
        <div className="mb-8">
          <TranscriptCoachView transcript={interviewData.transcript} coaching={interviewData.coaching} />
        </div>
      )}

      {showQuestions && interviewData?.betterQuestions && (
        <div className="mb-8">
          <BetterQuestions data={interviewData.betterQuestions} />
        </div>
      )}

      {showEmail && interviewData?.followUpEmail && (
        <div className="mb-8">
          <FollowupEmail
            data={interviewData.followUpEmail}
            onRegenerate={async (commitment) => {
              const response = await fetch('/api/followup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  interviewId,
                  desiredCommitment: commitment,
                  insights: interviewData.insights,
                  customerName: customer?.name || '',
                }),
              });
              const result = await response.json();
              if (result.ok) handleEmailLoaded(result.data.followUpEmail);
            }}
          />
        </div>
      )}

      {/* Transcript Section */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Transcript</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto rounded-md bg-muted p-4">
              <pre className="whitespace-pre-wrap font-sans text-sm">
                {interview.transcript}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
