import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const ANALYSIS_PROMPT = `당신은 한화손해보험 FP(설계사)의 영업활동을 지원하는 AI 어시스턴트입니다.
FP가 조회한 데이터 결과를 분석하여 짧고 실용적인 인사이트를 제공하세요.

규칙:
- 2~4문장으로 간결하게 작성
- 데이터에서 눈에 띄는 패턴, 비율, 특이점을 짚어주세요
- FP가 바로 활용할 수 있는 영업 액션 제안을 1개 포함하세요
- 숫자나 비율을 구체적으로 언급하세요
- 한국어로 작성, 존댓말(~입니다/~하세요) 사용
- 이모지는 사용하지 마세요
- "분석 결과:" 같은 접두어 없이 바로 내용을 시작하세요`;

export async function POST(req: NextRequest) {
  try {
    const { query, dataText } = (await req.json()) as { query: string; dataText: string };

    if (!dataText?.trim()) {
      return NextResponse.json({ analysis: "" });
    }

    // 데이터가 너무 길면 잘라서 보냄 (토큰 절약)
    const truncated = dataText.length > 2000 ? dataText.slice(0, 2000) + "\n...(이하 생략)" : dataText;

    let analysis = "";
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (getOpenAI() as any).responses.create({
        model: MODEL,
        input: `${ANALYSIS_PROMPT}\n\n[FP 질문] ${query}\n\n[조회 결과]\n${truncated}`,
      });
      analysis = typeof response?.output_text === "string" ? response.output_text : "";
      if (!analysis && Array.isArray(response?.output)) {
        for (const item of response.output) {
          if (item?.type === "message" && Array.isArray(item?.content)) {
            for (const c of item.content) {
              if (c?.type === "output_text") { analysis = c.text; break; }
            }
          }
          if (analysis) break;
        }
      }
    } catch {
      const completion = await getOpenAI().chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: ANALYSIS_PROMPT },
          { role: "user", content: `[FP 질문] ${query}\n\n[조회 결과]\n${truncated}` },
        ],
        max_completion_tokens: 300,
      });
      analysis = completion.choices[0]?.message?.content ?? "";
    }

    return NextResponse.json({ analysis: analysis.trim() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[analyze-data] Error:", message);
    return NextResponse.json({ analysis: "" });
  }
}
