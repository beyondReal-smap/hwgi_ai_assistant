import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { Customer, LMSMessage } from "@/lib/types";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-5.2-chat-latest";

const FP_NAME = "김한화";
const FP_PHONE = "010-1111-1111";
const CS_PHONE = "1566-8000";

function buildRegeneratePrompt(
  customer: Customer,
  messageType: string,
  existingContent: string
): string {
  const productList = customer.products
    .map(
      (p) =>
        `  - ${p.name} (${p.contractNo})` +
        (p.renewalDate ? ` / 갱신일: ${p.renewalDate}` : "") +
        (p.expiryDate ? ` / 만기일: ${p.expiryDate}` : "")
    )
    .join("\n");

  return `당신은 한화손해보험 FP ${FP_NAME}의 영업 비서 AI입니다.
아래 고객에게 보낼 ${messageType} 형태의 LMS 메시지를 새롭게 작성하세요.
이전에 작성된 메시지와는 다른 표현과 구성으로 작성해주세요.

규칙:
- 이전 메시지와 확연히 다른 표현, 구성, 어조로 작성
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

이전 메시지 (이것과 다르게 작성하세요):
${existingContent}

다음 JSON 형식으로만 응답하세요:
{"type":"${messageType}","title":"제목","content":"본문"}`;
}

/** gpt-5-mini 등 신규 모델용: Responses API 사용 */
async function callResponsesAPI(prompt: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) as any).responses.create({
    model: MODEL,
    input: prompt,
  });
  if (typeof response?.output_text === "string") return response.output_text;
  if (Array.isArray(response?.output)) {
    for (const item of response.output) {
      if (item?.type === "message" && Array.isArray(item?.content)) {
        for (const c of item.content) {
          if (c?.type === "output_text" && typeof c?.text === "string")
            return c.text;
        }
      }
    }
  }
  return "";
}

/** 구형 모델용: Chat Completions API 사용 */
async function callChatAPI(prompt: string): Promise<string> {
  const completion = await new OpenAI({ apiKey: process.env.OPENAI_API_KEY }).chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 800,
  });
  return completion.choices[0]?.message?.content ?? "";
}

function parseJsonResponse(
  raw: string
): { type: string; title: string; content: string } | null {
  if (!raw || raw.trim().length === 0) return null;
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  const jsonMatch = stripped.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : stripped;
  const parsed = JSON.parse(jsonStr) as {
    type: string;
    title: string;
    content: string;
  };
  return parsed;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const customer: Customer = body.customer;
    const messageType: string = body.messageType;
    const existingContent: string = body.existingContent ?? "";

    if (!customer?.id || !messageType) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    const prompt = buildRegeneratePrompt(customer, messageType, existingContent);
    let raw = "";

    try {
      raw = await callResponsesAPI(prompt);
      console.log("[regenerate-lms/responses] len:", raw.length);
    } catch (err) {
      console.warn(
        "[regenerate-lms/responses] failed, trying chat API:",
        (err as Error).message
      );
      raw = await callChatAPI(prompt);
      console.log("[regenerate-lms/chat] len:", raw.length);
    }

    console.log("[regenerate-lms raw preview]", raw.slice(0, 200));

    const parsed = parseJsonResponse(raw);

    if (!parsed) {
      return NextResponse.json(
        { error: `Model returned no message. Raw: ${raw.slice(0, 200)}` },
        { status: 500 }
      );
    }

    const message: LMSMessage = {
      id: `ai-regen-${customer.id}-${Date.now()}`,
      customerId: customer.id,
      type: parsed.type as LMSMessage["type"],
      title: parsed.title,
      content: parsed.content,
    };

    return NextResponse.json({ message });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[regenerate-lms] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
