"use client";

import { useState } from "react";
import AppHeader from "@/components/AppHeader";

/* ── 카테고리 + 예시 데이터 ── */

interface Example {
  query: string;
  desc: string;
}

interface Category {
  title: string;
  icon: string;
  examples: Example[];
}

const CATEGORIES: Category[] = [
  {
    title: "오늘 터치 (Daily Touch)",
    icon: "📋",
    examples: [
      { query: "오늘 터치할 고객 보여줘", desc: "전체 터치 리스트" },
      { query: "만기 갱신 고객 알려줘", desc: "자동차/장기 만기 + 갱신" },
      { query: "연체 미인출 고객 보여줘", desc: "장기 연체 + 미인출" },
      { query: "오늘 생일인 고객 있어?", desc: "오늘 생일" },
      { query: "체결 감사 대상 고객", desc: "신규 체결 감사" },
      { query: "미터치 고객 누구야?", desc: "장기 미접촉" },
      { query: "주요담보 저가입 고객", desc: "담보 부족 안내" },
      { query: "가입설계 동의 만료 고객", desc: "동의 만료 예정" },
      { query: "남자 터치 고객", desc: "터치 리스트 내 성별 필터" },
      { query: "50대 터치 고객", desc: "터치 리스트 내 연령 필터" },
      { query: "자동차보험 고객", desc: "자동차(CA) 보유 고객" },
      { query: "긴급 고객 보여줘", desc: "긴급도 필터" },
    ],
  },
  {
    title: "내 전체 고객",
    icon: "👥",
    examples: [
      { query: "내 담당 고객 목록 보여줘", desc: "이름순 정렬" },
      { query: "남자 고객 몇 명이야?", desc: "성별 필터" },
      { query: "여성 고객 목록", desc: "성별 필터" },
      { query: "50대 고객 보여줘", desc: "50~60세" },
      { query: "30세 이상 고객", desc: "30세 이상 전체" },
      { query: "50대 여자 고객", desc: "연령 + 성별 복합 조건" },
      { query: "마케팅 동의 고객", desc: "마케팅 활용 동의" },
      { query: "3월 생일 고객", desc: "특정 월 생일" },
      { query: "이번달 생일 고객", desc: "이번 달 생일" },
    ],
  },
  {
    title: "직장 검색",
    icon: "🏢",
    examples: [
      { query: "우체국 다니는 고객", desc: "직장명: 우체국" },
      { query: "병원 고객", desc: "직장명: 병원" },
      { query: "학생 고객", desc: "직장명: 학생" },
    ],
  },
  {
    title: "설계사 조회",
    icon: "🧑‍💼",
    examples: [
      { query: "우리 지점 설계사 목록 보여줘", desc: "전체 FP 목록" },
      { query: "안옥순 설계사 고객", desc: "특정 FP 고객 조회" },
      { query: "위정숙 담당 고객", desc: "특정 FP 고객 조회" },
    ],
  },
  {
    title: "상품 조회",
    icon: "📦",
    examples: [
      { query: "가장 많이 가입한 상품 순위", desc: "인기 상품 순위" },
      { query: "취급 상품 목록", desc: "전체 상품 목록" },
      { query: "암보험 가입 현황", desc: "상품명 검색" },
      { query: "실손보험 가입 고객", desc: "상품명 검색" },
      { query: "운전자보험 가입자", desc: "상품명 검색" },
      { query: "자녀보험 가입 현황", desc: "상품명 검색" },
      { query: "치아보험 가입 고객", desc: "상품명 검색" },
    ],
  },
  {
    title: "담보 검색",
    icon: "🛡️",
    examples: [
      { query: "질병사망 담보 가입자", desc: "담보명 검색" },
      { query: "수술비 담보 가입 현황", desc: "담보명 검색" },
      { query: "뇌출혈 담보 가입 고객", desc: "담보명 검색" },
      { query: "암진단비 가입자", desc: "담보명 검색" },
    ],
  },
  {
    title: "고객 가입 상세",
    icon: "📄",
    examples: [
      { query: "지미애 가입 담보", desc: "증권별 담보 트리" },
      { query: "박우신 계약 정보", desc: "증권별 담보 트리" },
      { query: "강경민 가입 상품", desc: "증권별 담보 트리" },
    ],
  },
  {
    title: "만기 도래",
    icon: "⏰",
    examples: [
      { query: "올해 만기 도래 담보 현황", desc: "12개월 이내" },
      { query: "3개월 내 만기 계약", desc: "3개월 이내" },
      { query: "6개월 이내 만기 담보", desc: "6개월 이내" },
    ],
  },
];

