import { NextRequest, NextResponse } from "next/server";
import type { Customer, LMSMessage } from "@/lib/types";
import { callLlm, extractJson } from "@/lib/openai-service";
import { CS_PHONE } from "@/lib/constants";
import { validateRequest, GenerateLmsSchema } from "@/lib/validation";

function buildPrompt(customer: Customer, fpName: string): string {
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
아래 고객에게 보낼 LMS 메시지 3종(안내형, 감성형, 혜택/관리형)을 작성하세요.

규칙:
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

다음 JSON 형식으로만 응답하세요:
{"messages":[{"type":"안내형","title":"제목","content":"본문"},{"type":"감성형","title":"제목","content":"본문"},{"type":"혜택/관리형","title":"제목","content":"본문"}]}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const v = validateRequest(GenerateLmsSchema, body);
    if (!v.success) return NextResponse.json({ error: v.error }, { status: 400 });
    const { customer: rawCustomer, fpName: rawFpName } = v.data;
    const customer = rawCustomer as Customer;
    const fpName = rawFpName ?? "담당 FP";

    const prompt = buildPrompt(customer, fpName);
    const raw = await callLlm(prompt);
    console.log("[LMS] len:", raw.length);
    console.log("[LMS raw preview]", raw.slice(0, 300));

    const msgs = extractJson<{ messages: Array<{ type: string; title: string; content: string }> }>(raw).messages ?? [];

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
