"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FPProfile } from "@/lib/types";

const NAV_ITEMS: { label: string; href: string; comingSoon?: boolean }[] = [
  { label: "AI 영업비서", href: "/" },
  { label: "직업분류", href: "/jobcode", comingSoon: true },
];
const KST_TIMEZONE = "Asia/Seoul";
const FP_SESSION_KEY = "fp_logged_in_employee_id";

function getDateLabels(now: Date) {
  const full = new Intl.DateTimeFormat("ko-KR", {
    timeZone: KST_TIMEZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(now);

  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: KST_TIMEZONE,
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).formatToParts(now);

  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const short = `${month}/${day} (${weekday})`;

  return { full, short };
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className="text-gray-700 font-medium text-right">{value}</span>
    </div>
  );
}

function ProfileDropdown({
  fp,
  onLogout,
  onClose,
}: {
  fp: FPProfile;
  onLogout: () => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl shadow-modal border border-gray-100 overflow-hidden z-50">
      {/* Profile header */}
      <div
        className="px-4 py-4"
        style={{ background: "linear-gradient(135deg, #1A2B4A 0%, #2D4168 100%)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ background: "linear-gradient(135deg, #F37321 0%, #E06A1B 100%)" }}
          >
            {fp.profileInitials}
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight">{fp.name} FP</p>
            <p className="text-white/60 text-xs leading-tight mt-0.5">
              {fp.level} · {fp.branch}
            </p>
          </div>
        </div>
      </div>

      {/* Info rows */}
      <div className="px-4 py-3 space-y-2 text-xs border-b border-gray-100">
        <InfoRow label="사번" value={fp.employeeId} />
        <InfoRow label="경력" value={`${fp.yearsOfExperience}년`} />
        {fp.phone && <InfoRow label="연락처" value={fp.phone} />}
        {fp.email && <InfoRow label="이메일" value={fp.email} />}
      </div>

      {/* Logout */}
      <div className="px-4 py-3">
        <button
          onClick={() => {
            onLogout();
            onClose();
          }}
          className="w-full py-2 rounded-xl text-xs font-semibold text-red-500 border border-red-100 hover:bg-red-50 active:bg-red-100 transition-colors"
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}

interface AppHeaderProps {
  currentFP?: FPProfile | null;
  onLogout?: () => void;
}

export default function AppHeader({ currentFP, onLogout }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState("");
  const [currentDateShort, setCurrentDateShort] = useState("");
  const [internalLoggedIn, setInternalLoggedIn] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncDate = () => {
      const labels = getDateLabels(new Date());
      setCurrentDate(labels.full);
      setCurrentDateShort(labels.short);
    };
    syncDate();
    const timer = setInterval(syncDate, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  // For pages (like /jobcode) that don't pass currentFP,
  // detect login state from localStorage so logout button is consistent.
  useEffect(() => {
    if (!currentFP) {
      const savedId = window.localStorage.getItem(FP_SESSION_KEY);
      setInternalLoggedIn(!!savedId);
    } else {
      setInternalLoggedIn(false);
    }
  }, [currentFP]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showProfile) return;
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showProfile]);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      window.localStorage.removeItem(FP_SESSION_KEY);
      router.push("/");
    }
  };

  // Avatar button + dropdown (shared between mobile & desktop)
  const avatarButton = currentFP ? (
    <div className="relative shrink-0" ref={profileRef}>
      <button
        onClick={() => setShowProfile((v) => !v)}
        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-[10px] sm:text-xs font-bold transition-all"
        style={{
          background: "linear-gradient(135deg, #F37321 0%, #E06A1B 100%)",
          outline: showProfile
            ? "2px solid rgba(243,115,33,0.6)"
            : "2px solid rgba(255,255,255,0.2)",
          outlineOffset: "2px",
        }}
        aria-label="내 프로필"
      >
        {currentFP.profileInitials}
      </button>
      {showProfile && (
        <ProfileDropdown
          fp={currentFP}
          onLogout={handleLogout}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  ) : null;

  return (
    <header className="bg-hanwha-navy relative z-30 shrink-0">
      {/* ── Mobile header ── */}
      <div className="sm:hidden">
        {/* Row 1 — fixed height 40px */}
        <div className="flex items-center h-10 px-3 gap-2">
          <img
            src="/hwgi.png"
            alt="한화손해보험"
            className="h-14 object-contain shrink-0"
          />
          <div className="flex-1 min-w-0" />
          <div className="flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full px-2 py-0.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-300 font-semibold leading-none">
              정상
            </span>
          </div>
          <span className="text-[11px] text-white/50 font-medium shrink-0">
            {currentDateShort}
          </span>
          {avatarButton}
          {/* Fallback logout for pages without FP context */}
          {!currentFP && internalLoggedIn && (
            <button
              onClick={handleLogout}
              className="h-7 px-2.5 text-[10px] font-medium rounded-md border border-white/20 text-white/60 hover:bg-white/10 active:bg-white/20 transition-colors whitespace-nowrap shrink-0"
            >
              로그아웃
            </button>
          )}
        </div>

        {/* Row 2 — nav tabs, fixed height 36px */}
        <div className="flex items-end h-9 px-3 gap-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            if (item.comingSoon) {
              return (
                <span
                  key={item.href}
                  className="shrink-0 h-8 px-3.5 flex items-center gap-1.5 rounded-t-md text-xs font-semibold text-white/25 cursor-default select-none"
                >
                  {item.label}
                  <span className="text-[9px] font-bold tracking-wide bg-white/10 text-white/30 px-1 py-0.5 rounded leading-none">
                    SOON
                  </span>
                </span>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 h-8 px-3.5 flex items-center rounded-t-md text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-hanwha-orange text-white"
                    : "text-white/55 hover:text-white hover:bg-white/10"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Desktop header ── */}
      <div className="hidden sm:flex items-center justify-between px-6 py-3">
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <img
            src="/hwgi.png"
            alt="한화손해보험"
            className="h-10 object-contain shrink-0"
          />
          <div className="w-px h-5 bg-white/20 mx-1 shrink-0" />
          <nav className="flex items-center gap-1 overflow-x-auto whitespace-nowrap">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              if (item.comingSoon) {
                return (
                  <span
                    key={item.href}
                    className="shrink-0 whitespace-nowrap px-3 py-1.5 rounded-md text-sm font-medium text-white/25 cursor-default select-none flex items-center gap-1.5"
                  >
                    {item.label}
                    <span className="text-[10px] font-bold tracking-wide bg-white/10 text-white/30 px-1.5 py-0.5 rounded leading-none">
                      SOON
                    </span>
                  </span>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-hanwha-orange text-white"
                      : "text-white/60 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden md:flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-white/50"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span className="text-white/70 text-xs font-medium">{currentDate}</span>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-white/50 text-xs">시스템 정상</span>
          <div className="w-px h-5 bg-white/20" />
          {avatarButton}
          {/* Fallback logout for pages without FP context */}
          {!currentFP && internalLoggedIn && (
            <button
              onClick={handleLogout}
              className="px-2.5 py-1.5 text-xs font-medium rounded-md border border-white/20 text-white/60 hover:bg-white/10 transition-colors whitespace-nowrap"
            >
              로그아웃
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
