'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CustomerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.customerId as string;

  const customer = useStore((state) => state.getCustomerById(customerId));
  const deleteInterview = useStore((state) => state.deleteInterview);

  const interviews = useMemo(() => {
    const allInterviews = useStore.getState().getInterviewsByCustomerId(customerId);
    return [...allInterviews].sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }, [customerId]);

  const handleDeleteInterview = (interviewId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (confirm('Are you sure you want to delete this interview?')) {
      deleteInterview(interviewId);
      toast.success('Interview deleted');
    }
  };

  if (!customer) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">Customer not found</p>
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
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to Dashboard
        </Link>
        <div className="mt-2 mb-4 flex items-center gap-3">
          <h1 className="text-3xl font-bold">{customer.name}</h1>
          {customer.stakeholderType && (
            <Badge variant="outline">{customer.stakeholderType}</Badge>
          )}
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

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Interviews ({interviews.length})</h2>
        <Button onClick={() => router.push('/interview/new')}>New Interview</Button>
      </div>

      {interviews.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">No interviews yet for this customer</p>
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
            const snippet = interview.analysis
              ? interview.analysis.length > 160
                ? `${interview.analysis.slice(0, 157)}…`
                : interview.analysis
              : null;

            return (
              <Card key={interview.id} className="transition hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg">
                        <Link
                          href={`/interview/${interview.id}`}
                          className="hover:underline text-purple-600"
                        >
                          Interview from {new Date(interview.uploadedAt).toLocaleDateString()}
                        </Link>
                      </CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {interview.productIdea}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDeleteInterview(interview.id, e)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      aria-label="Delete interview"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Badge variant={interview.analysisStatus === 'complete' ? 'secondary' : 'outline'}>
                    {interview.analysisStatus === 'complete'
                      ? 'Analysis ready'
                      : interview.analysisStatus === 'processing'
                        ? 'Analyzing…'
                        : interview.analysisStatus === 'error'
                          ? 'Analysis failed'
                          : 'Queued'}
                  </Badge>
                  {snippet && (
                    <p className="text-sm text-muted-foreground">{snippet}</p>
                  )}
                  {interview.analysisStatus === 'error' && interview.error && (
                    <p className="text-sm text-destructive">{interview.error}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
