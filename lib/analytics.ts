const LOG_KEY = "hwgi_action_log";
const MAX_ENTRIES = 200;

export function track(event: string, props?: Record<string, unknown>) {
  const entry = { event, ts: new Date().toISOString(), ...props };
  console.log("[analytics]", entry);

  if (typeof window === "undefined") return;
  try {
    const stored: unknown[] = JSON.parse(localStorage.getItem(LOG_KEY) ?? "[]");
    stored.push(entry);
    if (stored.length > MAX_ENTRIES) stored.splice(0, stored.length - MAX_ENTRIES);
    localStorage.setItem(LOG_KEY, JSON.stringify(stored));
  } catch {
    // localStorage 접근 실패 시 무시
  }
}
