const LOG_KEY = "hwgi_action_log";
const USER_KEY = "hwgi_current_user";
const MAX_ENTRIES = 200;
const FLUSH_INTERVAL_MS = 30_000;
const FLUSH_BATCH_SIZE = 10;

const pendingEvents: Record<string, unknown>[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let visibilityListenerAttached = false;

async function flushToServer() {
  if (pendingEvents.length === 0) return;
  const batch = pendingEvents.splice(0, pendingEvents.length);
  try {
    await fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    });
  } catch {
    // 실패 시 버퍼 앞에 다시 넣어 다음 flush 때 재시도
    pendingEvents.unshift(...batch);
  }
}

function scheduleFlusher() {
  if (flushTimer !== null) return;
  flushTimer = setTimeout(async () => {
    flushTimer = null;
    await flushToServer();
  }, FLUSH_INTERVAL_MS);

  if (!visibilityListenerAttached && typeof document !== "undefined") {
    visibilityListenerAttached = true;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flushToServer();
    });
  }
}

export function setUser(employeeId: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (employeeId) {
      sessionStorage.setItem(USER_KEY, employeeId);
    } else {
      sessionStorage.removeItem(USER_KEY);
    }
  } catch {
    // ignore
  }
}

export function track(event: string, props?: Record<string, unknown>) {
  let employeeId: string | undefined;
  if (typeof window !== "undefined") {
    try {
      employeeId = sessionStorage.getItem(USER_KEY) ?? undefined;
    } catch {
      // ignore
    }
  }

  const entry: Record<string, unknown> = {
    event,
    ts: new Date().toISOString(),
    ...(employeeId ? { employeeId } : {}),
    ...props,
  };
  console.log("[analytics]", entry);

  // localStorage 누적 (오프라인 보조)
  if (typeof window !== "undefined") {
    try {
      const stored: unknown[] = JSON.parse(localStorage.getItem(LOG_KEY) ?? "[]");
      stored.push(entry);
      if (stored.length > MAX_ENTRIES) stored.splice(0, stored.length - MAX_ENTRIES);
      localStorage.setItem(LOG_KEY, JSON.stringify(stored));
    } catch {
      // ignore
    }
  }

  // 서버 전송 버퍼에 추가
  if (typeof window !== "undefined") {
    pendingEvents.push(entry);
    if (pendingEvents.length >= FLUSH_BATCH_SIZE) {
      // 즉시 전송
      if (flushTimer !== null) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      flushToServer();
    } else {
      scheduleFlusher();
    }
  }
}
