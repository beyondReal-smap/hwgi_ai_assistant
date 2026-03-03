"use client";

import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import JobcodeSearchPanel from "@/components/jobcode/JobcodeSearchPanel";
import JobcodeResultsPanel from "@/components/jobcode/JobcodeResultsPanel";
import type { JobcodeSearchRequest, JobcodeSearchResponse } from "@/lib/jobcode-types";

export default function JobcodePage() {
  const [response, setResponse] = useState<JobcodeSearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(params: JobcodeSearchRequest) {
    setIsSearching(true);
    setError(null);
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
    <div className="flex flex-col h-screen overflow-hidden">
      <AppHeader />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <JobcodeSearchPanel onSearch={handleSearch} isSearching={isSearching} />
        <JobcodeResultsPanel response={response} isSearching={isSearching} error={error} />
      </div>
    </div>
  );
}
