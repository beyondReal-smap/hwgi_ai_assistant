import { beforeEach, describe, expect, it, vi } from "vitest";

const searchSemanticDocuments = vi.fn();

vi.mock("@/lib/openai-embedding-index", () => ({
  isOpenAIEmbeddingConfigured: () => true,
  searchSemanticDocuments,
}));

describe("customer semantic search", () => {
  beforeEach(() => {
    searchSemanticDocuments.mockReset();
  });

  it("maps workplace semantic matches back to customer rows", async () => {
    searchSemanticDocuments.mockResolvedValue([
      {
        rank: 1,
        score: 0.92,
        document: {
          id: "보육교사",
          text: "직장 또는 직업: 보육교사",
          metadata: { term: "보육교사" },
        },
      },
    ]);

    const { searchCustomersBySemanticWorkplace } = await import("@/lib/customer-semantic-search");
    const result = await searchCustomersBySemanticWorkplace("어린이집 선생님");

    expect(result.matchedTerms).toContain("보육교사");
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.some((customer) => customer.workplace === "보육교사")).toBe(true);
    expect(result.items.every((customer) => result.matchedTerms.includes(customer.workplace))).toBe(true);
  });

  it("maps coverage semantic matches back to coverage detail rows", async () => {
    searchSemanticDocuments.mockResolvedValue([
      {
        rank: 1,
        score: 0.89,
        document: {
          id: "질병사망",
          text: "보험 담보명: 질병사망",
          metadata: { term: "질병사망" },
        },
      },
    ]);

    const { searchGoodsBySemanticCoverage } = await import("@/lib/customer-semantic-search");
    const result = await searchGoodsBySemanticCoverage("질병으로 사망하는 담보");

    expect(result.matchedTerms).toContain("질병사망");
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((detail) => detail.coverageName.includes("질병사망"))).toBe(true);
  });
});
