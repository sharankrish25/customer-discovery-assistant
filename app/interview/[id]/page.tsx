'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { Summary } from '@/components/Panels/Summary';
import { Insights } from '@/components/Panels/Insights';
import { Alignment } from '@/components/Panels/Alignment';
import { OptionalActions } from '@/components/OptionalActions';
import { TranscriptCoachView } from '@/components/TranscriptCoachView';
import { BetterQuestions } from '@/components/BetterQuestions';
import { FollowupEmail } from '@/components/FollowupEmail';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SummaryOutput, InsightItem, AlignmentOutput } from '@/lib/types';
import type {
  CoachingOutput,
  BetterQuestionsOutput,
  FollowUpEmailOutput,
} from '@/types/ai';

export default function InterviewDetailPage() {
  const params = useParams();
  const interviewId = params.id as string;
  const [activeTab, setActiveTab] = useState('transcript');

  const interviewDetailed = useStore((state) => state.getInterviewById(interviewId));
  const customer = useStore((state) =>
    interviewDetailed ? state.getCustomerById(interviewDetailed.customerId) : undefined
  );
  const updateInterview = useStore((state) => state.updateInterview);

  // Convert to simplified types for UI components
  const interview = interviewDetailed
    ? {
        ...interviewDetailed,
        summary: interviewDetailed.summary
          ? ({ bullets: interviewDetailed.summary.summary.bullets } as SummaryOutput)
          : null,
        insights: interviewDetailed.insights
          ? (interviewDetailed.insights.insights.map((insight) => ({
              insight: insight.title,
              supportingQuote: insight.quotes[0]?.text || '',
            })) as InsightItem[])
          : null,
        alignment: interviewDetailed.alignment
          ? ({
              supports: interviewDetailed.alignment.alignment.supports.map((s) => s.quote),
              contradicts: interviewDetailed.alignment.alignment.contradicts.map((c) => c.quote),
              neutral: interviewDetailed.alignment.alignment.neutral.map((n) => n.rationale),
            } as AlignmentOutput)
          : null,
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

  const handleCoachingLoaded = (data: CoachingOutput) => {
    updateInterview(interviewId, { coaching: data });
    setActiveTab('coaching');
  };

  const handleQuestionsLoaded = (data: BetterQuestionsOutput) => {
    updateInterview(interviewId, { betterQuestions: data });
    setActiveTab('questions');
  };

  const handleEmailLoaded = (data: FollowUpEmailOutput) => {
    updateInterview(interviewId, { followUpEmail: data });
    setActiveTab('email');
  };

  const handleEmailRegenerate = async (desiredCommitment: string) => {
    // Call the API with the new commitment
    try {
      const response = await fetch('/api/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId, desiredCommitment }),
      });

      if (response.ok) {
        const data = await response.json();
        updateInterview(interviewId, { followUpEmail: data.followUpEmail });
      }
    } catch (error) {
      console.error('Failed to regenerate email:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <Link
            href={`/profile/${interview.customerId}`}
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

      {/* Analysis Panels */}
      <div className="mb-8 space-y-6">
        <h2 className="text-2xl font-semibold">Auto-Analysis</h2>
        <div className="grid gap-6 lg:grid-cols-3">
          <Summary summary={interview.summary} />
          <Insights insights={interview.insights} />
          <Alignment alignment={interview.alignment} />
        </div>
      </div>

      {/* Optional Actions */}
      <div className="mb-8 space-y-4">
        <h2 className="text-2xl font-semibold">Optional Deep Dives</h2>
        <OptionalActions
          interviewId={interviewId}
          hasCoaching={!!interviewDetailed?.coaching}
          hasQuestions={!!interviewDetailed?.betterQuestions}
          hasEmail={!!interviewDetailed?.followUpEmail}
          onCoachingLoaded={handleCoachingLoaded}
          onQuestionsLoaded={handleQuestionsLoaded}
          onEmailLoaded={handleEmailLoaded}
        />
      </div>

      {/* Tabbed Content */}
      <div className="mb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
            <TabsTrigger value="coaching">Coaching</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="email">Follow-up</TabsTrigger>
          </TabsList>

          <TabsContent value="transcript" className="mt-6">
            <div className="rounded-lg border bg-card p-6">
              <h3 className="mb-4 text-lg font-semibold">Full Transcript</h3>
              <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-muted-foreground">
                {interview.transcript}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="coaching" className="mt-6">
            <TranscriptCoachView
              transcript={interview.transcript}
              coaching={interviewDetailed?.coaching || null}
            />
          </TabsContent>

          <TabsContent value="questions" className="mt-6">
            <BetterQuestions data={interviewDetailed?.betterQuestions || null} />
          </TabsContent>

          <TabsContent value="email" className="mt-6">
            <FollowupEmail
              data={interviewDetailed?.followUpEmail || null}
              onRegenerate={handleEmailRegenerate}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
