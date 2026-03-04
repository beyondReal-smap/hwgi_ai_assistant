"use client";

export default function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-4">
      {/* Bot avatar */}
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mb-0.5 bg-white border border-gray-200 shadow-sm">
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

      {/* Bubble */}
      <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-card flex items-center gap-1.5">
        <span className="typing-dot w-2 h-2 rounded-full bg-hanwha-orange/60" />
        <span className="typing-dot w-2 h-2 rounded-full bg-hanwha-orange/60" style={{ animationDelay: "0.2s" }} />
        <span className="typing-dot w-2 h-2 rounded-full bg-hanwha-orange/60" style={{ animationDelay: "0.4s" }} />
      </div>
    </div>
  );
}
