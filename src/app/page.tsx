"use client";

import React, { useState, useEffect } from "react";
import { User } from "@/types";
import Header from "@/components/Header";
import StudentDashboard from "@/components/StudentDashboard";
import AdminDashboard from "@/components/AdminDashboard";
import { ShieldCheck, ArrowRight, AlertCircle } from "lucide-react";

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [inputEmail, setInputEmail] = useState<string>("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  // Restore authenticated session from localStorage if present
  useEffect(() => {
    const saved = localStorage.getItem("flame_sports_user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCurrentUser(parsed);
      } catch {
        localStorage.removeItem("flame_sports_user");
      }
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {!currentUser ? (
          /* Clean Official Landing Page */
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
                Sign in with your official FLAME email account to issue or return sports equipment.
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

            {/* Email Authentication Entry */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (inputEmail) handleLogin(inputEmail);
              }}
              className="space-y-3 pt-2 text-left"
            >
              <label className="text-xs font-bold text-slate-700 block">
                Sign In with your FLAME Email ID
              </label>
              <div className="space-y-2">
                <input
                  type="email"
                  required
                  placeholder="name.surname@flame.edu.in"
                  value={inputEmail}
                  onChange={(e) => setInputEmail(e.target.value)}
                  className="w-full text-xs p-3.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-800 font-mono"
                />
                <button
                  type="submit"
                  disabled={!inputEmail || isAuthenticating}
                  className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-xs"
                >
                  {isAuthenticating ? "Verifying Account..." : "Login with your FLAME Email ID"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Administrator Direct Access */}
            <div className="pt-4 border-t border-slate-100 text-left">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Sports Department Administrator
              </span>
              <button
                type="button"
                onClick={() => handleLogin("asmi.malushte@flame.edu.in", "Asmi Malushte")}
                className="w-full p-3 rounded-xl border border-slate-200 hover:border-red-600 hover:bg-red-50/50 text-xs text-left transition flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-slate-900 block">Asmi Malushte</span>
                  <span className="text-[10px] text-red-700 font-semibold uppercase">
                    Administrator Access
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">asmi.malushte@flame.edu.in</span>
              </button>
            </div>

            <div className="pt-2 text-[10px] text-slate-400 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              Restricted exclusively to verified @flame.edu.in domain accounts
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
