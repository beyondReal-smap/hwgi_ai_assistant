"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { ChatMessage, Customer, LMSMessage, SilsonCardTone } from "@/lib/types";
import CustomerCard from "./CustomerCard";
import LMSMessageCard from "./LMSMessageCard";
import PaginatedTable from "./PaginatedTable";

const SILSON_CARD_STYLES: Record<SilsonCardTone, { shell: string; badge: string; title: string }> = {
  intro: {
    shell: "border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-gray-50",
    badge: "bg-slate-900 text-white",
    title: "text-slate-900",
  },
  answer: {
    shell: "border border-orange-200 bg-gradient-to-br from-white via-orange-50/70 to-amber-50/90",
    badge: "bg-hanwha-orange text-white",
    title: "text-hanwha-navy",
  },
  detail: {
    shell: "border border-blue-200 bg-gradient-to-br from-white via-sky-50/70 to-blue-50/90",
    badge: "bg-[#1A2B4A] text-white",
    title: "text-hanwha-navy",
  },
  warning: {
    shell: "border border-amber-200 bg-gradient-to-br from-white via-amber-50/70 to-yellow-50/90",
    badge: "bg-amber-500 text-white",
    title: "text-amber-950",
  },
  sources: {
    shell: "border border-emerald-200 bg-gradient-to-br from-white via-emerald-50/70 to-teal-50/90",
    badge: "bg-emerald-600 text-white",
    title: "text-emerald-950",
  },
};

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

/** Normalize a line for dedup comparison */
function normForDedup(s: string): string {
  return s
    .replace(/[✅📌📋🔹🔸👉🔎\s\uFE0F\u20E3①②③④⑤⑥⑦⑧⑨⑩]+/gu, "")
    .replace(/^[\d.()]+/, "")
    .trim();
}

