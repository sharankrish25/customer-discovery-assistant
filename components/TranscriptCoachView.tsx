'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CoachingOutput, CoachingBook } from '@/types/ai';
import { BookOpen } from 'lucide-react';

interface TranscriptCoachViewProps {
  transcript: string;
  coaching: CoachingOutput | null;
}

interface HighlightSegment {
  text: string;
  mark?: {
    book: CoachingBook;
    reason: string;
    suggestion: string;
  };
}

// Color mapping for each book
const BOOK_COLORS: Record<CoachingBook, { bg: string; text: string; border: string }> = {
  'Talking to Humans': {
    bg: 'bg-blue-100 dark:bg-blue-950/30',
    text: 'text-blue-900 dark:text-blue-100',
    border: 'border-blue-300 dark:border-blue-700',
  },
  'The Mom Test': {
    bg: 'bg-amber-100 dark:bg-amber-950/30',
    text: 'text-amber-900 dark:text-amber-100',
    border: 'border-amber-300 dark:border-amber-700',
  },
  'Lean Customer Development': {
    bg: 'bg-violet-100 dark:bg-violet-950/30',
    text: 'text-violet-900 dark:text-violet-100',
    border: 'border-violet-300 dark:border-violet-700',
  },
  'The Lean Startup': {
    bg: 'bg-green-100 dark:bg-green-950/30',
    text: 'text-green-900 dark:text-green-100',
    border: 'border-green-300 dark:border-green-700',
  },
};

/**
 * Helper function to convert transcript + highlights into renderable segments
 */
function highlightSegments(
  transcript: string,
  highlights: CoachingOutput['highlights']
): HighlightSegment[] {
  if (highlights.length === 0) {
    return [{ text: transcript }];
  }

  // Sort highlights by start position
  const sorted = [...highlights].sort((a, b) => a.start_char - b.start_char);

  const segments: HighlightSegment[] = [];
  let lastIndex = 0;

  for (const highlight of sorted) {
    // Add text before this highlight
    if (highlight.start_char > lastIndex) {
      segments.push({
        text: transcript.slice(lastIndex, highlight.start_char),
      });
    }

    // Add highlighted text
    segments.push({
      text: transcript.slice(highlight.start_char, highlight.end_char),
      mark: {
        book: highlight.book,
        reason: highlight.reason,
        suggestion: highlight.suggestion,
      },
    });

    lastIndex = highlight.end_char;
  }

  // Add remaining text
  if (lastIndex < transcript.length) {
    segments.push({
      text: transcript.slice(lastIndex),
    });
  }

  return segments;
}

export function TranscriptCoachView({ transcript, coaching }: TranscriptCoachViewProps) {
  if (!coaching) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Coaching Analysis Yet</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Run &ldquo;Analyze Interview Quality&rdquo; to get feedback on your interview technique
            based on 4 customer discovery books.
          </p>
        </CardContent>
      </Card>
    );
  }

  const segments = highlightSegments(transcript, coaching.highlights);

  return (
    <div className="space-y-6">
      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Book Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(BOOK_COLORS).map(([book, colors]) => (
              <Badge
                key={book}
                variant="outline"
                className={`${colors.bg} ${colors.text} ${colors.border}`}
              >
                {book}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transcript with Highlights */}
      <Card>
        <CardHeader>
          <CardTitle>Annotated Transcript</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
              {segments.map((segment, idx) =>
                segment.mark ? (
                  <span
                    key={idx}
                    className={`relative inline-block ${BOOK_COLORS[segment.mark.book].bg} ${BOOK_COLORS[segment.mark.book].text} px-1 rounded cursor-help group`}
                    title={`${segment.mark.book} • ${segment.mark.reason}\n${segment.mark.suggestion}`}
                  >
                    {segment.text}
                    <span className="invisible group-hover:visible absolute bottom-full left-0 mb-2 w-64 p-2 bg-popover text-popover-foreground text-xs rounded shadow-lg border z-10">
                      <strong className="block mb-1">{segment.mark.book}</strong>
                      <em className="block mb-1 text-muted-foreground">
                        {segment.mark.reason}
                      </em>
                      <p>{segment.mark.suggestion}</p>
                    </span>
                  </span>
                ) : (
                  <span key={idx}>{segment.text}</span>
                )
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advice Cards */}
      {coaching.advice.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Improvement Advice</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {coaching.advice.map((item, idx) => {
              const colors = BOOK_COLORS[item.book];
              return (
                <Card key={idx} className={`${colors.border} border-2`}>
                  <CardHeader>
                    <Badge
                      variant="outline"
                      className={`${colors.bg} ${colors.text} w-fit`}
                    >
                      {item.book}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-1">What to improve:</p>
                      <p className="text-sm text-muted-foreground">
                        {item.what_to_improve}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Example rewrite:</p>
                      <p className="text-sm italic text-muted-foreground">
                        &ldquo;{item.example_rewrite}&rdquo;
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
