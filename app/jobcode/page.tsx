"use client";

import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import JobcodeSearchPanel from "@/components/jobcode/JobcodeSearchPanel";
import JobcodeResultsPanel from "@/components/jobcode/JobcodeResultsPanel";
import type { JobcodeSearchRequest, JobcodeSearchResponse } from "@/lib/jobcode-types";

type MobileTab = "search" | "results";

export default function JobcodePage() {
  const [response, setResponse] = useState<JobcodeSearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("search");

  async function handleSearch(params: JobcodeSearchRequest) {
    setIsSearching(true);
    setError(null);
    // Switch to results tab immediately so user sees the loading state
    setMobileTab("results");
    try {
      const res = await fetch("/api/jobcode-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "알 수 없는 오류가 발생했습니다.");
        setResponse(null);
      } else {
        setResponse(data as JobcodeSearchResponse);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "직업코드 검색 서비스에 연결할 수 없습니다.");
      setResponse(null);
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden">
      <AppHeader />

      {/* ── Mobile: tab bar ── */}
      <div className="sm:hidden flex shrink-0 bg-hanwha-navy">
        {(["search", "results"] as MobileTab[]).map((tab) => {
          const label = tab === "search" ? "검색 설정" : "결과 보기";
          const isActive = mobileTab === tab;
          const hasResults = tab === "results" && (response !== null || isSearching || error !== null);
          return (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className={`relative flex-1 py-2.5 text-sm font-semibold transition-colors ${
                isActive ? "text-white" : "text-white/45 hover:text-white/70"
              }`}
            >
              {label}
              {hasResults && !isActive && (
                <span className="ml-1.5 inline-flex items-center justify-center w-1.5 h-1.5 rounded-full bg-hanwha-orange" />
              )}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-hanwha-orange rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Mobile: single-panel view ── */}
      <div className="sm:hidden flex-1 min-h-0 overflow-hidden">
        <div className={mobileTab === "search" ? "block h-full" : "hidden"}>
          <JobcodeSearchPanel
            onSearch={handleSearch}
            isSearching={isSearching}
            fullWidth
          />
        </div>
        <div className={mobileTab === "results" ? "block h-full" : "hidden"}>
          <JobcodeResultsPanel
            response={response}
            isSearching={isSearching}
            error={error}
          />
        </div>
      </div>

      {/* ── Desktop: side-by-side ── */}
      <div className="hidden sm:flex flex-1 min-h-0 overflow-hidden">
        <JobcodeSearchPanel onSearch={handleSearch} isSearching={isSearching} />
        <JobcodeResultsPanel response={response} isSearching={isSearching} error={error} />
      </div>
    </div>
  );
}
