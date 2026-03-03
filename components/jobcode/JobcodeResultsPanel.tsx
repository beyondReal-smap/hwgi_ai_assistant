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
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <svg className="animate-spin h-8 w-8 text-hanwha-orange" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-sm">검색 및 추천 수행 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-8">
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
    );
  }

  if (!response) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400 max-w-xs">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <p className="text-sm font-medium">직업 설명을 입력하고</p>
          <p className="text-sm">"후보 검색"을 눌러 추천을 받으세요.</p>
        </div>
      </div>
    );
  }

  const { recs, mode, score_threshold, filtered_out_count, prefilter_count } = response;

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-5 flex flex-col gap-5">
      {/* Mode info bar */}
      <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 shadow-sm">
        <span>
          <span className="font-medium text-gray-700">검색:</span> {mode.retrieval}
        </span>
        <span>
          <span className="font-medium text-gray-700">재랭크:</span> {mode.rerank}
        </span>
        <span>
          <span className="font-medium text-gray-700">Embed:</span> {mode.embed_status}
        </span>
        <span>
          <span className="font-medium text-gray-700">CE:</span> {mode.ce_status}
        </span>
        {mode.llm_status && mode.llm_status !== "disabled" && (
          <span className={mode.llm_status === "real" ? "text-emerald-600 font-semibold" : "text-amber-600"}>
            <span className="font-medium">GPT:</span>{" "}
            {mode.llm_status === "real" ? "✓ 재랭크 적용" : "mock"}
          </span>
        )}
        <span>
          <span className="font-medium text-gray-700">임계치:</span> {score_threshold.toFixed(2)}
        </span>
        {filtered_out_count > 0 && (
          <span className="text-amber-600">
            {prefilter_count}개 중 {filtered_out_count}개 임계치 미달 제외
          </span>
        )}
      </div>

      {recs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400 text-sm">추천 결과가 없습니다. 임계치를 낮추거나 다른 설명을 입력해 주세요.</p>
        </div>
      ) : (
        <>
          {/* Recommendation cards */}
          <div>
            <h3 className="text-hanwha-navy font-semibold text-sm mb-3">
              추천 Top{recs.length}
            </h3>
            <div className="flex flex-col gap-2">
              {recs.map((rec) => {
                const gs = gradeStyle(rec.risk_grade);
                const isSelected = selectedRec?.rank === rec.rank;
                return (
                  <button
                    key={rec.rank}
                    onClick={() => setSelectedRec(isSelected ? null : rec)}
                    className={`text-left w-full bg-white border rounded-xl px-4 py-3 shadow-sm transition-all
                      ${isSelected
                        ? "border-hanwha-orange ring-1 ring-hanwha-orange"
                        : "border-gray-200 hover:border-gray-300 hover:shadow-md"
                      }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="shrink-0 w-6 h-6 rounded-full bg-hanwha-navy text-white text-xs font-bold flex items-center justify-center">
                          {rec.rank}
                        </span>
                        <div className="min-w-0">
                          <span className="font-mono text-xs text-gray-400 mr-1">{rec.job_code}</span>
                          <span className="font-semibold text-sm text-hanwha-navy">{rec.job_name}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${gs.bg} ${gs.text} ${gs.border}`}
                        >
                          {rec.risk_grade}급
                        </span>
                        <span className="text-xs font-mono text-gray-500">
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
