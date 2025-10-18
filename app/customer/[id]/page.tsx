'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Timeline } from '@/components/Timeline';
import { getProfile, getLastInterviewDate } from '@/lib/storage';
import { CustomerProfile, InterviewRecord } from '@/types/customer';
import { toast } from 'sonner';

export default function CustomerProfilePage() {
  const params = useParams();
  const customerId = params.id as string;
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [selectedInterviewId, setSelectedInterviewId] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const p = getProfile(customerId);
    setProfile(p);
    if (p && p.interviews.length > 0) {
      setSelectedInterviewId(p.interviews[0].id);
    }
  }, [customerId]);

  if (!mounted) {
    return null;
  }

  if (!profile) {
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

  const lastDate = getLastInterviewDate(profile);
  const selectedInterview = profile.interviews.find(
    (i) => i.id === selectedInterviewId
  );

  const handleRerun = (type: string) => {
    toast.info(`${type} generation coming soon`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:underline mb-2 inline-block"
        >
          ← Back to Dashboard
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold mb-2">{profile.name}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">
                {profile.role || profile.stakeholderType}
              </Badge>
              {profile.demographics && (
                <span className="text-sm text-muted-foreground">
                  {profile.demographics}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Last interview:{' '}
              {lastDate ? new Date(lastDate).toLocaleDateString() : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Interview Timeline</h2>
        <Timeline interviews={profile.interviews} />
      </div>

      {/* Tabs */}
      {profile.interviews.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Interview Data</h2>
            {profile.interviews.length > 1 && (
              <Select
                value={selectedInterviewId}
                onValueChange={setSelectedInterviewId}
              >
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select interview" />
                </SelectTrigger>
                <SelectContent>
                  {profile.interviews.map((interview) => (
                    <SelectItem key={interview.id} value={interview.id}>
                      {new Date(interview.date).toLocaleDateString()} -{' '}
                      {interview.productIdea.slice(0, 40)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedInterview && (
            <Tabs defaultValue="summary">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="insights">Insights</TabsTrigger>
                <TabsTrigger value="alignment">Alignment</TabsTrigger>
                <TabsTrigger value="coaching">Coaching</TabsTrigger>
                <TabsTrigger value="questions">Questions</TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc space-y-2 pl-5">
                      {selectedInterview.results.summary.bullets.map(
                        (bullet, idx) => (
                          <li key={idx} className="text-sm">
                            {bullet}
                          </li>
                        )
                      )}
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="insights" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Insights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedInterview.results.insights.items.map(
                        (item, idx) => (
                          <div
                            key={idx}
                            className="border-l-4 border-primary pl-4"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{item.type}</Badge>
                              <Badge>{item.evidence}</Badge>
                            </div>
                            <p className="font-medium text-sm">{item.title}</p>
                            {item.quotes.length > 0 && (
                              <p className="text-sm text-muted-foreground mt-1 italic">
                                "{item.quotes[0]}"
                              </p>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="alignment" className="mt-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-green-600 dark:text-green-400">
                        Supports
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {selectedInterview.results.alignment.supports.map(
                          (item, idx) => (
                            <li key={idx} className="text-sm">
                              {item}
                            </li>
                          )
                        )}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-red-600 dark:text-red-400">
                        Contradicts
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {selectedInterview.results.alignment.contradicts.map(
                          (item, idx) => (
                            <li key={idx} className="text-sm">
                              {item}
                            </li>
                          )
                        )}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-gray-600 dark:text-gray-400">
                        Neutral
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {selectedInterview.results.alignment.neutral.map(
                          (item, idx) => (
                            <li key={idx} className="text-sm">
                              {item}
                            </li>
                          )
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="coaching" className="mt-6">
                <Card>
                  <CardContent className="pt-6 text-center py-12">
                    <p className="text-muted-foreground mb-4">
                      Not generated yet
                    </p>
                    <Button
                      variant="outline"
                      disabled
                      title="Coming soon"
                      aria-disabled="true"
                      onClick={() => handleRerun('Coaching')}
                    >
                      Re-run Coaching
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="questions" className="mt-6">
                <Card>
                  <CardContent className="pt-6 text-center py-12">
                    <p className="text-muted-foreground mb-4">
                      Not generated yet
                    </p>
                    <Button
                      variant="outline"
                      disabled
                      title="Coming soon"
                      aria-disabled="true"
                      onClick={() => handleRerun('Better Questions')}
                    >
                      Re-run Better Questions
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="email" className="mt-6">
                <Card>
                  <CardContent className="pt-6 text-center py-12">
                    <p className="text-muted-foreground mb-4">
                      Not generated yet
                    </p>
                    <Button
                      variant="outline"
                      disabled
                      title="Coming soon"
                      aria-disabled="true"
                      onClick={() => handleRerun('Follow-up Email')}
                    >
                      Re-run Follow-up Email
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      )}
    </div>
  );
}
