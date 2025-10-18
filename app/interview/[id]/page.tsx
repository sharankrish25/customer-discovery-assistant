'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
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

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div>
        <Link
          href={`/customer/${interview.customerId}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to {customer?.name || 'Customer Profile'}
        </Link>
        <h1 className="mt-3 text-3xl font-bold">Interview Detail</h1>
        <p className="text-sm text-muted-foreground">
          Uploaded: {new Date(interview.uploadedAt).toLocaleString()}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vision being tested</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{interview.productIdea}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transcript</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto rounded-md bg-muted p-4">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed">
              {interview.transcript}
            </pre>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          {interview.analysis ? (
            <p className="text-sm leading-relaxed">{interview.analysis.analysis}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No analysis has been generated yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
