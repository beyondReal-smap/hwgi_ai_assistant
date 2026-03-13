import OpenAI from "openai";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const LLM_TIMEOUT_MS = 30_000;

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export interface CallLlmOptions {
  maxTokens?: number;
  systemPrompt?: string;
  jsonMode?: boolean;
  timeoutMs?: number;
}

/** Hard timeout wrapper — always resolves or rejects within the given ms. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

/**
 * Call OpenAI with automatic Responses API -> Chat Completions fallback.
 * Returns the raw text output from the model.
 */
export async function callLlm(prompt: string, options: CallLlmOptions = {}): Promise<string> {
  const { maxTokens = 1500, systemPrompt, jsonMode, timeoutMs = LLM_TIMEOUT_MS } = options;

  // Try Responses API first
  try {
    const controller = new AbortController();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responsesPromise = (getOpenAI() as any).responses.create(
      {
        model: MODEL,
        input: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
      },
      { signal: controller.signal },
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await withTimeout(responsesPromise, timeoutMs, "Responses API");

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
  } catch (err) {
    console.warn("[callLlm] Responses API failed, trying Chat Completions:", (err as Error).message);
  }

  // Fallback to Chat Completions API
  try {
    const controller2 = new AbortController();
    const messages: Array<{ role: "system" | "user"; content: string }> = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const completionPromise = getOpenAI().chat.completions.create(
      {
        model: MODEL,
        messages,
        max_completion_tokens: maxTokens,
        ...(jsonMode ? { response_format: { type: "json_object" as const } } : {}),
      },
      { signal: controller2.signal },
    );

    const completion = await withTimeout(completionPromise, timeoutMs, "Chat Completions API");
    return completion.choices[0]?.message?.content ?? "";
  } catch (err) {
    console.error("[callLlm] Chat Completions also failed:", (err as Error).message);
    throw err;
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
