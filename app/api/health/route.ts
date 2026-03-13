import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function GET() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "API 키가 설정되지 않았습니다." });
    }

    const openai = new OpenAI({ apiKey });
    // Lightweight models.list call to verify key validity
    await openai.models.list({ limit: 1 } as Parameters<typeof openai.models.list>[0]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    const isAuthError = msg.includes("401") || msg.includes("Incorrect API key");
    return NextResponse.json({
      ok: false,
      error: isAuthError
        ? "OpenAI API 키가 유효하지 않습니다. 관리자에게 문의하세요."
        : `OpenAI 연결 실패: ${msg}`,
    });
  }
}
