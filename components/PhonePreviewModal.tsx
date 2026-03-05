"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LMSMessage, Customer } from "@/lib/types";
import { track } from "@/lib/analytics";

/** customer.phone 없으면 기본 번호 반환 */
function getCustomerPhone(customer: Customer): string {
  if (customer.phone) return customer.phone;
  return "010-1111-1111";
}

/** iOS / Android 양쪽에서 동작하는 SMS URI 열기 */
function openSmsApp(phone: string, body: string) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const sep = isIOS ? "&" : "?";
  const raw = phone.replace(/-/g, "");          // 010XXXXXXXX
  window.location.href = `sms:${raw}${sep}body=${encodeURIComponent(body)}`;
}

interface PhonePreviewModalProps {
  isOpen: boolean;
  message: LMSMessage | null;
  customer: Customer | null;
  fpName?: string;
  onClose: () => void;
  onSend: (message: LMSMessage) => void;
  onEdit: () => void;
  onChooseOther: () => void;
}

export default function PhonePreviewModal({
  isOpen,
  message,
  customer,
  fpName,
  onClose,
  onSend,
  onEdit,
  onChooseOther,
}: PhonePreviewModalProps) {
  const [currentMessage, setCurrentMessage] = useState<LMSMessage | null>(message);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);

  // Sync with incoming prop changes (e.g. user selects a different message)
  useEffect(() => {
    setCurrentMessage(message);
    setRegenError(null);
  }, [message]);

  const now = new Date();
  const timeStr = now.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateStr = now.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
  });

  const handleRegenerate = async () => {
    if (!currentMessage || !customer || isRegenerating) return;
    track("lms_regenerate", { messageType: currentMessage.type, customerId: customer.id });
    setIsRegenerating(true);
    setRegenError(null);

    try {
      const res = await fetch("/api/regenerate-lms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer,
          messageType: currentMessage.type,
          existingContent: currentMessage.content,
          fpName,
        }),
      });

      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json() as { message?: LMSMessage; error?: string };

      if (data.message) {
        setCurrentMessage(data.message);
      } else {
        throw new Error(data.error ?? "응답 없음");
      }
    } catch (err) {
      console.error("[PhonePreviewModal] regenerate failed:", err);
      setRegenError("재생성에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && currentMessage && customer && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.35, type: "spring", stiffness: 260, damping: 22 }}
            className="fixed inset-x-0 top-0 bottom-0 z-50 flex items-start sm:items-center justify-center px-3 sm:px-4 py-3 sm:py-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-md flex flex-col" style={{ maxHeight: "calc(100dvh - 1.5rem)" }}>
              <div className="bg-white rounded-3xl shadow-modal overflow-hidden flex flex-col min-h-0">
                {/* Modal header — always visible */}
                <div
                  className="flex items-center justify-between px-4 sm:px-6 py-4 shrink-0"
                  style={{
                    background: "linear-gradient(135deg, #1A2B4A 0%, #2D4168 100%)",
                  }}
                >
                  <div>
                    <h3 className="text-white font-bold text-base">
                      LMS 발송 미리보기
                    </h3>
                    <p className="text-white/60 text-xs mt-0.5">
                      {customer.name} 고객 · {currentMessage.type}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors text-white/80 hover:text-white"
                    aria-label="닫기"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="1" y1="1" x2="13" y2="13" />
                      <line x1="13" y1="1" x2="1" y2="13" />
                    </svg>
                  </button>
                </div>

                {/* Scrollable body */}
                <div className="overflow-y-auto flex-1 min-h-0">
                  {/* Phone frame */}
                  <div className="flex justify-center py-4 sm:py-6 bg-gray-50">
                    <div className={`transition-opacity duration-300 ${isRegenerating ? "opacity-40" : "opacity-100"}`}>
                      <PhoneFrame
                        message={currentMessage}
                        timeStr={timeStr}
                        dateStr={dateStr}
                        customerName={customer.name}
                        customerPhone={getCustomerPhone(customer)}
                      />
                    </div>
                  </div>

                  {/* Message info */}
                  <div className="px-4 sm:px-6 py-3 border-t border-gray-100 bg-white">
                    <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
                      <InfoBadge icon="👤" text={`수신: ${customer.name} 고객`} />
                      <InfoBadge icon="📱" text={getCustomerPhone(customer)} />
                      <InfoBadge icon="📋" text={currentMessage.type} />
                      <InfoBadge
                        icon="📏"
                        text={`${currentMessage.content.length}자`}
                      />
                    </div>
                  </div>

                  {/* Error message */}
                  {regenError && (
                    <div className="px-4 sm:px-6 py-2 bg-red-50">
                      <p className="text-xs text-red-500">{regenError}</p>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="px-4 sm:px-6 pb-5 sm:pb-6 pt-4 space-y-2.5">
                    {/* Send button - primary */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        const body = `[${currentMessage.title}]\n\n${currentMessage.content}`;
                        openSmsApp(getCustomerPhone(customer), body);
                        onSend(currentMessage);
                      }}
                      disabled={isRegenerating}
                      className="w-full py-3.5 rounded-2xl text-white font-bold text-sm shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background:
                          "linear-gradient(135deg, #F37321 0%, #E06A1B 100%)",
                      }}
                    >
                      📱 메시지 앱으로 전달
                    </motion.button>

                    {/* Regenerate button */}
                    <motion.button
                      whileHover={!isRegenerating ? { scale: 1.02 } : {}}
                      whileTap={!isRegenerating ? { scale: 0.97 } : {}}
                      onClick={handleRegenerate}
                      disabled={isRegenerating}
                      className="w-full py-3 rounded-2xl text-sm font-semibold border transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      style={{
                        borderColor: isRegenerating ? "#D1D5DB" : "rgba(243,115,33,0.4)",
                        color: isRegenerating ? "#9CA3AF" : "#F37321",
                        background: isRegenerating
                          ? "#F9FAFB"
                          : "rgba(243,115,33,0.04)",
                      }}
                    >
                      {isRegenerating ? (
                        <>
                          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          새 내용 생성 중...
                        </>
                      ) : (
                        <>
                          🔄 메시지 재생성
                          <span className="text-xs font-normal opacity-60">
                            (같은 형태, 새 내용)
                          </span>
                        </>
                      )}
                    </motion.button>

                    {/* Secondary buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={onEdit}
                        disabled={isRegenerating}
                        className="py-3 rounded-2xl text-hanwha-navy text-sm font-semibold border border-gray-200 hover:border-hanwha-orange hover:text-hanwha-orange transition-all bg-white disabled:opacity-50"
                      >
                        ✏️ 수정하기
                      </button>
                      <button
                        onClick={onChooseOther}
                        disabled={isRegenerating}
                        className="py-3 rounded-2xl text-gray-500 text-sm font-semibold border border-gray-200 hover:border-gray-400 transition-all bg-white disabled:opacity-50"
                      >
                        ↩ 다른 메시지
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function PhoneFrame({
  message,
  timeStr,
  dateStr,
  customerName,
  customerPhone,
}: {
  message: LMSMessage;
  timeStr: string;
  dateStr: string;
  customerName: string;
  customerPhone: string;
}) {
  return (
    <div className="relative w-[14.5rem] sm:w-64 bg-black rounded-[40px] shadow-2xl overflow-hidden p-[8px]">
      {/* Screen */}
      <div className="h-full bg-[#F2F2F7] rounded-[34px] overflow-hidden flex flex-col">
        {/* Messages app header */}
        <div className="px-4 py-2 bg-white/90 border-b border-gray-200/50">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
              style={{ background: "linear-gradient(135deg, #1A2B4A, #2D4168)" }}
            >
              {customerName[0]}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-gray-900 truncate">
                {customerName}
              </div>
              <div className="text-gray-400 text-[10px]">
                {customerPhone}
              </div>
            </div>
          </div>
        </div>

        {/* Message content */}
        <div className="flex-1 px-3 py-3 overflow-y-auto">
          <div className="text-center text-[10px] text-gray-400 mb-2">{dateStr}</div>

          {/* SMS bubble */}
          <div className="flex justify-start">
            <div
              className="max-w-[85%] px-3 py-2.5 rounded-2xl rounded-tl-sm phone-screen text-xs text-gray-900 leading-relaxed shadow-sm"
              style={{ background: "white", fontSize: "10px" }}
            >
              {message.content}
            </div>
          </div>

          {/* Time */}
          <div className="flex justify-start pl-1 mt-1">
            <span className="text-gray-400" style={{ fontSize: "9px" }}>
              {timeStr}
            </span>
          </div>
        </div>

        {/* Input bar */}
        <div className="px-3 py-2 bg-white border-t border-gray-200/50 flex items-center gap-2">
          <div className="flex-1 h-7 bg-gray-100 rounded-full flex items-center px-3">
            <span className="text-gray-400" style={{ fontSize: "10px" }}>
              문자 입력...
            </span>
          </div>
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "#F37321" }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoBadge({ icon, text }: { icon: string; text: string }) {
  return (
    <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-lg">
      <span>{icon}</span>
      <span>{text}</span>
    </span>
  );
}
