"use client";

import { motion } from "framer-motion";
import type { ChatMessage, Customer, LMSMessage } from "@/lib/types";
import CustomerCard from "./CustomerCard";
import LMSMessageCard from "./LMSMessageCard";

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
            {message.content}
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
