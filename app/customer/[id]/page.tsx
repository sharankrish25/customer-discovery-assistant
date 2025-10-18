'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Timeline } from '@/components/Timeline';
import { useStore } from '@/lib/store';

export default function CustomerProfilePage() {
  const params = useParams();
  const customerId = params.id as string;

  const customer = useStore((state) => state.getCustomerById(customerId));

  const interviews = useMemo(() => {
    if (!customer) return [];
    return customer.interviews
      .slice()
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }, [customer]);

  const [selectedInterviewId, setSelectedInterviewId] = useState(() => interviews[0]?.id ?? '');

  useEffect(() => {
    if (interviews.length === 0) {
      setSelectedInterviewId('');
      return;
    }
    const stillValid = interviews.some((interview) => interview.id === selectedInterviewId);
    if (!stillValid) {
      setSelectedInterviewId(interviews[0].id);
    }
  }, [interviews, selectedInterviewId]);

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

  const selectedInterview = interviews.find((interview) => interview.id === selectedInterviewId) ?? interviews[0];

  return (
    <div className="container mx-auto px-4 py-8 space-y-10">
      <div>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          ← Back to Dashboard
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">{customer.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {customer.stakeholderType && (
                <Badge variant="secondary">{customer.stakeholderType}</Badge>
              )}
              {customer.demographics && <span>{customer.demographics}</span>}
              {customer.email && <span>{customer.email}</span>}
            </div>
          </div>
          <Button asChild variant="outline">
            <Link href="/interview/new">Add Interview</Link>
          </Button>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-2xl font-semibold">Interview History</h2>
        <Timeline
          interviews={interviews.map((interview) => ({
            id: interview.id,
            customerId: interview.customerId,
            productIdea: interview.productIdea,
            transcript: interview.transcript,
            date: interview.uploadedAt.toISOString(),
            analysis: interview.analysis,
          }))}
        />
      </div>

      {selectedInterview && (
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle>Interview Details</CardTitle>
            <div className="text-sm text-muted-foreground">
              Conducted {selectedInterview.uploadedAt.toLocaleDateString()} •{' '}
              {selectedInterview.uploadedAt.toLocaleTimeString()}
            </div>
            {interviews.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {interviews.map((interview) => (
                  <Button
                    key={interview.id}
                    size="sm"
                    variant={interview.id === selectedInterview.id ? 'default' : 'outline'}
                    onClick={() => setSelectedInterviewId(interview.id)}
                  >
                    {interview.uploadedAt.toLocaleDateString()}
                  </Button>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <section className="space-y-2">
              <h3 className="text-lg font-semibold">Product Idea</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {selectedInterview.productIdea}
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-lg font-semibold">Transcript</h3>
              <pre className="whitespace-pre-wrap rounded-md bg-muted p-4 text-sm leading-relaxed">
                {selectedInterview.transcript}
              </pre>
            </section>

            <section className="space-y-2">
              <h3 className="text-lg font-semibold">Analysis</h3>
              {selectedInterview.analysis ? (
                <pre className="whitespace-pre-wrap rounded-md bg-muted/50 p-4 text-sm leading-relaxed">
                  {selectedInterview.analysis}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Analysis not yet available for this interview.
                </p>
              )}
            </section>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
