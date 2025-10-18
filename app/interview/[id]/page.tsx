'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStore } from '@/lib/store';

export default function InterviewDetailPage() {
  const params = useParams();
  const interviewId = params.id as string;

  const interview = useStore((state) => state.getInterview(interviewId));
  const customer = useStore((state) =>
    interview ? state.getCustomerById(interview.customerId) : undefined
  );

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

  const formattedDate = new Date(interview.uploadedAt).toLocaleString();

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div>
        <Link
          href={customer ? `/customer/${customer.id}` : '/dashboard'}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to {customer ? `${customer.name}'s profile` : 'Dashboard'}
        </Link>
        <h1 className="mt-4 text-3xl font-bold">Interview Overview</h1>
        <p className="text-sm text-muted-foreground">Uploaded {formattedDate}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Idea</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="leading-relaxed text-sm sm:text-base">
            {interview.productIdea}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transcript</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap rounded-md bg-muted p-4 text-sm leading-relaxed">
            {interview.transcript}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          {interview.analysis ? (
            <pre className="whitespace-pre-wrap text-sm leading-relaxed">
              {interview.analysis}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">
              No analysis available yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
