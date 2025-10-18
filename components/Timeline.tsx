'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

interface InterviewRecord {
  id: string;
  customerId: string;
  productIdea: string;
  transcript: string;
  date: string;
  analysis: string | null;
  analysisStatus?: string;
  error?: string;
  summary?: {
    bullets: string[];
    tone: 'neutral';
    confidence: number;
  };
  insights?: {
    insights: Array<{
      title: string;
      type: 'existing_process' | 'motivation' | 'unmet_need' | 'pain_magnitude' | 'past_attempt';
      quotes: Array<{
        text: string;
        start_sec: number | null;
      }>;
      why_it_matters: string;
      evidence_level: 'low' | 'med' | 'high';
    }>;
    confidence: number;
  };
  alignment?: {
    alignment: {
      supports: Array<{
        insight_title: string;
        quote: string;
        rationale: string;
      }>;
      contradicts: Array<{
        insight_title: string;
        quote: string;
        rationale: string;
      }>;
      neutral: Array<{
        insight_title: string;
        quote: string;
        rationale: string;
      }>;
    };
    confidence: number;
  };
}

interface TimelineProps {
  interviews: InterviewRecord[];
}

export function Timeline({ interviews }: TimelineProps) {
  if (interviews.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No interviews yet</p>
          <Link
            href="/interview/new"
            className="mt-2 inline-block text-sm text-primary hover:underline"
          >
            Upload your first interview
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {interviews.map((interview) => {
        // Create snippet from agent outputs or legacy analysis
        let snippet = null;
        if (interview.summary && interview.summary.bullets.length > 0) {
          snippet = `📋 ${interview.summary.bullets[0]}`;
        } else if (interview.insights && interview.insights.insights.length > 0) {
          snippet = `🔍 ${interview.insights.insights[0].title}`;
        } else if (interview.alignment && interview.alignment.alignment.supports.length > 0) {
          snippet = `🎯 ${interview.alignment.alignment.supports[0].insight_title}`;
        } else if (interview.analysis) {
          snippet = interview.analysis.length > 160
            ? `${interview.analysis.slice(0, 157)}…`
            : interview.analysis;
        }

        // Show agent status indicators
        const agentStatus = [];
        if (interview.summary) agentStatus.push('📋 Summary');
        if (interview.insights) agentStatus.push('🔍 Insights');
        if (interview.alignment) agentStatus.push('🎯 Alignment');

        return (
          <Card key={interview.id}>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">
                      {new Date(interview.date).toLocaleDateString()} •{' '}
                      {new Date(interview.date).toLocaleTimeString()}
                    </p>
                    <p className="font-medium mt-1 line-clamp-1">
                      {interview.productIdea}
                    </p>
                    {snippet && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {snippet}
                      </p>
                    )}
                    {agentStatus.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {agentStatus.map((status, index) => (
                          <span key={index} className="text-xs bg-muted/40 px-2 py-1 rounded">
                            {status}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Link
                    href={`/interview/${interview.id}`}
                    className="text-sm text-primary hover:underline shrink-0"
                  >
                    View Results →
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
