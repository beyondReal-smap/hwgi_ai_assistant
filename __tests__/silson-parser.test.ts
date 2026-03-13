import { describe, expect, it } from "vitest";
import { buildSilsonCards } from "@/lib/silson-parser";
import type { SilsonSearchResponse } from "@/lib/silson-types";

function createResponse(overrides: Partial<SilsonSearchResponse> = {}): SilsonSearchResponse {
  return {
    query: "4세대 치과 치료 보상되나요?",
    answer: "치과 치료는 급여 항목 위주로 확인이 필요합니다.\n\n참고: 4세대 | 기본형 | 치과 치료",
    sources: ["4세대 | 기본형 | 치과 치료"],
    chunks: [
      {
        doc_id: "doc-1",
        source_kind: "coverage_criteria",
        source_label: "담보별 보상기준",
        generation: "4세대",
        product_alias: "기본형",
        sales_period: "202107~현재",
        coverage_name: "치과 치료",
        clause_name: "치과 치료 보상 기준",
        clause_text_oneline: "급여 치료 중심으로 보상 여부를 확인합니다.",
        source_file: "doc-1.md",
        filename: "doc-1.md",
        score: 0.92,
        document_excerpt: "급여 치료 중심으로 보상 여부를 확인합니다.",
      },
    ],
    mode: {
      retrieval: "silson_rag_clauses",
      llm_status: "disabled",
    },
    filters: {
      generation: "4세대",
      source_kind: "coverage_criteria",
      join_ym: 202107,
    },
    follow_ups: ["비급여 치과 치료는 어떻게 되나요?"],
    structured_answer: {
      summary: "✅ 4세대 실손은 치과 치료도 급여 여부가 핵심입니다.",
      context_note: "2021년 7월 이후 4세대 실손 기준으로 먼저 보는 질문입니다.",
      answer: "치과 치료라고 해서 모두 같은 기준이 적용되지는 않습니다. 급여 치료인지, 비급여 치료인지에 따라 보상 가능 범위를 나눠서 안내해야 합니다.",
      coverage_points: [
        "급여 치료 여부를 먼저 확인해야 합니다.",
        "치료 목적과 시행 항목을 함께 봐야 합니다.",
      ],
      cautions: [
        "미용 목적 치료나 약관상 제외 항목은 보상이 제한될 수 있습니다.",
      ],
      checkpoints: [
        "진료비 영수증과 급여/비급여 구분 내역을 같이 확인해 주세요.",
      ],
      reference_note: "참고: 4세대 | 기본형 | 치과 치료 보상 기준",
    },
    ...overrides,
  };
}

describe("buildSilsonCards", () => {
  it("uses structured answers to build a combined silson card", () => {
    const cards = buildSilsonCards("4세대 치과 치료 보상되나요?", createResponse());

    expect(cards).toHaveLength(1);
    expect(cards[0].title).toBe("실손 AI 답변");
    expect(cards[0].content).toContain("핵심 요약");
    expect(cards[0].content).toContain("보상 포인트");
    expect(cards[0].content).toContain("주의할 점");
    expect(cards[0].content).toContain("상담 체크포인트");
    expect(cards[0].sources).toContain("4세대 | 기본형 | 치과 치료 보상 기준");
    expect(cards[0].followUps).toEqual(["비급여 치과 치료는 어떻게 되나요?"]);
  });

  it("falls back to raw answer parsing when structured answer is missing", () => {
    const cards = buildSilsonCards("4세대 치과 치료 보상되나요?", createResponse({ structured_answer: null }));

    expect(cards).toHaveLength(1);
    expect(cards[0].title).toBe("실손 AI 답변");
    expect(cards[0].content).toContain("치과 치료는 급여 항목 위주로 확인이 필요합니다.");
  });
});
