"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

  const showLogout = !!(currentFP && onLogout) || internalLoggedIn;

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      window.localStorage.removeItem(FP_SESSION_KEY);
      router.push("/");
    }
  };

  return (
    <header className="bg-white shadow-sm z-10 shrink-0 border-b border-gray-200">
      {/* ── Mobile header ── */}
      <div className="sm:hidden">
        {/* Row 1 — fixed height 40px */}
        <div className="flex items-center h-10 px-3 gap-2">
          <img
            src="/hwgi.png"
            alt="한화손해보험"
            className="h-6 object-contain shrink-0"
          />
          <div className="flex-1 min-w-0" />
          <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-emerald-700 font-semibold leading-none">
              정상
            </span>
          </div>
          <span className="text-[11px] text-gray-400 font-medium shrink-0">
            {currentDateShort}
          </span>
          {showLogout && (
            <button
              onClick={handleLogout}
              className="h-7 px-2.5 text-[10px] font-medium rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 active:bg-gray-100 transition-colors whitespace-nowrap shrink-0"
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
                  className="shrink-0 h-8 px-3.5 flex items-center gap-1.5 rounded-t-md text-xs font-semibold text-gray-300 cursor-default select-none"
                >
                  {item.label}
                  <span className="text-[9px] font-bold tracking-wide bg-gray-100 text-gray-400 px-1 py-0.5 rounded leading-none">
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
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
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
            className="h-8 object-contain shrink-0"
          />
          <div className="w-px h-5 bg-gray-300 mx-1 shrink-0" />
          <nav className="flex items-center gap-1 overflow-x-auto whitespace-nowrap">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              if (item.comingSoon) {
                return (
                  <span
                    key={item.href}
                    className="shrink-0 whitespace-nowrap px-3 py-1.5 rounded-md text-sm font-medium text-gray-300 cursor-default select-none flex items-center gap-1.5"
                  >
                    {item.label}
                    <span className="text-[10px] font-bold tracking-wide bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded leading-none">
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
                      ? "bg-orange-50 text-hanwha-orange"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden md:flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-hanwha-orange"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span className="text-gray-700 text-xs font-medium">{currentDate}</span>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-gray-500 text-xs">시스템 정상</span>
          {currentFP && (
            <>
              <div className="hidden xl:block w-px h-5 bg-gray-300" />
              <div className="hidden xl:block text-right">
                <p className="text-xs font-semibold text-gray-700 leading-tight">
                  {currentFP.name} FP
                </p>
                <p className="text-[11px] text-gray-500 leading-tight">
                  {currentFP.branch}
                </p>
              </div>
            </>
          )}
          {showLogout && (
            <button
              onClick={handleLogout}
              className="px-2.5 py-1.5 text-xs font-medium rounded-md border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors whitespace-nowrap"
            >
              로그아웃
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
