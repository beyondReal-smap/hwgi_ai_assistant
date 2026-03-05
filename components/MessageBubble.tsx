"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import type { ChatMessage, Customer, LMSMessage } from "@/lib/types";
import CustomerCard from "./CustomerCard";
import LMSMessageCard from "./LMSMessageCard";

const PAGE_SIZE = 15;
const SWIPE_THRESHOLD = 50;

function PaginatedTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
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

/** 마크다운 테이블이 포함된 텍스트를 파싱하여 React 엘리먼트로 변환 */
function renderTextWithTables(text: string) {
  const lines = text.split("\n");
  const parts: Array<{ type: "text"; value: string } | { type: "table"; headers: string[]; rows: string[][] }> = [];
  let i = 0;
  let textBuffer: string[] = [];

  const flushText = () => {
    if (textBuffer.length > 0) {
      parts.push({ type: "text", value: textBuffer.join("\n") });
      textBuffer = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];
    if (line.trimStart().startsWith("|") && i + 1 < lines.length && /^\|[\s-:|]+\|$/.test(lines[i + 1].trim())) {
      flushText();
      const headerCells = line.split("|").filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map((c) => c.trim());
      i += 2;
      const tableRows: string[][] = [];
      while (i < lines.length && lines[i].trimStart().startsWith("|")) {
        const cells = lines[i].split("|").filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map((c) => c.trim());
        tableRows.push(cells);
        i++;
      }
      parts.push({ type: "table", headers: headerCells, rows: tableRows });
    } else {
      textBuffer.push(line);
      i++;
    }
  }
  flushText();

  if (parts.length === 1 && parts[0].type === "text") {
    return <>{text}</>;
  }

  return (
    <>
      {parts.map((part, idx) =>
        part.type === "text" ? (
          <span key={idx}>{part.value}{idx < parts.length - 1 ? "\n" : ""}</span>
        ) : (
          <PaginatedTable key={idx} headers={part.headers} rows={part.rows} />
        )
      )}
    </>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  onCustomerSelect: (customer: Customer) => void;
  onLMSSelect: (lms: LMSMessage, customer: Customer) => void;
  sentCustomerIds?: Set<string>;
}

export default function MessageBubble({
  message,
  onCustomerSelect,
  onLMSSelect,
  sentCustomerIds,
}: MessageBubbleProps) {
  const isBot = message.role === "bot";
  const formattedTime = message.timestamp.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className={`flex items-end gap-1.5 sm:gap-2 mb-3 sm:mb-4 ${isBot ? "flex-row" : "flex-row-reverse"}`}
    >
      {/* Bot avatar */}
      {isBot && (
        <div
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0 mb-0.5 bg-white border border-gray-200 shadow-sm"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#1A2B4A"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Antenna */}
            <line x1="12" y1="7" x2="12" y2="3" />
            <circle cx="12" cy="2.5" r="1" fill="#1A2B4A" stroke="none" />
            {/* Head */}
            <rect x="4" y="7" width="16" height="13" rx="2.5" />
            {/* Eyes */}
            <circle cx="9" cy="12" r="1.5" fill="#1A2B4A" stroke="none" />
            <circle cx="15" cy="12" r="1.5" fill="#1A2B4A" stroke="none" />
            {/* Mouth */}
            <path d="M9 16.5 Q12 15 15 16.5" strokeWidth="1.5" />
            {/* Ear ports */}
            <line x1="4" y1="12" x2="2" y2="12" />
            <line x1="20" y1="12" x2="22" y2="12" />
          </svg>
        </div>
      )}

      <div className={`flex flex-col gap-1 max-w-[88%] sm:max-w-[80%] ${isBot ? "items-start" : "items-end"}`}>
        {/* Main content */}
        {message.type === "text" && (
          <div
            className={`px-3.5 sm:px-4 py-2.5 rounded-2xl text-[13px] sm:text-sm leading-relaxed whitespace-pre-wrap ${
              isBot
                ? "bg-white text-hanwha-navy rounded-bl-sm border border-gray-100 shadow-sm"
                : "text-white rounded-br-sm shadow-sm"
            }`}
            style={
              !isBot
                ? { background: "linear-gradient(135deg, #3D537F 0%, #2D4168 100%)" }
                : undefined
            }
          >
            {isBot ? renderTextWithTables(message.content) : message.content}
          </div>
        )}

        {/* Customer list */}
        {message.type === "customer-list" && message.customers && (
          <div className="flex flex-col gap-2 w-full">
            {/* Text first */}
            <div
              className="px-3.5 sm:px-4 py-2.5 rounded-2xl rounded-bl-sm shadow-sm text-[13px] sm:text-sm leading-relaxed bg-white text-hanwha-navy border border-gray-100"
            >
              {message.content}
            </div>
            {/* Horizontal scroll cards */}
            <div className="flex gap-3 overflow-x-auto pb-2 pr-2 -mr-2 chat-scroll">
              {message.customers.map((customer, i) => (
                <div key={customer.id} className="shrink-0">
                  <CustomerCard
                    customer={customer}
                    onSelect={onCustomerSelect}
                    index={i}
                    isSent={sentCustomerIds?.has(customer.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LMS list */}
        {message.type === "lms-list" && message.lmsMessages && message.customerContext && (
          <div className="flex flex-col gap-2 w-full">
            {/* Text first */}
            <div
              className="px-3.5 sm:px-4 py-2.5 rounded-2xl rounded-bl-sm shadow-sm text-[13px] sm:text-sm leading-relaxed bg-white text-hanwha-navy border border-gray-100"
            >
              {message.content}
            </div>
            {/* Horizontal scroll cards */}
            <div className="flex gap-3 overflow-x-auto pb-2 pr-2 -mr-2 chat-scroll">
              {message.lmsMessages.map((lms, i) => (
                <div key={lms.id} className="shrink-0">
                  <LMSMessageCard
                    message={lms}
                    customer={message.customerContext!}
                    onSelect={onLMSSelect}
                    index={i}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timestamp */}
        <span className="text-gray-400 text-xs px-1" suppressHydrationWarning>{formattedTime}</span>
      </div>

      {/* User avatar placeholder for alignment */}
      {!isBot && <div className="w-8 shrink-0" />}
    </motion.div>
  );
}
