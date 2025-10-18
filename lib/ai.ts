import Anthropic from "@anthropic-ai/sdk";

const DEFAULT_MODEL = process.env.CLAUDE_MODEL ?? "claude-3-5-sonnet-20241022";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ClaudeAnalysis {
  analysis: string;
}

export async function callClaude(prompt: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Missing ANTHROPIC_API_KEY environment variable");
  }

  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 1024,
    temperature: 0,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const text = response.content
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Claude returned an empty response");
  }

  return text;
}
