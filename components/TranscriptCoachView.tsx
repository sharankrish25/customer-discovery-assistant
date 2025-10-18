'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CoachingOutput, BookReference } from '@/types/ai';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TranscriptCoachViewProps {
  transcript: string;
  coaching: CoachingOutput | null;
}

interface HighlightSegment {
  text: string;
  mark?: {
    book: BookReference;
    reason: string;
    suggestion: string;
  };
}

// Book color mapping
const bookColors: Record<BookReference, { bg: string; text: string; badge: string }> = {
  'Talking to Humans': {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-900 dark:text-blue-100',
    badge: 'bg-blue-500',
  },
  'The Mom Test': {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-900 dark:text-amber-100',
    badge: 'bg-amber-500',
  },
  'Lean Customer Development': {
    bg: 'bg-violet-100 dark:bg-violet-900/30',
    text: 'text-violet-900 dark:text-violet-100',
    badge: 'bg-violet-500',
  },
  'The Lean Startup': {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-900 dark:text-green-100',
    badge: 'bg-green-500',
  },
};

function highlightSegments(
  transcript: string,
  coaching: CoachingOutput
): HighlightSegment[] {
  const segments: HighlightSegment[] = [];

  // Sort highlights by start_char to process in order
  const sortedHighlights = [...coaching.highlights].sort(
    (a, b) => a.start_char - b.start_char
  );

  let currentPos = 0;

  for (const highlight of sortedHighlights) {
    // Add text before this highlight
    if (currentPos < highlight.start_char) {
      segments.push({
        text: transcript.slice(currentPos, highlight.start_char),
      });
    }

    // Add the highlighted segment
    segments.push({
      text: transcript.slice(highlight.start_char, highlight.end_char),
      mark: {
        book: highlight.book,
        reason: highlight.reason,
        suggestion: highlight.suggestion,
      },
    });

    currentPos = highlight.end_char;
  }

  // Add remaining text
  if (currentPos < transcript.length) {
    segments.push({
      text: transcript.slice(currentPos),
    });
  }

  return segments;
}

export function TranscriptCoachView({ transcript, coaching }: TranscriptCoachViewProps) {
  if (!coaching) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <div className="mx-auto max-w-md space-y-3">
          <div className="text-4xl">💡</div>
          <h3 className="text-lg font-semibold">No Coaching Analysis Yet</h3>
          <p className="text-sm text-muted-foreground">
            Click "Analyze Interview Quality" above to get AI-powered feedback on your interview
            technique based on customer discovery best practices.
          </p>
        </div>
      </div>
    );
  }

  const segments = highlightSegments(transcript, coaching);

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm font-medium text-muted-foreground">Legend:</span>
        {(Object.keys(bookColors) as BookReference[]).map((book) => (
          <Badge
            key={book}
            variant="outline"
            className="gap-1.5"
          >
            <div className={`h-2 w-2 rounded-full ${bookColors[book].badge}`} />
            {book}
          </Badge>
        ))}
      </div>

      {/* Highlighted Transcript */}
      <Card>
        <CardHeader>
          <CardTitle>Transcript with Inline Feedback</CardTitle>
          <CardDescription>
            Hover over highlighted text to see specific suggestions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TooltipProvider>
            <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
              {segments.map((segment, index) => {
                if (segment.mark) {
                  const colors = bookColors[segment.mark.book];
                  return (
                    <Tooltip key={index}>
                      <TooltipTrigger asChild>
                        <mark
                          className={`cursor-help rounded px-1 ${colors.bg} ${colors.text}`}
                        >
                          {segment.text}
                        </mark>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <div className="space-y-1.5">
                          <div className="font-semibold">{segment.mark.book}</div>
                          <div className="text-xs opacity-75">
                            Issue: {segment.mark.reason.replace(/-/g, ' ')}
                          </div>
                          <div className="text-sm">{segment.mark.suggestion}</div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                }
                return <span key={index}>{segment.text}</span>;
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advice Cards */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Overall Advice</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {coaching.advice.map((item, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      bookColors[item.book].badge
                    }`}
                  />
                  {item.book}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm font-medium">What to improve:</div>
                  <p className="text-sm text-muted-foreground">
                    {item.what_to_improve}
                  </p>
                </div>
                <div>
                  <div className="text-sm font-medium">Example rewrite:</div>
                  <p className="text-sm italic text-muted-foreground">
                    "{item.example_rewrite}"
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
