"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { FPProfile } from "@/lib/types";

const NAV_ITEMS = [
  { label: "AI 영업비서", href: "/" },
  { label: "직업분류", href: "/jobcode" },
];

interface AppHeaderProps {
  currentFP?: FPProfile | null;
  onLogout?: () => void;
}

export default function AppHeader({ currentFP, onLogout }: AppHeaderProps) {
  const pathname = usePathname();
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    const now = new Date();
    setCurrentDate(
      now.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
      })
    );
  }, []);

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white shadow-md z-10 shrink-0 border-b border-gray-200">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <img src="/hwgi.png" alt="한화손해보험" className="h-8 object-contain" />
        </div>
        <div className="hidden sm:block w-px h-5 bg-gray-300 mx-1" />

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
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

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5">
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
            <div className="hidden sm:block w-px h-5 bg-gray-300" />
            <div className="hidden sm:block text-right">
              <p className="text-xs font-semibold text-gray-700 leading-tight">
                {currentFP.name} FP
              </p>
              <p className="text-[11px] text-gray-500 leading-tight">
                {currentFP.branch}
              </p>
            </div>
          </>
        )}
        {currentFP && onLogout && (
          <button
            onClick={onLogout}
            className="px-2.5 py-1.5 text-xs font-medium rounded-md border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
          >
            로그아웃
          </button>
        )}
      </div>
    </header>
  );
}
