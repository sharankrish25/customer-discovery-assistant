# Optional Actions API Documentation

This document describes the three optional action APIs available for customer discovery interviews:
1. **Coaching** - Get feedback on interview technique
2. **Next Questions** - Generate smart follow-up questions
3. **Follow-up Email** - Create professional thank-you emails

## Prerequisites

Ensure your `.env.local` file contains:
```bash
ANTHROPIC_API_KEY=your_api_key_here
```

All APIs use Claude 3.5 Sonnet for generation.

---

## 1. Coaching API

**Endpoint:** `POST /api/coach`

Analyzes interview transcripts using four foundational books to identify problematic questions and provide specific coaching feedback.

### Books Referenced
1. **The Mom Test** (Rob Fitzpatrick) - Focus on past behavior, avoid fluff
2. **Talking to Humans** (Giff Constable) - Open-ended questions, story elicitation
3. **Lean Customer Development** (Cindy Alvarez) - Current behavior over hypotheticals
4. **The Lean Startup** (Eric Ries) - Validated learning, actionable metrics

### Request

```json
{
  "transcript": "string (required) - Full interview transcript",
  "productIdea": "string (required) - Brief description of what you're building"
}
```

### Response

```json
{
  "ok": true,
  "data": {
    "highlights": [
      {
        "span_text": "exact text from transcript (≤180 chars)",
        "reason": "seeking-compliment | fluff-hypothetical | closed-question | etc.",
        "book": "The Mom Test | Talking to Humans | etc.",
        "suggestion": "specific improvement suggestion",
        "start_char": 145,
        "end_char": 178
      }
    ],
    "advice": [
      {
        "book": "which book this advice comes from",
        "what_to_improve": "specific pattern to improve",
        "example_rewrite": "concrete example of better phrasing"
      }
    ]
  }
}
```

### Example Usage

```javascript
const response = await fetch('/api/coach', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    transcript: "Interviewer: Do you think this is a good idea?\nCustomer: Yeah, it sounds cool!",
    productIdea: "AI-powered customer interview analysis tool"
  })
});

const result = await response.json();
```

### Common Signals Detected

**The Mom Test:**
- `seeking-compliment` - Asking for opinions about your idea
- `fluff-hypothetical` - "Would you...", "If we built..."
- `fluff-generic-claim` - "I always...", "Everyone says..."
- `past-behavior-good` ✓ - "Last time that happened..."

**Talking to Humans:**
- `closed-question` - Yes/no questions
- `seeking-validation` - Questions confirming beliefs
- `open-ended-elaboration` ✓ - "Tell me about..."

**Lean Customer Development:**
- `wishing-question` - "Magic wand" questions
- `seeking-current-behavior` ✓ - "What tools do you use?"
- `cost-or-time-pain-check` ✓ - "How much does this cost you?"

**The Lean Startup:**
- `vanity-metric-citation` - "Total users", "Hits this month"
- `actionable-metric-focus` ✓ - Conversion rates, cohorts

---

## 2. Next Questions API

**Endpoint:** `POST /api/next-questions`

Generates 3-6 smart follow-up questions grounded in the interview to deepen understanding and validate assumptions.

### Request

```json
{
  "transcript": "string (required) - Full interview transcript",
  "productIdea": "string (required) - What you're building",
  "analysis": "string (optional) - Interview analysis/insights",
  "coachingFeedback": "object (optional) - Output from coaching API"
}
```

### Response

```json
{
  "ok": true,
  "data": {
    "questions": [
      {
        "text": "The specific question to ask",
        "linked_to": "insight title from analysis OR 'gap'",
        "why": "Why this question matters (1-2 sentences)",
        "style": "past-behavior | quantification | prioritization | context | gap-filling"
      }
    ]
  }
}
```

### Question Styles

1. **past-behavior** - "Walk me through the last time..."
2. **quantification** - "How often/much/many..."
3. **prioritization** - "Which matters more to you..."
4. **context** - "Who else is involved...", "What would prevent..."
5. **gap-filling** - Exploring unexplored areas

### Example Usage

```javascript
const response = await fetch('/api/next-questions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    transcript: "...",
    productIdea: "Task management for remote teams",
    analysis: "Customer mentioned spending 3 hours/week on manual status updates",
    coachingFeedback: { /* optional coaching data */ }
  })
});

const result = await response.json();
// Use result.data.questions to display to user
```

---

## 3. Follow-up Email API

**Endpoint:** `POST /api/followup`

Generates professional, personalized thank-you emails after customer interviews.

### Request

```json
{
  "customerName": "string (required) - Person you interviewed",
  "customerContext": "string (optional) - Their role, company",
  "conversationHighlights": "string (required) - Key insights from interview",
  "productIdea": "string (optional) - What you're building",
  "nextSteps": "string (optional) - What you want from them",
  "tone": "string (optional) - 'professional' | 'friendly' | 'casual' (default: 'friendly')",
  "includeFollowupQuestions": "boolean (optional) - Ask for second conversation"
}
```

