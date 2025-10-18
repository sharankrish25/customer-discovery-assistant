import { InsightItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface InsightsProps {
  insights: InsightItem[] | null;
}

// Type label mapping for better display
const TYPE_LABELS: Record<string, string> = {
  existing_process: 'Existing Process',
  motivation: 'Motivation',
  unmet_need: 'Unmet Need',
  pain_magnitude: 'Pain Magnitude',
  past_attempt: 'Past Attempt',
};

// Type color mapping
const TYPE_COLORS: Record<string, string> = {
  existing_process: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  motivation: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  unmet_need: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  pain_magnitude: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  past_attempt: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

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
              <div key={index} className="space-y-2">
                <div className="flex items-start gap-2">
                  {item.type && (
                    <Badge variant="outline" className={TYPE_COLORS[item.type] || ''}>
                      {TYPE_LABELS[item.type] || item.type}
                    </Badge>
                  )}
                  <p className="text-sm font-medium flex-1">{item.insight}</p>
                </div>
                <blockquote className="border-l-2 pl-3 text-sm italic text-muted-foreground">
                  &quot;{item.supportingQuote}&quot;
                </blockquote>
                {item.whyItMatters && (
                  <p className="text-xs text-muted-foreground pl-3">
                    💡 {item.whyItMatters}
                  </p>
                )}
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
