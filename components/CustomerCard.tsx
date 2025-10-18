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

function getAnalysisPreview(profile: CustomerProfile): string {
  const latestInterview = profile.interviews
    .slice()
    .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())[0];
  if (!latestInterview || !latestInterview.analysis) {
    return 'Analysis pending';
  }
  const firstLine = latestInterview.analysis.split('\n').find((line) => line.trim().length > 0);
  return firstLine ?? 'Analysis pending';
}

export function CustomerCard({ profile }: CustomerCardProps) {
  const lastDate = getLastInterviewDate(profile);
  const analysisPreview = getAnalysisPreview(profile);

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
          <p className="text-sm line-clamp-3">
            <span className="font-medium">Analysis: </span>
            {analysisPreview}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