function renderSilsonCardBody(content: string) {
  const rawLines = normalizeInlineMarkdown(content).split("\n");
  // Keep empty lines for table detection (tables need contiguous pipe rows)
  const lines = rawLines.map((line) => line.trim());

  // Group lines into: metadata block, then sections (header + body lines)
  const metaLines: string[] = [];
  const sections: Array<{ header: string; lines: string[] }> = [];
  let currentSection: { header: string; lines: string[] } | null = null;
  const seenHeaders = new Set<string>();

  const SECTION_RE = /^[✅📌📋🔹🔸👉🔎]*\s*(핵심\s*답변|추가\s*안내|참고\s*사항|주의\s*사항|결론|요약|보상\s*기준|면책\s*사항|정리|[①②③④⑤].+)$/;
  const META_RE = /^(질문|가입시기|세대|상품명|보험종류)\s*[:：]\s*/;
  // Subsection headers like "① 구계약 (판매시기: ~ 2003.09)"
  const SUBSECTION_RE = /^[①②③④⑤⑥⑦⑧⑨⑩]\s+.+$/;
  const seenBodyLines = new Set<string>();

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line) { i++; continue; }

    if (META_RE.test(line)) {
      metaLines.push(line);
      i++;
    } else if (SECTION_RE.test(line) || SUBSECTION_RE.test(line)) {
      const normKey = normForDedup(line);
      // Skip duplicate section headers
      if (seenHeaders.has(normKey)) { i++; continue; }
      seenHeaders.add(normKey);
      if (currentSection) sections.push(currentSection);
      currentSection = { header: line, lines: [] };
      i++;
    } else if (line.startsWith("|")) {
      // Table detected — consume all contiguous table lines
      const table = parseTableLines(lines, i);
      if (table) {
        if (!currentSection) currentSection = { header: "", lines: [] };
        // Encode table as special marker for rendering
        currentSection.lines.push(`__TABLE__${JSON.stringify({ headers: table.headers, rows: table.rows })}`);
        i = table.endIdx;
      } else {
        if (!currentSection) currentSection = { header: "", lines: [] };
        currentSection.lines.push(line);
        i++;
      }
    } else {
      if (!currentSection) {
        currentSection = { header: "", lines: [] };
      }
      // Dedup: skip line if essentially same as section header
      if (currentSection.header && currentSection.lines.length === 0) {
        const normH = normForDedup(currentSection.header);
        const normL = normForDedup(line);
        if (normH && normL && (normH === normL || normL.startsWith(normH) || normH.startsWith(normL))) {
          i++;
          continue;
        }
      }
      // Dedup: skip duplicate body lines (10+ chars after whitespace removal)
      const normBody = line.replace(/\s+/g, "");
      if (normBody.length > 10) {
        if (seenBodyLines.has(normBody)) { i++; continue; }
        seenBodyLines.add(normBody);
      }
      currentSection.lines.push(line);
      i++;
    }
  }
  if (currentSection) sections.push(currentSection);

  // Merge consecutive sections with same header
  const merged: typeof sections = [];
  for (const sec of sections) {
    const prev = merged[merged.length - 1];
    if (prev && sec.header === prev.header && sec.header !== "") {
      prev.lines.push(...sec.lines);
    } else {
      merged.push({ ...sec, lines: [...sec.lines] });
    }
  }

  const elements: React.ReactNode[] = [];

  // Metadata block
  if (metaLines.length > 0) {
    elements.push(
      <div key="meta" className="flex flex-wrap gap-x-3 gap-y-1 rounded-xl bg-white/60 px-3 py-2 mb-1">
        {metaLines.map((ml, i) => {
          const colonIdx = ml.search(/[:：]/);
          const label = ml.slice(0, colonIdx).trim();
          const value = ml.slice(colonIdx + 1).trim();
          return (
            <span key={i} className="text-[11px] sm:text-[12px] text-gray-500">
              <span className="font-medium text-gray-600">{label}</span>
              <span className="mx-1 text-gray-300">|</span>
              <span className="text-hanwha-navy font-medium">{value}</span>
            </span>
          );
        })}
      </div>
    );
  }

  // Render sections
  merged.forEach((sec, sIdx) => {
    if (sec.header) {
      elements.push(
        <div key={`h-${sIdx}`} className="flex items-center gap-2 mt-2 first:mt-0">
          <span className="h-1 w-1 rounded-full bg-hanwha-orange shrink-0" />
          <span className="text-[13px] sm:text-[14px] font-bold text-hanwha-navy tracking-wide">
            {sec.header.replace(/^[✅📌📋🔹🔸👉🔎]+\s*/, "")}
          </span>
          <span className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent" />
        </div>
      );
    }

    sec.lines.forEach((line, lIdx) => {
      const key = `s${sIdx}-l${lIdx}`;

      // Embedded table
      if (line.startsWith("__TABLE__")) {
        try {
          const tableData = JSON.parse(line.slice("__TABLE__".length)) as { headers: string[]; rows: string[][] };
          elements.push(
            <PaginatedTable key={key} headers={tableData.headers} rows={tableData.rows} />
          );
        } catch {
          // fallback: render as text
          elements.push(<p key={key} className="text-[12px] sm:text-[13px] leading-relaxed text-gray-700">{line}</p>);
        }
        return;
      }

      if (/^(?:-|\u2022)\s+/.test(line)) {
        elements.push(
          <div key={key} className="flex items-start gap-2 rounded-xl bg-white/70 px-3 py-2 text-[12px] sm:text-[13px] text-gray-700">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-hanwha-orange" />
            <span className="leading-relaxed">{line.replace(/^(?:-|\u2022)\s+/, "")}</span>
          </div>
        );
      } else if (/^\d+\.\s+/.test(line)) {
        const match = line.match(/^(\d+\.)\s+(.*)$/);
        elements.push(
          <div key={key} className="flex items-start gap-2 rounded-xl bg-white/70 px-3 py-2 text-[12px] sm:text-[13px] text-gray-700">
            <span className="min-w-[1.5rem] font-semibold text-hanwha-navy">{match?.[1]}</span>
            <span className="leading-relaxed">{match?.[2] ?? line}</span>
          </div>
        );
      } else {
        elements.push(
          <p key={key} className="text-[12px] sm:text-[13px] leading-relaxed text-gray-700">
            {line}
          </p>
        );
      }
    });
  });

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

  useEffect(() => {
    setFormattedTime(
      message.timestamp.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }, [message.timestamp]);

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
                ? "bg-white text-hanwha-navy border border-gray-100 shadow-sm"
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

        {/* Analysis card */}
        {message.type === "analysis" && (
          <div className="px-3.5 sm:px-4 py-3 rounded-2xl shadow-sm border border-blue-100 bg-gradient-to-br from-blue-50/80 to-slate-50/80 max-w-full">
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

        {message.type === "silson-card" && (
          <div
            className={`w-full overflow-hidden rounded-[22px] shadow-sm ${SILSON_CARD_STYLES[message.tone ?? "detail"].shell}`}
          >
            <div className="flex items-center gap-2 border-b border-black/5 px-4 py-3">
              {message.badge ? (
                <span
                  className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] uppercase ${SILSON_CARD_STYLES[message.tone ?? "detail"].badge}`}
                >
                  {message.badge}
                </span>
              ) : null}
              <h4 className={`text-[13px] sm:text-sm font-bold ${SILSON_CARD_STYLES[message.tone ?? "detail"].title}`}>
                {message.title ?? "실손 검색 결과"}
              </h4>
            </div>

            <div className="flex flex-col gap-1.5 px-4 py-3">
              {renderSilsonCardBody(message.content)}

              {message.sources && message.sources.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {message.sources.map((source, idx) => (
                    <span
                      key={`${source}-${idx}`}
                      className="rounded-full border border-black/10 bg-white/80 px-2.5 py-1 text-[10px] sm:text-[11px] text-gray-600"
                    >
                      {source}
                    </span>
                  ))}
                </div>
              )}

              {message.followUps && message.followUps.length > 0 && (
                <div className="mt-2 pt-2 border-t border-black/5">
                  <p className="text-[10px] sm:text-[11px] font-medium text-gray-500 mb-1.5">관련 질문</p>
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
          </div>
        )}

        {/* Customer list */}
        {message.type === "customer-list" && message.customers && (
          <div className="flex flex-col gap-2 w-full">
            {/* Text first */}
            <div
              className="px-3.5 sm:px-4 py-2.5 rounded-2xl shadow-sm text-[13px] sm:text-sm leading-relaxed bg-white text-hanwha-navy border border-gray-100"
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
              className="px-3.5 sm:px-4 py-2.5 rounded-2xl shadow-sm text-[13px] sm:text-sm leading-relaxed bg-white text-hanwha-navy border border-gray-100"
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
        {formattedTime && <span className="text-gray-400 text-xs px-1">{formattedTime}</span>}
      </div>

      {/* User avatar placeholder for alignment */}
      {!isBot && <div className="w-8 shrink-0" />}
    </motion.div>
  );
}
