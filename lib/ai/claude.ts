import "server-only";

export type ClaudeMessage = { role: "user" | "assistant"; content: string };

const API = "https://api.anthropic.com/v1/messages";

export const MODELS = {
  main: process.env.CLAUDE_MODEL ?? "claude-sonnet-5-5",
  fast: process.env.CLAUDE_FAST_MODEL ?? "claude-haiku-5-5",
};

/** One Claude call. Returns the text of the reply. */
export async function callClaude(opts: {
  system: string;
  messages: ClaudeMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set in Vercel.");
  const res = await fetch(API, {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: opts.model ?? MODELS.main,
      max_tokens: opts.maxTokens ?? 1024,
      temperature: opts.temperature ?? 0.5,
      system: opts.system,
      messages: opts.messages,
    }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { content: { type: string; text?: string }[] };
  return data.content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
}

/** Pulls the first JSON object out of a model reply (tolerates code fences or stray prose). */
export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON in model reply");
  return JSON.parse(text.slice(start, end + 1));
}
