'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CustomerProfile } from '@/types/customer';
import { getLastInterviewDate, getKeyInsightSnippet } from '@/lib/storage';

interface CustomerCardProps {
  profile: CustomerProfile;
}

export function CustomerCard({ profile }: CustomerCardProps) {
  const lastDate = getLastInterviewDate(profile);
  const keyInsight = profile.interviews[0]
    ? getKeyInsightSnippet(profile.interviews[0])
    : '—';

  return (
    <Link href={`/customer/${profile.id}`} className="block group">
      <Card className="transition-shadow hover:shadow-lg">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-lg line-clamp-1">{profile.name}</h3>
            <Badge variant="secondary" className="shrink-0">
              {profile.role || profile.stakeholderType}
            </Badge>
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
