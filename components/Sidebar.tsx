"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { TODAY_TODOS } from "@/lib/data";
import type { FPProfile, TodoItem } from "@/lib/types";

function useCountUp(target: number, duration: number = 1200, delay: number = 0) {
  const [count, setCount] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      started.current = true;
      const startTime = performance.now();
      const step = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.floor(eased * target));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, delay);
    return () => clearTimeout(timeout);
  }, [target, duration, delay]);

  return count;
}

const urgencyDot: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  normal: "bg-blue-400",
  low: "bg-green-400",
};

interface SidebarProps {
  fpProfile: FPProfile;
}

export default function Sidebar({ fpProfile }: SidebarProps) {
  const [todos, setTodos] = useState<TodoItem[]>(TODAY_TODOS);
  const totalCustomers = useCountUp(147, 1400, 500);
  const todayTargets = useCountUp(95, 800, 700);
  const completed = useCountUp(3, 600, 900);
  const monthly = useCountUp(92, 1000, 800);

  const completedCount = todos.filter((t) => t.done).length;
  const toggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  return (
    <aside className="hidden md:flex flex-col w-72 lg:w-80 shrink-0 bg-hanwha-navy border-r border-white/10 overflow-y-auto">
      {/* FP Profile */}
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="relative">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shrink-0"
              style={{
                background: "linear-gradient(135deg, #F37321 0%, #E06A1B 100%)",
              }}
            >
              {fpProfile.profileInitials}
            </div>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-hanwha-navy" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-white font-bold text-base leading-tight truncate">
                {fpProfile.name} FP
              </h2>
              <span
                className="shrink-0 text-xs px-1.5 py-0.5 rounded-md font-semibold"
                style={{
                  background: "rgba(243, 115, 33, 0.2)",
                  color: "#F37321",
                  border: "1px solid rgba(243, 115, 33, 0.3)",
                }}
              >
                {fpProfile.level}
              </span>
            </div>
            <p className="text-white/60 text-xs mt-0.5 truncate">
              {fpProfile.branch}
            </p>
            <p className="text-white/40 text-xs">
              경력 {fpProfile.yearsOfExperience}년
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-4 border-b border-white/10">
        <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-3">
          오늘의 현황
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          <StatCard
            label="보유 고객"
            value={totalCustomers}
            unit="명"
            color="text-white"
            bg="bg-white/5"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/50">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            }
          />
          <StatCard
            label="터치 대상"
            value={todayTargets}
            unit="명"
            color="text-hanwha-orange"
            bg="bg-hanwha-orange/10"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-hanwha-orange/70">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 12 19.79 19.79 0 0 1 1.95 3.4 2 2 0 0 1 3.93 1.2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            }
          />
          <StatCard
            label="처리 완료"
            value={completed}
            unit="건"
            color="text-emerald-400"
            bg="bg-emerald-400/10"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-400/70">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            }
          />
          <StatCard
            label="이달 실적"
            value={monthly}
            unit="%"
            color="text-sky-400"
            bg="bg-sky-400/10"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sky-400/70">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                <polyline points="17 6 23 6 23 12"/>
              </svg>
            }
          />
        </div>

        {/* Monthly progress bar */}
        <div className="mt-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-white/50 text-xs">이달 목표 달성률</span>
            <span className="text-sky-400 text-xs font-bold">{monthly}%</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${monthly}%` }}
              transition={{ duration: 1.2, delay: 1.0, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, #38BDF8, #0EA5E9)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Today's Todo */}
      <div className="p-4 flex-1">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white/50 text-xs font-medium uppercase tracking-wider">
            오늘의 할일
          </p>
          <span className="text-xs text-white/40">
            {completedCount}/{todos.length}
          </span>
        </div>

        <div className="space-y-2">
          {[...todos].sort((a, b) => Number(a.done) - Number(b.done)).map((todo, index) => (
            <motion.button
              key={todo.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.8 + index * 0.08 }}
              onClick={() => toggleTodo(todo.id)}
              className={`w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group ${
                todo.done
                  ? "bg-white/5 opacity-60"
                  : "bg-white/8 hover:bg-white/12"
              }`}
              style={!todo.done ? { background: "rgba(255,255,255,0.06)" } : {}}
            >
              {/* Checkbox */}
              <div
                className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all duration-200 ${
                  todo.done
                    ? "bg-emerald-400 border-emerald-400"
                    : "border-white/30 group-hover:border-white/60"
                }`}
              >
                {todo.done && (
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <polyline points="2 6 5 9 10 3" />
                  </svg>
                )}
              </div>

              {/* Text + urgency */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-xs leading-snug ${
                    todo.done
                      ? "line-through text-white/40"
                      : "text-white/80"
                  }`}
                >
                  {todo.text}
                </p>
              </div>

              {/* Urgency dot */}
              {!todo.done && todo.urgency && (
                <div
                  className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                    urgencyDot[todo.urgency]
                  } ${todo.urgency === "urgent" ? "pulse-ring" : ""}`}
                />
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Bottom contact info */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-2 text-white/40 text-xs">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 12 19.79 19.79 0 0 1 1.95 3.4 2 2 0 0 1 3.93 1.2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          <span>고객센터 1566-8000</span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-white/40 text-xs">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          <span className="truncate">{fpProfile.email ?? "-"}</span>
        </div>
      </div>
    </aside>
  );
}

function StatCard({
  label,
  value,
  unit,
  color,
  bg,
  icon,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
  bg: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className={`${bg} rounded-xl p-3 flex flex-col gap-1`}
      style={{ border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-white/50 text-xs">{label}</span>
        {icon}
      </div>
      <div className={`${color} font-bold text-xl leading-none`}>
        {value}
        <span className="text-sm font-medium ml-0.5 opacity-80">{unit}</span>
      </div>
    </div>
  );
}
