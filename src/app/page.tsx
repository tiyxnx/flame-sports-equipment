"use client";

import React, { useState, useEffect } from "react";
import { User } from "@/types";
import Header from "@/components/Header";
import StudentDashboard from "@/components/StudentDashboard";
import AdminDashboard from "@/components/AdminDashboard";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { ShieldCheck, AlertCircle, ArrowRight, Mail } from "lucide-react";

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [inputEmail, setInputEmail] = useState<string>("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [showManualEmail, setShowManualEmail] = useState<boolean>(false);

  // Check URL parameters for OAuth callback or errors
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const errorMsg = urlParams.get("error");
      const authEmail = urlParams.get("auth_success");

      if (errorMsg) {
        setAuthError(decodeURIComponent(errorMsg));
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (authEmail) {
        handleDirectLogin(decodeURIComponent(authEmail));
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        // Restore session from localStorage
        const saved = localStorage.getItem("flame_sports_user");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setCurrentUser(parsed);
          } catch {
            localStorage.removeItem("flame_sports_user");
          }
        }
      }
    }
  }, []);

  // Direct login / sync helper
  const handleDirectLogin = async (emailToAuth: string, customName?: string) => {
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

  // Google OAuth Login Trigger
  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError(null);

    if (supabase && isSupabaseConfigured) {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
            queryParams: {
              hd: "flame.edu.in", // Restricts to FLAME domain
              prompt: "select_account",
            },
          },
        });

        if (error) {
          setAuthError(error.message);
          setIsAuthenticating(false);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Google Sign-In failed.";
        setAuthError(msg);
        setIsAuthenticating(false);
      }
    } else {
      // If Supabase keys are not yet pasted into environment variables, explain clearly
      setShowManualEmail(true);
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
    }
    setCurrentUser(null);
    localStorage.removeItem("flame_sports_user");
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header currentUser={currentUser} onLogout={handleLogout} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        {!currentUser ? (
          /* Official FLAME Landing & Login Card */
          <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-slate-200 text-center space-y-6">
            {/* University Crest Badge */}
            <div className="mx-auto w-16 h-16 rounded-2xl bg-[#C8102E] text-white font-black text-2xl flex items-center justify-center shadow-lg border-2 border-red-500">
              F
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-black tracking-widest text-[#C8102E] uppercase">
                FLAME University • Department of Sports
              </span>
              <h2 className="text-2xl font-black text-[#0B2545] tracking-tight">
                Digital Sports Equipment Room
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                Scan the equipment room QR code and sign in with your official FLAME Google account to issue or return equipment.
              </p>
            </div>

            {authError && (
              <div className="p-3.5 bg-red-50 text-red-800 border border-red-200 rounded-xl text-xs flex items-start gap-2.5 text-left">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Access Notice</strong>
                  {authError}
                </div>
              </div>
            )}

            {/* PRIMARY ACTION: Sign In with Google */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isAuthenticating}
                className="w-full py-4 px-5 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-2xl border-2 border-slate-200 hover:border-slate-300 shadow-md transition flex items-center justify-center gap-3 text-sm active:scale-[0.99] disabled:opacity-50"
              >
                {/* Official Google Icon */}
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                {isAuthenticating
                  ? "Connecting to Google..."
                  : "Sign In with Google (@flame.edu.in)"}
              </button>

              <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Restricted strictly to @flame.edu.in domain</span>
              </div>
            </div>

            {/* Or Sign in directly by typing email */}
            <div className="pt-2">
              {!showManualEmail ? (
                <button
                  type="button"
                  onClick={() => setShowManualEmail(true)}
                  className="text-xs text-slate-500 hover:text-slate-800 underline transition"
                >
                  Or enter your FLAME Email ID manually
                </button>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (inputEmail) handleDirectLogin(inputEmail);
                  }}
                  className="space-y-2 pt-2 text-left animate-in fade-in duration-150"
                >
                  <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> Enter your official FLAME Email ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      required
                      placeholder="name.surname@flame.edu.in"
                      value={inputEmail}
                      onChange={(e) => setInputEmail(e.target.value)}
                      className="flex-1 text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-800 font-mono"
                    />
                    <button
                      type="submit"
                      disabled={!inputEmail || isAuthenticating}
                      className="px-4 py-3 bg-[#0B2545] hover:bg-[#133966] text-white font-bold rounded-xl text-xs transition flex items-center gap-1 shrink-0"
                    >
                      Login <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Quick Administrator Access */}
            <div className="pt-4 border-t border-slate-100 text-left">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Sports Department Administrator
              </span>
              <button
                type="button"
                onClick={() => handleDirectLogin("asmi.malushte@flame.edu.in", "Asmi Malushte")}
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
