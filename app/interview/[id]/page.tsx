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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import type { SummaryOutput as SummaryOutputSimplified, InsightItem, AlignmentOutput as AlignmentOutputSimplified } from '@/lib/types';
import type { CoachingOutput, BetterQuestionsOutput, FollowUpEmailOutput } from '@/types/ai';
import { useStore } from '@/lib/store';

export default function InterviewDetailPage() {
  const params = useParams();
  const interviewId = params.id as string;

  const [activeTab, setActiveTab] = useState('transcript');

  // Get interview and customer from Zustand store
  const interviewData = useStore((state) => state.getInterview(interviewId));
  const customer = useStore((state) =>
    interviewData ? state.getCustomerById(interviewData.customerId) : null
  );

  // Optional agents handlers (currently disabled for storage-based version)
  const handleCoachingLoaded = (coaching: CoachingOutput) => {
    // TODO: Save to localStorage when optional agents are enabled
    setActiveTab('coaching');
  };

  const handleQuestionsLoaded = (betterQuestions: BetterQuestionsOutput) => {
    // TODO: Save to localStorage when optional agents are enabled
    setActiveTab('questions');
  };

  const handleEmailLoaded = (followUpEmail: FollowUpEmailOutput) => {
    // TODO: Save to localStorage when optional agents are enabled
    setActiveTab('email');
  };

  const handleEmailRegenerate = async (desiredCommitment: string) => {
    try {
      const response = await fetch('/api/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId, desiredCommitment }),
      });

      if (!response.ok) throw new Error('Failed to regenerate');

      const result = await response.json();
      handleEmailLoaded(result.followUpEmail);
    } catch (error) {
      console.error('Regeneration error:', error);
    }
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
          hasCoaching={false}
          hasQuestions={false}
          hasEmail={false}
          onCoachingLoaded={handleCoachingLoaded}
          onQuestionsLoaded={handleQuestionsLoaded}
          onEmailLoaded={handleEmailLoaded}
        />
      </div>

      {/* Tabs for Optional Outputs */}
      <div className="mb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
            <TabsTrigger value="coaching">Coaching</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="email">Follow-up</TabsTrigger>
          </TabsList>

          <TabsContent value="transcript" className="mt-6">
            <Card className="p-6">
              <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                {interview.transcript}
              </pre>
            </Card>
          </TabsContent>

          <TabsContent value="coaching" className="mt-6">
            <TranscriptCoachView
              transcript={interview.transcript}
              coaching={null}
            />
          </TabsContent>

          <TabsContent value="questions" className="mt-6">
            <BetterQuestions data={null} />
          </TabsContent>

          <TabsContent value="email" className="mt-6">
            <FollowupEmail
              data={null}
              onRegenerate={handleEmailRegenerate}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
