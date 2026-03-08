import { NextRequest, NextResponse } from "next/server";
import type { Customer, LMSMessage } from "@/lib/types";
import { callLlm, extractJson } from "@/lib/openai-service";
import { CS_PHONE } from "@/lib/constants";
import { validateRequest, RegenerateLmsSchema } from "@/lib/validation";

function buildRegeneratePrompt(
  customer: Customer,
  messageType: string,
  existingContent: string,
  fpName: string
): string {
  const FP_NAME = fpName || "담당 FP";
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
- 담당 FP ${FP_NAME} 및 고객센터 ${CS_PHONE} 포함
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const v = validateRequest(RegenerateLmsSchema, body);
    if (!v.success) return NextResponse.json({ error: v.error }, { status: 400 });
    const { customer: rawCustomer, messageType, existingContent: rawContent, fpName: rawFpName } = v.data;
    const customer = rawCustomer as Customer;
    const existingContent = rawContent ?? "";
    const fpName = rawFpName ?? "담당 FP";

    const prompt = buildRegeneratePrompt(customer, messageType, existingContent, fpName);
    const raw = await callLlm(prompt, { maxTokens: 800 });
    console.log("[regenerate-lms] len:", raw.length);
    console.log("[regenerate-lms raw preview]", raw.slice(0, 200));

    const parsed = extractJson<{ type: string; title: string; content: string }>(raw);

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
