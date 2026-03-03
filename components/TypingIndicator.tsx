"use client";

import { motion } from "framer-motion";

export default function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className="flex items-end gap-2 mb-4"
    >
      {/* Bot avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mb-0.5 shadow-sm"
        style={{
          background: "linear-gradient(135deg, #F37321 0%, #E06A1B 100%)",
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2a9 9 0 0 1 9 9c0 4-2.5 7.5-6.5 8.5L12 22l-2.5-2.5C5.5 18.5 3 15 3 11a9 9 0 0 1 9-9z" />
          <circle cx="9" cy="11" r="1" fill="white" />
          <circle cx="15" cy="11" r="1" fill="white" />
        </svg>
      </div>

      {/* Bubble */}
      <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-card flex items-center gap-1.5">
        <span className="typing-dot w-2 h-2 rounded-full bg-hanwha-orange/60" />
        <span className="typing-dot w-2 h-2 rounded-full bg-hanwha-orange/60" style={{ animationDelay: "0.2s" }} />
        <span className="typing-dot w-2 h-2 rounded-full bg-hanwha-orange/60" style={{ animationDelay: "0.4s" }} />
      </div>
    </motion.div>
  );
}
