'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMemo } from 'react';
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

  // Fix: Cache selectors to avoid infinite loop
  const customer = useStore((state) => state.getCustomerById(customerId));
  const deleteInterview = useStore((state) => state.deleteInterview);
  const interviews = useMemo(
    () => {
      const allInterviews = useStore.getState().getInterviewsByCustomerId(customerId);
      // Sort by interview date (newest first)
      return [...allInterviews].sort((a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      );
    },
    [customerId]
  );

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
                <Card key={interview.id} className="hover:shadow-md transition">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="mb-2">
                          <Link
                            href={`/interview/${interview.id}`}
                            className="hover:underline text-purple-600"
                          >
                            Interview from{' '}
                            {new Date(interview.uploadedAt).toLocaleDateString()}
                          </Link>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
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
