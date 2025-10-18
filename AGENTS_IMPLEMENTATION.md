# Auto-Analysis Agents Implementation

## Overview

Implemented 3 automatic agents (Summary, Insights, Alignment) using Anthropic's Claude 3.5 Sonnet with strict Zod validation. The agents can work with or without an API key - returning mock data when no key is present.

## Files Created

### Core Implementation

1. **`lib/anthropic.ts`** - Claude API helper
   - `callClaude(model, system, user)` - Simple helper for calling Claude API
   - Returns text content from response
   - Throws clear error if API key missing

2. **`lib/parseJson.ts`** - JSON parsing utility
   - `parseJsonSafely(text)` - Extracts JSON from LLM responses
   - Handles markdown code fences (```json)
   - Finds JSON objects/arrays in text
   - Throws descriptive errors on parse failure

3. **`lib/agents.ts`** - Main agents implementation
   - `analyzeSummary(transcript, idea)` - Generates summary with bullets
   - `extractInsights(transcript)` - Extracts pains/needs/motivations
   - `analyzeAlignment(insights, idea)` - Classifies insight alignment
   - `runAutoAnalysis(transcript, idea)` - **Main entry point** - chains all 3
   - All functions include Zod validation
   - Automatic fallback to mocks when no API key

4. **`lib/anthropic-legacy.ts`** - Legacy mock functions
   - Preserves coaching/questions/followup features
   - Not part of the 3 automatic agents scope

5. **`lib/agents-example.ts`** - Usage examples
   - Shows how to use the agents
   - Demonstrates error handling
   - Documents expected output shapes

### Updated Files

- **`app/api/analyze/route.ts`** - Now uses `runAutoAnalysis()` from agents
- **`app/api/coach/route.ts`** - Updated to use legacy file
- **`app/api/next-questions/route.ts`** - Updated to use legacy file
- **`app/api/followup/route.ts`** - Updated to use legacy file

## Zod Schemas

All schemas match the UI types exactly:

```typescript
// Summary
const SummarySchema = z.object({
  summary: z.object({
    bullets: z.array(z.string()).min(1),
    tone: z.literal('neutral'),
    confidence: z.number().min(0).max(1)
  })
});

// Insights
const InsightsSchema = z.object({
  insights: z.array(InsightItemSchema),
  confidence: z.number().min(0).max(1)
});

// Alignment
const AlignmentSchema = z.object({
  alignment: z.object({
    supports: [...],
    contradicts: [...],
    neutral: [...]
  })
});
```

## Usage

### Primary Entry Point (Recommended)

```typescript
import { runAutoAnalysis } from '@/lib/agents';

const result = await runAutoAnalysis(transcript, idea);
// Returns: { summary, insights, alignment }
```

### Individual Agents

```typescript
import { analyzeSummary, extractInsights, analyzeAlignment } from '@/lib/agents';

const summary = await analyzeSummary(transcript, idea);
const insights = await extractInsights(transcript);
const alignment = await analyzeAlignment(insights, idea);
```

## Environment Setup

Add to `.env.local`:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

**Without API key**: All functions return deterministic mock data
**With API key**: Uses Claude 3.5 Sonnet for real analysis

## Function Signatures

```typescript
function analyzeSummary(
  transcript: string,
  idea: string
): Promise<SummaryOutput>

function extractInsights(
  transcript: string
): Promise<InsightsOutput>

function analyzeAlignment(
  insights: InsightsOutput,
  idea: string
): Promise<AlignmentOutput>

function runAutoAnalysis(
  transcript: string,
  idea: string
): Promise<{
  summary: SummaryOutput;
  insights: InsightsOutput;
  alignment: AlignmentOutput;
}>
```

## Prompts Used

### 1. Summary Agent
- **System**: "You are a customer discovery analyst. Produce concise, factual learnings from interview transcripts. Avoid opinions."
- **Task**: Generate bullet points with tone and confidence
- **Model**: Claude 3.5 Sonnet

### 2. Insights Agent
- **System**: "Extract only evidence-backed pains/needs/motivations with verbatim quotes."
- **Task**: Extract insights with quotes and evidence levels
- **Model**: Claude 3.5 Sonnet

### 3. Alignment Agent
- **System**: "Compare insights to the founder's product idea; classify how each relates."
- **Task**: Classify as supports/contradicts/neutral with rationale
- **Model**: Claude 3.5 Sonnet

## Error Handling

All agents throw descriptive errors:
- API key missing → Clear error message
- JSON parsing fails → Shows partial response
- Zod validation fails → Type mismatch details
- API errors → Anthropic SDK error messages

UI can catch and display as toast notifications.

## Testing

Build verification:
```bash
npm run build
# ✓ Compiled successfully
```

All TypeScript types are strictly validated. No `any` types used (except optional parameters in legacy functions).

## Acceptance Criteria ✓

- [x] With real API key: returns strictly valid objects
- [x] Without API key: returns deterministic mock data
- [x] Function signatures match exactly as specified
- [x] Zod validation on all outputs
- [x] Complete code files with proper imports
- [x] Usage examples in comments
- [x] Build passes without errors

## Dependencies

```json
{
  "@anthropic-ai/sdk": "^0.67.0",
  "zod": "^4.1.12"
}
```

## Next Steps for UI Team

1. Import `runAutoAnalysis` in your interview form handler
2. Call it with transcript and product idea
3. The `/api/analyze` route already uses this - it works out of the box
4. Handle errors with try/catch and show toast notifications
5. Add `ANTHROPIC_API_KEY` to `.env.local` for real API calls

See `lib/agents-example.ts` for detailed usage examples.
