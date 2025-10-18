'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CustomerProfile } from '@/types/models';

interface CustomerCardProps {
  profile: CustomerProfile;
}

function getLastInterviewDate(profile: CustomerProfile): Date | null {
  if (!profile.interviews || profile.interviews.length === 0) return null;
  const dates = profile.interviews.map((i) => new Date(i.uploadedAt));
  return new Date(Math.max(...dates.map((d) => d.getTime())));
}

function getAnalysisSnippet(profile: CustomerProfile): string {
  if (!profile.interviews || profile.interviews.length === 0) return '—';
  const withAnalysis = profile.interviews
    .filter((interview) => interview.analysis && interview.analysis.trim().length > 0)
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

  const latest = withAnalysis[0];
  if (!latest || !latest.analysis) return '—';

  const text = latest.analysis.trim();
  if (text.length <= 160) return text;
  return `${text.slice(0, 157)}…`;
}

export function CustomerCard({ profile }: CustomerCardProps) {
  const lastDate = getLastInterviewDate(profile);
  const analysisSnippet = getAnalysisSnippet(profile);

  return (
    <Link href={`/customer/${profile.id}`} className="block group">
      <Card className="transition-shadow hover:shadow-lg">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-lg line-clamp-1">{profile.name}</h3>
            {profile.stakeholderType && (
              <Badge variant="secondary" className="shrink-0">
                {profile.stakeholderType}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Last interview:{' '}
            {lastDate ? lastDate.toLocaleDateString() : '—'}
          </p>
          <p className="text-sm line-clamp-2">
            <span className="font-medium">Latest analysis: </span>
            {analysisSnippet}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
