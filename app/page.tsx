"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import LoginLoadingScreen from "@/components/LoginLoadingScreen";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import FPLoginScreen from "@/components/FPLoginScreen";
import { parseFPAccountsCsv, authenticateFP } from "@/lib/fp-auth";
import type { FPAccount, FPProfile } from "@/lib/types";

const FP_SESSION_KEY = "fp_logged_in_employee_id";
const FP_CSV_CANDIDATES = ["/FP.csv", "/fp.csv"];

export default function Home() {
  const [accounts, setAccounts] = useState<FPAccount[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentFP, setCurrentFP] = useState<FPProfile | null>(null);
  const [showLoginLoading, setShowLoginLoading] = useState(false);
  const [loginLoadingDone, setLoginLoadingDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadFpCsv = async () => {
      setIsLoadingAccounts(true);
      setLoadError(null);

      let csvText: string | null = null;
      let lastStatusCode: number | null = null;

      for (const path of FP_CSV_CANDIDATES) {
        try {
          const response = await fetch(path, { cache: "no-store" });
          if (response.ok) {
            csvText = await response.text();
            break;
          }
          lastStatusCode = response.status;
        } catch {
          // Ignore network error and continue to next candidate path.
        }
      }

      if (cancelled) return;

      if (!csvText) {
        setAccounts([]);
        setLoadError(
          `FP.csv 파일을 찾지 못했습니다. (/public/FP.csv, 마지막 응답 코드: ${
            lastStatusCode ?? "unknown"
          })`
        );
        setIsLoadingAccounts(false);
        return;
      }

      const parsed = parseFPAccountsCsv(csvText);
      setAccounts(parsed.accounts);
      setLoadError(parsed.parseError ?? null);
      setIsLoadingAccounts(false);
    };

    loadFpCsv();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isLoadingAccounts || currentFP || accounts.length === 0) return;

    const savedEmployeeId = window.localStorage.getItem(FP_SESSION_KEY);
    if (!savedEmployeeId) return;

    const savedAccount = accounts.find(
      (account) => account.employeeId === savedEmployeeId
    );
    if (!savedAccount) {
      window.localStorage.removeItem(FP_SESSION_KEY);
      return;
    }

    const { password: _, ...savedProfile } = savedAccount;
    setCurrentFP(savedProfile);
  }, [accounts, isLoadingAccounts, currentFP]);

  useEffect(() => {
    if (!currentFP) {
      setShowLoginLoading(false);
      setLoginLoadingDone(false);
      return;
    }

    setShowLoginLoading(true);
    setLoginLoadingDone(false);

    const doneTimer = setTimeout(() => setLoginLoadingDone(true), 3000);
    const removeTimer = setTimeout(() => setShowLoginLoading(false), 3700);

    return () => {
      clearTimeout(doneTimer);
      clearTimeout(removeTimer);
    };
  }, [currentFP?.employeeId]);

  const handleLogin = (employeeId: string, password: string) => {
    setAuthError(null);
    if (isLoadingAccounts || loadError) return;

    const profile = authenticateFP(accounts, employeeId, password);
    if (!profile) {
      setAuthError("사번 또는 비밀번호가 올바르지 않습니다.");
      return;
    }

    setCurrentFP(profile);
    window.localStorage.setItem(FP_SESSION_KEY, profile.employeeId);
  };

  const handleLogout = () => {
    setCurrentFP(null);
    setAuthError(null);
    window.localStorage.removeItem(FP_SESSION_KEY);
  };

  if (!currentFP) {
    return (
      <FPLoginScreen
        isLoading={isLoadingAccounts}
        accountCount={accounts.length}
        loadError={loadError}
        authError={authError}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <>
      {showLoginLoading && (
        <LoginLoadingScreen
          fpName={currentFP.name}
          isLeaving={loginLoadingDone}
        />
      )}

      <div
        className={`flex flex-col h-screen transition-opacity duration-500 ${
          showLoginLoading ? "opacity-0" : "opacity-100"
        }`}
      >
        <AppHeader currentFP={currentFP} onLogout={handleLogout} />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <Sidebar fpProfile={currentFP} />
          <ChatWindow fpProfile={currentFP} />
        </div>
      </div>
    </>
  );
}
