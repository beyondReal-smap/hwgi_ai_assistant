"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import type { ChatMessage, Customer, LMSMessage } from "@/lib/types";
import CustomerCard from "./CustomerCard";
import LMSMessageCard from "./LMSMessageCard";
import PaginatedTable, { type LMSSendInfo } from "./PaginatedTable";

const LMS_LOADING_STEPS = [
  "고객 정보를 분석하고 있습니다",
  "이벤트에 맞는 메시지를 구성 중입니다",
  "안내형 메시지를 작성 중입니다",
  "감성형 메시지를 작성 중입니다",
  "혜택/관리형 메시지를 작성 중입니다",
  "메시지를 최종 검토 중입니다",
];

function LmsLoadingSteps() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => (s < LMS_LOADING_STEPS.length - 1 ? s + 1 : s));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="border-t border-gray-100 px-4 py-4 bg-gradient-to-br from-emerald-50/20 to-transparent">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <span className="text-[13px] font-bold text-hanwha-navy">AI LMS 메시지 생성</span>
      </div>
      <div className="flex flex-col gap-1.5 pl-1">
        {LMS_LOADING_STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            {i < step ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : i === step ? (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin shrink-0" />
            ) : (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-gray-200 shrink-0" />
            )}
            <span className={`text-[11px] transition-colors duration-300 ${
              i < step ? "text-emerald-600 font-medium" : i === step ? "text-hanwha-navy font-medium" : "text-gray-300"
            }`}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function normalizeInlineMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/#{1,6}\s*/g, "")       // strip all heading markers (inline too)
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
  const SECTION_EMOJIS = /^(💡|📝|✅|⚠️|📌|🔍|📋|1️⃣|2️⃣|3️⃣|4️⃣|5️⃣|6️⃣|7️⃣|8️⃣|9️⃣|🔟)/;
  const EMOJI_SECTION_RE = /^(💡|📝|✅|⚠️|📌|🔍|📋|1️⃣|2️⃣|3️⃣|4️⃣|5️⃣|6️⃣|7️⃣|8️⃣|9️⃣|🔟)\s+(.+)$/;
  const META_TAG_RE = /^🏷️\s+(.+)$/;

  // Pre-process: merge emoji-only lines with the next non-empty line
  const merged: string[] = [];
  for (let j = 0; j < lines.length; j++) {
    const l = lines[j];
    if (SECTION_EMOJIS.test(l) && l.replace(SECTION_EMOJIS, "").trim() === "") {
      // Emoji alone on a line — merge with next non-empty line
      let next = "";
      while (j + 1 < lines.length) {
        j++;
        if (lines[j].trim()) { next = lines[j].trim(); break; }
      }
      merged.push(next ? `${l.trim()} ${next}` : l);
    } else {
      merged.push(l);
    }
  }

  let i = 0;
  while (i < merged.length) {
    const line = merged[i];
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
      const table = parseTableLines(merged, i);
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
  onDataCardLMS?: (info: LMSSendInfo) => void;
  sentCustomerIds?: Set<string>;
  lmsGeneratingMsgId?: string | null;
}

export default function MessageBubble({
  message,
  onCustomerSelect,
  onLMSSelect,
  onFollowUpClick,
  onDataCardLMS,
  sentCustomerIds,
  lmsGeneratingMsgId,
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

      <div className={`flex flex-col gap-1 ${isBot ? "max-w-[92%] sm:max-w-[88%] lg:max-w-[95%] items-start" : "max-w-[88%] sm:max-w-[80%] lg:max-w-[85%] items-end"} ${message.type === "data-card" ? "w-[92%] sm:w-[88%] lg:w-[95%]" : ""}`}>
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
          <div className="w-full overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-card">
            {/* Header */}
            <div className="relative px-4 py-3 border-b border-gray-100 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-50/60 via-purple-50/30 to-transparent" />
              <div className="relative flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    <polyline points="7.5 4.21 12 6.81 16.5 4.21"/>
                    <polyline points="7.5 19.79 7.5 14.6 3 12"/>
                    <polyline points="21 12 16.5 14.6 16.5 19.79"/>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                  </svg>
                </div>
                <h4 className="text-[13px] sm:text-[14px] font-bold text-hanwha-navy">AI 분석 인사이트</h4>
              </div>
            </div>

            {/* Body */}
            <div className="px-4 py-3">
              {message.content.split("\n").map((line, i) => {
                const trimmed = line.trim();
                if (!trimmed) return <div key={i} className="h-1.5" />;
                // Section headers (📊, 💡)
                if (/^[📊💡🔍📌]/.test(trimmed)) {
                  return (
                    <div key={i} className="flex items-center gap-2 mt-2.5 first:mt-0 mb-1">
                      <span className="text-[13px] sm:text-sm font-bold text-hanwha-navy">{trimmed}</span>
                      <span className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent" />
                    </div>
                  );
                }
                // Bullet items
                if (trimmed.startsWith("•") || trimmed.startsWith("-")) {
                  return (
                    <div key={i} className="flex items-start gap-2 py-0.5 pl-0.5">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                      <span className="text-[12px] sm:text-[13px] text-gray-700 leading-relaxed">
                        {trimmed.replace(/^[-•]\s*/, "")}
                      </span>
                    </div>
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
          </div>
        )}

        {/* Data card (CSV query results) */}
        {message.type === "data-card" && (() => {
          // Strip first line (title like "📋 박옥경 FP님 담당 고객 (268명)") and extract count & title
          const lines = message.content.split("\n");
          const firstLine = lines[0] ?? "";
          const countMatch = firstLine.match(/\((\d+)명/);
          const count = countMatch ? countMatch[1] : null;
          const titleText = firstLine.replace(/^📋\s*/, "").replace(/\(\d+명\)/, "").trim() || "데이터 조회 결과";
          // Remove first line (title) and any blank lines right after
          let bodyStart = 1;
          while (bodyStart < lines.length && !lines[bodyStart].trim()) bodyStart++;
          const bodyText = lines.slice(bodyStart).join("\n");

          return (
            <div className="w-full overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-card">
              {/* Header */}
              <div className="relative px-4 py-3.5 border-b border-gray-100 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-hanwha-orange/[0.06] via-orange-50/30 to-transparent" />
                <div className="relative flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-hanwha-orange to-orange-600 flex items-center justify-center shadow-sm">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[14px] sm:text-[15px] font-bold text-hanwha-navy truncate">{titleText}</h4>
                    <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5">터치하여 고객 상세정보를 확인하세요</p>
                  </div>
                  {count && (
                    <span className="rounded-full px-3 py-1 text-[11px] font-bold bg-gradient-to-r from-hanwha-orange to-orange-500 text-white shadow-sm">
                      {count}명
                    </span>
                  )}
                </div>
              </div>
              {/* Body — parse table and pass LMS callback */}
              <div className="px-2.5 sm:px-3 py-2">
                {(() => {
                  // Parse markdown table from bodyText
                  const bodyLines = bodyText.split("\n");
                  const tblStart = bodyLines.findIndex((l) => l.trimStart().startsWith("|"));
                  if (tblStart >= 0 && tblStart + 1 < bodyLines.length && /^\|[\s-:|]+\|$/.test(bodyLines[tblStart + 1].trim())) {
                    const splitCells = (row: string) =>
                      row.split("|").filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map((c) => c.trim());
                    const tblHeaders = splitCells(bodyLines[tblStart]);
                    const tblRows: string[][] = [];
                    let ri = tblStart + 2;
                    while (ri < bodyLines.length && bodyLines[ri].trimStart().startsWith("|")) {
                      tblRows.push(splitCells(bodyLines[ri]));
                      ri++;
                    }
                    // Text before table
                    const preText = bodyLines.slice(0, tblStart).join("\n").trim();
                    // Text after table
                    const postText = bodyLines.slice(ri).join("\n").trim();
                    return (
                      <>
                        {preText && <p className="text-[12px] sm:text-[13px] text-hanwha-navy mb-1.5">{preText}</p>}
                        <PaginatedTable headers={tblHeaders} rows={tblRows} onLMSSend={onDataCardLMS} />
                        {postText && <p className="text-[11px] text-gray-500 mt-1">{postText}</p>}
                      </>
                    );
                  }
                  // Fallback: no table found, render as text
                  return <div className="text-[13px] sm:text-sm whitespace-pre-wrap text-hanwha-navy leading-[1.75]">{renderTextWithTables(bodyText)}</div>;
                })()}
              </div>
            </div>
          );
        })()}

        {/* Customer info card */}
        {message.type === "customer-info" && message.customerContext && (() => {
          const c = message.customerContext!;
          const urgencyMap: Record<string, { label: string; color: string; bg: string; border: string }> = {
            urgent: { label: "긴급", color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
            high:   { label: "높음", color: "#EA580C", bg: "#FFF7ED", border: "#FED7AA" },
            normal: { label: "보통", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
            low:    { label: "낮음", color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0" },
          };
          const urg = urgencyMap[c.urgency] ?? urgencyMap.normal;
          const lastContact = c.lastContact ?? "없음 (미접촉 고객)";
          const genderGradient = c.gender === "여"
            ? "linear-gradient(135deg, #EC4899, #DB2777)"
            : "linear-gradient(135deg, #3B82F6, #2563EB)";
          return (
            <div className="w-full overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-card">
              {/* Header */}
              <div className="relative px-4 py-3.5 border-b border-gray-100 overflow-hidden">
                <div
                  className="absolute inset-0 opacity-[0.06]"
                  style={{ background: genderGradient }}
                />
                <div className="relative flex items-center gap-2.5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base shrink-0 shadow-sm"
                    style={{ background: genderGradient }}
                  >
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[14px] sm:text-[15px] font-bold text-hanwha-navy">
                        {c.name}
                      </h4>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                        style={{
                          background: c.gender === "여" ? "#FDF2F8" : "#EFF6FF",
                          color: c.gender === "여" ? "#EC4899" : "#3B82F6",
                        }}
                      >
                        {c.gender}성
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-400">{c.age}세 · {c.birthDate}</span>
                  </div>
                  <span
                    className="rounded-full px-2.5 py-1 text-[10px] font-bold border"
                    style={{ background: urg.bg, color: urg.color, borderColor: urg.border }}
                  >
                    {urg.label}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="px-4 py-3 flex flex-col gap-2.5">
                {/* Event */}
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs leading-none">🎯</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">이벤트</span>
                    <p className="text-[13px] sm:text-sm font-semibold text-hanwha-navy">{c.event}</p>
                  </div>
                </div>

                {/* Event detail */}
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs leading-none">📌</span>
                  </div>
                  <p className="text-[12px] sm:text-[13px] text-gray-600 leading-relaxed">{c.eventDetail}</p>
                </div>

                {/* Products */}
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs leading-none">📦</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
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
                </div>

                {/* Last contact */}
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                    <span className="text-xs leading-none">⏰</span>
                  </div>
                  <span className="text-[12px] sm:text-[13px] text-gray-500">최근 컨택: {lastContact}</span>
                </div>
              </div>

              {/* LMS section: error / loading / loaded */}
              {message.lmsError && (
                <div className="border-t border-gray-100 px-4 py-3.5 bg-red-50/30">
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-red-600 mb-0.5">LMS 생성 불가</p>
                      <p className="text-[11px] text-red-500/80 leading-relaxed">{message.lmsError}</p>
                    </div>
                  </div>
                </div>
              )}

              {lmsGeneratingMsgId === message.id && !message.lmsError && (
                <LmsLoadingSteps />
              )}

              {message.lmsMessages && message.lmsMessages.length > 0 && (
                <div className="border-t border-gray-100">
                  <div className="relative px-4 py-3 border-b border-gray-50 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/40 to-transparent" />
                    <div className="relative flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                      </div>
                      <span className="text-[13px] font-bold text-hanwha-navy">AI 맞춤 LMS 메시지</span>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-500 text-white">
                        {message.lmsMessages.length}건
                      </span>
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    <div className="flex gap-3 overflow-x-auto pb-2 -mr-2 chat-scroll">
                      {message.lmsMessages.map((lms, i) => (
                        <div key={lms.id} className="shrink-0">
                          <LMSMessageCard
                            message={lms}
                            customer={c}
                            onSelect={onLMSSelect}
                            index={i}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
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
        {message.type === "customer-list" && message.customers && (() => {
          const customers = message.customers;
          const urgentCount = customers.filter(c => c.urgency === "urgent").length;
          const highCount = customers.filter(c => c.urgency === "high").length;
          const normalCount = customers.filter(c => c.urgency === "normal").length;
          const lowCount = customers.filter(c => c.urgency === "low").length;
          const hasMultiple = customers.length > 2;

          return (
            <div className="w-full rounded-2xl bg-white border border-gray-100 shadow-card overflow-x-clip">
              {/* Header */}
              <div className="relative px-4 py-3.5 border-b border-gray-100 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-hanwha-orange/[0.07] via-orange-50/40 to-transparent" />
                <div className="relative flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-hanwha-orange to-orange-600 flex items-center justify-center shadow-sm">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[14px] sm:text-[15px] font-bold text-hanwha-navy">터치 대상 고객</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">{message.content}</p>
                  </div>
                  <span className="rounded-full px-3 py-1 text-[11px] font-bold bg-hanwha-orange text-white shadow-sm">
                    {customers.length}명
                  </span>
                </div>
              </div>

              {/* Urgency stats bar */}
              <div className="px-4 py-2.5 flex items-center gap-3 border-b border-gray-50 bg-gray-50/30">
                <span className="text-[10px] font-semibold text-gray-400 shrink-0">긴급도</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {urgentCount > 0 && (
                    <div className="flex items-center gap-1 rounded-full bg-red-50 border border-red-100 px-2 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-[10px] font-semibold text-red-600">긴급 {urgentCount}</span>
                    </div>
                  )}
                  {highCount > 0 && (
                    <div className="flex items-center gap-1 rounded-full bg-orange-50 border border-orange-100 px-2 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      <span className="text-[10px] font-semibold text-orange-600">높음 {highCount}</span>
                    </div>
                  )}
                  {normalCount > 0 && (
                    <div className="flex items-center gap-1 rounded-full bg-blue-50 border border-blue-100 px-2 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <span className="text-[10px] font-semibold text-blue-600">보통 {normalCount}</span>
                    </div>
                  )}
                  {lowCount > 0 && (
                    <div className="flex items-center gap-1 rounded-full bg-green-50 border border-green-100 px-2 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span className="text-[10px] font-semibold text-green-600">낮음 {lowCount}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Horizontal scroll cards */}
              <div className="relative px-2 py-4">
                <div className="flex gap-3 overflow-x-auto pb-3 pt-1 pl-2 pr-2 chat-scroll">
                  {customers.map((customer, i) => (
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
                {/* Scroll hint gradient */}
                {hasMultiple && (
                  <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white via-white/80 to-transparent" />
                )}
              </div>

              {/* Footer hint */}
              {hasMultiple && (
                <div className="px-4 py-2 border-t border-gray-50 flex items-center justify-center gap-1.5 text-[10px] text-gray-400">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                  <span>좌우로 스크롤하여 더 많은 고객을 확인하세요</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              )}

            </div>
          );
        })()}

        {/* LMS list */}
        {message.type === "lms-list" && message.lmsMessages && message.customerContext && (
          <div className="w-full overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-card">
            {/* Header */}
            <div className="relative px-4 py-3.5 border-b border-gray-100 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/50 via-teal-50/30 to-transparent" />
              <div className="relative flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[14px] sm:text-[15px] font-bold text-hanwha-navy">AI 맞춤 LMS 메시지</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate">{message.customerContext.name} 고객 · {message.customerContext.event}</p>
                </div>
                <span className="rounded-full px-3 py-1 text-[11px] font-bold bg-emerald-500 text-white shadow-sm">
                  {message.lmsMessages.length}건
                </span>
              </div>
            </div>
            {/* Intro text */}
            <div className="px-4 py-2.5 text-[12px] sm:text-[13px] leading-relaxed text-gray-600 border-b border-gray-50 bg-gray-50/30">
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
