"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import LoginLoadingScreen from "@/components/LoginLoadingScreen";
import LogoutScreen from "@/components/LogoutScreen";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import FPLoginScreen from "@/components/FPLoginScreen";
import { track, setUser } from "@/lib/analytics";
import type { FPProfile, TodoItem } from "@/lib/types";

const FP_SESSION_KEY = "fp_logged_in_employee_id";

export default function Home() {
  const [accounts, setAccounts] = useState<FPProfile[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentFP, setCurrentFP] = useState<FPProfile | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [showLoginLoading, setShowLoginLoading] = useState(false);
  const [loginLoadingDone, setLoginLoadingDone] = useState(false);
  const [showLogoutScreen, setShowLogoutScreen] = useState(false);
  const [logoutScreenLeaving, setLogoutScreenLeaving] = useState(false);
  // Store FP name separately so logout screen can still show it after currentFP clears
  const [logoutFPName, setLogoutFPName] = useState("");
  const [touchCount, setTouchCount] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [todos, setTodos] = useState<TodoItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadAccounts = async () => {
      setIsLoadingAccounts(true);
      setLoadError(null);

      try {
        const res = await fetch("/api/fp-accounts");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;

        if (data.error) {
          setLoadError(data.error);
          setAccounts([]);
        } else {
          setAccounts(data.accounts ?? []);
        }
      } catch (err) {
        if (cancelled) return;
        setAccounts([]);
        setLoadError(
          `FP 계정 데이터를 불러오지 못했습니다: ${err instanceof Error ? err.message : "알 수 없는 오류"}`
        );
      } finally {
        if (!cancelled) setIsLoadingAccounts(false);
      }
    };

    loadAccounts();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isLoadingAccounts || currentFP) return;

    // No accounts loaded yet (or load failed) — nothing to validate against.
    if (accounts.length === 0) {
      setSessionChecked(true);
      return;
    }

    const savedEmployeeId = window.localStorage.getItem(FP_SESSION_KEY);
    if (!savedEmployeeId) {
      setSessionChecked(true);
      return;
    }

    const savedProfile = accounts.find(
      (account) => account.employeeId === savedEmployeeId
    );
    if (!savedProfile) {
      window.localStorage.removeItem(FP_SESSION_KEY);
      setSessionChecked(true);
      return;
    }

    setCurrentFP(savedProfile);
    window.localStorage.setItem("fp_profile", JSON.stringify(savedProfile));
    setSessionChecked(true);
  }, [accounts, isLoadingAccounts, currentFP]);

  // Clean up login splash only (logout splash is managed by handleLogout timeouts).
  useEffect(() => {
    if (!currentFP) {
      setShowLoginLoading(false);
      setLoginLoadingDone(false);
      setTouchCount(0);
      setCustomerCount(0);
      setTodos([]);
      return;
    }
    // Fetch daily touch count for sidebar stats
    fetch("/api/daily-touch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stfno: currentFP.employeeId }),
    })
      .then((res) => res.json())
      .then((data) => {
        setTouchCount(data.totalCount ?? 0);
        setCustomerCount(data.customerCount ?? 0);
        setTodos(data.todos ?? []);
      })
      .catch(() => {
        setTouchCount(0);
        setCustomerCount(0);
        setTodos([]);
      });
  }, [currentFP]);

  const handleLogin = async (employeeId: string, password: string) => {
    setAuthError(null);
    if (isLoadingAccounts || loadError) return;

    try {
      const res = await fetch("/api/fp-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error ?? "사번 또는 비밀번호가 올바르지 않습니다.");
        return;
      }

      const profile: FPProfile = data.profile;

      // Set splash state BEFORE setCurrentFP so React batches both into one render,
      // preventing a one-frame flash of the main content.
      setShowLoginLoading(true);
      setLoginLoadingDone(false);
      setTimeout(() => setLoginLoadingDone(true), 3000);
      setTimeout(() => setShowLoginLoading(false), 3700);

      setUser(profile.employeeId);
      track("login", { employeeId: profile.employeeId, name: profile.name, branch: profile.branch });
      setCurrentFP(profile);
      window.localStorage.setItem(FP_SESSION_KEY, profile.employeeId);
      window.localStorage.setItem("fp_profile", JSON.stringify(profile));
    } catch {
      setAuthError("로그인 처리 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
  };

  const handleLogout = () => {
    if (!currentFP) return;
    track("logout", { employeeId: currentFP.employeeId, name: currentFP.name });
    setUser(null);
    setAuthError(null);
    setLogoutFPName(currentFP.name);
    window.localStorage.removeItem(FP_SESSION_KEY);
    window.localStorage.removeItem("fp_profile");
    sessionStorage.removeItem("chat_state");
    sessionStorage.removeItem("guide_selected_query");

    // Show logout screen immediately while main content is still visible
    setShowLogoutScreen(true);
    setLogoutScreenLeaving(false);

    // After 1200ms: start fade AND switch to login screen simultaneously.
    // LogoutScreen (z-50 fixed) fades over 350ms on top of the login screen.
    setTimeout(() => {
      setLogoutScreenLeaving(true);
      setCurrentFP(null);
    }, 1200);

    // After fade completes (1200 + 400ms buffer), hide the logout screen entirely.
    setTimeout(() => setShowLogoutScreen(false), 1650);
  };

  // Session check in progress — show header shell to prevent flash during navigation.
  if (!currentFP && !sessionChecked) {
    return (
      <div className="flex flex-col h-screen">
        <AppHeader />
        <div className="flex-1 bg-[#F0F4F8]" />
      </div>
    );
  }

  return (
    <>
      {/* Logout screen — rendered outside login/main branches so it persists
          as an overlay while transitioning from main → login screen */}
      {showLogoutScreen && (
        <LogoutScreen fpName={logoutFPName} isLeaving={logoutScreenLeaving} />
      )}

      {!currentFP ? (
        <FPLoginScreen
          isLoading={isLoadingAccounts}
          accountCount={accounts.length}
          loadError={loadError}
          authError={authError}
          onLogin={handleLogin}
        />
      ) : (
        <>
          {showLoginLoading && (
            <LoginLoadingScreen
              fpName={currentFP.name}
              isLeaving={loginLoadingDone}
            />
          )}

          <div className="flex flex-col h-screen">
            <AppHeader currentFP={currentFP} onLogout={handleLogout} />

            <div className="flex flex-1 min-h-0 overflow-hidden">
              <Sidebar fpProfile={currentFP} touchCount={touchCount} customerCount={customerCount} todos={todos} />
              <ChatWindow fpProfile={currentFP} />
            </div>
          </div>
        </>
      )}
    </>
  );
}
