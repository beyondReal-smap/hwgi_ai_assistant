"use client";

import { useState } from "react";
import type { JobcodeSearchRequest } from "@/lib/jobcode-types";

const EXAMPLE_QUERIES = [
  {
    label: "보상 심사 관리자",
    summary: "보험사 보상팀 내근 관리자",
    text: "손해보험사 보상지원 부서에서 심사 기준을 검토하고 팀원의 보상 처리 품질을 관리하는 내근 관리자입니다. 현장 출동은 거의 없고 문서 검토, 승인, 민원 조율 업무 비중이 높습니다.",
  },
  {
    label: "지자체 행정 사무관",
    summary: "정책 검토 중심의 공공 행정직",
    text: "구청 기획예산 부서에서 정책 검토, 예산 편성, 행정문서 결재를 담당하는 5급 이상 공무원입니다. 외근보다는 회의, 보고서 작성, 조직 운영 비중이 큽니다.",
  },
  {
    label: "물류센터 현장 소장",
    summary: "하역·장비·안전 관리가 많은 현장형 직무",
    text: "대형 물류센터에서 하역 인력 배치, 지게차 동선 관리, 안전 점검, 사고 예방 교육을 총괄하는 현장 관리자입니다. 실내 사무보다 현장 통제와 순회 비중이 높습니다.",
  },
];

const DEFAULT_SEARCH_OPTIONS = {
  use_hybrid: true,
  use_cross_encoder: true,
  use_llm: true,
  show_highlight: true,
  score_threshold: 0.3,
  alpha_bm25: 0.3,
  topk_bm25: 120,
  topk_embed: 120,
  topk_result: 3,
} satisfies Omit<JobcodeSearchRequest, "query">;

interface Props {
  onSearch: (params: JobcodeSearchRequest) => void;
  isSearching: boolean;
  fullWidth?: boolean;
}

export default function JobcodeSearchPanel({ onSearch, isSearching, fullWidth = false }: Props) {
  const [query, setQuery] = useState("");

  function handleSearch() {
    if (!query.trim()) return;
    onSearch({
      query,
      ...DEFAULT_SEARCH_OPTIONS,
    });
  }

  return (
    <div
      className={`${fullWidth ? "w-full" : "w-[25rem] shrink-0"} h-full min-h-0 overflow-y-auto border-r border-slate-200/80 bg-[linear-gradient(180deg,#FFF8F2_0%,#F7F2EA_38%,#F2F5F8_100%)]`}
    >
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-[0_18px_60px_rgba(26,43,74,0.08)] backdrop-blur">
          <div className="border-b border-slate-100 bg-[linear-gradient(135deg,rgba(243,115,33,0.12)_0%,rgba(243,115,33,0.03)_45%,rgba(26,43,74,0.02)_100%)] px-5 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-hanwha-orange/80">
              Search Setup
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-hanwha-navy">
              고객 직업 설명을 준비해 주세요
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              직무의 핵심 업무, 현장 여부, 관리 책임, 위험 노출 정도가 드러나면 추천 정확도가 좋아집니다.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <HintChip>내근/외근 여부</HintChip>
              <HintChip>장비·현장 노출</HintChip>
              <HintChip>승인·관리 책임</HintChip>
            </div>
          </div>

          <div className="space-y-4 px-5 py-5">
            <label htmlFor="jobcode-query" className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              직업 설명
            </label>

            <textarea
              id="jobcode-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={7}
              placeholder="고객의 실제 업무 내용을 자연스럽게 적어주세요."
              className="min-h-[11rem] w-full resize-y rounded-[22px] border border-slate-200 bg-[#FFFDFC] px-4 py-4 text-sm leading-6 text-slate-700 shadow-inner outline-none transition-[border,box-shadow] placeholder:text-slate-400 focus:border-hanwha-orange focus:ring-4 focus:ring-orange-100"
            />

            <div className="flex items-center justify-between gap-3 text-[11px] text-slate-400">
              <span>{query.trim().length}자 입력됨</span>
              <span>기본 설정으로 검색됩니다</span>
            </div>

            <button
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
              className="relative w-full overflow-hidden rounded-[22px] py-3.5 text-sm font-semibold text-white transition-all shadow-[0_16px_30px_rgba(243,115,33,0.22)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
              style={{
                background: isSearching
                  ? "linear-gradient(135deg, rgba(243,115,33,0.88) 0%, rgba(224,106,27,0.95) 100%)"
                  : "linear-gradient(135deg, #F37321 0%, #E06A1B 100%)",
              }}
            >
              {isSearching && (
                <span
                  className="pointer-events-none absolute inset-0 opacity-60"
                  style={{
                    background:
                      "linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.16) 25%, transparent 55%)",
                    backgroundSize: "200% 100%",
                    animation: "shimmerMove 1.4s linear infinite",
                  }}
                />
              )}
              {isSearching ? (
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-white/90 animate-pulse" />
                    <span className="h-1.5 w-1.5 rounded-full bg-white/70 animate-pulse [animation-delay:180ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-white/50 animate-pulse [animation-delay:360ms]" />
                  </span>
                  후보를 찾는 중
                </span>
              ) : (
                <span className="relative z-10">직업코드 후보 찾기</span>
              )}
            </button>
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200/80 bg-white/88 p-4 shadow-sm backdrop-blur">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-hanwha-navy">예시 입력</p>
              <p className="mt-1 text-xs text-slate-400">
                아래 예시를 눌러 바로 교체할 수 있습니다.
              </p>
            </div>
            <span className="rounded-full bg-hanwha-orange/10 px-2.5 py-1 text-[11px] font-semibold text-hanwha-orange">
              {EXAMPLE_QUERIES.length}개
            </span>
          </div>

          <div className="space-y-2.5">
            {EXAMPLE_QUERIES.map((example) => (
              <ExampleCard
                key={example.label}
                label={example.label}
                summary={example.summary}
                onClick={() => setQuery(example.text)}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function HintChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-medium text-hanwha-orange">
      {children}
    </span>
  );
}

function ExampleCard({
  label,
  summary,
  onClick,
}: {
  label: string;
  summary: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center justify-between gap-3 rounded-[20px] border border-slate-200 bg-[linear-gradient(135deg,#FFFFFF_0%,#FFF7F1_100%)] px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-hanwha-navy">{label}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">{summary}</p>
      </div>
      <span className="shrink-0 rounded-full border border-orange-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-hanwha-orange transition-colors group-hover:bg-orange-50">
        적용
      </span>
    </button>
  );
}
