import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { validateRequest, AnalyticsSchema } from "@/lib/validation";

const DATA_DIR = path.join(process.cwd(), "data");
const LOG_FILE = path.join(DATA_DIR, "analytics.jsonl");

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function POST(req: NextRequest) {
  try {
    const v = validateRequest(AnalyticsSchema, await req.json());
    if (!v.success) return NextResponse.json({ ok: false, error: v.error }, { status: 400 });
    const events = v.data.events;
    if (events.length === 0) return NextResponse.json({ ok: true });

    await ensureDataDir();
    const lines = events.map((e) => JSON.stringify(e)).join("\n") + "\n";
    await fs.appendFile(LOG_FILE, lines, "utf-8");
    return NextResponse.json({ ok: true, count: events.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureDataDir();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "500"), 2000);
    const filterEmployeeId = searchParams.get("employeeId") ?? "";

    let text = "";
    try {
      text = await fs.readFile(LOG_FILE, "utf-8");
    } catch {
      // 파일 없으면 빈 목록 반환
    }

    let events = text
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line) as Record<string, unknown>;
        } catch {
          return null;
        }
      })
      .filter(Boolean) as Record<string, unknown>[];

    if (filterEmployeeId) {
      events = events.filter((e) => e.employeeId === filterEmployeeId);
    }

    // 최신순 정렬 후 limit 적용
    events.reverse();
    events = events.slice(0, limit);

    return NextResponse.json({ events, total: events.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
