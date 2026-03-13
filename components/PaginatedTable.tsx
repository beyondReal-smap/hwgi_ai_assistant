"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";

const PAGE_SIZE = 10;
const SWIPE_THRESHOLD = 50;
const ROW_HEIGHT = 34;
const HEADER_HEIGHT = 30;

type CellType = "index" | "name" | "gender" | "age" | "date" | "boolean" | "phone" | "text";

function getCellType(header: string): CellType {
  const h = header.trim();
  if (h === "#" || h === "번호" || h === "No") return "index";
  if (h === "이름" || h === "고객명" || h === "성명") return "name";
  if (h === "성별") return "gender";
  if (h === "나이" || h === "연령") return "age";
  if (/생년월일|날짜|일자|기간/.test(h)) return "date";
  if (h === "마케팅" || h === "동의" || h === "수신") return "boolean";
  if (/전화|연락처|휴대폰|핸드폰/.test(h)) return "phone";
  return "text";
}

function getColPx(type: CellType): number {
  switch (type) {
    case "index": return 36;
    case "name": return 72;
    case "gender": return 34;
    case "age": return 36;
    case "date": return 86;
    case "boolean": return 30;
    case "phone": return 110;
    default: return 72;
  }
}

function getTopicChips(age: number): string[] {
  const common = ["안부인사", "보장분석"];
  if (age < 30) return [...common, "건강관리", "재테크/저축", "첫보험안내"];
  if (age < 40) return [...common, "건강검진", "결혼/출산", "내집마련"];
  if (age < 50) return [...common, "자녀교육", "보장점검", "은퇴준비"];
  if (age < 60) return [...common, "은퇴설계", "건강관리", "연금안내"];
  return [...common, "건강관리", "실버보험", "연금수령"];
}

function SmartCell({ value, type }: { value: string; type: CellType }) {
  switch (type) {
    case "index":
      return <span className="text-[11px] sm:text-xs text-gray-400 tabular-nums whitespace-nowrap">{value}</span>;
    case "name":
      return (
        <div className="flex items-center gap-1.5">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
            style={{ background: "linear-gradient(135deg, #F37321, #E06A1B)" }}
          >
            {value.charAt(0)}
          </div>
          <span className="font-semibold text-hanwha-navy text-xs sm:text-[13px] truncate">{value}</span>
        </div>
      );
    case "gender":
      return value === "여" ? (
        <span className="text-[11px] sm:text-xs font-semibold text-pink-600">{value}</span>
      ) : (
        <span className="text-[11px] sm:text-xs font-semibold text-blue-600">{value}</span>
      );
    case "age":
      return <span className="text-hanwha-navy font-medium tabular-nums text-xs sm:text-[13px]">{value}</span>;
    case "date":
      return <span className="text-gray-500 tabular-nums text-[11px] sm:text-xs whitespace-nowrap">{value}</span>;
    case "phone": {
      const digits = value.replace(/[^0-9]/g, "");
      return digits ? (
        <a
          href={`tel:${digits}`}
          onClick={(e) => e.stopPropagation()}
          className="text-[11px] sm:text-xs tabular-nums text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5 whitespace-nowrap"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
          {value}
        </a>
      ) : (
        <span className="text-[11px] sm:text-xs text-gray-300">-</span>
      );
    }
    case "boolean":
      return value === "O" || value === "Y" || value === "예" ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <span className="text-[11px] sm:text-xs text-gray-300">-</span>
      );
    default:
      return <span className="text-gray-600 text-xs sm:text-[13px] truncate block">{value}</span>;
  }
}

export interface LMSSendInfo {
  name: string;
  gender: string;
  age: number;
  topic: string;
}

interface PaginatedTableProps {
  headers: string[];
  rows: string[][];
  onLMSSend?: (info: LMSSendInfo) => void;
}

