'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/lib/store';

function renderStatusBadge(status: 'pending' | 'processing' | 'complete' | 'error') {
  switch (status) {
    case 'complete':
      return <Badge variant="secondary">Analysis complete</Badge>;
    case 'processing':
      return <Badge>Analyzing…</Badge>;
    case 'error':
      return <Badge variant="destructive">Analysis failed</Badge>;
    default:
      return <Badge variant="outline">Waiting to analyze</Badge>;
  }
}

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
          <Link
            href="/dashboard"
            className="mt-4 inline-block text-primary hover:underline"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col gap-2">
        <Link
          href={customer ? `/customer/${customer.id}` : '/dashboard'}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to {customer?.name || 'dashboard'}
        </Link>
        <h1 className="text-3xl font-bold">Interview Detail</h1>
        <p className="text-sm text-muted-foreground">
          Uploaded {new Date(interview.uploadedAt).toLocaleString()}
        </p>
        <div className="flex items-center gap-2">
          {renderStatusBadge(interview.analysisStatus)}
          {interview.error && (
            <span className="text-sm text-destructive">{interview.error}</span>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vision being tested</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground whitespace-pre-line">
            {interview.productIdea}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          {interview.analysisStatus === 'complete' && interview.analysis ? (
            <p className="whitespace-pre-line leading-relaxed">
              {interview.analysis}
            </p>
          ) : interview.analysisStatus === 'error' ? (
            <p className="text-sm text-muted-foreground">
              Unable to generate analysis. Try re-running the interview upload.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Analysis is still running. This page will update when the results are ready.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transcript</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap rounded bg-muted/40 p-4 text-sm">
            {interview.transcript}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
