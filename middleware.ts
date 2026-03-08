import { NextRequest, NextResponse } from "next/server";

/** Per-IP sliding-window rate limiter (in-memory, resets on restart). */
const hits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

// Periodic cleanup to prevent memory leak (every 5 min)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of hits) {
    if (now > entry.resetAt) hits.delete(key);
  }
}, 5 * 60 * 1000);

export function middleware(req: NextRequest) {
  // ── CSRF: verify origin for state-changing requests ──
  if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");

    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return NextResponse.json(
            { error: "Cross-origin request blocked" },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: "Invalid origin header" },
          { status: 403 }
        );
      }
    }
  }

  // ── Rate limiting ──
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  // General: 60 req/min per IP
  if (!checkRateLimit(`ip:${ip}`, 60, 60_000)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  // Stricter limit for LLM-calling endpoints: 10 req/min per IP
  const llmPaths = ["/api/generate-lms", "/api/regenerate-lms", "/api/parse-query", "/api/analyze-data", "/api/silson-search"];
  if (llmPaths.some((p) => req.nextUrl.pathname.startsWith(p))) {
    if (!checkRateLimit(`llm:${ip}`, 10, 60_000)) {
      return NextResponse.json(
        { error: "AI 요청 한도를 초과했습니다. 1분 후 다시 시도해주세요." },
        { status: 429 }
      );
    }
  }

  // ── Security headers ──
  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
