"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import type { ChatMessage, Customer, LMSMessage } from "@/lib/types";
import CustomerCard from "./CustomerCard";
import LMSMessageCard from "./LMSMessageCard";
import PaginatedTable from "./PaginatedTable";


function normalizeInlineMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .trim();
}

/** Parse markdown table lines into header + rows */
function parseTableLines(lines: string[], startIdx: number): { headers: string[]; rows: string[][]; endIdx: number } | null {
  const line = lines[startIdx];
  if (!line.startsWith("|")) return null;
  // Need separator line next
  const sepIdx = startIdx + 1;
  if (sepIdx >= lines.length || !/^\|[\s\-:|]+\|$/.test(lines[sepIdx])) return null;

  const splitCells = (row: string) =>
    row.split("|").filter((_, i, arr) => i > 0 && i < arr.length - 1).map((c) => c.trim());

  const headers = splitCells(line);
  const rows: string[][] = [];
  let i = sepIdx + 1;
  while (i < lines.length && lines[i].startsWith("|")) {
    rows.push(splitCells(lines[i]));
    i++;
  }
  return { headers, rows, endIdx: i };
}

/** Render silson card body — ChatGPT-style unified sections */
function renderSilsonCardBody(content: string) {
  const lines = normalizeInlineMarkdown(content).split("\n").map((l) => l.trim());
  const elements: React.ReactNode[] = [];
  const EMOJI_SECTION_RE = /^(💡|📝|✅|⚠️|📌|🔍|📋)\s+(.+)$/;
  const META_TAG_RE = /^🏷️\s+(.+)$/;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line) { i++; continue; }

    // Meta tag pills (🏷️ 세대: 4세대 | 가입시기: ...)
    const metaMatch = line.match(META_TAG_RE);
    if (metaMatch) {
      const tags = metaMatch[1].split("|").map((t) => t.trim()).filter(Boolean);
      elements.push(
        <div key={`meta-${i}`} className="flex flex-wrap gap-1.5 mb-1">
          {tags.map((tag, ti) => (
            <span key={ti} className="inline-flex items-center rounded-full bg-black/[0.04] px-2.5 py-0.5 text-[11px] text-gray-500 font-medium">
              {tag}
            </span>
          ))}
        </div>,
      );
      i++;
      continue;
    }

    // Emoji section header (💡 핵심 요약, 📝 상세 설명, etc.)
    const secMatch = line.match(EMOJI_SECTION_RE);
    if (secMatch) {
      elements.push(
        <div key={`sh-${i}`} className="flex items-center gap-2 mt-3 first:mt-0 mb-1">
          <span className="text-sm leading-none">{secMatch[1]}</span>
          <span className="text-[13px] sm:text-[14px] font-bold text-hanwha-navy">{secMatch[2]}</span>
          <span className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent" />
        </div>,
      );
      i++;
      continue;
    }

    // Table (pipe lines)
    if (line.startsWith("|")) {
      const table = parseTableLines(lines, i);
      if (table) {
        elements.push(<PaginatedTable key={`tbl-${i}`} headers={table.headers} rows={table.rows} />);
        i = table.endIdx;
        continue;
      }
    }

    // Bullet point
    if (/^[-•]\s+/.test(line)) {
      elements.push(
        <div key={`bl-${i}`} className="flex items-start gap-2 py-0.5">
          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-hanwha-orange/60" />
          <span className="text-[12px] sm:text-[13px] leading-relaxed text-gray-700">
            {line.replace(/^[-•]\s+/, "")}
          </span>
        </div>,
      );
      i++;
      continue;
    }

    // Numbered item
    if (/^\d+\.\s+/.test(line)) {
      const m = line.match(/^(\d+\.)\s+(.*)$/);
      elements.push(
        <div key={`num-${i}`} className="flex items-start gap-2 py-0.5">
          <span className="min-w-[1.2rem] text-[12px] font-semibold text-hanwha-orange">{m?.[1]}</span>
          <span className="text-[12px] sm:text-[13px] leading-relaxed text-gray-700">{m?.[2] ?? line}</span>
        </div>,
      );
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="text-[12px] sm:text-[13px] leading-relaxed text-gray-700">{line}</p>,
    );
    i++;
  }

  return elements;
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

  const hasTable = parts.some((p) => p.type === "table");

  return (
    <>
      {parts.map((part, idx) =>
        part.type === "text" ? (
          hasTable && idx === 0 && part.value.trim() ? (
            <span key={idx} className="block text-[14px] sm:text-[15px] font-bold text-hanwha-navy pb-1 mb-1 border-b border-gray-100">
              {part.value.trim()}
            </span>
          ) : (
            <span key={idx}>{part.value}{idx < parts.length - 1 ? "\n" : ""}</span>
          )
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
  onFollowUpClick?: (query: string) => void;
  sentCustomerIds?: Set<string>;
}

export default function MessageBubble({
  message,
  onCustomerSelect,
  onLMSSelect,
  onFollowUpClick,
  sentCustomerIds,
}: MessageBubbleProps) {
  const isBot = message.role === "bot";
  const [formattedTime, setFormattedTime] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setFormattedTime(
      message.timestamp.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }, [message.timestamp]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [message.content]);

  const showCopyBtn = isBot && (message.type === "text" || message.type === "analysis" || message.type === "data-card");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className={`group flex ${isBot ? "items-start flex-row" : "items-end flex-row-reverse"} gap-1.5 sm:gap-2 mb-3 sm:mb-4`}
    >
      {/* Bot avatar */}
      {isBot && (
        <div
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 shadow-sm"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#C2571A"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Antenna */}
            <line x1="12" y1="7" x2="12" y2="3" />
            <circle cx="12" cy="2.5" r="1" fill="#C2571A" stroke="none" />
            {/* Head */}
            <rect x="4" y="7" width="16" height="13" rx="2.5" />
            {/* Eyes */}
            <circle cx="9" cy="12" r="1.5" fill="#C2571A" stroke="none" />
            <circle cx="15" cy="12" r="1.5" fill="#C2571A" stroke="none" />
            {/* Mouth */}
            <path d="M9 16.5 Q12 15 15 16.5" strokeWidth="1.5" />
            {/* Ear ports */}
            <line x1="4" y1="12" x2="2" y2="12" />
            <line x1="20" y1="12" x2="22" y2="12" />
          </svg>
        </div>
      )}

      <div className={`flex flex-col gap-1 ${isBot ? "max-w-[92%] sm:max-w-[88%] items-start" : "max-w-[88%] sm:max-w-[80%] items-end"}`}>
        {/* Bot name label */}
        {isBot && (
          <span className="text-[11px] font-semibold text-hanwha-navy/60 ml-0.5 mb-0.5">AI 영업비서</span>
        )}

        {/* Main content */}
        {message.type === "text" && (
          <div
            className={`text-[13px] sm:text-sm whitespace-pre-wrap ${
              isBot
                ? "text-hanwha-navy leading-[1.75] px-3.5 sm:px-4 py-2.5 rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-orange-50/20"
                : "px-3.5 sm:px-4 py-2.5 rounded-2xl text-white rounded-br-sm shadow-sm leading-relaxed"
            }`}
            style={
              !isBot
                ? { background: "linear-gradient(135deg, #2D4168 0%, #1A2B4A 100%)" }
                : undefined
            }
          >
            {isBot ? renderTextWithTables(message.content) : message.content}
          </div>
        )}

        {/* Analysis card */}
        {message.type === "analysis" && (
          <div className="border border-gray-100 bg-gradient-to-br from-white to-orange-50/30 rounded-2xl px-3.5 sm:px-4 py-3 border-l-[3px] border-l-hanwha-orange/50 max-w-full">
            {message.content.split("\n").map((line, i) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={i} className="h-1.5" />;
              // Section headers (📊, 💡)
              if (/^[📊💡🔍📌]/.test(trimmed)) {
                return (
                  <p key={i} className="text-[13px] sm:text-sm font-bold text-hanwha-navy mt-1 first:mt-0">
                    {trimmed}
                  </p>
                );
              }
              // Bullet items
              if (trimmed.startsWith("•") || trimmed.startsWith("-")) {
                return (
                  <p key={i} className="text-[12px] sm:text-[13px] text-gray-700 leading-relaxed pl-1 mt-0.5">
                    {trimmed}
                  </p>
                );
              }
              // Regular text
              return (
                <p key={i} className="text-[12px] sm:text-[13px] text-gray-600 leading-relaxed mt-0.5">
                  {trimmed}
                </p>
              );
            })}
          </div>
        )}

        {/* Data card (CSV query results) */}
        {message.type === "data-card" && (() => {
          // Strip first line (title like "📋 박옥경 FP님 담당 고객 (268명)") and extract count
          const lines = message.content.split("\n");
          const firstLine = lines[0] ?? "";
          const countMatch = firstLine.match(/\((\d+)명/);
          const count = countMatch ? countMatch[1] : null;
          // Remove first line (title) and any blank lines right after
          let bodyStart = 1;
          while (bodyStart < lines.length && !lines[bodyStart].trim()) bodyStart++;
          const bodyText = lines.slice(bodyStart).join("\n");

          return (
            <div className="w-full overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm">
              {/* Header */}
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-orange-50/60 to-white">
                <span className="text-base leading-none">👥</span>
                <h4 className="text-[14px] sm:text-[15px] font-bold text-hanwha-navy flex-1">
                  고객 목록
                </h4>
                {count && (
                  <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-hanwha-orange/10 text-hanwha-orange">
                    {count}명
                  </span>
                )}
              </div>
              {/* Body */}
              <div className="px-4 py-3 text-[13px] sm:text-sm whitespace-pre-wrap text-hanwha-navy leading-[1.75]">
                {renderTextWithTables(bodyText)}
              </div>
            </div>
          );
        })()}

        {/* Customer info card */}
        {message.type === "customer-info" && message.customerContext && (() => {
          const c = message.customerContext!;
          const urgencyMap: Record<string, { label: string; color: string; bg: string }> = {
            urgent: { label: "긴급", color: "#DC2626", bg: "#FEF2F2" },
            high:   { label: "높음", color: "#EA580C", bg: "#FFF7ED" },
            normal: { label: "보통", color: "#2563EB", bg: "#EFF6FF" },
            low:    { label: "낮음", color: "#16A34A", bg: "#F0FDF4" },
          };
          const urg = urgencyMap[c.urgency] ?? urgencyMap.normal;
          const lastContact = c.lastContact ?? "없음 (미접촉 고객)";
          return (
            <div className="w-full overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm">
              {/* Header */}
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-orange-50/60 to-white">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{
                    background: c.gender === "여"
                      ? "linear-gradient(135deg, #EC4899, #DB2777)"
                      : "linear-gradient(135deg, #3B82F6, #2563EB)",
                  }}
                >
                  {c.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[14px] sm:text-[15px] font-bold text-hanwha-navy">
                    {c.name} 고객 정보
                  </h4>
                  <span className="text-[11px] text-gray-400">{c.gender}성 · {c.age}세 · {c.birthDate}</span>
                </div>
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                  style={{ background: urg.bg, color: urg.color }}
                >
                  {urg.label}
                </span>
              </div>

              {/* Body */}
              <div className="px-4 py-3 flex flex-col gap-2">
                {/* Event */}
                <div className="flex items-start gap-2">
                  <span className="text-sm leading-none mt-0.5">🎯</span>
                  <div>
                    <span className="text-[12px] text-gray-400 font-medium">이벤트</span>
                    <p className="text-[13px] sm:text-sm font-semibold text-hanwha-navy">{c.event}</p>
                  </div>
                </div>

                {/* Event detail */}
                <div className="flex items-start gap-2">
                  <span className="text-sm leading-none mt-0.5">📌</span>
                  <p className="text-[12px] sm:text-[13px] text-gray-600 leading-relaxed">{c.eventDetail}</p>
                </div>

                {/* Products */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm leading-none">📦</span>
                  {c.products.length > 0 ? (
                    c.products.map((p, pi) => (
                      <span key={pi} className="inline-flex items-center rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-[11px] text-blue-600 font-medium">
                        {p.name} ({p.contractNo})
                      </span>
                    ))
                  ) : (
                    <>
                      {c.longTermCount > 0 && (
                        <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-[11px] text-blue-600 font-medium">
                          장기 {c.longTermCount}건
                        </span>
                      )}
                      {c.carCount > 0 && (
                        <span className="inline-flex items-center rounded-full bg-orange-50 border border-orange-100 px-2.5 py-0.5 text-[11px] text-orange-600 font-medium">
                          자동차 {c.carCount}건
                        </span>
                      )}
                      {c.longTermCount === 0 && c.carCount === 0 && (
                        <span className="text-[12px] text-gray-400">보유 상품 없음</span>
                      )}
                    </>
                  )}
                </div>

                {/* Last contact */}
                <div className="flex items-center gap-2">
                  <span className="text-sm leading-none">⏰</span>
                  <span className="text-[12px] sm:text-[13px] text-gray-500">최근 컨택: {lastContact}</span>
                </div>
              </div>
            </div>
          );
        })()}

        {message.type === "silson-card" && (
          <div className="w-full overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm">
            {/* Header */}
            <div
              className={`flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 ${
                message.tone === "warning"
                  ? "bg-gradient-to-r from-amber-50 to-yellow-50/30"
                  : "bg-gradient-to-r from-orange-50/80 to-white"
              }`}
            >
              <span className="text-base leading-none">🔎</span>
              <h4 className="text-[14px] sm:text-[15px] font-bold text-hanwha-navy flex-1">
                {message.title ?? "실손 검색 결과"}
              </h4>
              {message.badge && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                    message.tone === "warning"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-hanwha-orange/10 text-hanwha-orange"
                  }`}
                >
                  {message.badge}
                </span>
              )}
            </div>

            {/* Body */}
            <div className="flex flex-col gap-0.5 px-4 py-3">
              {renderSilsonCardBody(message.content)}
            </div>

            {/* Sources */}
            {message.sources && message.sources.length > 0 && (
              <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
                <p className="text-[10px] font-medium text-gray-400 mb-1.5">📎 참고 근거</p>
                <div className="flex flex-wrap gap-1.5">
                  {message.sources.map((source, idx) => (
                    <span
                      key={`${source}-${idx}`}
                      className="rounded-full bg-white border border-gray-200 px-2.5 py-0.5 text-[10px] text-gray-500"
                    >
                      {source}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-ups */}
            {message.followUps && message.followUps.length > 0 && (
              <div className="px-4 py-2.5 border-t border-gray-100">
                <p className="text-[10px] font-medium text-gray-400 mb-1.5">💬 이런 것도 물어보세요</p>
                <div className="flex flex-wrap gap-1.5">
                  {message.followUps.map((fu, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onFollowUpClick?.(fu)}
                      className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-[11px] sm:text-[12px] font-medium text-hanwha-orange hover:bg-orange-100 hover:border-orange-300 active:scale-95 transition-all duration-150"
                    >
                      {fu}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Customer list */}
        {message.type === "customer-list" && message.customers && (
          <div className="w-full overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm">
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-orange-50/60 to-white">
              <span className="text-base leading-none">👥</span>
              <h4 className="text-[14px] sm:text-[15px] font-bold text-hanwha-navy flex-1">
                고객 목록
              </h4>
              <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-hanwha-orange/10 text-hanwha-orange">
                {message.customers.length}명
              </span>
            </div>
            {/* Intro text */}
            <div className="px-4 py-3 text-[13px] sm:text-sm leading-[1.75] text-hanwha-navy border-b border-gray-50">
              {message.content}
            </div>
            {/* Horizontal scroll cards */}
            <div className="px-4 py-3">
              <div className="flex gap-3 overflow-x-auto pb-2 -mr-2 chat-scroll">
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
          </div>
        )}

        {/* LMS list */}
        {message.type === "lms-list" && message.lmsMessages && message.customerContext && (
          <div className="w-full overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm">
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-orange-50/80 to-white">
              <span className="text-base leading-none">💬</span>
              <h4 className="text-[14px] sm:text-[15px] font-bold text-hanwha-navy flex-1">
                LMS 메시지
              </h4>
              <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-hanwha-orange/10 text-hanwha-orange">
                {message.lmsMessages.length}건
              </span>
            </div>
            {/* Intro text */}
            <div className="px-4 py-3 text-[13px] sm:text-sm leading-[1.75] text-hanwha-navy border-b border-gray-50">
              {message.content}
            </div>
            {/* Horizontal scroll cards */}
            <div className="px-4 py-3">
              <div className="flex gap-3 overflow-x-auto pb-2 -mr-2 chat-scroll">
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
          </div>
        )}

        {/* Copy button + Timestamp */}
        <div className="flex items-center gap-2 px-0.5">
          {showCopyBtn && (
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 rounded-md hover:bg-orange-50 text-gray-400 hover:text-hanwha-orange transition-colors duration-150"
              aria-label="복사"
            >
              {copied ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
          )}
          {formattedTime && <span className="text-gray-400 text-xs">{formattedTime}</span>}
        </div>
      </div>

      {/* User avatar placeholder for alignment */}
      {!isBot && <div className="w-8 shrink-0" />}
    </motion.div>
  );
}
