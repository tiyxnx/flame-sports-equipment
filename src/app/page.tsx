"use client";

import React, { useState, useEffect } from "react";
import { User } from "@/types";
import Header from "@/components/Header";
import StudentDashboard from "@/components/StudentDashboard";
import AdminDashboard from "@/components/AdminDashboard";
import { ShieldCheck, ArrowRight, AlertCircle, Sparkles } from "lucide-react";

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [inputEmail, setInputEmail] = useState<string>("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  // Initialize with student or saved session in localStorage
  useEffect(() => {
    const saved = localStorage.getItem("flame_sports_user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCurrentUser(parsed);
      } catch {
        // ignore
      }
    } else {
      // Default to student Rohan Sharma so the app is immediately testable and demonstrated!
      handleLogin("rohan.sharma@flame.edu.in", "Rohan Sharma");
    }
  }, []);

  const handleLogin = async (emailToAuth: string, customName?: string) => {
    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToAuth, name: customName }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || "Authentication failed.");
        setIsAuthenticating(false);
        return;
      }

      setCurrentUser(data.user);
      localStorage.setItem("flame_sports_user", JSON.stringify(data.user));
    } catch {
      setAuthError("Network connection error. Please try again.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("flame_sports_user");
  };

  const handleSwitchUser = (email: string) => {
    handleLogin(email);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {!currentUser ? (
          /* Landing Page: Login with FLAME Email ID */
          <div className="max-w-md mx-auto my-12 bg-white rounded-3xl p-8 shadow-xl border border-slate-200 text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-red-600 text-white font-black text-2xl flex items-center justify-center shadow-md">
              F
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-black tracking-widest text-red-600 uppercase">
                FLAME University • Department of Sports
              </span>
              <h2 className="text-2xl font-black text-[#0B2545] tracking-tight">
                Digital Sports Equipment Room
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                Scan the equipment room QR code, sign in with your official university credentials, and borrow or return gear in seconds.
              </p>
            </div>

            {authError && (
              <div className="p-3.5 bg-red-50 text-red-800 border border-red-200 rounded-xl text-xs flex items-start gap-2.5 text-left">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Access Restricted</strong>
                  {authError}
                </div>
              </div>
            )}

            {/* Custom Email Entry */}
            <div className="space-y-3 pt-2 text-left">
              <label className="text-xs font-bold text-slate-700 block">
                Sign In with University Account
              </label>
              <div className="space-y-2">
                <input
                  type="email"
                  placeholder="your.name@flame.edu.in"
                  value={inputEmail}
                  onChange={(e) => setInputEmail(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-800 font-mono"
                />
                <button
                  type="button"
                  onClick={() => handleLogin(inputEmail)}
                  disabled={!inputEmail || isAuthenticating}
                  className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-xs"
                >
                  {isAuthenticating ? "Authenticating..." : "Login with your FLAME Email ID"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Demo Logins */}
            <div className="pt-4 border-t border-slate-100 text-left space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-red-500" /> One-Click Verified Accounts:
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleLogin("asmi.malushte@flame.edu.in", "Asmi Malushte")}
                  className="p-2.5 rounded-xl border border-slate-200 hover:border-red-600 hover:bg-red-50/50 text-xs text-left transition flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-slate-900 block">Asmi Malushte</span>
                    <span className="text-[10px] text-red-700 font-semibold uppercase">
                      Administrator Dashboard
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">asmi.malushte@flame.edu.in</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleLogin("rohan.sharma@flame.edu.in", "Rohan Sharma")}
                  className="p-2.5 rounded-xl border border-slate-200 hover:border-[#0B2545] hover:bg-slate-50 text-xs text-left transition flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-slate-900 block">Rohan Sharma</span>
                    <span className="text-[10px] text-[#0B2545] font-semibold uppercase">
                      Student (Has Active Issue)
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">rohan.sharma@flame.edu.in</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleLogin("ananya.verma@flame.edu.in", "Ananya Verma")}
                  className="p-2.5 rounded-xl border border-slate-200 hover:border-[#0B2545] hover:bg-slate-50 text-xs text-left transition flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-slate-900 block">Ananya Verma</span>
                    <span className="text-[10px] text-amber-700 font-semibold uppercase">
                      Student (Return Submitted)
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">ananya.verma@flame.edu.in</span>
                </button>
              </div>
            </div>

            <div className="pt-2 text-[10px] text-slate-400 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              Restricted exclusively to @flame.edu.in accounts
            </div>
          </div>
        ) : currentUser.role === "admin" ? (
          /* Role: Administrator Dashboard */
          <AdminDashboard adminUser={currentUser} />
        ) : (
          /* Role: Student Dashboard */
          <StudentDashboard user={currentUser} />
        )}
      </main>

      {/* Institutional Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-bold text-[#0B2545]">
            Department of Sports • FLAME University, Pune, India
          </p>
          <p className="text-[11px] text-slate-400">
            Official Equipment Issue &amp; Return Portal • Standard Return Deadline: 11:00 PM IST Daily
          </p>
        </div>
      </footer>
    </div>
  );
}