### Response

```json
{
  "ok": true,
  "data": {
    "subject": "Email subject line",
    "body": "Full email body text",
    "notes": "Optional: brief note about tone/approach used"
  }
}
```

### Example Usage

```javascript
const response = await fetch('/api/followup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerName: "Sarah Chen",
    customerContext: "Product Manager at TechCorp",
    conversationHighlights: "Spends 5+ hours weekly on manual reporting. Already tried 3 tools but they created more work.",
    productIdea: "Automated reporting tool for PMs",
    nextSteps: "Would like 15-minute follow-up to ask about data sources",
    tone: "friendly",
    includeFollowupQuestions: true
  })
});

const result = await response.json();
console.log(result.data.subject); // "Thanks for sharing your workflow insights"
console.log(result.data.body);    // Full email text
```

### Email Principles

The generated emails will:
- ✓ Be genuinely grateful and specific
- ✓ Demonstrate you listened (recap key insights)
- ✓ Keep it concise (100-250 words)
- ✓ Make next steps clear
- ✓ Maintain authenticity

---

## Error Handling

All APIs follow the same error response pattern:

```json
{
  "ok": false,
  "error": {
    "message": "Description of what went wrong"
  }
}
```

### Common Error Cases

**400 Bad Request:**
- Missing required fields
- Invalid field types

**500 Internal Server Error:**
- Anthropic API errors
- Prompt loading failures
- JSON parsing failures
- Missing `ANTHROPIC_API_KEY`

### Error Handling Example

```javascript
try {
  const response = await fetch('/api/coach', { /* ... */ });
  const result = await response.json();

  if (!result.ok) {
    console.error('API Error:', result.error.message);
    // Handle error in UI
    return;
  }

  // Use result.data
} catch (error) {
  console.error('Network error:', error);
}
```

---

## Integration Example

Here's how to integrate all three optional actions into an interview detail page:

```typescript
// After user completes an interview
const interview = {
  transcript: "...",
  productIdea: "...",
  analysis: "..."
};

// 1. Get coaching feedback
const coachingResponse = await fetch('/api/coach', {
  method: 'POST',
  body: JSON.stringify({
    transcript: interview.transcript,
    productIdea: interview.productIdea
  })
});
const coaching = await coachingResponse.json();

// 2. Generate follow-up questions
const questionsResponse = await fetch('/api/next-questions', {
  method: 'POST',
  body: JSON.stringify({
    transcript: interview.transcript,
    productIdea: interview.productIdea,
    analysis: interview.analysis,
    coachingFeedback: coaching.data
  })
});
const questions = await questionsResponse.json();

// 3. Generate thank-you email
const emailResponse = await fetch('/api/followup', {
  method: 'POST',
  body: JSON.stringify({
    customerName: "Sarah Chen",
    conversationHighlights: interview.analysis,
    productIdea: interview.productIdea,
    tone: "friendly"
  })
});
const email = await emailResponse.json();

// Display all three in your UI
```

---

## Performance Notes

- **Typical Response Times:**
  - Coaching: 8-15 seconds (analyzing full transcript)
  - Next Questions: 5-10 seconds (generating 3-6 questions)
  - Follow-up Email: 3-7 seconds (composing email)

- **Rate Limits:** Subject to Anthropic API rate limits (contact Anthropic for details)

- **Recommendations:**
  - Show loading states for all API calls
  - Consider running APIs in parallel where possible
  - Cache results to avoid redundant calls
  - Handle timeouts gracefully (set timeout > 30s)

---

## Prompt Customization

All prompts are stored in the `/prompts` directory:

- `coaching-system.txt` - Comprehensive diagnostic rubric
- `questions-generator.txt` - Question generation guidelines
- `followup-email.txt` - Email writing principles

You can customize these prompts to match your specific use case or coaching philosophy.

---

## Testing

To test the APIs locally:

```bash
# Start development server
npm run dev

# Test coaching API
curl -X POST http://localhost:3000/api/coach \
  -H "Content-Type: application/json" \
  -d '{"transcript":"...","productIdea":"..."}'

# Test questions API
curl -X POST http://localhost:3000/api/next-questions \
  -H "Content-Type: application/json" \
  -d '{"transcript":"...","productIdea":"...","analysis":"..."}'

# Test followup email API
curl -X POST http://localhost:3000/api/followup \
  -H "Content-Type: application/json" \
  -d '{"customerName":"...","conversationHighlights":"..."}'
```

---

## Security Considerations

1. **API Key Protection:** Never expose `ANTHROPIC_API_KEY` to client-side code
2. **Input Validation:** All inputs are validated before processing
3. **Rate Limiting:** Consider implementing rate limiting for production use
4. **Error Messages:** Error messages don't expose sensitive implementation details

---

## Support

For issues or questions about the optional actions:
1. Check the error message in the API response
2. Verify your `ANTHROPIC_API_KEY` is set correctly
3. Review the prompt files in `/prompts` directory
4. Check the Next.js server logs for detailed error traces
