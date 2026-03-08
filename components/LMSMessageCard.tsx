"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import type { LMSMessage, Customer } from "@/lib/types";

const typeConfig = {
  "안내형": {
    label: "📋 안내형",
    bg: "#EFF6FF",
    text: "#2563EB",
    border: "#BFDBFE",
    btnBg: "#2563EB",
    desc: "정보 전달 중심",
  },
  "감성형": {
    label: "💙 감성형",
    bg: "#FDF4FF",
    text: "#9333EA",
    border: "#E9D5FF",
    btnBg: "#9333EA",
    desc: "따뜻한 공감",
  },
  "혜택/관리형": {
    label: "✨ 혜택/관리형",
    bg: "#FFF7ED",
    text: "#EA580C",
    border: "#FED7AA",
    btnBg: "#F37321",
    desc: "전문 관리 강조",
  },
};

interface LMSMessageCardProps {
  message: LMSMessage;
  customer: Customer;
  onSelect: (message: LMSMessage, customer: Customer) => void;
  index: number;
}

const LMSMessageCard = memo(function LMSMessageCard({
  message,
  customer,
  onSelect,
  index,
}: LMSMessageCardProps) {
  const config = typeConfig[message.type];

  // Short preview (first 60 chars)
  const preview = message.content.length > 80
    ? message.content.slice(0, 80).replace(/\n/g, " ") + "..."
    : message.content.replace(/\n/g, " ");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden"
      style={{ width: "clamp(210px, 76vw, 290px)" }}
    >
      {/* Type badge header */}
      <div
        className="px-4 py-2.5 flex items-center justify-between"
        style={{ background: config.bg, borderBottom: `1px solid ${config.border}` }}
      >
        <span
          className="text-xs font-bold"
          style={{ color: config.text }}
        >
          {config.label}
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: config.border, color: config.text }}
        >
          {config.desc}
        </span>
      </div>

      {/* Title */}
      <div className="px-4 pt-3 pb-1">
        <p className="text-hanwha-navy font-semibold text-sm">{message.title}</p>
      </div>

      {/* Preview text */}
      <div className="px-4 pb-3">
        <p className="text-gray-500 text-xs leading-relaxed line-clamp-3">
          {preview}
        </p>
      </div>

      {/* Action button */}
      <div className="px-4 pb-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(message, customer)}
          className="w-full py-2 rounded-xl text-white text-xs font-semibold shadow-sm transition-all duration-150"
          style={{
            background: `linear-gradient(135deg, ${config.btnBg} 0%, ${adjustColor(config.btnBg, -20)} 100%)`,
          }}
        >
          이 메시지 선택 →
        </motion.button>
      </div>
    </motion.div>
  );
});

export default LMSMessageCard;

// Simple color darkening helper
function adjustColor(hex: string, amount: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  const r = Math.max(0, Math.min(255, parseInt(result[1], 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(result[2], 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(result[3], 16) + amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
