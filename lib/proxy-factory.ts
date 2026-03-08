import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.JOBCODE_API_URL ?? "http://localhost:8000";

interface ProxyConfig {
  /** Path on the backend server, e.g. "/api/search" */
  path: string;
  /** Label for console.error, e.g. "jobcode-search" */
  logTag: string;
  /** Korean service name for ECONNREFUSED error message */
  serviceName: string;
}

/**
 * Creates a Next.js POST handler that proxies to the FastAPI backend.
 * Validates that `body.query` is non-empty before forwarding.
 */
export function createProxyHandler(config: ProxyConfig) {
  return async function POST(req: NextRequest) {
    try {
      const body = await req.json();

      if (!body.query?.trim()) {
        return NextResponse.json(
          { error: "query must not be empty" },
          { status: 400 }
        );
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 60_000);

      let res: Response;
      try {
        res = await fetch(`${BACKEND_URL}${config.path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json(
          { error: `FastAPI error ${res.status}: ${errText}` },
          { status: res.status }
        );
      }

      const data = await res.json();
      return NextResponse.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`[${config.logTag}] Error:`, message);

      if (
        message.includes("ECONNREFUSED") ||
        message.includes("fetch failed")
      ) {
        return NextResponse.json(
          {
            error: `${config.serviceName} 서비스에 연결할 수 없습니다. FastAPI 서버가 실행 중인지 확인해 주세요.`,
          },
          { status: 503 }
        );
      }

      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}
