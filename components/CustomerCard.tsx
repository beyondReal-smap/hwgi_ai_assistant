"use client";

import { motion } from "framer-motion";
import type { Customer } from "@/lib/types";

const eventColors: Record<string, { bg: string; text: string; border: string }> = {
  "본인 생일": { bg: "#F3E8FF", text: "#7C3AED", border: "#DDD6FE" },
  "자동차 만기 도래": { bg: "#FEF2F2", text: "#DC2626", border: "#FECACA" },
  "장기 갱신": { bg: "#FFF7ED", text: "#EA580C", border: "#FED7AA" },
  "장기 만기 도래": { bg: "#FEF2F2", text: "#DC2626", border: "#FECACA" },
  "장기 체결 감사": { bg: "#F0FDF4", text: "#16A34A", border: "#BBF7D0" },
  "장기 자동이체 미인출": { bg: "#FFFBEB", text: "#D97706", border: "#FDE68A" },
  "장기 연체(미납)": { bg: "#FEF2F2", text: "#DC2626", border: "#FECACA" },
  "주요담보 저가입고객 안내": { bg: "#EFF6FF", text: "#2563EB", border: "#BFDBFE" },
  "미터치고객": { bg: "#F8FAFC", text: "#64748B", border: "#E2E8F0" },
  "가입설계동의 만료": { bg: "#FFF7ED", text: "#EA580C", border: "#FED7AA" },
};

const urgencyConfig: Record<string, { label: string; bg: string; text: string; pulse: boolean }> = {
  urgent: { label: "긴급", bg: "#FEF2F2", text: "#DC2626", pulse: true },
  high: { label: "높음", bg: "#FFF7ED", text: "#EA580C", pulse: false },
  normal: { label: "보통", bg: "#EFF6FF", text: "#2563EB", pulse: false },
  low: { label: "낮음", bg: "#F0FDF4", text: "#16A34A", pulse: false },
};

interface CustomerCardProps {
  customer: Customer;
  onSelect: (customer: Customer) => void;
  index: number;
  isSent?: boolean;
}

export default function CustomerCard({ customer, onSelect, index, isSent = false }: CustomerCardProps) {
  const event = eventColors[customer.event] ?? {
    bg: "#F8FAFC",
    text: "#64748B",
    border: "#E2E8F0",
  };
  const urgency = urgencyConfig[customer.urgency];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.07 }}
      whileHover={{ y: -3, boxShadow: "0 8px 24px 0 rgba(26, 43, 74, 0.14)" }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(customer)}
      className="bg-white rounded-2xl p-4 cursor-pointer shadow-card transition-all duration-200 border relative overflow-hidden"
      style={{
        width: "clamp(196px, 72vw, 260px)",
        borderColor: isSent ? "#86EFAC" : "#F3F4F6",
      }}
    >
      {/* Sent badge */}
      {isSent && (
        <div
          className="absolute top-0 right-0 flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-bl-xl"
          style={{ background: "#DCFCE7", color: "#16A34A" }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          LMS 발송됨
        </div>
      )}
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        {/* Name + gender + age */}
        <div className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{
              background: customer.gender === "여"
                ? "linear-gradient(135deg, #EC4899, #DB2777)"
                : "linear-gradient(135deg, #3B82F6, #2563EB)",
            }}
          >
            {customer.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-hanwha-navy text-sm">
                {customer.name}
              </span>
              <span
                className="text-xs px-1 py-0.5 rounded font-medium"
                style={{
                  background: customer.gender === "여" ? "#FDF2F8" : "#EFF6FF",
                  color: customer.gender === "여" ? "#EC4899" : "#3B82F6",
                }}
              >
                {customer.gender}
              </span>
            </div>
            <span className="text-gray-400 text-xs">{customer.age}세</span>
          </div>
        </div>

        {/* Urgency badge */}
        <div
          className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${urgency.pulse ? "pulse-ring" : ""}`}
          style={{ background: urgency.bg, color: urgency.text }}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full`}
            style={{ background: urgency.text }}
          />
          {urgency.label}
        </div>
      </div>

      {/* Event badge */}
      <div
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg mb-2.5"
        style={{
          background: event.bg,
          color: event.text,
          border: `1px solid ${event.border}`,
        }}
      >
        <EventIcon eventType={customer.event} color={event.text} />
        {customer.event}
      </div>

      {/* Event detail */}
      <p className="text-gray-500 text-xs leading-snug mb-3 line-clamp-2">
        {customer.eventDetail}
      </p>

      {/* Products */}
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        {customer.longTermCount > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
            장기 {customer.longTermCount}건
          </span>
        )}
        {customer.carCount > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100">
            자동차 {customer.carCount}건
          </span>
        )}
      </div>

      {/* Last contact */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          최근 {customer.lastContact ?? "미접촉"}
        </div>
        <div
          className="text-xs font-medium px-2.5 py-1 rounded-lg transition-colors"
          style={
            isSent
              ? { background: "#DCFCE7", color: "#16A34A" }
              : { background: "rgba(243, 115, 33, 0.08)", color: "#F37321" }
          }
        >
          {isSent ? "재발송 →" : "상세보기 →"}
        </div>
      </div>
    </motion.div>
  );
}

function EventIcon({ eventType, color }: { eventType: string; color: string }) {
  const iconProps = {
    width: 12,
    height: 12,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: "2",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (eventType) {
    case "본인 생일":
      return (
        <svg {...iconProps}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      );
    case "자동차 만기 도래":
      return (
        <svg {...iconProps}>
          <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
          <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>
      );
    case "장기 갱신":
    case "장기 만기 도래":
      return (
        <svg {...iconProps}>
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
      );
    case "장기 체결 감사":
      return (
        <svg {...iconProps}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      );
    case "장기 자동이체 미인출":
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      );
    case "장기 연체(미납)":
      return (
        <svg {...iconProps}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      );
    default:
      return (
        <svg {...iconProps}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      );
  }
}
