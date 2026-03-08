"use client";

import { useState, useEffect } from "react";
import type { JobcodeRecommendation, JobcodeSearchResponse } from "@/lib/jobcode-types";

const GRADE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "1": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  "2": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  "3": { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

function gradeStyle(grade: string) {
  const num = grade.replace(/[^0-9]/g, "");
  return GRADE_COLORS[num] ?? { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" };
}

interface Props {
  response: JobcodeSearchResponse | null;
  isSearching: boolean;
  error: string | null;
}

export default function JobcodeResultsPanel({ response, isSearching, error }: Props) {
  const [selectedRec, setSelectedRec] = useState<JobcodeRecommendation | null>(null);

  useEffect(() => {
    setSelectedRec(null);
  }, [response]);

  if (isSearching) {
    return (
      <section className="flex h-full min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,#F8FAFD_0%,#F2F6FB_100%)]">
        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-5 sm:py-6">
          <LoadingPanel />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex h-full min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,#F8FAFD_0%,#F2F6FB_100%)]">
        <div className="flex flex-1 items-center justify-center p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 max-w-md w-full">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <p className="text-red-700 font-medium text-sm">오류 발생</p>
              <p className="text-red-600 text-xs mt-1">{error}</p>
            </div>
          </div>
        </div>
        </div>
      </section>
    );
  }

  if (!response) {
    return (
      <section className="flex h-full min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,#F8FAFD_0%,#F2F6FB_100%)]">
        <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="text-center text-gray-400 max-w-xs">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <p className="text-sm font-medium">직업 설명을 입력하고</p>
          <p className="text-sm">"후보 검색"을 눌러 추천을 받으세요.</p>
        </div>
        </div>
      </section>
    );
  }

  const { recs } = response;

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,#F8FAFD_0%,#F2F6FB_100%)]">
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5 sm:py-6">
        <div className="flex flex-col gap-5 pb-8">
          {recs.length === 0 ? (
            <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 text-center">
              <p className="px-6 text-sm text-slate-400">
                추천 결과가 없습니다. 임계치를 낮추거나 설명을 조금 더 구체적으로 입력해 주세요.
              </p>
            </div>
          ) : (
            <>
              {/* Recommendation cards */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-hanwha-navy">
                  추천 Top{recs.length}
                </h3>
                <div className="flex flex-col gap-2.5">
                  {recs.map((rec) => {
                    const gs = gradeStyle(rec.risk_grade);
                    const isSelected = selectedRec?.rank === rec.rank;
                    return (
                      <button
                        key={rec.rank}
                        onClick={() => setSelectedRec(isSelected ? null : rec)}
                        className={`w-full rounded-2xl border px-4 py-3.5 text-left transition-all ${
                          isSelected
                            ? "border-hanwha-orange bg-white shadow-[0_12px_28px_rgba(243,115,33,0.14)] ring-1 ring-hanwha-orange/30"
                            : "border-slate-200 bg-white/92 shadow-sm hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-hanwha-navy text-xs font-bold text-white">
                              {rec.rank}
                            </span>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="font-mono text-[11px] text-slate-400">{rec.job_code}</span>
                                <span className="text-sm font-semibold text-hanwha-navy">{rec.job_name}</span>
                              </div>
                              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                                {rec.reason}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${gs.bg} ${gs.text} ${gs.border}`}
                            >
                              {rec.risk_grade}급
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              {rec.final_score.toFixed(4)}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detail viewer */}
              {selectedRec && (
                <DetailViewer rec={selectedRec} onClose={() => setSelectedRec(null)} />
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function DetailViewer({
  rec,
  onClose,
}: {
  rec: JobcodeRecommendation;
  onClose: () => void;
}) {
  const gs = gradeStyle(rec.risk_grade);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-gray-400">{rec.job_code}</span>
          <span className="font-semibold text-hanwha-navy text-sm">{rec.job_name}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${gs.bg} ${gs.text} ${gs.border}`}>
            {rec.risk_grade}급
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="닫기"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-5 flex flex-col gap-4">
        {/* Reason */}
        <Section title="추천 이유">
          <p className="text-sm text-gray-600">{rec.reason}</p>
        </Section>

        {/* GPT cited phrases (LLM mode) */}
        {rec.cited_phrases.length > 0 && (
          <Section title="GPT 인용 구절">
            <ul className="flex flex-col gap-1.5">
              {rec.cited_phrases.map((phrase, i) => (
                <li key={i} className="text-sm text-gray-600 bg-emerald-50 rounded-md px-3 py-2 border border-emerald-100 flex gap-2">
                  <span className="text-emerald-500 shrink-0">"</span>
                  <span>{phrase}</span>
                  <span className="text-emerald-500 shrink-0">"</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Evidence sentences */}
        {rec.evidence.length > 0 && (
          <Section title="근거 문장">
            <ul className="flex flex-col gap-1.5">
              {rec.evidence.map((sent, i) => (
                <li key={i} className="text-sm text-gray-600 bg-yellow-50 rounded-md px-3 py-2 border border-yellow-100">
                  <span
                    dangerouslySetInnerHTML={{
                      __html: highlightHits(sent, rec.hits),
                    }}
                  />
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Keywords */}
        <Section title="키워드">
          {rec.hits.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {rec.hits.map((kw) => (
                <span
                  key={kw}
                  className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-medium"
                >
                  {kw}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">(일치 키워드 없음)</p>
          )}
        </Section>

        {/* Full description */}
        <Section title="원문 설명">
          <div
            className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-md px-3 py-2 border border-gray-100 max-h-48 overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: rec.highlighted_description }}
          />
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{title}</h4>
      {children}
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 shadow-sm backdrop-blur">
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Jobcode Matching
          </p>
          <h2 className="mt-1 text-lg font-semibold text-hanwha-navy">
            직업 특징을 분석하고 후보를 정리하고 있어요
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            입력한 설명에서 핵심 업무, 위험 키워드, 유사 직무를 차례로 비교하는 중입니다.
          </p>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-600">후보를 탐색하는 중</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  잠시 후 추천 결과를 정리해서 보여드립니다.
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-slate-300 animate-pulse" />
                <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse [animation-delay:180ms]" />
                <span className="h-2 w-2 rounded-full bg-slate-500 animate-pulse [animation-delay:360ms]" />
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {["직무 해석", "유사군 탐색", "추천 정렬"].map((label, index) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-3"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-600 shadow-sm">
                    {index + 1}
                  </span>
                  <span className="text-xs font-semibold text-slate-600">{label}</span>
                </div>
                <div className="space-y-1.5">
                  <div className="h-2 rounded-full bg-slate-200/80 animate-pulse" />
                  <div className="h-2 w-4/5 rounded-full bg-slate-200/60 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {[1, 2, 3].map((row) => (
          <div
            key={row}
            className="rounded-2xl border border-slate-200/80 bg-white/85 px-4 py-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 h-7 w-7 rounded-full bg-slate-200 animate-pulse" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3 w-28 rounded-full bg-slate-200 animate-pulse" />
                  <div className="h-3 w-44 max-w-full rounded-full bg-slate-100 animate-pulse" />
                  <div className="h-3 w-full rounded-full bg-slate-100 animate-pulse" />
                </div>
              </div>
              <div className="h-6 w-14 rounded-full bg-slate-100 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Client-side fallback highlight in case the API response lacks <mark> tags */
function highlightHits(text: string, hits: string[]): string {
  if (!hits.length) return text;
  // If text already has <mark> tags, return as-is
  if (text.includes("<mark")) return text;
  let result = text;
  const sorted = [...hits].sort((a, b) => b.length - a.length);
  for (const kw of sorted) {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(
      new RegExp(escaped, "g"),
      `<mark class="kw-hit">${kw}</mark>`
    );
  }
  return result;
}
