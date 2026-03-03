"use client";

import { useState } from "react";
import type { JobcodeSearchRequest } from "@/lib/jobcode-types";

const EXAMPLE_QUERIES = [
  {
    label: "보험 관리자",
    text: "보험회사 지점에서 영업조직 운영 계획을 세우고 팀장 인력 관리를 담당하는 내근 관리자입니다.",
  },
  {
    label: "5급 공무원(내근)",
    text: "시청에서 도시계획 정책 검토와 행정문서 결재를 담당하는 5급 이상 공무원이며 현장업무는 거의 없습니다.",
  },
  {
    label: "대출/추심 관리자",
    text: "대부업체에서 대출알선과 채권추심 부서 운영 및 관리 업무를 담당합니다.",
  },
];

interface Props {
  onSearch: (params: JobcodeSearchRequest) => void;
  isSearching: boolean;
}

export default function JobcodeSearchPanel({ onSearch, isSearching }: Props) {
  const [query, setQuery] = useState(EXAMPLE_QUERIES[0].text);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced settings
  const [useHybrid, setUseHybrid] = useState(true);
  const [useCrossEncoder, setUseCrossEncoder] = useState(true);
  const [useLlm, setUseLlm] = useState(true);
  const [showHighlight, setShowHighlight] = useState(true);
  const [scoreThreshold, setScoreThreshold] = useState(0.3);
  const [alphaBm25, setAlphaBm25] = useState(0.3);
  const [topkBm25, setTopkBm25] = useState(120);
  const [topkEmbed, setTopkEmbed] = useState(120);
  const [topkResult, setTopkResult] = useState(3);

  function handleSearch() {
    if (!query.trim()) return;
    onSearch({
      query,
      use_hybrid: useHybrid,
      use_cross_encoder: useCrossEncoder,
      use_llm: useLlm,
      show_highlight: showHighlight,
      score_threshold: scoreThreshold,
      alpha_bm25: alphaBm25,
      topk_bm25: topkBm25,
      topk_embed: topkEmbed,
      topk_result: topkResult,
    });
  }

  return (
    <div className="w-80 shrink-0 bg-hanwha-navy flex flex-col overflow-y-auto">
      <div className="p-5 flex flex-col gap-4">
        <h2 className="text-white font-semibold text-base">입력 / 설정</h2>

        {/* Query textarea */}
        <div className="flex flex-col gap-2">
          <label className="text-gray-300 text-xs font-medium">고객 직업 설명</label>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={6}
            placeholder="직업 설명을 입력하세요..."
            className="w-full bg-white/10 border border-white/20 text-white text-sm rounded-lg px-3 py-2 resize-none placeholder-gray-400 focus:outline-none focus:border-hanwha-orange transition-colors"
          />
        </div>

        {/* Example queries */}
        <div className="flex flex-col gap-1.5">
          <p className="text-gray-400 text-xs font-medium">예시 입력</p>
          <div className="flex flex-col gap-1">
            {EXAMPLE_QUERIES.map((ex) => (
              <button
                key={ex.label}
                onClick={() => setQuery(ex.text)}
                className="text-left text-xs px-2.5 py-1.5 rounded-md bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition-colors border border-white/10 hover:border-white/25"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search button */}
        <button
          onClick={handleSearch}
          disabled={isSearching || !query.trim()}
          className="w-full py-2.5 rounded-xl font-semibold text-sm text-white
            bg-gradient-to-r from-hanwha-orange to-orange-500
            hover:from-orange-500 hover:to-orange-400
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all shadow-md active:scale-95"
        >
          {isSearching ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              검색 중...
            </span>
          ) : (
            "후보 검색"
          )}
        </button>

        {/* Advanced settings */}
        <div className="border border-white/15 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2.5 text-gray-300 hover:text-white hover:bg-white/5 transition-colors text-xs font-medium"
          >
            <span>고급 설정</span>
            <svg
              className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {showAdvanced && (
            <div className="px-3 pb-3 flex flex-col gap-3 bg-black/10">
              {/* Toggles */}
              <ToggleRow
                label="하이브리드 사용 (BM25+Embedding)"
                checked={useHybrid}
                onChange={setUseHybrid}
              />
              <ToggleRow
                label="Cross-Encoder 재랭크"
                checked={useCrossEncoder}
                onChange={setUseCrossEncoder}
              />
              <ToggleRow
                label="GPT 최종 재랭크 (LLM)"
                checked={useLlm}
                onChange={setUseLlm}
              />
              <ToggleRow
                label="하이라이트 표시"
                checked={showHighlight}
                onChange={setShowHighlight}
              />

              {/* Sliders */}
              <SliderRow
                label="최소 표시 점수"
                value={scoreThreshold}
                min={0}
                max={1}
                step={0.05}
                onChange={setScoreThreshold}
                format={(v) => v.toFixed(2)}
              />
              <SliderRow
                label="BM25 가중치 (alpha)"
                value={alphaBm25}
                min={0}
                max={1}
                step={0.05}
                onChange={setAlphaBm25}
                format={(v) => v.toFixed(2)}
              />
              <SliderRow
                label="BM25 후보 수 (TOPK)"
                value={topkBm25}
                min={20}
                max={300}
                step={10}
                onChange={setTopkBm25}
                format={(v) => String(v)}
              />
              <SliderRow
                label="Embedding 후보 수 (TOPK)"
                value={topkEmbed}
                min={20}
                max={300}
                step={10}
                onChange={setTopkEmbed}
                format={(v) => String(v)}
              />
              <SliderRow
                label="최종 추천 개수"
                value={topkResult}
                min={1}
                max={10}
                step={1}
                onChange={setTopkResult}
                format={(v) => String(v)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 cursor-pointer pt-2">
      <span className="text-gray-300 text-xs">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${
          checked ? "bg-hanwha-orange" : "bg-white/20"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-4" : "translate-x-1"
          }`}
        />
      </button>
    </label>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <div className="flex flex-col gap-1 pt-2">
      <div className="flex justify-between items-center">
        <span className="text-gray-300 text-xs">{label}</span>
        <span className="text-hanwha-orange text-xs font-mono font-semibold">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-white/20 accent-hanwha-orange cursor-pointer"
      />
    </div>
  );
}
