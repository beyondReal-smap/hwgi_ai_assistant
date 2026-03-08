"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { SilsonSearchResponse } from "@/lib/silson-types";
import type { ChatMessage, Customer, FPProfile, LMSMessage } from "@/lib/types";
import type { QueryIntent, QueryParams, ParsedQuery } from "@/lib/query-filters";
import { filterByIntent, getCrmRequiredMessage, getBotText, urgencyOrder, CRM_REQUIRED_INTENTS, CSV_DATA_INTENTS } from "@/lib/query-filters";
import type { SilsonCardSpec } from "@/lib/silson-parser";
import { buildSilsonCards } from "@/lib/silson-parser";
import { QUICK_ACTIONS } from "@/lib/constants";
import { LMS_MESSAGES } from "@/lib/data";
import { track } from "@/lib/analytics";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import PhonePreviewModal from "./PhonePreviewModal";

const CHAT_STATE_KEY = "chat_state";
const GUIDE_QUERY_KEY = "guide_selected_query";

function createGreetingMessage(fpProfile: FPProfile, touchCount?: number): ChatMessage {
  const countText = touchCount != null ? `${touchCount}명` : "";
  return {
    id: "greeting",
    role: "bot",
    type: "text",
    content: touchCount != null
      ? `안녕하세요, ${fpProfile.name} FP님! 👋\n\n오늘도 활기찬 하루 되세요. 현재 오늘 터치가 필요한 고객 ${countText}이 대기 중입니다.`
      : `안녕하세요, ${fpProfile.name} FP님! 👋\n\n오늘의 터치 리스트를 불러오고 있습니다...`,
    timestamp: new Date(),
  };
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function parseQueryIntent(query: string): Promise<ParsedQuery> {
  const res = await fetch("/api/parse-query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`parse-query API ${res.status}`);
  return res.json() as Promise<ParsedQuery>;
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
async function generateLMSViaAI(customer: Customer, fpName?: string): Promise<LMSMessage[]> {
  const res = await fetch("/api/generate-lms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customer, fpName }),
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

// Read saved chat state from sessionStorage (called once during component init)
function readSavedChatState(employeeId: string) {
  try {
    const raw = sessionStorage.getItem(CHAT_STATE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved.employeeId === employeeId && saved.messages?.length > 1) {
        return {
          messages: saved.messages.map((m: ChatMessage & { timestamp: string }) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })) as ChatMessage[],
          touchCustomers: (saved.touchCustomers ?? []) as Customer[],
          sentCustomerIds: (saved.sentCustomerIds ?? []) as string[],
        };
      }
    }
  } catch {}
  return null;
}

export default function ChatWindow({ fpProfile }: ChatWindowProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Parse sessionStorage once on first render for state initialization
  const restoredRef = useRef<ReturnType<typeof readSavedChatState> | undefined>(undefined);
  const lastAppliedGuideQueryRef = useRef<string | null>(null);
  if (restoredRef.current === undefined) {
    restoredRef.current = readSavedChatState(fpProfile.employeeId);
  }

  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    restoredRef.current?.messages ?? [createGreetingMessage(fpProfile)]
  );
  const [touchCustomers, setTouchCustomers] = useState<Customer[]>(
    () => restoredRef.current?.touchCustomers ?? []
  );
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedLMS, setSelectedLMS] = useState<LMSMessage | null>(null);
  const [selectedCustomerForModal, setSelectedCustomerForModal] =
    useState<Customer | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [sentCustomerIds, setSentCustomerIds] = useState<Set<string>>(
    () => new Set(restoredRef.current?.sentCustomerIds ?? [])
  );
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
  }, [messages, scrollToBottom]);

  useEffect(() => {
    // Chat state was already restored from sessionStorage in useState initializers
    if (restoredRef.current) {
      return;
    }

    // Normal initialization (first login or no saved state)
    setIsTyping(false);
    setIsGenerating(false);
    setSentCustomerIds(new Set());
    setMessages([createGreetingMessage(fpProfile)]);
    setInputValue("");

    // FP 로그인 시 daily_touch 데이터 자동 로드 + 표시
    const loadDailyTouch = async () => {
      try {
        const res = await fetch("/api/daily-touch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stfno: fpProfile.employeeId }),
        });
        const data = (await res.json()) as { customers: Customer[]; totalCount: number };
        setTouchCustomers(data.customers);

        const greeting = createGreetingMessage(fpProfile, data.totalCount);
        if (data.customers.length > 0) {
          setMessages([
            greeting,
            {
              id: makeId(),
              role: "bot",
              type: "customer-list",
              content: `오늘 터치가 필요한 고객 ${data.totalCount}명을 확인했습니다. 긴급도 순으로 정렬되었습니다.`,
              customers: data.customers,
              timestamp: new Date(),
            },
          ]);
        } else {
          setMessages([
            {
              ...greeting,
              content: `안녕하세요, ${fpProfile.name} FP님! 👋\n\n오늘 터치 대상 고객이 없습니다. 아래 버튼을 이용해 고객 데이터를 조회해보세요.`,
            },
          ]);
        }
      } catch (err) {
        console.error("[daily-touch] Load failed:", err);
        setMessages([createGreetingMessage(fpProfile, 0)]);
      }
    };

    loadDailyTouch();
  }, [fpProfile]);

  useEffect(() => {
    const guideQueryFromUrl = searchParams.get("guideQuery");
    let pendingGuideQuery = guideQueryFromUrl;

    if (!pendingGuideQuery) {
      try {
        pendingGuideQuery = sessionStorage.getItem(GUIDE_QUERY_KEY);
      } catch {}
    }

    if (!pendingGuideQuery) {
      lastAppliedGuideQueryRef.current = null;
      return;
    }

    if (lastAppliedGuideQueryRef.current === pendingGuideQuery) {
      return;
    }

    lastAppliedGuideQueryRef.current = pendingGuideQuery;
    setInputValue(pendingGuideQuery);
    requestAnimationFrame(() => inputRef.current?.focus());

    try {
      sessionStorage.removeItem(GUIDE_QUERY_KEY);
    } catch {}

    if (guideQueryFromUrl) {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.delete("guideQuery");
      const nextUrl = nextParams.toString()
        ? `${pathname}?${nextParams.toString()}`
        : pathname;
      router.replace(nextUrl, { scroll: false });
    }
  }, [pathname, router, searchParams]);

  // Persist chat state to sessionStorage for tab navigation preservation
  useEffect(() => {
    try {
      sessionStorage.setItem(
        CHAT_STATE_KEY,
        JSON.stringify({
          employeeId: fpProfile.employeeId,
          messages,
          touchCustomers,
          sentCustomerIds: Array.from(sentCustomerIds),
        })
      );
    } catch {}
  }, [messages, touchCustomers, sentCustomerIds, fpProfile.employeeId]);

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

  const handleUserInput = async (query: string) => {
    if (!query.trim() || isTyping) return;
    track("chat_send", { query });
    addUserMessage(query);
    setInputValue("");
    setIsTyping(true);

    try {
      const parsed = await parseQueryIntent(query);

      console.group(`%c[AI 의도 파악] "${query}"`, "color:#F37321;font-weight:bold");
      console.log("intent   :", parsed.intent);
      console.log("targetName:", parsed.targetName);
      console.log("reasoning:", parsed.reasoning);
      if (parsed.raw) console.log("raw LLM  :", parsed.raw);
      console.groupEnd();

      setIsTyping(false);
      const params: QueryParams = parsed.params ?? {};

      if (parsed.intent === "off_topic") {
        addBotMessage({
          role: "bot",
          type: "text",
          content: `저는 FP님의 영업활동을 돕는 AI 어시스턴트입니다 😊\n고객 조회, 만기·생일·미납 안내, LMS 메시지 작성 등 영업 관련 질문을 도와드릴 수 있어요.\n\n아래 버튼을 눌러 오늘 터치할 고객을 확인해보세요!`,
        });
        return;
      }

      // CRM 연동이 필요한 intent는 안내 메시지 반환
      if (CRM_REQUIRED_INTENTS.has(parsed.intent)) {
        addBotMessage({
          role: "bot",
          type: "text",
          content: getCrmRequiredMessage(parsed.intent, params),
        });
        return;
      }

      // CSV 데이터 조회 intent 처리
      if (CSV_DATA_INTENTS.has(parsed.intent)) {
        try {
          const csvIntent = parsed.intent === "my_customers" ? "my_customers" : parsed.intent;
          const csvTargetName = parsed.intent === "my_customers" ? fpProfile.name : parsed.targetName;
          const csvRes = await fetch("/api/query-csv", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              intent: csvIntent,
              targetName: csvTargetName,
              fpName: fpProfile.name,
              params,
            }),
          });
          const { text } = (await csvRes.json()) as { text: string };
          addBotMessage({ role: "bot", type: "text", content: text });

          // LLM 분석 비동기 호출 (데이터가 있는 경우만)
          if (text && !text.includes("찾을 수 없습니다") && !text.includes("없습니다.")) {
            setIsTyping(true);
            try {
              const analysisRes = await fetch("/api/analyze-data", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query, dataText: text }),
              });
              const { analysis } = (await analysisRes.json()) as { analysis: string };
              setIsTyping(false);
              if (analysis) {
                addBotMessage({ role: "bot", type: "analysis", content: analysis });
              }
            } catch {
              setIsTyping(false);
            }
          }
        } catch {
          addBotMessage({
            role: "bot",
            type: "text",
            content: "데이터 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
          });
        }
        return;
      }

      // 실손의료비 약관/보상 기준 질의
      if (parsed.intent === "silson_search") {
        try {
          setIsTyping(true);
          const silsonRes = await fetch("/api/silson-search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, topk: 5 }),
          });
          setIsTyping(false);
          if (!silsonRes.ok) throw new Error(`silson-search ${silsonRes.status}`);
          const silsonData = await silsonRes.json() as SilsonSearchResponse;
          const cards = buildSilsonCards(query, silsonData);

          for (let i = 0; i < cards.length; i += 1) {
            setIsTyping(true);
            await sleep(i === 0 ? 420 : 760);
            setIsTyping(false);
            addBotMessage({
              role: "bot",
              type: "silson-card",
              title: cards[i].title,
              badge: cards[i].badge,
              tone: cards[i].tone,
              content: cards[i].content,
              sources: cards[i].sources,
              followUps: cards[i].followUps,
            });
          }
        } catch {
          setIsTyping(false);
          addBotMessage({
            role: "bot",
            type: "text",
            content: "실손의료비 정보 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
          });
        }
        return;
      }

      const customers = filterByIntent(touchCustomers, parsed.intent, parsed.targetName, query, params);
      const botText = getBotText(parsed.intent, params, customers.length);

      // 결과 없거나 텍스트 안내가 필요한 경우 (일반보험 등)
      if (customers.length === 0 && (parsed.intent === "insurance_type" && params.insuranceType === "general")) {
        addBotMessage({ role: "bot", type: "text", content: botText });
        return;
      }

      addBotMessage({ role: "bot", type: "customer-list", content: botText, customers });
    } catch (err) {
      console.warn("[parse-query] 폴백 실행:", err);
      // 폴백: 전체 긴급도 순 반환
      const customers = [...touchCustomers].sort(
        (a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
      );
      setIsTyping(false);
      addBotMessage({
        role: "bot",
        type: "customer-list",
        content: `오늘 터치가 필요한 고객 ${customers.length}명을 확인했습니다. 긴급도 순으로 정렬되었습니다.`,
        customers,
      });
    }
  };

  const handleCustomerSelect = useCallback(async (customer: Customer) => {
    if (isGenerating) return;
    track("customer_select", { customerId: customer.id, name: customer.name, event: customer.event });
    setIsGenerating(true);

    addUserMessage(`${customer.name} 고객님의 정보를 확인하고 LMS 메시지를 작성해 주세요.`);
    setIsTyping(true);
    await sleep(1400);
    setIsTyping(false);

    // 고객 상세 정보 표시
    const lastContactText = customer.lastContact
      ? `최근 컨택: ${customer.lastContact}`
      : "최근 컨택: 없음 (미접촉 고객)";
    const productSection = customer.products.length > 0
      ? `\n📦 보유 상품 ${customer.products.length}건:\n${customer.products.map((p) => `• ${p.name} (${p.contractNo})`).join("\n")}`
      : `\n📦 장기 ${customer.longTermCount}건 / 자동차 ${customer.carCount}건`;

    addBotMessage({
      role: "bot",
      type: "text",
      content: `📋 ${customer.name} 고객 정보\n\n👤 ${customer.gender}성, ${customer.age}세 (${customer.birthDate})\n🎯 이벤트: ${customer.event}\n📌 ${customer.eventDetail}${productSection}\n\n⏰ ${lastContactText}\n⚡ 긴급도: ${urgencyLabel[customer.urgency]}`,
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
      const lmsMessages = await generateLMSViaAI(customer, fpProfile.name);
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
    track("lms_select", { messageType: lms.type, customerId: customer.id });
    setSelectedLMS(lms);
    setSelectedCustomerForModal(customer);
    setShowModal(true);
  };

  const handleSend = (message: LMSMessage) => {
    if (!selectedCustomerForModal) return;
    track("lms_send", { messageType: message.type, customerId: selectedCustomerForModal.id });
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
  const showQuickScrollHint = QUICK_ACTIONS.length > 4;

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
            role="status"
            aria-live="polite"
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
              onFollowUpClick={handleUserInput}
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
          {showQuickScrollHint && (
            <div className="mb-2 flex items-center justify-between px-1 text-[11px] text-gray-400 sm:hidden">
              <span>빠른 실행</span>
              <span>좌우로 더 보기</span>
            </div>
          )}
          <div className="relative mb-3">
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 sm:mx-0 sm:px-0 sm:pb-0">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleUserInput(action.query)}
                  disabled={busy}
                  className="shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border border-orange-200 bg-orange-50 text-hanwha-orange hover:bg-orange-100 hover:border-orange-300 active:scale-95 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {action.label}
                </button>
              ))}
            </div>
            {showQuickScrollHint && (
              <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white via-white/85 to-transparent sm:hidden" />
            )}
          </div>

          {/* Input form */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl sm:rounded-2xl px-3 sm:px-4 h-10 sm:h-12 focus-within:border-hanwha-orange focus-within:bg-white transition-colors duration-200 shadow-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" className="shrink-0">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="고객명, 이벤트 유형 또는 실손 내용을 검색하세요..."
                disabled={busy}
                className="flex-1 bg-transparent text-[13px] sm:text-sm text-hanwha-navy placeholder-gray-400 outline-none disabled:opacity-50"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={() => setInputValue("")}
                  aria-label="입력 지우기"
                  className="text-gray-400 hover:text-gray-600 transition-colors text-base sm:text-lg leading-none"
                >
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
        fpName={fpProfile.name}
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
