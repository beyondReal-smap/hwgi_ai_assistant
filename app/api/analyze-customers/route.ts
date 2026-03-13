import { NextRequest, NextResponse } from "next/server";
import { callLlm } from "@/lib/openai-service";
import { validateRequest, AnalyzeCustomersSchema } from "@/lib/validation";

const ANALYSIS_PROMPT = `당신은 한화손해보험 FP(설계사)의 영업활동을 지원하는 AI 어시스턴트입니다.
FP가 조회한 고객 리스트를 분석하여 짧고 실용적인 인사이트를 제공하세요.

출력 형식 (반드시 이 구조로):
📊 핵심 요약
• (고객 리스트의 핵심 수치/특징 1줄)
• (눈에 띄는 패턴이나 우선순위 1줄)

💡 액션 제안
• (FP가 바로 활용할 수 있는 구체적 영업 액션 1~2줄)

규칙:
- 각 항목은 1줄로 간결하게
- 숫자나 비율을 구체적으로 언급
- 한국어 존댓말(~입니다/~하세요)
- 위 형식의 헤더(📊, 💡)와 bullet(•)을 반드시 사용
- 그 외 이모지는 사용하지 마세요`;

export async function POST(req: NextRequest) {
  try {
    const v = validateRequest(AnalyzeCustomersSchema, await req.json());
    if (!v.success) return NextResponse.json({ analysis: "" });
    const { query, customers, intent } = v.data;

    if (!customers || customers.length === 0) {
      return NextResponse.json({ analysis: "" });
    }

    const summary = customers
      .map((c, i) => `${i + 1}. ${c.name}(${c.gender},${c.age}세) - ${c.event} [${c.urgency}]`)
      .join("\n");

    const truncated =
      summary.length > 2000 ? summary.slice(0, 2000) + "\n...(이하 생략)" : summary;

    const analysis = await callLlm(
      `[FP 질문] ${query}\n[의도] ${intent}\n[조회 결과 ${customers.length}명]\n${truncated}`,
      { systemPrompt: ANALYSIS_PROMPT, maxTokens: 300 },
    );

    return NextResponse.json({ analysis: analysis.trim() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[analyze-customers] Error:", message);
    return NextResponse.json({ analysis: "" });
  }
}
