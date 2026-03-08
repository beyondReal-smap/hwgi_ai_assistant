import OpenAI from "openai";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const LLM_TIMEOUT_MS = 15_000;

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export interface CallLlmOptions {
  maxTokens?: number;
  systemPrompt?: string;
  jsonMode?: boolean;
  timeoutMs?: number;
}

/**
 * Call OpenAI with automatic Responses API -> Chat Completions fallback.
 * Returns the raw text output from the model.
 */
export async function callLlm(prompt: string, options: CallLlmOptions = {}): Promise<string> {
  const { maxTokens = 1500, systemPrompt, jsonMode, timeoutMs = LLM_TIMEOUT_MS } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Try Responses API first (for newer models like gpt-5, gpt-4.1)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (getOpenAI() as any).responses.create(
      {
        model: MODEL,
        input: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
      },
      { signal: controller.signal }
    );

    if (typeof response?.output_text === "string") return response.output_text;
    if (Array.isArray(response?.output)) {
      for (const item of response.output) {
        if (item?.type === "message" && Array.isArray(item?.content)) {
          for (const c of item.content) {
            if (c?.type === "output_text" && typeof c?.text === "string") return c.text;
          }
        }
      }
    }
    return "";
  } catch {
    // Fallback to Chat Completions API
    const messages: Array<{ role: "system" | "user"; content: string }> = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const completion = await getOpenAI().chat.completions.create(
      {
        model: MODEL,
        messages,
        max_completion_tokens: maxTokens,
        ...(jsonMode ? { response_format: { type: "json_object" as const } } : {}),
      },
      { signal: controller.signal }
    );
    return completion.choices[0]?.message?.content ?? "";
  } finally {
    clearTimeout(timer);
  }
}

/** Strip markdown code fences and extract JSON object/array from raw LLM output. */
export function extractJson<T = unknown>(raw: string): T {
  if (!raw || raw.trim().length === 0) throw new Error("Empty LLM response");
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  const jsonMatch = stripped.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : stripped;
  return JSON.parse(jsonStr) as T;
}
