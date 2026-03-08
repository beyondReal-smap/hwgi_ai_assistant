import { describe, it, expect } from "vitest";
import { extractJson } from "@/lib/openai-service";

describe("extractJson", () => {
  it("parses plain JSON", () => {
    const result = extractJson<{ intent: string }>('{"intent":"birthday"}');
    expect(result.intent).toBe("birthday");
  });

  it("strips markdown code fences", () => {
    const result = extractJson<{ a: number }>("```json\n{\"a\":42}\n```");
    expect(result.a).toBe(42);
  });

  it("extracts JSON from surrounding text", () => {
    const result = extractJson<{ x: string }>("Here is the result: {\"x\":\"hello\"} done.");
    expect(result.x).toBe("hello");
  });

  it("throws on empty input", () => {
    expect(() => extractJson("")).toThrow("Empty LLM response");
  });

  it("throws on whitespace-only input", () => {
    expect(() => extractJson("   ")).toThrow("Empty LLM response");
  });

  it("throws on invalid JSON", () => {
    expect(() => extractJson("not json at all")).toThrow();
  });

  it("handles nested JSON objects", () => {
    const result = extractJson<{ messages: Array<{ type: string }> }>(
      '{"messages":[{"type":"안내형"},{"type":"감성형"}]}'
    );
    expect(result.messages).toHaveLength(2);
    expect(result.messages[0].type).toBe("안내형");
  });
});
