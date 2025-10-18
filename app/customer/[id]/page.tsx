'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Timeline } from '@/components/Timeline';
import { useStore } from '@/lib/store';

export default function CustomerProfilePage() {
  const params = useParams();
  const customerId = params.id as string;

  const zustandProfile = useStore((state) => state.getCustomerById(customerId));
  const interviews = useMemo(() => {
    if (!zustandProfile) return [];
    return [...zustandProfile.interviews]
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
      .map((interview) => ({
        id: interview.id,
        customerId: interview.customerId,
        productIdea: interview.productIdea,
        transcript: interview.transcript,
        date: interview.uploadedAt.toISOString(),
        analysis: interview.analysis,
        analysisStatus: interview.analysisStatus,
        error: interview.error,
        summary: interview.summary,
        insights: interview.insights,
        alignment: interview.alignment,
      }));
  }, [zustandProfile]);

  const [selectedInterviewId, setSelectedInterviewId] = useState<string>(
    interviews[0]?.id || ''
  );

  const selectedInterview = interviews.find((i) => i.id === selectedInterviewId);

  useEffect(() => {
    if (interviews.length === 0) {
      setSelectedInterviewId('');
      return;
    }

    const exists = interviews.some((interview) => interview.id === selectedInterviewId);
    if (!exists) {
      setSelectedInterviewId(interviews[0].id);
    }
  }, [interviews, selectedInterviewId]);

  if (!zustandProfile) {
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

  const lastDate = interviews.length > 0 ? interviews[0].date : null;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold">{zustandProfile.name}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            {zustandProfile.stakeholderType && (
              <Badge variant="secondary">{zustandProfile.stakeholderType}</Badge>
            )}
            {zustandProfile.demographics && (
              <span className="text-sm text-muted-foreground">
                {zustandProfile.demographics}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Last interview: {lastDate ? new Date(lastDate).toLocaleDateString() : '—'}
          </p>
        </div>
        <Button asChild>
          <Link href="/interview/new">New Interview</Link>
        </Button>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Analyzed Interviews</h2>
        <Timeline interviews={interviews} />
      </div>

      {interviews.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-2xl font-semibold">Interview Details</h2>
            {interviews.length > 1 && (
              <Select value={selectedInterviewId} onValueChange={setSelectedInterviewId}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="Select interview" />
                </SelectTrigger>
                <SelectContent>
                  {interviews.map((interview) => (
                    <SelectItem key={interview.id} value={interview.id}>
                      {new Date(interview.date).toLocaleDateString()} –{' '}
                      {interview.productIdea.slice(0, 50)}
                      {interview.productIdea.length > 50 ? '…' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedInterview && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Product Vision</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line text-sm text-muted-foreground">
                    {selectedInterview.productIdea}
                  </p>
                </CardContent>
              </Card>

              {selectedInterview.analysisStatus === 'complete' ? (
                <div className="space-y-6">
                  {/* Summary Agent */}
                  {selectedInterview.summary && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          📋 Summary
                          <Badge variant="outline" className="text-xs">
                            {Math.round(selectedInterview.summary.confidence * 100)}% confidence
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {selectedInterview.summary.bullets.map((bullet, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-muted-foreground">•</span>
                              <span className="text-sm">{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Insights Agent */}
                  {selectedInterview.insights && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          🔍 Insights
                          <Badge variant="outline" className="text-xs">
                            {Math.round(selectedInterview.insights.confidence * 100)}% confidence
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {selectedInterview.insights.insights.map((insight, index) => (
                            <div key={index} className="border-l-2 border-muted pl-4">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium text-sm">{insight.title}</h4>
                                <Badge 
                                  variant={insight.evidence_level === 'high' ? 'default' : insight.evidence_level === 'med' ? 'secondary' : 'outline'}
                                  className="text-xs"
                                >
                                  {insight.evidence_level} evidence
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {insight.type.replace('_', ' ')}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{insight.why_it_matters}</p>
                              {insight.quotes.length > 0 && (
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-muted-foreground">Quotes:</p>
                                  {insight.quotes.map((quote, qIndex) => (
                                    <blockquote key={qIndex} className="text-xs italic bg-muted/40 p-2 rounded">
                                      &ldquo;{quote.text}&rdquo;
                                    </blockquote>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Alignment Agent */}
                  {selectedInterview.alignment && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          🎯 Alignment Analysis
                          <Badge variant="outline" className="text-xs">
                            {Math.round(selectedInterview.alignment.confidence * 100)}% confidence
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Supports */}
                          {selectedInterview.alignment.alignment.supports.length > 0 && (
                            <div>
                              <h4 className="font-medium text-sm text-green-600 mb-2 flex items-center gap-2">
                                ✅ Supports Your Idea ({selectedInterview.alignment.alignment.supports.length})
                              </h4>
                              <div className="space-y-2">
                                {selectedInterview.alignment.alignment.supports.map((item, index) => (
                                  <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                                    <p className="text-sm font-medium">{item.insight_title}</p>
                                    <blockquote className="text-xs italic text-muted-foreground mt-1">
                                      &ldquo;{item.quote}&rdquo;
                                    </blockquote>
                                    <p className="text-xs text-muted-foreground mt-2">{item.rationale}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Contradicts */}
                          {selectedInterview.alignment.alignment.contradicts.length > 0 && (
                            <div>
                              <h4 className="font-medium text-sm text-red-600 mb-2 flex items-center gap-2">
                                ❌ Contradicts Your Idea ({selectedInterview.alignment.alignment.contradicts.length})
                              </h4>
                              <div className="space-y-2">
                                {selectedInterview.alignment.alignment.contradicts.map((item, index) => (
                                  <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
                                    <p className="text-sm font-medium">{item.insight_title}</p>
                                    <blockquote className="text-xs italic text-muted-foreground mt-1">
                                      &ldquo;{item.quote}&rdquo;
                                    </blockquote>
                                    <p className="text-xs text-muted-foreground mt-2">{item.rationale}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Neutral */}
                          {selectedInterview.alignment.alignment.neutral.length > 0 && (
                            <div>
                              <h4 className="font-medium text-sm text-yellow-600 mb-2 flex items-center gap-2">
                                ⚪ Neutral Insights ({selectedInterview.alignment.alignment.neutral.length})
                              </h4>
                              <div className="space-y-2">
                                {selectedInterview.alignment.alignment.neutral.map((item, index) => (
                                  <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                    <p className="text-sm font-medium">{item.insight_title}</p>
                                    <blockquote className="text-xs italic text-muted-foreground mt-1">
                                      &ldquo;{item.quote}&rdquo;
                                    </blockquote>
                                    <p className="text-xs text-muted-foreground mt-2">{item.rationale}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Legacy Analysis (if no agent data) */}
                  {!selectedInterview.summary && !selectedInterview.insights && !selectedInterview.alignment && selectedInterview.analysis && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Analysis</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="whitespace-pre-line leading-relaxed">
                          {selectedInterview.analysis}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : selectedInterview.analysisStatus === 'error' ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {selectedInterview.error || 'Analysis failed. Try rerunning the interview.'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Analysis is still running. Check back in a moment.
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Transcript</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded bg-muted/40 p-4 text-sm">
                    {selectedInterview.transcript}
                  </pre>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
