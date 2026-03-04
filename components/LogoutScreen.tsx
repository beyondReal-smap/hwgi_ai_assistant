"use client";

import { motion } from "framer-motion";

interface LogoutScreenProps {
  fpName: string;
  isLeaving: boolean;
}

export default function LogoutScreen({ fpName, isLeaving }: LogoutScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={isLeaving ? { opacity: 0 } : { opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{
        background: "linear-gradient(155deg, #F8FAFC 0%, #EBF0F7 50%, #E3EBF5 100%)",
      }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-36 -left-32 w-[30rem] h-[30rem] rounded-full opacity-25"
          style={{
            background: "radial-gradient(circle, rgba(26,43,74,0.3) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-36 -right-28 w-[28rem] h-[28rem] rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, rgba(243,115,33,0.2) 0%, transparent 70%)",
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
          <img src="/hwgi_black.png" alt="한화손해보험" className="h-12 object-contain" />
          <div className="w-px h-5 bg-slate-300" />
          <p className="text-sm font-semibold text-slate-700">AI 영업비서</p>
        </div>

        <div
          className="mt-5 w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #1A2B4A 0%, #2D4168 100%)" }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h2 className="mt-4 text-xl font-bold text-hanwha-navy">
          안녕히 가세요, {fpName} FP님
        </h2>
        <p className="mt-1.5 text-sm text-slate-600">
          세션이 안전하게 종료되었습니다.
        </p>

        <div className="mt-5 flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          보안 세션 정상 종료
        </div>
      </motion.div>
    </motion.div>
  );
}
