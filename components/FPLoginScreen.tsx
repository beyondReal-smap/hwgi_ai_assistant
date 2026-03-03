"use client";

import { useState } from "react";

interface FPLoginScreenProps {
  isLoading: boolean;
  accountCount: number;
  loadError: string | null;
  authError: string | null;
  onLogin: (employeeId: string, password: string) => void;
}

export default function FPLoginScreen({
  isLoading,
  accountCount,
  loadError,
  authError,
  onLogin,
}: FPLoginScreenProps) {
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");

  const disabled = isLoading || Boolean(loadError);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-100 flex items-center justify-center px-4">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 12% 18%, rgba(243,115,33,0.26), transparent 34%), radial-gradient(circle at 88% 82%, rgba(26,43,74,0.2), transparent 40%), linear-gradient(155deg, #F8FAFC 0%, #E7EDF5 48%, #DEE7F2 100%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md rounded-3xl shadow-xl border border-white/70 bg-white/90 backdrop-blur-sm p-7">
        <div className="flex items-center gap-3 mb-6">
          <img src="/hwgi.png" alt="한화손해보험" className="h-9 object-contain" />
          <div className="w-px h-5 bg-slate-300" />
          <p className="text-sm font-semibold text-slate-700">FP 로그인</p>
        </div>

        <h1 className="text-2xl font-bold text-hanwha-navy mb-1">AI 영업비서</h1>
        <p className="text-sm text-slate-600 mb-6">
          FP.csv에 등록된 설계사만 로그인할 수 있습니다.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (disabled) return;
            onLogin(employeeId, password);
          }}
          className="space-y-3"
        >
          <label className="block">
            <span className="text-xs font-semibold text-slate-500">사번 / FP ID</span>
            <input
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="예: 3219739"
              disabled={disabled}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:border-hanwha-orange focus:ring-2 focus:ring-orange-100 disabled:opacity-60"
              autoComplete="username"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-500">비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="FP.csv 비밀번호"
              disabled={disabled}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:border-hanwha-orange focus:ring-2 focus:ring-orange-100 disabled:opacity-60"
              autoComplete="current-password"
            />
          </label>

          <button
            type="submit"
            disabled={disabled || !employeeId.trim() || !password}
            className="w-full mt-1 rounded-xl py-3 text-sm font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background:
                disabled || !employeeId.trim() || !password
                  ? "#CBD5E1"
                  : "linear-gradient(135deg, #F37321 0%, #E06A1B 100%)",
            }}
          >
            로그인
          </button>
        </form>

        <div className="mt-4 space-y-2">
          {isLoading && (
            <p className="text-xs text-slate-600">FP.csv를 불러오는 중입니다...</p>
          )}
          {!isLoading && !loadError && (
            <p className="text-xs text-emerald-700">
              로그인 가능한 FP 계정 {accountCount}건을 로드했습니다.
            </p>
          )}
          {loadError && (
            <p className="text-xs text-red-600 leading-relaxed">
              {loadError}
              <br />
              파일 경로: <code className="font-semibold">/public/FP.csv</code>
            </p>
          )}
          {authError && <p className="text-xs text-red-600">{authError}</p>}
        </div>

        <div className="mt-5 pt-4 border-t border-slate-200 text-[11px] text-slate-500 leading-relaxed">
          필수 컬럼: <code>name</code>, <code>employeeId</code>, <code>password</code>
          <br />
          선택 컬럼: <code>branch</code>, <code>level</code>, <code>yearsOfExperience</code>,{" "}
          <code>phone</code>, <code>email</code>, <code>profileInitials</code>
        </div>
      </div>
    </div>
  );
}
