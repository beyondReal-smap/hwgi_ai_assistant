"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface LoginLoadingScreenProps {
  fpName: string;
  isLeaving: boolean;
}

export default function LoginLoadingScreen({
  fpName,
  isLeaving,
}: LoginLoadingScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let rafId = 0;
    const durationMs = 2800;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const ratio = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - ratio, 2.2);
      setProgress(Math.round(eased * 100));
      if (ratio < 1) {
        rafId = requestAnimationFrame(step);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={isLeaving ? { opacity: 0 } : { opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{
        background:
          "linear-gradient(155deg, #F8FAFC 0%, #EBF0F7 50%, #E3EBF5 100%)",
      }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-36 -left-32 w-[30rem] h-[30rem] rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(circle, rgba(243,115,33,0.35) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-36 -right-28 w-[28rem] h-[28rem] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, rgba(26,43,74,0.3) 0%, transparent 70%)",
          }}
        />
      </div>

      <motion.div
        initial={{ y: 14, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative w-full max-w-md rounded-3xl border border-white/80 bg-white/88 backdrop-blur-sm p-7 shadow-[0_18px_45px_rgba(26,43,74,0.16)]"
      >
        <div className="flex items-center gap-3">
          <img src="/hwgi.png" alt="한화손해보험" className="h-9 object-contain" />
          <div className="w-px h-5 bg-slate-300" />
          <p className="text-sm font-semibold text-slate-700">AI 영업비서 준비 중</p>
        </div>

        <h2 className="mt-5 text-xl font-bold text-hanwha-navy">
          {fpName} FP님, 업무 환경을 불러오는 중입니다.
        </h2>
        <p className="mt-1.5 text-sm text-slate-600">
          고객 데이터와 오늘의 우선순위를 정리하고 있어요.
        </p>

        <div className="mt-6">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>초기화 진행률</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-200 overflow-hidden">
            <motion.div
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, #F37321 0%, #E06A1B 100%)",
              }}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          보안 인증 및 세션 연결 완료
        </div>
      </motion.div>
    </motion.div>
  );
}
