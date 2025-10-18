'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CustomerProfile } from '@/types/models';

interface CustomerCardProps {
  profile: CustomerProfile;
}

function getLastInterviewDate(profile: CustomerProfile): string {
  if (!profile.interviews || profile.interviews.length === 0) return '—';
  const dates = profile.interviews.map((i) => new Date(i.uploadedAt));
  const latest = new Date(Math.max(...dates.map((d) => d.getTime())));
  return latest.toLocaleDateString();
}

function getKeyInsightSnippet(profile: CustomerProfile): string {
  const interview = profile.interviews[0];
  if (!interview) return '—';
  const insightsData = interview.insights;
  if (!insightsData || !insightsData.insights || insightsData.insights.length === 0) return '—';
  const first = insightsData.insights[0];
  return first.title || first.quotes?.[0]?.text || '—';
}

export function CustomerCard({ profile }: CustomerCardProps) {
  const lastDate = getLastInterviewDate(profile);
  const keyInsight = getKeyInsightSnippet(profile);

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
            {lastDate ? new Date(lastDate).toLocaleDateString() : '—'}
          </p>
          <p className="text-sm line-clamp-2">
            <span className="font-medium">Key insight: </span>
            {keyInsight}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
