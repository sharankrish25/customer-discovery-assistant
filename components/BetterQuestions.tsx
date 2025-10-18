'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { BetterQuestionsOutput } from '@/types/ai';

interface BetterQuestionsProps {
  data: BetterQuestionsOutput | null;
}

// Map question "why" to short label and color
const whyStyles: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  'TH: story depth': { label: 'TH', variant: 'default' },
  'LCD: frequency/workflow/alternative': { label: 'LCD', variant: 'secondary' },
  'TMT: past-behavior': { label: 'TMT', variant: 'outline' },
};

export function BetterQuestions({ data }: BetterQuestionsProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!data) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <div className="mx-auto max-w-md space-y-3">
          <div className="text-4xl">❓</div>
          <h3 className="text-lg font-semibold">No Questions Generated Yet</h3>
          <p className="text-sm text-muted-foreground">
            Click "Generate Better Questions" above to get AI-suggested follow-up questions based
            on customer discovery best practices (Talking to Humans, The Mom Test, Lean Customer
            Development).
          </p>
        </div>
      </div>
    );
  }

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      toast.error('Failed to copy');
      console.error(error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Better Questions to Ask</h3>
        <div className="flex gap-2 text-xs text-muted-foreground">
          <span>
            <Badge variant="default" className="mr-1">TH</Badge>
            Talking to Humans
          </span>
          <span>
            <Badge variant="secondary" className="mr-1">LCD</Badge>
            Lean Customer Development
          </span>
          <span>
            <Badge variant="outline" className="mr-1">TMT</Badge>
            The Mom Test
          </span>
        </div>
      </div>

      <ol className="space-y-4">
        {data.questions.map((q, index) => {
          const whyInfo = whyStyles[q.why] || { label: q.why, variant: 'outline' as const };
          const isCopied = copiedIndex === index;

          return (
            <li
              key={index}
              className="group flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {index + 1}
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-sm leading-relaxed">{q.text}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant={whyInfo.variant} className="text-xs">
                    {whyInfo.label}
                  </Badge>
                  {q.linked_to && (
                    <>
                      <span>•</span>
                      <span>Linked to: {q.linked_to}</span>
                    </>
                  )}
                  <span>•</span>
                  <span className="capitalize">{q.style.replace('-', ' ')}</span>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleCopy(q.text, index)}
                className="shrink-0 opacity-0 group-hover:opacity-100"
              >
                {isCopied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </li>
          );
        })}
      </ol>

      <p className="text-xs text-muted-foreground">
        💡 Tip: These questions follow best practices from customer discovery literature to dig
        deeper into past behavior and avoid hypothetical responses.
      </p>
    </div>
  );
}
