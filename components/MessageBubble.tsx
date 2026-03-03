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
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex items-end gap-2 mb-4 ${isBot ? "flex-row" : "flex-row-reverse"}`}
    >
      {/* Bot avatar */}
      {isBot && (
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
            <circle cx="9" cy="11" r="1" fill="white" stroke="none" />
            <circle cx="15" cy="11" r="1" fill="white" stroke="none" />
          </svg>
        </div>
      )}

      <div className={`flex flex-col gap-1 max-w-[80%] ${isBot ? "items-start" : "items-end"}`}>
        {/* Main content */}
        {message.type === "text" && (
          <div
            className={`px-4 py-2.5 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${
              isBot
                ? "bg-white text-hanwha-navy rounded-bl-sm border border-gray-100"
                : "text-white rounded-br-sm"
            }`}
            style={
              !isBot
                ? {
                    background: "linear-gradient(135deg, #3D537F 0%, #2D4168 100%)",
                  }
                : {
                    borderLeft: "3px solid #F37321",
                  }
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
              className="px-4 py-2.5 rounded-2xl rounded-bl-sm shadow-sm text-sm leading-relaxed bg-white text-hanwha-navy border border-gray-100"
              style={{ borderLeft: "3px solid #F37321" }}
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
              className="px-4 py-2.5 rounded-2xl rounded-bl-sm shadow-sm text-sm leading-relaxed bg-white text-hanwha-navy border border-gray-100"
              style={{ borderLeft: "3px solid #F37321" }}
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
