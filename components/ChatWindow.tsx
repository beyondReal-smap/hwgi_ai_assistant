"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { ChatMessage, Customer, FPProfile, LMSMessage } from "@/lib/types";
import { CUSTOMERS, LMS_MESSAGES } from "@/lib/data";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import PhonePreviewModal from "./PhonePreviewModal";

const QUICK_ACTIONS = [
  { label: "전체 고객", query: "오늘 터치할 고객 보여줘" },
  { label: "미납/미인출", query: "연체 미인출 고객 보여줘" },
  { label: "만기/갱신", query: "만기 갱신 고객 알려줘" },
  { label: "저가입 안내", query: "저가입 담보 보강 고객 보여줘" },
  { label: "가입설계 만료", query: "가입설계 동의 만료 고객 보여줘" },
  { label: "체결 감사", query: "체결 감사 고객 보여줘" },
  { label: "미터치", query: "미터치 미접촉 고객 보여줘" },
  { label: "생일", query: "오늘 생일인 고객 있어?" },
];

function createGreetingMessage(fpProfile: FPProfile): ChatMessage {
  return {
    id: "greeting",
    role: "bot",
    type: "text",
    content: `안녕하세요, ${fpProfile.name} FP님! 👋\n\n오늘도 활기찬 하루 되세요. 현재 오늘 터치가 필요한 고객 ${CUSTOMERS.length}명이 대기 중입니다.\n\n아래 버튼을 클릭하거나 직접 검색해보세요.`,
    timestamp: new Date(),
  };
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function getFilteredCustomers(query: string): Customer[] {
  const q = query;
  if (q.includes("만기") || q.includes("갱신")) {
    return CUSTOMERS.filter(
      (c) =>
        c.event === "자동차 만기 도래" ||
        c.event === "장기 만기 도래" ||
        c.event === "장기 갱신"
    );
  }
  if (q.includes("생일")) {
    return CUSTOMERS.filter((c) => c.event === "본인 생일");
  }
  if (q.includes("클레임") || q.includes("연체") || q.includes("미납") || q.includes("미인출")) {
    return CUSTOMERS.filter(
      (c) =>
        c.event === "장기 연체(미납)" ||
        c.event === "장기 자동이체 미인출"
    );
  }
  if (q.includes("감사") || q.includes("체결")) {
    return CUSTOMERS.filter((c) => c.event === "장기 체결 감사");
  }
  if (q.includes("미터치") || q.includes("미접촉")) {
    return CUSTOMERS.filter((c) => c.event === "미터치고객");
  }
  if (q.includes("저가입") || q.includes("담보") || q.includes("보강")) {
    return CUSTOMERS.filter((c) => c.event === "주요담보 저가입고객 안내");
  }
  if (q.includes("가입설계") || q.includes("동의")) {
    return CUSTOMERS.filter((c) => c.event === "가입설계동의 만료");
  }
  // Name search
  const nameMatches = CUSTOMERS.filter((c) => c.name.includes(q));
  if (nameMatches.length > 0) return nameMatches;
  const urgencyOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
  return [...CUSTOMERS].sort(
    (a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
  );
}

function getBotTextForQuery(query: string, count: number): string {
  if (query.includes("만기") || query.includes("갱신"))
    return `만기 도래 및 갱신 예정 고객 ${count}명을 찾았습니다. 각 고객의 계약 현황을 확인하고 연락해보세요.`;
  if (query.includes("생일"))
    return `오늘 생일인 고객 ${count}명이 있습니다. 따뜻한 생일 메시지를 보내드리세요!`;
  if (query.includes("클레임") || query.includes("연체") || query.includes("미납") || query.includes("미인출"))
    return `연체 및 자동이체 미인출 고객 ${count}명입니다. 빠른 연락이 필요합니다.`;
  if (query.includes("감사") || query.includes("체결"))
    return `체결 감사 안내 대상 고객 ${count}명입니다. 감사 인사로 관계를 강화하세요.`;
  if (query.includes("미터치") || query.includes("미접촉"))
    return `장기 미접촉 고객 ${count}명입니다. 관계 재구축이 필요합니다.`;
  if (query.includes("저가입") || query.includes("담보") || query.includes("보강"))
    return `주요담보 저가입 고객 ${count}명입니다. 담보 보강 제안을 검토하세요.`;
  if (query.includes("가입설계") || query.includes("동의"))
    return `가입설계 동의 만료 예정 고객 ${count}명입니다. 동의 연장 안내가 필요합니다.`;
  return `오늘 터치가 필요한 고객 ${count}명을 확인했습니다. 긴급도 순으로 정렬되었습니다.`;
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

const urgencyLabel: Record<string, string> = {
  urgent: "🔴 긴급",
  high: "🟠 높음",
  normal: "🔵 보통",
  low: "🟢 낮음",
};

/** API 호출로 ChatGPT가 즉석으로 LMS 3종 생성 */
async function generateLMSViaAI(customer: Customer): Promise<LMSMessage[]> {
  const res = await fetch("/api/generate-lms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customer }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = (await res.json()) as { messages: LMSMessage[] };
  if (!Array.isArray(data.messages) || data.messages.length === 0)
    throw new Error("Empty response");
  return data.messages;
}

interface ChatWindowProps {
  fpProfile: FPProfile;
}

export default function ChatWindow({ fpProfile }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    createGreetingMessage(fpProfile),
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedLMS, setSelectedLMS] = useState<LMSMessage | null>(null);
  const [selectedCustomerForModal, setSelectedCustomerForModal] =
    useState<Customer | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [sentCustomerIds, setSentCustomerIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ show: boolean; msg: string }>({
    show: false,
    msg: "",
  });

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  useEffect(() => {
    setMessages([createGreetingMessage(fpProfile)]);
    setInputValue("");
    setIsTyping(false);
    setIsGenerating(false);
    setSentCustomerIds(new Set());
  }, [fpProfile]);

  const showToastMsg = (msg: string) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: "" }), 3200);
  };

  const addBotMessage = useCallback((msg: Omit<ChatMessage, "id" | "timestamp">) => {
    setMessages((prev) => [
      ...prev,
      { ...msg, id: makeId(), timestamp: new Date() },
    ]);
  }, []);

  const addUserMessage = useCallback((content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: makeId(), role: "user", type: "text", content, timestamp: new Date() },
    ]);
  }, []);

  const handleUserInput = (query: string) => {
    if (!query.trim() || isTyping) return;
    addUserMessage(query);
    setInputValue("");
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const customers = getFilteredCustomers(query);
      addBotMessage({
        role: "bot",
        type: "customer-list",
        content: getBotTextForQuery(query, customers.length),
        customers,
      });
    }, 1300);
  };

  const handleCustomerSelect = useCallback(async (customer: Customer) => {
    if (isGenerating) return;
    setIsGenerating(true);

    addUserMessage(`${customer.name} 고객님의 정보를 확인하고 LMS 메시지를 작성해 주세요.`);
    setIsTyping(true);
    await sleep(1400);
    setIsTyping(false);

    // 고객 상세 정보 표시
    const lastContactText = customer.lastContact
      ? `최근 컨택: ${customer.lastContact}`
      : "최근 컨택: 없음 (미접촉 고객)";
    const productList = customer.products
      .map((p) => `• ${p.name} (${p.contractNo})`)
      .join("\n");

    addBotMessage({
      role: "bot",
      type: "text",
      content: `📋 ${customer.name} 고객 정보\n\n👤 ${customer.gender}성, ${customer.age}세 (${customer.birthDate})\n🎯 이벤트: ${customer.event}\n📌 ${customer.eventDetail}\n\n📦 보유 상품 ${customer.products.length}건:\n${productList}\n\n⏰ ${lastContactText}\n⚡ 긴급도: ${urgencyLabel[customer.urgency]}`,
    });

    // 고객 정보를 읽을 시간 확보 후 타이핑 인디케이터 표시
    await sleep(1200);
    setIsTyping(true);

    // 타이핑 인디케이터가 충분히 보인 뒤 "생성 중" 메시지 표시
    await sleep(1400);
    addBotMessage({
      role: "bot",
      type: "text",
      content: `AI 영업비서가 ${customer.name} 고객님의 상황에 맞는 LMS 메시지를 생성하고 있습니다...`,
    });

    try {
      const lmsMessages = await generateLMSViaAI(customer);
      setIsTyping(false);
      addBotMessage({
        role: "bot",
        type: "lms-list",
        content: `AI가 ${customer.name} 고객님께 최적화된 LMS 메시지 3종을 생성했습니다. (${customer.event} 기반) 원하시는 메시지를 선택해주세요.`,
        lmsMessages,
        customerContext: customer,
      });
    } catch (err) {
      console.warn("[LMS] AI generation failed, falling back:", err);
      // 폴백: 정적 더미 데이터 사용
      await sleep(800);
      setIsTyping(false);
      const fallback = LMS_MESSAGES[customer.id] ?? [];
      addBotMessage({
        role: "bot",
        type: "lms-list",
        content: `${customer.name} 고객님께 보낼 LMS 메시지 3종입니다. 원하시는 메시지를 선택해주세요.`,
        lmsMessages: fallback,
        customerContext: customer,
      });
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, addUserMessage, addBotMessage]);

  const handleLMSSelect = (lms: LMSMessage, customer: Customer) => {
    setSelectedLMS(lms);
    setSelectedCustomerForModal(customer);
    setShowModal(true);
  };

  const handleSend = (message: LMSMessage) => {
    if (!selectedCustomerForModal) return;
    setShowModal(false);

    setSentCustomerIds((prev) => new Set(prev).add(selectedCustomerForModal.id));
    addUserMessage(`${selectedCustomerForModal.name} 고객님께 보낼 ${message.type} 메시지를 메시지 앱으로 전달했습니다.`);
    showToastMsg(`${selectedCustomerForModal.name} 고객님 메시지가 메시지 앱으로 전달되었습니다.`);

    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      addBotMessage({
        role: "bot",
        type: "text",
        content: `📱 메시지 앱 전달 완료!\n\n${selectedCustomerForModal.name} 고객님께 보낼 ${message.type} 메시지가 FP님의 메시지 앱으로 전달되었습니다. 내용을 확인 후 발송해주세요.\n\n다음 고객을 확인하시겠습니까?`,
      });
    }, 1200);

    setSelectedLMS(null);
    setSelectedCustomerForModal(null);
  };

  const handleEdit = () => {
    setShowModal(false);
    addBotMessage({
      role: "bot",
      type: "text",
      content: `메시지를 수정하시려면 직접 입력창에 원하시는 내용을 입력해 주세요. AI 영업비서가 맞춤 메시지를 다시 생성해 드릴 수 있습니다. 😊`,
    });
  };

  const handleChooseOther = () => {
    setShowModal(false);
    addBotMessage({
      role: "bot",
      type: "text",
      content: `위의 LMS 메시지 카드 중 다른 메시지를 선택해주세요.`,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleUserInput(inputValue);
  };

  const busy = isTyping || isGenerating;

  return (
    <main className="flex-1 flex flex-col min-w-0 bg-surface-secondary relative overflow-hidden">
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, #1A2B4A 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* AI 생성 중 상단 배너 */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute top-0 left-0 right-0 z-20 flex items-center justify-center gap-2 py-2 text-xs font-medium text-white/90"
            style={{ background: "linear-gradient(90deg, #1A2B4A 0%, #2D4168 50%, #1A2B4A 100%)" }}
          >
            <span>AI 영업비서가 맞춤 LMS를 생성 중입니다</span>
            <span className="flex gap-0.5 items-center">
              <span className="typing-dot w-1 h-1 rounded-full bg-hanwha-orange" />
              <span className="typing-dot w-1 h-1 rounded-full bg-hanwha-orange" style={{ animationDelay: "0.2s" }} />
              <span className="typing-dot w-1 h-1 rounded-full bg-hanwha-orange" style={{ animationDelay: "0.4s" }} />
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat messages area */}
      <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 chat-scroll relative z-10">
        <div className="max-w-3xl mx-auto">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onCustomerSelect={handleCustomerSelect}
              onLMSSelect={handleLMSSelect}
              sentCustomerIds={sentCustomerIds}
            />
          ))}

          {isTyping && <TypingIndicator />}

          <div />
        </div>
      </div>

      {/* Bottom input area */}
      <div className="shrink-0 bg-white border-t border-gray-100 px-3 sm:px-4 md:px-6 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:py-4 relative z-10">
        <div className="max-w-3xl mx-auto">
          {/* Quick chips */}
          <div className="no-scrollbar flex gap-2 mb-3 overflow-x-auto pb-1 -mx-1 px-1 sm:mx-0 sm:px-0 sm:pb-0 sm:flex-wrap">
            {QUICK_ACTIONS.map((action) => (
              <motion.button
                key={action.label}
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleUserInput(action.query)}
                disabled={busy}
                className="shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border border-orange-200 bg-orange-50 text-hanwha-orange hover:bg-orange-100 hover:border-orange-300 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {action.label}
              </motion.button>
            ))}
          </div>

          {/* Input form */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 focus-within:border-hanwha-orange focus-within:bg-white transition-all duration-200 shadow-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" className="shrink-0">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="고객명 또는 이벤트 유형을 검색하세요..."
                disabled={busy}
                className="flex-1 bg-transparent text-[13px] sm:text-sm text-hanwha-navy placeholder-gray-400 outline-none disabled:opacity-50"
              />
              {inputValue && (
                <button type="button" onClick={() => setInputValue("")} className="text-gray-400 hover:text-gray-600 transition-colors text-base sm:text-lg leading-none">
                  ×
                </button>
              )}
            </div>

            <motion.button
              type="submit"
              disabled={!inputValue.trim() || busy}
              whileHover={inputValue.trim() && !busy ? { scale: 1.05 } : {}}
              whileTap={inputValue.trim() && !busy ? { scale: 0.95 } : {}}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm transition-all duration-200 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: inputValue.trim() && !busy
                  ? "linear-gradient(135deg, #F37321 0%, #E06A1B 100%)"
                  : "#E5E7EB",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </motion.button>
          </form>

          <p className="hidden sm:block text-center text-xs text-gray-400 mt-2">
            한화손해보험 AI 영업비서 · AI 생성 메시지는 발송 전 반드시 검토하세요
          </p>
        </div>
      </div>

      <PhonePreviewModal
        isOpen={showModal}
        message={selectedLMS}
        customer={selectedCustomerForModal}
        onClose={() => setShowModal(false)}
        onSend={handleSend}
        onEdit={handleEdit}
        onChooseOther={handleChooseOther}
      />

      {/* Toast — portal to body to avoid overflow-hidden clipping */}
      {createPortal(
        <AnimatePresence>
          {toast.show && (
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.93 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.95 }}
              transition={{ duration: 0.3, type: "spring", stiffness: 260, damping: 20 }}
              className="fixed inset-x-3 mx-auto z-[9999] max-w-sm bottom-6 px-4 py-3 rounded-2xl flex items-center gap-2 text-sm font-semibold text-white"
              style={{
                background: "linear-gradient(135deg, #1A2B4A 0%, #2D4168 100%)",
                border: "1px solid rgba(243,115,33,0.3)",
                boxShadow: "0 12px 40px rgba(26,43,74,0.3)",
              }}
            >
              <span className="shrink-0">✅</span>
              <span className="min-w-0 break-keep leading-snug">{toast.msg}</span>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </main>
  );
}
