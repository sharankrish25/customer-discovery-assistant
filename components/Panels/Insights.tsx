import { InsightItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface InsightsProps {
  insights: InsightItem[] | null;
}

export function Insights({ insights }: InsightsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Insights</CardTitle>
      </CardHeader>
      <CardContent>
        {insights && insights.length > 0 ? (
          <div className="space-y-4">
            {insights.map((item, index) => (
              <div key={index} className="space-y-1">
                <p className="text-sm font-medium">{item.insight}</p>
                <blockquote className="border-l-2 pl-3 text-sm italic text-muted-foreground">
                  &quot;{item.supportingQuote}&quot;
                </blockquote>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No insights available yet. Analysis pending.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
