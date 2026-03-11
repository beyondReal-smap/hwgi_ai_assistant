"use client";

import { useEffect, useState } from "react";

export interface ProgressStep {
  label: string;
  duration: number; // ms before advancing to next step (0 = stay until unmount)
}

export const SILSON_STEPS: ProgressStep[] = [
  { label: "질문 분석 중", duration: 1200 },
  { label: "Q&A 검색 중", duration: 2000 },
  { label: "약관 조항 검색 중", duration: 2500 },
  { label: "AI 답변 생성 중", duration: 0 },
];

export const LMS_STEPS: ProgressStep[] = [
  { label: "고객 정보 분석 중", duration: 1500 },
  { label: "이벤트 맥락 파악 중", duration: 2000 },
  { label: "LMS 메시지 생성 중", duration: 0 },
];

interface Props {
  steps?: ProgressStep[];
}

export default function StepProgressIndicator({ steps = SILSON_STEPS }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  // Auto-advance through steps
  useEffect(() => {
    const step = steps[currentStep];
    if (!step || step.duration === 0) return;

    const timer = setTimeout(() => {
      if (currentStep < steps.length - 1) {
        setCurrentStep((s) => s + 1);
      }
    }, step.duration);

    return () => clearTimeout(timer);
  }, [currentStep, steps]);

  // Elapsed seconds counter
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-start gap-2 mb-4">
      {/* Bot avatar */}
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 shadow-sm">
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#C2571A"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="7" x2="12" y2="3" />
          <circle cx="12" cy="2.5" r="1" fill="#C2571A" stroke="none" />
          <rect x="4" y="7" width="16" height="13" rx="2.5" />
          <circle cx="9" cy="12" r="1.5" fill="#C2571A" stroke="none" />
          <circle cx="15" cy="12" r="1.5" fill="#C2571A" stroke="none" />
          <path d="M9 16.5 Q12 15 15 16.5" strokeWidth="1.5" />
          <line x1="4" y1="12" x2="2" y2="12" />
          <line x1="20" y1="12" x2="22" y2="12" />
        </svg>
      </div>

      <div className="flex flex-col items-start">
        <span className="text-[11px] font-semibold text-hanwha-navy/60 ml-0.5 mb-1">
          AI 영업비서
        </span>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-3.5 py-2.5 min-w-[200px]">
          {/* Step list */}
          <div className="flex flex-col gap-1.5">
            {steps.map((step, idx) => {
              const isDone = idx < currentStep;
              const isActive = idx === currentStep;
              const isPending = idx > currentStep;

              return (
                <div
                  key={step.label}
                  className={`flex items-center gap-2 text-[12px] transition-opacity duration-300 ${
                    isPending ? "opacity-30" : "opacity-100"
                  }`}
                >
                  {/* Status icon */}
                  <div className="w-4 h-4 flex items-center justify-center shrink-0">
                    {isDone ? (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="6.5" fill="#F37321" />
                        <path d="M4 7.2L6 9.2L10 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : isActive ? (
                      <span className="silson-spinner w-3.5 h-3.5 rounded-full border-2 border-hanwha-orange/30 border-t-hanwha-orange" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className={`${
                      isActive
                        ? "text-hanwha-navy font-medium"
                        : isDone
                        ? "text-gray-400"
                        : "text-gray-300"
                    }`}
                  >
                    {step.label}
                    {isActive && (
                      <span className="inline-flex ml-0.5 tracking-widest text-hanwha-orange/70">
                        <span className="typing-dot-inline">.</span>
                        <span className="typing-dot-inline" style={{ animationDelay: "0.3s" }}>.</span>
                        <span className="typing-dot-inline" style={{ animationDelay: "0.6s" }}>.</span>
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Elapsed time */}
          {elapsed > 0 && (
            <div className="mt-2 pt-1.5 border-t border-gray-50 text-[10px] text-gray-300 text-right">
              {elapsed}초 경과
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
