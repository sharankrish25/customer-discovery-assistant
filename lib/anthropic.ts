import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

const DEFAULT_MODEL = "claude-3-5-sonnet-20241022";
const MAX_TOKENS = 16000;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Call Claude API with a system prompt and user message
 */
export async function callClaude(
  systemPrompt: string,
  userMessage: string,
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Missing ANTHROPIC_API_KEY environment variable");
  }

  const response = await anthropic.messages.create({
    model: options?.model || DEFAULT_MODEL,
    max_tokens: options?.maxTokens || MAX_TOKENS,
    temperature: options?.temperature ?? 1.0,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: userMessage,
      },
    ],
  });

  const firstBlock = response.content[0];
  if (firstBlock.type === "text") {
    return firstBlock.text;
  }

  throw new Error("Unexpected response format from Claude");
}

/**
 * Load a prompt template from the prompts directory
 */
export function loadPrompt(promptName: string): string {
  const promptPath = path.join(process.cwd(), "prompts", `${promptName}.txt`);

  try {
    return fs.readFileSync(promptPath, "utf-8");
  } catch (error) {
    throw new Error(
      `Failed to load prompt "${promptName}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Parse JSON from Claude's response, handling markdown code fences
 */
export function parseClaudeJSON<T>(response: string): T {
  // Remove markdown code fences if present
  let cleaned = response.trim();

  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/,  "").replace(/```\s*$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/```\s*$/, "");
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch (error) {
    throw new Error(
      `Failed to parse JSON from Claude response: ${
        error instanceof Error ? error.message : String(error)
      }\n\nResponse was:\n${response.substring(0, 500)}`
    );
  }
}
