import { SummaryOutput } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SummaryProps {
  summary: SummaryOutput | null;
}

export function Summary({ summary }: SummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Summary</CardTitle>
      </CardHeader>
      <CardContent>
        {summary ? (
          <ul className="list-disc space-y-2 pl-5">
            {summary.bullets.map((bullet, index) => (
              <li key={index} className="text-sm">
                {bullet}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No summary available yet. Analysis pending.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
