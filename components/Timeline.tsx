'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { InterviewRecord } from '@/types/customer';

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
        const firstBullet = interview.results?.summary?.bullets?.[0];
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
                    {firstBullet && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {firstBullet}
                      </p>
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
