'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Summary } from '@/components/Panels/Summary';
import { Insights } from '@/components/Panels/Insights';
import { Alignment } from '@/components/Panels/Alignment';
import { OptionalActions } from '@/components/OptionalActions';
import { BetterQuestions } from '@/components/BetterQuestions';
import { FollowupEmail } from '@/components/FollowupEmail';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { SummaryOutput as SummaryOutputSimplified, InsightItem, AlignmentOutput as AlignmentOutputSimplified } from '@/lib/types';
import type { CoachingOutput, BetterQuestionsOutput, FollowUpEmailOutput, CoachingBook } from '@/types/ai';
import { useStore } from '@/lib/store';

// Color mapping for each book
const BOOK_COLORS: Record<CoachingBook, { bg: string; text: string; border: string }> = {
  'Talking to Humans': {
    bg: 'bg-blue-100 dark:bg-blue-950/30',
    text: 'text-blue-900 dark:text-blue-100',
    border: 'border-blue-300 dark:border-blue-700',
  },
  'The Mom Test': {
    bg: 'bg-amber-100 dark:bg-amber-950/30',
    text: 'text-amber-900 dark:text-amber-100',
    border: 'border-amber-300 dark:border-amber-700',
  },
  'Lean Customer Development': {
    bg: 'bg-violet-100 dark:bg-violet-950/30',
    text: 'text-violet-900 dark:text-violet-100',
    border: 'border-violet-300 dark:border-violet-700',
  },
  'The Lean Startup': {
    bg: 'bg-green-100 dark:bg-green-950/30',
    text: 'text-green-900 dark:text-green-100',
    border: 'border-green-300 dark:border-green-700',
  },
};

export default function InterviewDetailPage() {
  const params = useParams();
  const interviewId = params.id as string;

  const [selectedAction, setSelectedAction] = useState<'coaching' | 'questions' | 'followup' | null>(null);

  // Get interview and customer from Zustand store
  const interviewData = useStore((state) => state.getInterview(interviewId));
  const updateInterview = useStore((state) => state.updateInterview);
  const customer = useStore((state) =>
    interviewData ? state.getCustomerById(interviewData.customerId) : null
  );

  const handleCoachingLoaded = (coaching: CoachingOutput) => {
    updateInterview(interviewId, { coaching });
  };

  const handleQuestionsLoaded = (betterQuestions: BetterQuestionsOutput) => {
    updateInterview(interviewId, { betterQuestions });
  };

  const handleEmailLoaded = (followUpEmail: FollowUpEmailOutput) => {
    updateInterview(interviewId, { followUpEmail });
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
          type: item.type,
          whyItMatters: item.why_it_matters,
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
          betterQuestions={interviewData?.betterQuestions || null}
          followUpEmail={interviewData?.followUpEmail || null}
          customerName={customer?.name || ''}
          productIdea={interview.productIdea}
          hasCoaching={!!interviewData?.coaching}
          hasQuestions={!!interviewData?.betterQuestions}
          hasEmail={!!interviewData?.followUpEmail}
          onCoachingLoaded={handleCoachingLoaded}
          onQuestionsLoaded={handleQuestionsLoaded}
          onEmailLoaded={handleEmailLoaded}
          onActionSelected={(action) => setSelectedAction(action)}
        />

        {/* Dynamic content box that changes based on selected action */}
        {selectedAction && (
          <div className="mt-6">
            {selectedAction === 'coaching' && interviewData?.coaching && (
              <Card>
                <CardHeader>
                  <CardTitle>Coaching</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-96 overflow-y-auto space-y-4">
                    {interviewData.coaching.advice.map((item, idx) => {
                      const colors = BOOK_COLORS[item.book];
                      return (
                        <Card key={idx} className={`${colors.border} border-2`}>
                          <CardHeader>
                            <Badge
                              variant="outline"
                              className={`${colors.bg} ${colors.text} w-fit`}
                            >
                              {item.book}
                            </Badge>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div>
                              <p className="text-sm font-medium mb-1">What to improve:</p>
                              <p className="text-sm text-muted-foreground">
                                {item.what_to_improve}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium mb-1">Example rewrite:</p>
                              <p className="text-sm italic text-muted-foreground">
                                &ldquo;{item.example_rewrite}&rdquo;
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedAction === 'questions' && interviewData?.betterQuestions && (
              <BetterQuestions data={interviewData.betterQuestions} />
            )}

            {selectedAction === 'followup' && interviewData?.followUpEmail && (
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
            )}
          </div>
        )}
      </div>

      {/* Transcript Section with Annotated Transcript */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Transcript</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Book Legend - only show if coaching data exists */}
            {interviewData?.coaching && (
              <div>
                <p className="text-sm font-semibold mb-2">Book Legend</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(BOOK_COLORS).map(([book, colors]) => (
                    <Badge
                      key={book}
                      variant="outline"
                      className={`${colors.bg} ${colors.text} ${colors.border}`}
                    >
                      {book}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Annotated or plain transcript in scrollable box */}
            <div className="max-h-96 overflow-y-auto rounded-md bg-muted p-4">
              {interviewData?.coaching ? (
                <AnnotatedTranscript
                  transcript={interview.transcript}
                  coaching={interviewData.coaching}
                />
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-sm">
                  {interview.transcript}
                </pre>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Helper component for rendering annotated transcript
interface HighlightSegment {
  text: string;
  mark?: {
    book: CoachingBook;
    reason: string;
    suggestion: string;
  };
}

function highlightSegments(
  transcript: string,
  highlights: CoachingOutput['highlights']
): HighlightSegment[] {
  if (highlights.length === 0) {
    return [{ text: transcript }];
  }

  const sorted = [...highlights].sort((a, b) => a.start_char - b.start_char);
  const segments: HighlightSegment[] = [];
  let lastIndex = 0;

  for (const highlight of sorted) {
    if (highlight.start_char > lastIndex) {
      segments.push({
        text: transcript.slice(lastIndex, highlight.start_char),
      });
    }

    segments.push({
      text: transcript.slice(highlight.start_char, highlight.end_char),
      mark: {
        book: highlight.book,
        reason: highlight.reason,
        suggestion: highlight.suggestion,
      },
    });

    lastIndex = highlight.end_char;
  }

  if (lastIndex < transcript.length) {
    segments.push({
      text: transcript.slice(lastIndex),
    });
  }

  return segments;
}

function AnnotatedTranscript({ transcript, coaching }: { transcript: string; coaching: CoachingOutput }) {
  const segments = highlightSegments(transcript, coaching.highlights);

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
        {segments.map((segment, idx) =>
          segment.mark ? (
            <span
              key={idx}
              className={`relative inline-block ${BOOK_COLORS[segment.mark.book].bg} ${BOOK_COLORS[segment.mark.book].text} px-1 rounded cursor-help group`}
              title={`${segment.mark.book} • ${segment.mark.reason}\n${segment.mark.suggestion}`}
            >
              {segment.text}
              <span className="invisible group-hover:visible absolute bottom-full left-0 mb-2 w-64 p-2 bg-popover text-popover-foreground text-xs rounded shadow-lg border z-10">
                <strong className="block mb-1">{segment.mark.book}</strong>
                <em className="block mb-1 text-muted-foreground">
                  {segment.mark.reason}
                </em>
                <p>{segment.mark.suggestion}</p>
              </span>
            </span>
          ) : (
            <span key={idx}>{segment.text}</span>
          )
        )}
      </div>
    </div>
  );
}
