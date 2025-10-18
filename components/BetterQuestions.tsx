'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Check, Lightbulb } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { BetterQuestionsOutput } from '@/types/ai';

interface BetterQuestionsProps {
  data: BetterQuestionsOutput | null;
}

const WHY_COLORS: Record<string, string> = {
  'TH: story depth': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'LCD: frequency/workflow/alternative':
    'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
  'TMT: past-behavior': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
};

export function BetterQuestions({ data }: BetterQuestionsProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Questions Generated Yet</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Generate better follow-up questions based on your interview insights
            and coaching feedback.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleCopy = async (question: string, index: number) => {
    try {
      await navigator.clipboard.writeText(question);
      setCopiedIndex(index);
      toast.success('Question copied to clipboard!');
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      toast.error('Failed to copy question');
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              Better Questions ({data.questions.length})
            </h3>
            <p className="text-sm text-muted-foreground">
              Past-behavior focused questions
            </p>
          </div>

          <ol className="space-y-4">
            {data.questions.map((question, idx) => (
              <li key={idx} className="flex gap-3">
                <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  {idx + 1}
                </span>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium leading-relaxed">{question.text}</p>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Badge variant="outline" className={WHY_COLORS[question.why]}>
                      {question.why}
                    </Badge>
                    {question.linked_to && (
                      <Badge variant="secondary" className="text-xs">
                        → {question.linked_to}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(question.text, idx)}
                      className="ml-auto"
                    >
                      {copiedIndex === idx ? (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