export default function PaginatedTable({ headers, rows, onLMSSend }: PaginatedTableProps) {
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [lmsRowIdx, setLmsRowIdx] = useState<number | null>(null);
  const [customTopic, setCustomTopic] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const touchStartX = useRef(0);
  const topicPanelRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const cellTypes = useMemo(() => headers.map(getCellType), [headers]);

  const nameColIdx = useMemo(() => cellTypes.findIndex((t) => t === "name"), [cellTypes]);
  const genderColIdx = useMemo(() => cellTypes.findIndex((t) => t === "gender"), [cellTypes]);
  const ageColIdx = useMemo(() => cellTypes.findIndex((t) => t === "age"), [cellTypes]);
  const hasLMS = !!onLMSSend && nameColIdx >= 0;
  const lmsColWidth = 36;

  const gridCols = useMemo(() => {
    const cols = headers.map((_, i) => `${getColPx(cellTypes[i])}px`);
    if (hasLMS) cols.push(`${lmsColWidth}px`);
    return cols.join(" ");
  }, [headers, cellTypes, hasLMS]);

  const totalTableWidth = useMemo(() => {
    let w = headers.reduce((sum, _, i) => sum + getColPx(cellTypes[i]), 0);
    if (hasLMS) w += lmsColWidth;
    return w;
  }, [headers, cellTypes, hasLMS]);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.trim().toLowerCase();
    return rows.filter((row) => row.some((cell) => cell.toLowerCase().includes(term)));
  }, [rows, searchTerm]);

  const totalPages = Math.ceil(filteredRows.length / PAGE_SIZE);
  const needsPaging = filteredRows.length > PAGE_SIZE;
  const pageRows = needsPaging ? filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) : filteredRows;

  const goNext = useCallback(() => setPage((p) => Math.min(totalPages - 1, p + 1)), [totalPages]);
  const goPrev = useCallback(() => setPage((p) => Math.max(0, p - 1)), []);

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    if (dx > SWIPE_THRESHOLD) goNext();
    else if (dx < -SWIPE_THRESHOLD) goPrev();
  };

  const handleSearch = (val: string) => {
    setSearchTerm(val);
    setPage(0);
  };

  const stopPropagation = (e: React.KeyboardEvent) => e.stopPropagation();

  const extractCustomer = (row: string[]) => ({
    name: nameColIdx >= 0 ? row[nameColIdx] : "",
    gender: genderColIdx >= 0 ? row[genderColIdx] : "남",
    age: ageColIdx >= 0 ? parseInt(row[ageColIdx], 10) || 40 : 40,
  });

  const handleTopicSelect = (topic: string) => {
    if (!onLMSSend || lmsRowIdx === null) return;
    const row = filteredRows[page * PAGE_SIZE + lmsRowIdx];
    if (!row) return;
    const info = extractCustomer(row);
    onLMSSend({ ...info, topic });
    setLmsRowIdx(null);
    setCustomTopic("");
  };

  const handleLMSClick = (ri: number) => {
    if (lmsRowIdx === ri) {
      setLmsRowIdx(null);
      setCustomTopic("");
    } else {
      setLmsRowIdx(ri);
      setCustomTopic("");
    }
  };

  // When topic panel opens, scroll the entire bubble's bottom into view
  useEffect(() => {
    if (lmsRowIdx !== null) {
      const timer = setTimeout(() => {
        // Find the closest chat bubble ancestor (.shadow-card) and scroll its bottom into view
        const bubble = rootRef.current?.closest(".shadow-card") as HTMLElement | null;
        const target = bubble ?? topicPanelRef.current;
        target?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [lmsRowIdx]);

  const showSearch = rows.length > 5;
  const visibleRowCount = Math.min(rows.length, PAGE_SIZE);
  const bodyHeight = HEADER_HEIGHT + visibleRowCount * ROW_HEIGHT;

  const selectedAge = lmsRowIdx !== null
    ? (() => { const row = pageRows[lmsRowIdx]; return row && ageColIdx >= 0 ? parseInt(row[ageColIdx], 10) || 40 : 40; })()
    : 40;
  const selectedName = lmsRowIdx !== null
    ? (() => { const row = pageRows[lmsRowIdx]; return row && nameColIdx >= 0 ? row[nameColIdx] : ""; })()
    : "";
  const selectedGender = lmsRowIdx !== null
    ? (() => { const row = pageRows[lmsRowIdx]; return row && genderColIdx >= 0 ? row[genderColIdx] : ""; })()
    : "";

  return (
    <div
      ref={rootRef}
      className="my-1 w-full"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Search + LMS info hint */}
      {showSearch && (
        <div className="mb-1.5">
          <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-md px-2 h-6 focus-within:border-hanwha-orange/50 focus-within:bg-white transition-colors">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" className="shrink-0">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={stopPropagation}
              placeholder="검색..."
              className="flex-1 bg-transparent text-[10px] sm:text-[11px] text-hanwha-navy placeholder-gray-400 outline-none min-w-0"
            />
            <span className="text-[9px] sm:text-[10px] text-gray-400 shrink-0 tabular-nums w-[36px] text-right">
              {filteredRows.length}건
            </span>
            {searchTerm && (
              <button type="button" onClick={() => handleSearch("")} className="text-gray-400 hover:text-gray-600 text-[10px] leading-none shrink-0">
                ×
              </button>
            )}
          </div>
        </div>
      )}

      {/* LMS info banner */}
      {hasLMS && (
        <div className="relative mb-1.5">
          <button
            type="button"
            onClick={() => setShowInfo((v) => !v)}
            className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md bg-orange-50 border border-orange-100 hover:bg-orange-100/70 transition-colors text-left"
          >
            <span className="w-4 h-4 rounded-full bg-hanwha-orange text-white flex items-center justify-center shrink-0 text-[9px] font-bold">i</span>
            <span className="text-[10px] sm:text-[11px] text-hanwha-orange font-medium truncate">
              고객별 LMS 버튼을 눌러 AI 맞춤 메시지를 생성하세요
            </span>
            <svg
              width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#F37321" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className={`shrink-0 ml-auto transition-transform duration-200 ${showInfo ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {/* Overlay on top of list, not pushing it down */}
          {showInfo && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowInfo(false)} />
              <div className="absolute left-0 right-0 top-full mt-0.5 z-40 rounded-lg bg-hanwha-navy text-white p-3 shadow-lg text-[10px] leading-relaxed">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-start gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-orange-500/30 text-orange-300 flex items-center justify-center shrink-0 text-[9px] font-bold mt-px">1</span>
                    <span>각 고객 행의 <span className="text-orange-300 font-semibold">말풍선 버튼</span>을 클릭하세요</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-orange-500/30 text-orange-300 flex items-center justify-center shrink-0 text-[9px] font-bold mt-px">2</span>
                    <span>고객 나이에 맞는 <span className="text-orange-300 font-semibold">추천 주제</span>가 자동으로 표시됩니다</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-orange-500/30 text-orange-300 flex items-center justify-center shrink-0 text-[9px] font-bold mt-px">3</span>
                    <span>주제를 선택하면 <span className="text-orange-300 font-semibold">AI가 3종 LMS</span>(안내형/감성형/혜택관리형)를 <span className="text-orange-300 font-semibold">자동 생성</span>합니다</span>
                  </div>
                </div>
                <div className="mt-2 pt-1.5 border-t border-white/15 text-[9px] text-white/50">
                  직접 주제를 입력할 수도 있습니다 · 연령대별 적합한 주제가 자동 추천됩니다
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-gray-100 overflow-x-auto bg-white">
        <div style={{ minHeight: bodyHeight, width: totalTableWidth }}>
          {/* Header */}
          <div className="grid" style={{ gridTemplateColumns: gridCols, height: HEADER_HEIGHT }}>
            {headers.map((h, hi) => (
              <div key={hi} className="flex items-center px-1 text-[10px] sm:text-[11px] font-bold text-gray-500 bg-gray-50 border-b border-gray-200 truncate leading-none">
                {h}
              </div>
            ))}
            {hasLMS && (
              <div className="flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-hanwha-orange bg-gray-50 border-b border-gray-200">
                LMS
              </div>
            )}
          </div>

          {/* Rows */}
          {pageRows.length > 0 ? (
            pageRows.map((row, ri) => (
              <div
                key={ri}
                className={`grid items-center border-b border-gray-50 last:border-0 transition-colors duration-100 ${
                  lmsRowIdx === ri ? "bg-orange-50/50" : ri % 2 === 1 ? "bg-gray-50/30" : ""
                } hover:bg-orange-50/30`}
                style={{ gridTemplateColumns: gridCols, height: ROW_HEIGHT }}
              >
                {row.map((cell, ci) => (
                  <div key={ci} className="px-1 overflow-hidden">
                    <SmartCell value={cell} type={cellTypes[ci]} />
                  </div>
                ))}
                {hasLMS && (
                  <div className="flex items-center justify-center">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleLMSClick(ri); }}
                      className={`w-[26px] h-[18px] rounded flex items-center justify-center transition-colors ${
                        lmsRowIdx === ri
                          ? "bg-hanwha-orange text-white"
                          : "bg-orange-50 text-hanwha-orange hover:bg-orange-100"
                      }`}
                      title="LMS 메시지 생성"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center text-[11px] text-gray-400" style={{ height: ROW_HEIGHT * 3 }}>
              검색 결과가 없습니다
            </div>
          )}
        </div>
      </div>

      {/* Topic selection panel — outside table, scrolls into view */}
      {lmsRowIdx !== null && hasLMS && (
        <div
          ref={topicPanelRef}
          className="mt-1.5 rounded-lg border border-orange-200 bg-gradient-to-b from-orange-50/80 to-white p-2.5"
        >
          <div className="flex items-center gap-1.5 mb-2">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
              style={{ background: "linear-gradient(135deg, #F37321, #E06A1B)" }}
            >
              {selectedName.charAt(0)}
            </div>
            <span className="text-[11px] font-bold text-hanwha-navy">{selectedName}</span>
            <span className="text-[10px] text-gray-400">
              {selectedGender && `${selectedGender}성 · `}{selectedAge}세
            </span>
            <span className="text-[10px] text-gray-400 ml-auto">주제를 선택하세요</span>
          </div>

          <div className="flex flex-wrap gap-1 mb-2">
            {getTopicChips(selectedAge).map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleTopicSelect(chip)}
                className="px-2 py-1 rounded-full text-[10px] sm:text-[11px] font-medium border border-orange-200 bg-white text-hanwha-orange hover:bg-orange-100 hover:border-orange-300 active:scale-95 transition-all duration-150"
              >
                {chip}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter" && customTopic.trim()) handleTopicSelect(customTopic.trim());
              }}
              placeholder="직접 입력..."
              className="flex-1 bg-white border border-gray-200 rounded-md px-2 h-6 text-[10px] sm:text-[11px] text-hanwha-navy placeholder-gray-400 outline-none focus:border-hanwha-orange/50 min-w-0"
            />
            <button
              type="button"
              disabled={!customTopic.trim()}
              onClick={() => customTopic.trim() && handleTopicSelect(customTopic.trim())}
              className="px-2 h-6 rounded-md text-[10px] font-semibold bg-hanwha-orange text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-orange-600 transition-colors shrink-0"
            >
              생성
            </button>
            <button
              type="button"
              onClick={() => { setLmsRowIdx(null); setCustomTopic(""); }}
              className="px-1.5 h-6 rounded-md text-[10px] text-gray-500 hover:bg-gray-100 transition-colors shrink-0"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* Pagination – always rendered to keep stable height */}
        <div className={`flex items-center justify-between mt-1.5${needsPaging ? "" : " invisible"}`}>
          <button
            onClick={goPrev}
            disabled={page === 0}
            className="flex items-center gap-0.5 px-2 py-1 rounded-md text-[10px] sm:text-[11px] font-medium transition-colors disabled:opacity-25 disabled:cursor-not-allowed text-hanwha-navy bg-white border border-gray-200 hover:bg-orange-50/50 shadow-sm"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            이전
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let p: number;
              if (totalPages <= 5) p = i;
              else if (page < 3) p = i;
              else if (page > totalPages - 4) p = totalPages - 5 + i;
              else p = page - 2 + i;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-6 h-6 rounded-md text-[10px] sm:text-[11px] font-semibold transition-colors ${
                    page === p ? "bg-hanwha-orange text-white shadow-sm" : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {p + 1}
                </button>
              );
            })}
          </div>

          <button
            onClick={goNext}
            disabled={page >= totalPages - 1}
            className="flex items-center gap-0.5 px-2 py-1 rounded-md text-[10px] sm:text-[11px] font-medium transition-colors disabled:opacity-25 disabled:cursor-not-allowed text-hanwha-navy bg-white border border-gray-200 hover:bg-orange-50/50 shadow-sm"
          >
            다음
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
    </div>
  );
}
