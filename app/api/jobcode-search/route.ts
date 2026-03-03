import { NextRequest, NextResponse } from "next/server";
import type { JobcodeSearchRequest, JobcodeSearchResponse } from "@/lib/jobcode-types";

const JOBCODE_API_URL = process.env.JOBCODE_API_URL ?? "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const body: JobcodeSearchRequest = await req.json();

    if (!body.query?.trim()) {
      return NextResponse.json({ error: "query must not be empty" }, { status: 400 });
    }

    const res = await fetch(`${JOBCODE_API_URL}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `FastAPI error ${res.status}: ${errText}` },
        { status: res.status }
      );
    }

    const data: JobcodeSearchResponse = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[jobcode-search] Error:", message);

    if (message.includes("ECONNREFUSED") || message.includes("fetch failed")) {
      return NextResponse.json(
        { error: "직업코드 검색 서비스에 연결할 수 없습니다. FastAPI 서버가 실행 중인지 확인해 주세요." },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
