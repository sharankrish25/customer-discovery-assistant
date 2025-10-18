'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CustomerProfilePage() {
  const params = useParams();
  const customerId = params.customerId as string;

  const customer = useStore((state) => state.getCustomerById(customerId));
  const interviews = useStore((state) => state.getInterviewsByCustomerId(customerId));

  if (!customer) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">Customer not found</p>
          <Link href="/dashboard" className="mt-4 inline-block text-primary hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const getArtifactChips = (interview: typeof interviews[0]) => {
    const chips: { label: string; variant: 'default' | 'secondary' }[] = [];

    // Auto-generated outputs
    if (interview.summary) chips.push({ label: 'Summary', variant: 'default' });
    if (interview.insights) chips.push({ label: 'Insights', variant: 'default' });
    if (interview.alignment) chips.push({ label: 'Alignment', variant: 'default' });

    // Optional outputs (use betterQuestions and followUpEmail from detailed types)
    if (interview.coaching) chips.push({ label: 'Coaching', variant: 'secondary' });
    if (interview.betterQuestions)
      chips.push({ label: 'Questions', variant: 'secondary' });
    if (interview.followUpEmail) chips.push({ label: 'Follow-up', variant: 'secondary' });

    return chips;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Customer Header */}
      <div className="mb-8">
        <div className="mb-2">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Back to Dashboard
          </Link>
        </div>
        <div className="mb-4 flex items-center gap-3">
          <h1 className="text-3xl font-bold">{customer.name}</h1>
          <Badge variant="outline">{customer.stakeholderType}</Badge>
        </div>
        {customer.demographics && (
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm font-semibold">Demographics</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {customer.demographics}
            </p>
          </div>
        )}
      </div>

      {/* Interviews List */}
      <div>
        <h2 className="mb-4 text-2xl font-semibold">
          Interviews ({interviews.length})
        </h2>

        {interviews.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground">
              No interviews yet for this customer
            </p>
            <Link
              href="/interview/new"
              className="mt-4 inline-block text-primary hover:underline"
            >
              Create New Interview
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {interviews.map((interview) => {
              const chips = getArtifactChips(interview);

              return (
                <Card key={interview.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="mb-2">
                          <Link
                            href={`/interview/${interview.id}`}
                            className="hover:underline"
                          >
                            Interview from{' '}
                            {new Date(interview.uploadedAt).toLocaleDateString()}
                          </Link>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {interview.productIdea}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                        Available Artifacts
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {chips.length > 0 ? (
                          chips.map((chip, index) => (
                            <Badge key={index} variant={chip.variant}>
                              {chip.label}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Analysis pending
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
