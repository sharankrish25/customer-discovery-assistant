/**
 * EXAMPLE USAGE OF AGENTS
 *
 * This file demonstrates how to use the auto-analysis agents.
 * The agents will use real Claude API if ANTHROPIC_API_KEY is set,
 * otherwise they return deterministic mock data.
 */

import { runAutoAnalysis, analyzeSummary, extractInsights, analyzeAlignment } from './agents';

// Example transcript
const exampleTranscript = `
Interviewer: Thanks for taking the time to chat with me today. Can you tell me about how you currently handle customer feedback?

Customer: Sure! So I'm the product manager, and honestly, it's a bit of a mess. I spend probably 3-4 hours a week just trying to consolidate it all into a spreadsheet. We get feedback from everywhere - Slack, email, support tickets, Intercom messages...

Interviewer: Walk me through what happened the last time you had to make a prioritization decision.

Customer: Oh, last month we were deciding between two features. I had to go through literally hundreds of messages across different channels. The CEO asked me "how many customers asked for X" and I genuinely didn't know the exact number. I felt terrible - like I'm not doing my job well, even though I'm working really hard at it.

Interviewer: What would help you solve this?

Customer: Honestly, ideally it would just automatically gather everything and categorize it. Show me trends, maybe use AI or something to help me understand what's most important.
`;

const exampleIdea = 'AI-powered feedback aggregation tool that consolidates customer requests from multiple channels and quantifies demand';

// ============================================================================
// Example 1: Full auto-analysis (recommended)
// ============================================================================
async function example1_fullAnalysis() {
  console.log('=== Example 1: Full Auto-Analysis ===\n');

  try {
    const result = await runAutoAnalysis(exampleTranscript, exampleIdea);

    console.log('Summary bullets:', result.summary.summary.bullets);
    console.log('Summary confidence:', result.summary.summary.confidence);
    console.log('\nNumber of insights:', result.insights.insights.length);
    console.log('Insights confidence:', result.insights.confidence);
    console.log('\nAlignment supports:', result.alignment.alignment.supports.length);
    console.log('Alignment contradicts:', result.alignment.alignment.contradicts.length);
    console.log('Alignment neutral:', result.alignment.alignment.neutral.length);

    // Access specific data
    console.log('\n--- First Insight ---');
    const firstInsight = result.insights.insights[0];
    if (firstInsight) {
      console.log('Title:', firstInsight.title);
      console.log('Type:', firstInsight.type);
      console.log('Evidence level:', firstInsight.evidence_level);
      console.log('First quote:', firstInsight.quotes[0]?.text);
    }

    // Check alignment
    console.log('\n--- Alignment Details ---');
    if (result.alignment.alignment.supports.length > 0) {
      const firstSupport = result.alignment.alignment.supports[0];
      console.log('Supports:', firstSupport?.insight_title);
      console.log('Rationale:', firstSupport?.rationale);
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

// ============================================================================
// Example 2: Individual agents
// ============================================================================
async function example2_individualAgents() {
  console.log('\n\n=== Example 2: Individual Agents ===\n');

  try {
    // Step 1: Generate summary
    console.log('Calling analyzeSummary...');
    const summary = await analyzeSummary(exampleTranscript, exampleIdea);
    console.log('Got', summary.summary.bullets.length, 'bullet points');

    // Step 2: Extract insights
    console.log('\nCalling extractInsights...');
    const insights = await extractInsights(exampleTranscript);
    console.log('Extracted', insights.insights.length, 'insights');

    // Step 3: Analyze alignment
    console.log('\nCalling analyzeAlignment...');
    const alignment = await analyzeAlignment(insights, exampleIdea);
    console.log('Found', alignment.alignment.supports.length, 'supporting insights');
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

// ============================================================================
// Example 3: Error handling
// ============================================================================
async function example3_errorHandling() {
  console.log('\n\n=== Example 3: Error Handling ===\n');

  try {
    // This will work even without API key (returns mocks)
    const result = await runAutoAnalysis('Short transcript', 'Simple idea');
    console.log('Success! Got', result.summary.summary.bullets.length, 'bullets');
  } catch (error) {
    // If there's a real error (not just missing API key), handle it
    console.error('Failed to analyze:', error instanceof Error ? error.message : 'Unknown error');
    // UI can show a toast notification here
  }
}

// ============================================================================
// Run examples (uncomment to test)
// ============================================================================

// Uncomment these to run the examples:
// example1_fullAnalysis();
// example2_individualAgents();
// example3_errorHandling();

/*
Expected output shape:

{
  summary: {
    summary: {
      bullets: [
        "Customer manually consolidates feedback...",
        "Struggles with accurate prioritization...",
        ...
      ],
      tone: "neutral",
      confidence: 0.87
    }
  },
  insights: {
    insights: [
      {
        title: "Time-consuming manual aggregation process",
        type: "pain",
        quotes: [
          {
            text: "I spend probably 3-4 hours a week...",
            start_sec: 45
          }
        ],
        evidence_level: "high"
      },
      ...
    ],
    confidence: 0.82
  },
  alignment: {
    alignment: {
      supports: [
        {
          insight_title: "Time-consuming manual aggregation process",
          quote: "I spend probably 3-4 hours a week...",
          rationale: "Product idea directly addresses..."
        }
      ],
      contradicts: [],
      neutral: [...]
    }
  }
}
*/
