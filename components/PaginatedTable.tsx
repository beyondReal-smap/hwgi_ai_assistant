"use client";

import { useState, useRef, useCallback } from "react";

const PAGE_SIZE = 15;
const SWIPE_THRESHOLD = 50;

export default function PaginatedTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  const [page, setPage] = useState(0);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const touchStartX = useRef(0);
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const needsPaging = rows.length > PAGE_SIZE;
  const pageRows = needsPaging ? rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) : rows;

  const goNext = useCallback(() => setPage((p) => Math.min(totalPages - 1, p + 1)), [totalPages]);
  const goPrev = useCallback(() => setPage((p) => Math.max(0, p - 1)), []);

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    if (dx > SWIPE_THRESHOLD) goNext();
    else if (dx < -SWIPE_THRESHOLD) goPrev();
  };

  const handleRowClick = (ri: number) => {
    setExpandedRow(expandedRow === ri ? null : ri);
  };

  return (
    <div
      className="my-1.5 -mx-1"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <table className="text-[11px] sm:text-[13px] border-collapse w-full table-fixed">
        <thead>
          <tr className="border-b border-gray-200">
            {headers.map((h, hi) => (
              <th key={hi} className="px-1 sm:px-2 py-1 text-left font-semibold text-hanwha-navy truncate bg-gray-50/80">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pageRows.map((row, ri) => {
            const isExpanded = expandedRow === ri;
            return (
              <tr
                key={ri}
                onClick={() => handleRowClick(ri)}
                className={`border-b border-gray-100 last:border-0 cursor-pointer transition-colors ${isExpanded ? "bg-orange-50/60" : "active:bg-gray-50/80"}`}
              >
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={`px-1 sm:px-2 py-0.5 sm:py-1 text-gray-700 ${isExpanded ? "whitespace-normal break-words" : "truncate"}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {needsPaging && (
        <div className="flex items-center justify-between mt-1.5 px-0.5">
          <button
            onClick={goPrev}
            disabled={page === 0}
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] sm:text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-hanwha-navy hover:bg-gray-100"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            이전
          </button>
          <span className="text-[11px] sm:text-xs text-gray-400">{page + 1} / {totalPages}</span>
          <button
            onClick={goNext}
            disabled={page >= totalPages - 1}
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] sm:text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-hanwha-navy hover:bg-gray-100"
          >
            다음
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      )}
    </div>
  );
}
