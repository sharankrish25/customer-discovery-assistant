'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CustomerProfile } from '@/types/models';

interface CustomerCardProps {
  profile: CustomerProfile;
}

function getLastInterviewDate(profile: CustomerProfile): string {
  if (profile.interviews.length === 0) return '—';
  const latest = Math.max(
    ...profile.interviews.map((interview) => new Date(interview.uploadedAt).getTime())
  );
  return new Date(latest).toLocaleDateString();
}

function getAnalysisSnippet(profile: CustomerProfile): string {
  const interview = profile.interviews[0];
  if (!interview?.analysis) {
    return 'No analysis available yet.';
  }
  const text = interview.analysis.analysis;
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
}

export function CustomerCard({ profile }: CustomerCardProps) {
  const lastDate = getLastInterviewDate(profile);
  const snippet = getAnalysisSnippet(profile);

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
            Last interview: {lastDate}
          </p>
          <p className="text-sm line-clamp-3">
            <span className="font-medium">Analysis snapshot: </span>
            {snippet}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
