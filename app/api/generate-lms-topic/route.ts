import { NextRequest, NextResponse } from "next/server";
import type { LMSMessage } from "@/lib/types";
import { callLlm, extractJson } from "@/lib/openai-service";
import { CS_PHONE } from "@/lib/constants";

function ageStyle(age: number): string {
  if (age < 30) return "MZ세대 감성, 캐주얼하면서도 진정성 있는 톤";
  if (age < 50) return "전문적이면서도 친근한 톤";
  return "존경과 배려가 담긴 정중한 톤";
}

function buildPrompt(name: string, gender: string, age: number, topic: string, fpName: string): string {
  return `당신은 한화손해보험 FP ${fpName}의 영업 비서 AI입니다.
아래 고객에게 "${topic}" 주제로 보낼 LMS 메시지 3종(안내형, 감성형, 혜택/관리형)을 작성하세요.

규칙:
- 고객 연령대(${age}세)와 성별(${gender}성)에 맞는 신뢰감 있고 따뜻한 어조
- ${ageStyle(age)}
- 담당 FP ${fpName} 및 고객센터 ${CS_PHONE} 포함
- LMS 발송용으로 핵심 내용을 상단에 배치, 줄바꿈 적절히 사용
- 이모지 1~2개 이하로 자제
- "${topic}" 주제에 맞는 실질적이고 유용한 정보를 포함

고객 정보:
- 이름: ${name}
- 성별/나이: ${gender}성, ${age}세
- 주제: ${topic}

다음 JSON 형식으로만 응답하세요:
{"messages":[{"type":"안내형","title":"제목","content":"본문"},{"type":"감성형","title":"제목","content":"본문"},{"type":"혜택/관리형","title":"제목","content":"본문"}]}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, gender, age, topic, fpName } = body as {
      name: string;
      gender: string;
      age: number;
      topic: string;
      fpName?: string;
    };

    if (!name || !gender || !age || !topic) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const fp = fpName ?? "담당 FP";
    const prompt = buildPrompt(name, gender, age, topic, fp);
    const raw = await callLlm(prompt);

    const msgs = extractJson<{ messages: Array<{ type: string; title: string; content: string }> }>(raw).messages ?? [];

    if (msgs.length === 0) {
      return NextResponse.json({ error: "No messages generated" }, { status: 500 });
    }

    const lmsMessages: LMSMessage[] = msgs.map((m, i) => ({
      id: `topic-${Date.now()}-${i}`,
      customerId: `csv-${name}`,
      type: m.type as LMSMessage["type"],
      title: m.title,
      content: m.content,
    }));

    return NextResponse.json({ messages: lmsMessages });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[generate-lms-topic] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
