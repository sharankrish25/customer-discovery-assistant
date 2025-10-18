'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { InsightsOutput } from '@/types/ai';

interface HighlightedTranscriptProps {
  transcript: string;
  insights: InsightsOutput | null;
}

interface Highlight {
  start: number;
  end: number;
  color: string;
  insightTitle: string;
  insightType: string;
}

// Generate purple shades based on priority (darker = higher priority)
const PURPLE_SHADES = [
  'bg-purple-900 text-white',      // Highest priority (darkest)
  'bg-purple-800 text-white',
  'bg-purple-700 text-white',
  'bg-purple-600 text-white',
  'bg-purple-500 text-white',
  'bg-purple-400 text-gray-900',
  'bg-purple-300 text-gray-900',
  'bg-purple-200 text-gray-900',   // Lowest priority (lightest)
];

export function HighlightedTranscript({ transcript, insights }: HighlightedTranscriptProps) {
  const highlights = useMemo(() => {
    if (!insights || !insights.insights || insights.insights.length === 0) {
      return [];
    }

    const highlightsList: Highlight[] = [];

    // Sort insights by evidence level for priority (high > med > low)
    const priorityMap = { high: 0, med: 1, low: 2 };
    const sortedInsights = [...insights.insights].sort((a, b) => {
      return priorityMap[a.evidence_level] - priorityMap[b.evidence_level];
    });

    // Assign colors based on priority
    sortedInsights.forEach((insight, index) => {
      const colorIndex = Math.min(index, PURPLE_SHADES.length - 1);
      const color = PURPLE_SHADES[colorIndex];

      // Find all quotes for this insight in the transcript
      insight.quotes.forEach((quote) => {
        const quoteText = quote.text.trim();
        if (!quoteText) return;

        // Find all occurrences of this quote in the transcript
        const lowerTranscript = transcript.toLowerCase();
        const lowerQuote = quoteText.toLowerCase();

        let startIndex = 0;
        let foundIndex = lowerTranscript.indexOf(lowerQuote, startIndex);

        while (foundIndex !== -1) {
          highlightsList.push({
            start: foundIndex,
            end: foundIndex + quoteText.length,
            color,
            insightTitle: insight.title,
            insightType: insight.type,
          });

          startIndex = foundIndex + 1;
          foundIndex = lowerTranscript.indexOf(lowerQuote, startIndex);
        }
      });
    });

    // Sort highlights by start position
    return highlightsList.sort((a, b) => a.start - b.start);
  }, [transcript, insights]);

  const renderTranscript = useMemo(() => {
    if (highlights.length === 0) {
      return <pre className="whitespace-pre-wrap font-sans text-sm">{transcript}</pre>;
    }

    const segments: React.ReactElement[] = [];

    // Process each character position to handle overlapping highlights
    const charColors: { color: string; tooltip: string }[] = new Array(transcript.length).fill(null);

    highlights.forEach((highlight) => {
      for (let i = highlight.start; i < highlight.end && i < transcript.length; i++) {
        if (!charColors[i]) {
          charColors[i] = {
            color: highlight.color,
            tooltip: `${highlight.insightTitle} (${highlight.insightType})`,
          };
        } else {
          // Handle overlapping highlights by splitting the color
          const existingColor = charColors[i].color;
          const newColor = highlight.color;

          // Create a gradient or striped effect for overlaps
          if (existingColor !== newColor) {
            charColors[i] = {
              color: `${existingColor} ${newColor}`,
              tooltip: `${charColors[i].tooltip} | ${highlight.insightTitle} (${highlight.insightType})`,
            };
          }
        }
      }
    });

    // Build segments based on color changes
    let currentColor: string | null = null;
    let currentTooltip: string | null = null;
    let segmentStart = 0;

    for (let i = 0; i <= transcript.length; i++) {
      const charColor = i < transcript.length ? charColors[i] : null;
      const color = charColor?.color || null;
      const tooltip = charColor?.tooltip || null;

      if (color !== currentColor || tooltip !== currentTooltip) {
        // Render the previous segment
        if (segmentStart < i) {
          const text = transcript.slice(segmentStart, i);
          if (currentColor && currentTooltip) {
            // Check if it's a multi-color (overlapping highlights)
            const colors = currentColor.split(' ').filter(c => c.startsWith('bg-'));

            if (colors.length > 1) {
              // Multiple colors - create a split highlight
              segments.push(
                <span
                  key={`seg-${segmentStart}`}
                  className={`${colors[0]} inline-block relative group cursor-help`}
                  style={{
                    backgroundImage: `linear-gradient(135deg, transparent 45%, ${colors[1].replace('bg-', '#')} 45%, ${colors[1].replace('bg-', '#')} 55%, transparent 55%)`,
                    backgroundSize: '4px 4px',
                  }}
                  title={currentTooltip}
                >
                  {text}
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                    {currentTooltip}
                  </span>
                </span>
              );
            } else {
              // Single color
              segments.push(
                <span
                  key={`seg-${segmentStart}`}
                  className={`${currentColor} px-0.5 rounded group cursor-help relative`}
                  title={currentTooltip}
                >
                  {text}
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                    {currentTooltip}
                  </span>
                </span>
              );
            }
          } else {
            segments.push(<span key={`seg-${segmentStart}`}>{text}</span>);
          }
        }

        currentColor = color;
        currentTooltip = tooltip;
        segmentStart = i;
      }
    }

    return <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{segments}</pre>;
  }, [transcript, highlights]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Transcript</span>
          {highlights.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              {highlights.length} insight{highlights.length !== 1 ? 's' : ''} highlighted
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-96 overflow-y-auto rounded-md bg-muted p-4">
          {renderTranscript}
        </div>

        {/* Legend */}
        {insights && insights.insights && insights.insights.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-semibold mb-2">Highlighted Insights:</h4>
            <div className="space-y-1">
              {insights.insights.map((insight, index) => {
                const colorIndex = Math.min(index, PURPLE_SHADES.length - 1);
                const color = PURPLE_SHADES[colorIndex];
                return (
                  <div key={insight.title} className="flex items-center gap-2 text-sm">
                    <span className={`${color} px-2 py-0.5 rounded text-xs`}>
                      {insight.type}
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span>{insight.title}</span>
                    <span className="text-xs text-muted-foreground">
                      ({insight.evidence_level} evidence)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
