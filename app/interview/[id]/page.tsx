'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useStore } from '@/lib/store';
import { toast } from 'sonner';

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
  const [showFollowup, setShowFollowup] = useState(false);
  const [showCoaching, setShowCoaching] = useState(false);
  const [showNextQuestions, setShowNextQuestions] = useState(false);
  const [showAnnotation, setShowAnnotation] = useState(false);
  const [followupEmail, setFollowupEmail] = useState('');
  const [coachingResponse, setCoachingResponse] = useState('');
  const [nextQuestions, setNextQuestions] = useState<string[]>([]);
  const [annotation, setAnnotation] = useState('');
  const [loading, setLoading] = useState(false);

  const interview = useStore((state) => state.getInterview(interviewId));
  const customer = useStore((state) =>
    interview ? state.getCustomerById(interview.customerId) : undefined
  );

  const handleFollowupEmail = async () => {
    if (!interview || !customer) return;
    setLoading(true);
    try {
      const response = await fetch('/api/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customer.name,
          customerEmail: customer.email,
          productIdea: interview.productIdea,
          transcript: interview.transcript,
        }),
      });
      const data = await response.json();
      if (data.ok) {
        setFollowupEmail(data.data.email);
        toast.success('Follow-up email generated!');
      } else {
        throw new Error(data.error?.message || 'Failed to generate follow-up email');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate follow-up email');
    } finally {
      setLoading(false);
    }
  };

  const handleCoaching = async () => {
    if (!interview) return;
    setLoading(true);
    try {
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: interview.transcript,
          productIdea: interview.productIdea,
        }),
      });
      const data = await response.json();
      if (data.ok) {
        setCoachingResponse(data.data.coaching);
        toast.success('Coaching feedback generated!');
      } else {
        throw new Error(data.error?.message || 'Failed to generate coaching');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate coaching');
    } finally {
      setLoading(false);
    }
  };

  const handleNextQuestions = async () => {
    if (!interview) return;
    setLoading(true);
    try {
      const response = await fetch('/api/next-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: interview.transcript,
          productIdea: interview.productIdea,
        }),
      });
      const data = await response.json();
      if (data.ok) {
        setNextQuestions(data.data.questions);
        toast.success('Next questions generated!');
      } else {
        throw new Error(data.error?.message || 'Failed to generate next questions');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate next questions');
    } finally {
      setLoading(false);
    }
  };

  const handleAnnotation = async () => {
    if (!interview) return;
    setLoading(true);
    try {
      const response = await fetch('/api/annotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: interview.transcript,
          productIdea: interview.productIdea,
        }),
      });
      const data = await response.json();
      if (data.ok) {
        setAnnotation(data.data.annotation);
        toast.success('Annotation generated!');
      } else {
        throw new Error(data.error?.message || 'Failed to generate annotation');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate annotation');
    } finally {
      setLoading(false);
    }
  };

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

      {interview.analysisStatus === 'complete' ? (
        <div className="grid gap-6 lg:grid-cols-1">
          {/* Summary Agent */}
          {interview.summary && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📋 Summary
                  <Badge variant="outline" className="text-xs">
                    {Math.round(interview.summary.confidence * 100)}% confidence
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {interview.summary.bullets.map((bullet, index) => (
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
          {interview.insights && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🔍 Insights
                  <Badge variant="outline" className="text-xs">
                    {Math.round(interview.insights.confidence * 100)}% confidence
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {interview.insights.insights.map((insight, index) => (
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
          {interview.alignment && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🎯 Alignment Analysis
                  <Badge variant="outline" className="text-xs">
                    {Math.round(interview.alignment.confidence * 100)}% confidence
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Supports */}
                  {interview.alignment.alignment.supports.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm text-green-600 mb-3 flex items-center gap-2">
                        ✅ Supports Your Idea ({interview.alignment.alignment.supports.length})
                      </h4>
                      <div className="space-y-3">
                        {interview.alignment.alignment.supports.map((item, index) => (
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
                  {interview.alignment.alignment.contradicts.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm text-red-600 mb-3 flex items-center gap-2">
                        ❌ Contradicts Your Idea ({interview.alignment.alignment.contradicts.length})
                      </h4>
                      <div className="space-y-3">
                        {interview.alignment.alignment.contradicts.map((item, index) => (
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
                  {interview.alignment.alignment.neutral.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm text-yellow-600 mb-3 flex items-center gap-2">
                        ⚪ Neutral Insights ({interview.alignment.alignment.neutral.length})
                      </h4>
                      <div className="space-y-3">
                        {interview.alignment.alignment.neutral.map((item, index) => (
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
          {!interview.summary && !interview.insights && !interview.alignment && interview.analysis && (
            <Card>
              <CardHeader>
                <CardTitle>Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line leading-relaxed">
                  {interview.analysis}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : interview.analysisStatus === 'error' ? (
        <Card>
          <CardHeader>
            <CardTitle>Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Unable to generate analysis. Try re-running the interview upload.
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
              Analysis is still running. This page will update when the results are ready.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {interview.analysisStatus === 'complete' && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button 
                onClick={() => setShowFollowup(true)} 
                variant="outline"
                disabled={loading}
              >
                📧 Generate Follow-up Email
              </Button>
              <Button 
                onClick={() => setShowCoaching(true)} 
                variant="outline"
                disabled={loading}
              >
                🎯 Get Coaching Feedback
              </Button>
              <Button 
                onClick={() => setShowNextQuestions(true)} 
                variant="outline"
                disabled={loading}
              >
                ❓ Generate Next Questions
              </Button>
              <Button 
                onClick={() => setShowAnnotation(true)} 
                variant="outline"
                disabled={loading}
              >
                📝 Add Annotation
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Follow-up Email Modal */}
      {showFollowup && (
        <Card>
          <CardHeader>
            <CardTitle>Follow-up Email</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button onClick={handleFollowupEmail} disabled={loading}>
                {loading ? 'Generating...' : 'Generate Follow-up Email'}
              </Button>
              {followupEmail && (
                <div>
                  <Label>Generated Email:</Label>
                  <Textarea 
                    value={followupEmail} 
                    readOnly 
                    className="mt-2 min-h-[200px]"
                  />
                </div>
              )}
              <Button onClick={() => setShowFollowup(false)} variant="outline">
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coaching Modal */}
      {showCoaching && (
        <Card>
          <CardHeader>
            <CardTitle>Coaching Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button onClick={handleCoaching} disabled={loading}>
                {loading ? 'Generating...' : 'Get Coaching Feedback'}
              </Button>
              {coachingResponse && (
                <div>
                  <Label>Coaching Feedback:</Label>
                  <Textarea 
                    value={coachingResponse} 
                    readOnly 
                    className="mt-2 min-h-[200px]"
                  />
                </div>
              )}
              <Button onClick={() => setShowCoaching(false)} variant="outline">
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Questions Modal */}
      {showNextQuestions && (
        <Card>
          <CardHeader>
            <CardTitle>Next Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button onClick={handleNextQuestions} disabled={loading}>
                {loading ? 'Generating...' : 'Generate Next Questions'}
              </Button>
              {nextQuestions.length > 0 && (
                <div>
                  <Label>Suggested Questions:</Label>
                  <ul className="mt-2 space-y-2">
                    {nextQuestions.map((question, index) => (
                      <li key={index} className="p-3 bg-muted/40 rounded-lg text-sm">
                        {question}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Button onClick={() => setShowNextQuestions(false)} variant="outline">
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Annotation Modal */}
      {showAnnotation && (
        <Card>
          <CardHeader>
            <CardTitle>Annotation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button onClick={handleAnnotation} disabled={loading}>
                {loading ? 'Generating...' : 'Generate Annotation'}
              </Button>
              {annotation && (
                <div>
                  <Label>Generated Annotation:</Label>
                  <Textarea 
                    value={annotation} 
                    readOnly 
                    className="mt-2 min-h-[200px]"
                  />
                </div>
              )}
              <Button onClick={() => setShowAnnotation(false)} variant="outline">
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
