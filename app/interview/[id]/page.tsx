'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { Summary } from '@/components/Panels/Summary';
import { Insights } from '@/components/Panels/Insights';
import { Alignment } from '@/components/Panels/Alignment';
import { OptionalActions } from '@/components/OptionalActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { SummaryOutput, InsightItem, AlignmentOutput } from '@/lib/types';

export default function InterviewDetailPage() {
  const params = useParams();
  const interviewId = params.id as string;

  const interviewDetailed = useStore((state) => state.getInterviewById(interviewId));
  const customer = useStore((state) =>
    interviewDetailed ? state.getCustomerById(interviewDetailed.customerId) : undefined
  );

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
        coaching: interviewDetailed.coaching
          ? {
              overallQuality: interviewDetailed.coaching.highlights.length > 0 ? 'needs improvement' : 'good',
              suggestions: interviewDetailed.coaching.highlights.map((h) => h.suggestion),
            }
          : null,
        nextQuestions: interviewDetailed.betterQuestions
          ? { questions: interviewDetailed.betterQuestions.questions.map((q) => q.text) }
          : null,
        followup: interviewDetailed.followUpEmail
          ? { emailBody: interviewDetailed.followUpEmail.body }
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
        <OptionalActions interviewId={interviewId} />
      </div>

      {/* Optional Outputs (if generated) */}
      {(interview.coaching || interview.nextQuestions || interview.followup) && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Additional Insights</h2>

          {interview.coaching && (
            <Card>
              <CardHeader>
                <CardTitle>Interview Quality Coaching</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-sm font-semibold">Overall Quality:</p>
                    <Badge>{interview.coaching.overallQuality}</Badge>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-semibold">Suggestions:</p>
                    <ul className="list-disc space-y-1 pl-5">
                      {interview.coaching.suggestions.map((suggestion, index) => (
                        <li key={index} className="text-sm">
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {interview.nextQuestions && (
            <Card>
              <CardHeader>
                <CardTitle>Better Questions for Next Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-2 pl-5">
                  {interview.nextQuestions.questions.map((question, index) => (
                    <li key={index} className="text-sm">
                      {question}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {interview.followup && (
            <Card>
              <CardHeader>
                <CardTitle>Follow-up Email</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md bg-muted p-4">
                  <pre className="whitespace-pre-wrap text-sm">
                    {interview.followup.emailBody}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
