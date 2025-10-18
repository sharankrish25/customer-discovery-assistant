'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStore } from '@/lib/store';

export default function CustomerProfilePage() {
  const params = useParams();
  const customerId = params.id as string;

  const customer = useStore((state) => state.getCustomerById(customerId));
  const deleteInterview = useStore((state) => state.deleteInterview);

  const interviews = useMemo(() => {
    if (!customer) return [];
    return [...customer.interviews].sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }, [customer]);

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

  const handleDeleteInterview = (interviewId: string) => {
    if (!confirm('Delete this interview?')) {
      return;
    }
    deleteInterview(interviewId);
    toast.success('Interview deleted');
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-10">
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to Dashboard
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold">{customer.name}</h1>
          {customer.stakeholderType && (
            <Badge variant="outline">{customer.stakeholderType}</Badge>
          )}
        </div>
        {customer.demographics && (
          <p className="mt-2 text-sm text-muted-foreground">{customer.demographics}</p>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">
            Interviews ({interviews.length})
          </h2>
          <Button asChild variant="outline" size="sm">
            <Link href="/interview/new">New Interview</Link>
          </Button>
        </div>

        {interviews.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground">No interviews yet for this customer.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {interviews.map((interview) => (
              <Card key={interview.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">
                        <Link
                          href={`/interview/${interview.id}`}
                          className="hover:underline"
                        >
                          {new Date(interview.uploadedAt).toLocaleDateString()}
                        </Link>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {interview.productIdea}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteInterview(interview.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {interview.analysis ? (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {interview.analysis.analysis}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Analysis pending.
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
