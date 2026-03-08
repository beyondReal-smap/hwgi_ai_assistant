import { describe, it, expect } from "vitest";
import {
  LoginSchema,
  DailyTouchSchema,
  ParseQuerySchema,
  AnalyzeDataSchema,
  validateRequest,
} from "@/lib/validation";

describe("LoginSchema", () => {
  it("accepts valid input", () => {
    const result = LoginSchema.safeParse({ employeeId: "3536477", password: "1111" });
    expect(result.success).toBe(true);
  });

  it("rejects empty employeeId", () => {
    const result = LoginSchema.safeParse({ employeeId: "", password: "1111" });
    expect(result.success).toBe(false);
  });

  it("rejects missing password", () => {
    const result = LoginSchema.safeParse({ employeeId: "123" });
    expect(result.success).toBe(false);
  });

  it("rejects overly long employeeId", () => {
    const result = LoginSchema.safeParse({ employeeId: "a".repeat(21), password: "1111" });
    expect(result.success).toBe(false);
  });
});

describe("DailyTouchSchema", () => {
  it("accepts valid stfno", () => {
    const result = DailyTouchSchema.safeParse({ stfno: "3536477" });
    expect(result.success).toBe(true);
  });

  it("rejects empty stfno", () => {
    const result = DailyTouchSchema.safeParse({ stfno: "" });
    expect(result.success).toBe(false);
  });
});

describe("ParseQuerySchema", () => {
  it("accepts valid query", () => {
    const result = ParseQuerySchema.safeParse({ query: "오늘 생일인 고객" });
    expect(result.success).toBe(true);
  });

  it("accepts empty query (for fallback)", () => {
    const result = ParseQuerySchema.safeParse({ query: "" });
    expect(result.success).toBe(true);
  });

  it("rejects overly long query", () => {
    const result = ParseQuerySchema.safeParse({ query: "a".repeat(501) });
    expect(result.success).toBe(false);
  });
});

describe("AnalyzeDataSchema", () => {
  it("accepts valid data", () => {
    const result = AnalyzeDataSchema.safeParse({ query: "test", dataText: "some data" });
    expect(result.success).toBe(true);
  });

  it("rejects overly long dataText", () => {
    const result = AnalyzeDataSchema.safeParse({ query: "test", dataText: "a".repeat(10001) });
    expect(result.success).toBe(false);
  });
});

describe("validateRequest", () => {
  it("returns success with parsed data", () => {
    const result = validateRequest(LoginSchema, { employeeId: "123", password: "pass" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.employeeId).toBe("123");
    }
  });

  it("returns error message on failure", () => {
    const result = validateRequest(LoginSchema, { employeeId: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Validation error");
    }
  });
});