interface Scenario {
  title: string;
  steps: string[];
}

const SCENARIOS: Scenario[] = [
  {
    title: "일일 터치 업무",
    steps: [
      "로그인 → 자동 터치 리스트 표시",
      '"연체 미인출 고객 보여줘" → 긴급 고객 확인',
      "고객 카드 클릭 → LMS 생성 → 발송",
    ],
  },
  {
    title: "고객 분석",
    steps: [
      '"내 담당 고객 목록 보여줘" → 전체 고객 확인',
      '"50대 여자 고객" → 복합 필터',
      '"마케팅 동의 고객" → 마케팅 대상 확인',
      '"3월 생일 고객" → 생일 고객 확인',
    ],
  },
  {
    title: "상품/담보 분석",
    steps: [
      '"가장 많이 가입한 상품 순위" → 인기 상품 확인',
      '"암보험 가입 현황" → 특정 상품 가입자',
      '"지미애 가입 담보" → 고객 상세 확인',
      '"올해 만기 도래 담보 현황" → 만기 관리',
    ],
  },
];

/* ── 컴포넌트 ── */

function ExampleRow({ example }: { example: Example }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(example.query).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-gray-50 active:bg-orange-50 transition-colors group"
    >
      <span className="flex-1 min-w-0">
        <span className="text-sm font-medium text-hanwha-navy block truncate">
          {example.query}
        </span>
        <span className="text-xs text-gray-400 block mt-0.5">{example.desc}</span>
      </span>
      <span
        className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors ${
          copied
            ? "bg-emerald-100 text-emerald-600"
            : "bg-gray-100 text-gray-400 group-hover:bg-hanwha-orange/10 group-hover:text-hanwha-orange"
        }`}
      >
        {copied ? "복사됨" : "복사"}
      </span>
    </button>
  );
}

function CategoryCard({ category }: { category: Category }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50/50 transition-colors"
      >
        <span className="text-xl shrink-0">{category.icon}</span>
        <span className="flex-1 min-w-0">
          <span className="text-sm font-bold text-hanwha-navy">{category.title}</span>
          <span className="text-xs text-gray-400 ml-2">{category.examples.length}개 예시</span>
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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-6 h-6 rounded-full bg-hanwha-orange/10 text-hanwha-orange text-xs font-bold flex items-center justify-center">
          {String.fromCharCode(65 + index)}
        </span>
        <span className="text-sm font-bold text-hanwha-navy">{scenario.title}</span>
      </div>
      <ol className="space-y-2">
        {scenario.steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
            <span className="shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-400 text-[10px] font-bold flex items-center justify-center mt-0.5">
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
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-gray-50">
      <AppHeader />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
          {/* Title */}
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-hanwha-navy">사용법 안내</h1>
            <p className="text-sm text-gray-400 mt-1">
              채팅창에 아래 예시를 입력하면 해당 정보를 조회할 수 있습니다.
              예시를 탭하면 클립보드에 복사됩니다.
            </p>
          </div>

          {/* Categories */}
          <div className="space-y-3 mb-8">
            {CATEGORIES.map((cat, i) => (
              <CategoryCard key={i} category={cat} />
            ))}
          </div>

          {/* Scenarios */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-hanwha-navy mb-4">데모 시나리오</h2>
            <div className="space-y-3">
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
