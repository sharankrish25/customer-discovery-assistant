'use client';

import { useStore } from '@/lib/store';
import { CustomerTable } from '@/components/CustomerTable';
import { Button } from '@/components/ui/button';
import type { Interview } from '@/lib/types';
import type { Interview as InterviewDetailed } from '@/types/models';

export default function DashboardPage() {
  const customers = useStore((state) => state.customers);
  const seedMock = useStore((state) => state.seedMock);

  // Flatten interviews from all customers and convert to simplified Interview type
  const interviews: Interview[] = customers.flatMap((customer) =>
    customer.interviews.map((interview: InterviewDetailed) => ({
      id: interview.id,
      customerId: interview.customerId,
      productIdea: interview.productIdea,
      transcript: interview.transcript,
      uploadedAt: interview.uploadedAt,
      summary: interview.summary ? { bullets: interview.summary.summary.bullets } : null,
      insights: interview.insights
        ? interview.insights.insights.map((insight) => ({
            insight: insight.title,
            supportingQuote: insight.quotes[0]?.text || '',
          }))
        : null,
      alignment: interview.alignment
        ? {
            supports: interview.alignment.alignment.supports.map((s) => s.quote),
            contradicts: interview.alignment.alignment.contradicts.map((c) => c.quote),
            neutral: interview.alignment.alignment.neutral.map((n) => n.rationale),
          }
        : null,
      coaching: interview.coaching
        ? {
            overallQuality: interview.coaching.highlights.length > 0 ? 'needs improvement' : 'good',
            suggestions: interview.coaching.highlights.map((h) => h.suggestion),
          }
        : null,
      nextQuestions: interview.betterQuestions
        ? { questions: interview.betterQuestions.questions.map((q) => q.text) }
        : null,
      followup: interview.followUpEmail ? { emailBody: interview.followUpEmail.body } : null,
    }))
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            View all customer profiles and interviews
          </p>
        </div>
        <Button onClick={seedMock} variant="secondary">
          Seed Demo Data
        </Button>
      </div>

      <CustomerTable customers={customers} interviews={interviews} />
    </div>
  );
}
