"use client";

import { motion, AnimatePresence } from "framer-motion";

interface SplashScreenProps {
  isLeaving: boolean;
}

export default function SplashScreen({ isLeaving }: SplashScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={isLeaving ? { opacity: 0, scale: 1.04 } : { opacity: 1, scale: 1 }}
      transition={{ duration: 0.55, ease: "easeIn" }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #1A2B4A 0%, #2D4168 40%, #1A2B4A 100%)",
      }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10"
          style={{
            background:
              "radial-gradient(circle, #F37321 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-10"
          style={{
            background:
              "radial-gradient(circle, #F37321 0%, transparent 70%)",
          }}
        />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Logo content */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
        className="relative flex flex-col items-center gap-6"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15, type: "spring", stiffness: 200 }}
          className="relative"
        >
          <div
            className="w-28 h-28 rounded-2xl flex items-center justify-center shadow-2xl bg-white"
            style={{
              boxShadow: "0 0 40px rgba(243, 115, 33, 0.5)",
            }}
          >
            <img
              src="/hwgi.png"
              alt="한화손해보험"
              className="w-24 h-24 object-contain"
            />
          </div>
          {/* Glow ring */}
          <div
            className="absolute inset-0 rounded-2xl animate-ping"
            style={{
              background: "transparent",
              border: "2px solid rgba(243, 115, 33, 0.4)",
              animationDuration: "1.5s",
            }}
          />
        </motion.div>

        {/* Company name */}
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
          >
            <div className="text-white/70 text-sm font-medium tracking-[0.2em] mb-1">
              HANWHA GENERAL INSURANCE
            </div>
            <h1 className="text-white text-3xl font-bold tracking-tight">
              한화손해보험
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="mt-2"
          >
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold"
              style={{
                background: "rgba(243, 115, 33, 0.2)",
                border: "1px solid rgba(243, 115, 33, 0.4)",
                color: "#F37321",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-hanwha-orange animate-pulse" />
              AI 영업비서
            </div>
          </motion.div>
        </div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ duration: 0.4, delay: 0.7 }}
          className="text-white text-sm text-center"
        >
          AI 기반 고객관리 시스템
        </motion.p>

        {/* Loading bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.8 }}
          className="w-48 h-0.5 bg-white/20 rounded-full overflow-hidden"
        >
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{
              background:
                "linear-gradient(90deg, #F37321, #E06A1B)",
            }}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
