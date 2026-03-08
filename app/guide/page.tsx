"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { CATEGORIES, SCENARIOS } from "@/lib/guide-data";
import type { Example, Category, Scenario } from "@/lib/guide-data";

/* ── 컴포넌트 ── */

function ExampleRow({ example }: { example: Example }) {
  const router = useRouter();

  const handleInsert = () => {
    sessionStorage.setItem("guide_selected_query", example.query);
    const params = new URLSearchParams({ guideQuery: example.query });
    router.push(`/?${params.toString()}`);
  };

  return (
    <button
      onClick={handleInsert}
      className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-left hover:bg-gray-50 active:bg-orange-50 transition-colors group"
    >
      <span className="flex-1 min-w-0">
        <span className="text-sm font-medium text-hanwha-navy block truncate">
          {example.query}
        </span>
        <span className="text-xs text-gray-400 block mt-0.5">{example.desc}</span>
      </span>
      <span
        className="shrink-0 text-[11px] font-medium px-1.5 py-0.5 rounded transition-colors bg-hanwha-orange/10 text-hanwha-orange group-hover:bg-hanwha-orange/20"
      >
        입력
      </span>
    </button>
  );
}

function CategoryCard({ category }: { category: Category }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50/50 transition-colors"
      >
        <span className="text-lg shrink-0">{category.icon}</span>
        <span className="flex-1 min-w-0">
          <span className="text-sm font-bold text-hanwha-navy">{category.title}</span>
          <span className="text-xs text-gray-400 ml-1.5">{category.examples.length}개</span>
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-gray-300 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-gray-100 px-1 py-1">
          {category.examples.map((ex, i) => (
            <ExampleRow key={i} example={ex} />
          ))}
        </div>
      )}
    </div>
  );
}

function ScenarioCard({ scenario, index }: { scenario: Scenario; index: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="w-5 h-5 rounded-full bg-hanwha-orange/10 text-hanwha-orange text-xs font-bold flex items-center justify-center">
          {String.fromCharCode(65 + index)}
        </span>
        <span className="text-sm font-bold text-hanwha-navy">{scenario.title}</span>
      </div>
      <ol className="space-y-1.5">
        {scenario.steps.map((step, i) => (
          <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
            <span className="shrink-0 w-4 h-4 rounded-full bg-gray-100 text-gray-400 text-[10px] font-bold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            <span className="min-w-0">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ── 페이지 ── */

export default function GuidePage() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-gray-50">
      <AppHeader />

      <div className="flex-1">
        <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
          {/* Title */}
          <div className="mb-4">
            <h1 className="text-lg sm:text-xl font-bold text-hanwha-navy">사용법 안내</h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
              채팅창에 아래 예시를 입력하면 해당 정보를 조회할 수 있습니다.
              예시를 탭하면 AI 영업비서 채팅창에 자동으로 입력됩니다.
            </p>
          </div>

          {/* Categories */}
          <div className="space-y-2 mb-6">
            {CATEGORIES.map((cat, i) => (
              <CategoryCard key={i} category={cat} />
            ))}
          </div>

          {/* Scenarios */}
          <div className="mb-6">
            <h2 className="text-base font-bold text-hanwha-navy mb-2.5">데모 시나리오</h2>
            <div className="space-y-2">
              {SCENARIOS.map((sc, i) => (
                <ScenarioCard key={i} scenario={sc} index={i} />
              ))}
            </div>
          </div>

          {/* Bottom padding */}
          <div className="h-8" />
        </div>
      </div>
    </div>
  );
}
