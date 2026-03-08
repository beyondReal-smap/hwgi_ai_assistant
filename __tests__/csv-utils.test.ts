import { describe, it, expect } from "vitest";
import { parseCsvLine, toYmd, fuzzyScore } from "@/lib/csv-utils";

describe("parseCsvLine", () => {
  it("splits simple comma-separated values", () => {
    expect(parseCsvLine("a,b,c")).toEqual(["a", "b", "c"]);
  });

  it("handles quoted fields", () => {
    expect(parseCsvLine('"hello","world"')).toEqual(["hello", "world"]);
  });

  it("handles quoted fields with commas", () => {
    expect(parseCsvLine('"a,b",c,"d,e"')).toEqual(["a,b", "c", "d,e"]);
  });

  it("handles escaped quotes (double quotes)", () => {
    expect(parseCsvLine('"say ""hello""",b')).toEqual(['say "hello"', "b"]);
  });

  it("handles empty fields", () => {
    expect(parseCsvLine("a,,c")).toEqual(["a", "", "c"]);
  });

  it("handles a single field", () => {
    expect(parseCsvLine("hello")).toEqual(["hello"]);
  });

  it("trims whitespace from fields", () => {
    expect(parseCsvLine(" a , b , c ")).toEqual(["a", "b", "c"]);
  });
});

describe("toYmd", () => {
  it("converts datetime string to YYYYMMDD", () => {
    expect(toYmd("2024-04-05 00:00:00.0")).toBe("20240405");
  });

  it("converts date-only string", () => {
    expect(toYmd("2024-04-05")).toBe("20240405");
  });

  it("passes through already-formatted YYYYMMDD", () => {
    expect(toYmd("20240405")).toBe("20240405");
  });

  it("returns empty string for empty input", () => {
    expect(toYmd("")).toBe("");
  });
});

describe("fuzzyScore", () => {
  it("returns 1.0 for exact substring match", () => {
    expect(fuzzyScore("암보험", "무배당 암보험 플러스")).toBe(1.0);
  });

  it("returns 0 for completely unrelated strings", () => {
    expect(fuzzyScore("자동차", "생명보험")).toBe(0);
  });

  it("returns partial score for partial bigram overlap", () => {
    const score = fuzzyScore("암보", "암보험");
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});
