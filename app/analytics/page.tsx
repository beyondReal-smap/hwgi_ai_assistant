"use client";

import { useEffect, useState, useCallback } from "react";

type AnalyticsEvent = Record<string, unknown>;

const EVENT_LABELS: Record<string, string> = {
  login: "로그인",
  logout: "로그아웃",
  chat_send: "채팅 전송",
  customer_select: "고객 선택",
  lms_select: "LMS 선택",
  lms_send: "LMS 발송",
  lms_regenerate: "LMS 재생성",
};

const EVENT_COLORS: Record<string, string> = {
  login: "bg-blue-100 text-blue-700",
  logout: "bg-slate-100 text-slate-600",
  chat_send: "bg-purple-100 text-purple-700",
  customer_select: "bg-yellow-100 text-yellow-700",
  lms_select: "bg-orange-100 text-orange-700",
  lms_send: "bg-green-100 text-green-700",
  lms_regenerate: "bg-red-100 text-red-700",
};

function formatTs(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

function getProps(event: AnalyticsEvent) {
  const skip = new Set(["event", "ts", "employeeId"]);
  return Object.entries(event)
    .filter(([k]) => !skip.has(k))
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
}

export default function AnalyticsPage() {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterEvent, setFilterEvent] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "500" });
      if (filterEmployee) params.set("employeeId", filterEmployee);
      const res = await fetch(`/api/analytics?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { events: AnalyticsEvent[] };
      setEvents(data.events ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, [filterEmployee]);

  useEffect(() => { load(); }, [load]);

  const filtered = filterEvent
    ? events.filter((e) => e.event === filterEvent)
    : events;

  const counts: Record<string, number> = {};
  for (const e of events) {
    const key = String(e.event ?? "unknown");
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{ background: "linear-gradient(135deg, #1A2B4A 0%, #2D4168 100%)" }}
      >
        <div className="flex items-center gap-3">
          <img src="/hwgi.png" alt="한화손해보험" className="h-8 object-contain" />
          <span className="text-white font-bold">Analytics</span>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50"
        >
          {loading ? "로딩 중..." : "새로고침"}
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Summary badges */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterEvent("")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              filterEvent === "" ? "bg-slate-700 text-white border-slate-700" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
            }`}
          >
            전체 {events.length}건
          </button>
          {Object.entries(EVENT_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilterEvent(filterEvent === key ? "" : key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                filterEvent === key
                  ? "bg-slate-700 text-white border-slate-700"
                  : `${EVENT_COLORS[key] ?? "bg-gray-100 text-gray-600"} border-transparent hover:opacity-80`
              }`}
            >
              {label} {counts[key] ?? 0}
            </button>
          ))}
        </div>

        {/* Employee filter */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={filterEmployee}
            onChange={(e) => setFilterEmployee(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="사번으로 필터 (Enter)"
            className="w-48 px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:border-hanwha-orange focus:ring-2 focus:ring-orange-100 outline-none"
          />
          {filterEmployee && (
            <button
              onClick={() => setFilterEmployee("")}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              초기화
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 w-44">시각</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 w-28">이벤트</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 w-24">사번</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">상세</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-sm">
                    로딩 중...
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-sm">
                    이벤트가 없습니다.
                  </td>
                </tr>
              )}
              {!loading && filtered.map((e, i) => {
                const eventKey = String(e.event ?? "");
                return (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap">
                      {e.ts ? formatTs(String(e.ts)) : "-"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${EVENT_COLORS[eventKey] ?? "bg-gray-100 text-gray-600"}`}>
                        {EVENT_LABELS[eventKey] ?? eventKey}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600 font-mono">
                      {String(e.employeeId ?? "-")}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {getProps(e)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-400 text-center">
          최대 500건 표시 · 최신순 · data/analytics.jsonl
        </p>
      </div>
    </div>
  );
}
