import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { Customer, LMSMessage } from "@/lib/types";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const FP_NAME = "김한화";
const FP_PHONE = "010-1111-1111";
const CS_PHONE = "1566-8000";

function buildPrompt(customer: Customer): string {
  const productList = customer.products
    .map(
      (p) =>
        `  - ${p.name} (${p.contractNo})` +
        (p.renewalDate ? ` / 갱신일: ${p.renewalDate}` : "") +
        (p.expiryDate ? ` / 만기일: ${p.expiryDate}` : "")
    )
    .join("\n");

  return `당신은 한화손해보험 FP ${FP_NAME}의 영업 비서 AI입니다.
아래 고객에게 보낼 LMS 메시지 3종(안내형, 감성형, 혜택/관리형)을 작성하세요.

규칙:
- 고객 연령대/성별에 맞는 신뢰감 있고 따뜻한 어조
- 담당 FP ${FP_NAME}(${FP_PHONE}) 및 고객센터 ${CS_PHONE} 포함
- LMS 발송용으로 핵심 내용을 상단에 배치, 줄바꿈 적절히 사용
- 이모지 1~2개 이하로 자제

고객 정보:
- 이름: ${customer.name}
- 성별/나이: ${customer.gender}성, ${customer.age}세
- 이벤트: ${customer.event}
- 상세: ${customer.eventDetail}
- 보유 상품:
${productList}

다음 JSON 형식으로만 응답하세요:
{"messages":[{"type":"안내형","title":"제목","content":"본문"},{"type":"감성형","title":"제목","content":"본문"},{"type":"혜택/관리형","title":"제목","content":"본문"}]}`;
}

/** gpt-5-mini 등 신규 모델용: Responses API 사용 */
async function callResponsesAPI(prompt: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (getOpenAI() as any).responses.create({
    model: MODEL,
    input: prompt,
  });
  // output_text 또는 output 배열에서 텍스트 추출
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
}

/** 구형 모델용: Chat Completions API 사용 */
async function callChatAPI(prompt: string): Promise<string> {
  const completion = await getOpenAI().chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 1500,
  });
  return completion.choices[0]?.message?.content ?? "";
}

function parseJsonResponse(raw: string): Array<{ type: string; title: string; content: string }> {
  if (!raw || raw.trim().length === 0) return [];
  // 마크다운 코드 펜스 제거
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  // JSON 블록 추출
  const jsonMatch = stripped.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : stripped;
  const parsed = JSON.parse(jsonStr) as { messages?: Array<{ type: string; title: string; content: string }> };
  return parsed.messages ?? [];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const customer: Customer = body.customer;

    if (!customer?.id) {
      return NextResponse.json({ error: "Invalid customer data" }, { status: 400 });
    }

    const prompt = buildPrompt(customer);
    let raw = "";

    // gpt-5, gpt-4.1 계열은 Responses API 시도 → 실패 시 Chat API 폴백
    try {
      raw = await callResponsesAPI(prompt);
      console.log("[LMS/responses] len:", raw.length);
    } catch (err) {
      console.warn("[LMS/responses] failed, trying chat API:", (err as Error).message);
      raw = await callChatAPI(prompt);
      console.log("[LMS/chat] len:", raw.length);
    }

    console.log("[LMS raw preview]", raw.slice(0, 300));

    const msgs = parseJsonResponse(raw);

    if (msgs.length === 0) {
      return NextResponse.json(
        { error: `Model returned no messages. Raw: ${raw.slice(0, 200)}` },
        { status: 500 }
      );
    }

    const lmsMessages: LMSMessage[] = msgs.map((m, i) => ({
      id: `ai-${customer.id}-${i}`,
      customerId: customer.id,
      type: m.type as LMSMessage["type"],
      title: m.title,
      content: m.content,
    }));

    return NextResponse.json({ messages: lmsMessages });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[generate-lms] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
