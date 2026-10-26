"use client";

import React, { useState } from "react";
import { User } from "@/types";
import { QrCode, LogOut, ShieldCheck, GraduationCap } from "lucide-react";
import QrCodeModal from "./QrCodeModal";
import { isAdminEmail } from "@/lib/auth-constants";

interface HeaderProps {
  currentUser: User | null;
  onLogout: () => void;
  adminViewMode?: "admin" | "student";
  onSwitchView?: (mode: "admin" | "student") => void;
}

export default function Header({
  currentUser,
  onLogout,
  adminViewMode = "admin",
  onSwitchView,
}: HeaderProps) {
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const isAdmin = currentUser
    ? currentUser.role === "admin" || isAdminEmail(currentUser.email)
    : false;

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0B2545] text-white shadow-md border-b-2 border-red-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          {/* Logo & University Title */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center font-black text-white text-base tracking-tighter shadow-sm border border-red-500">
              F
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-widest text-red-400 uppercase">
                  FLAME UNIVERSITY
                </span>
                <span className="text-[10px] text-slate-400 hidden sm:inline">• Pune, India</span>
              </div>
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight leading-none text-white">
                Digital Sports Equipment Room
              </h1>
            </div>
          </div>

          {/* Center/Right: View Switcher (Only visible to verified Administrators) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isAdmin && onSwitchView && (
              <div className="flex items-center bg-white/10 p-1 rounded-2xl border border-white/15 shadow-inner">
                <button
                  type="button"
                  onClick={() => onSwitchView("admin")}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition duration-150 ${
                    adminViewMode === "admin"
                      ? "bg-[#C8102E] text-white shadow-md ring-1 ring-red-400"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  }`}
                  title="Switch to Administrator Dashboard"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-red-200" />
                  <span className="hidden xs:inline sm:inline">Admin View</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchView("student")}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition duration-150 ${
                    adminViewMode === "student"
                      ? "bg-[#C8102E] text-white shadow-md ring-1 ring-red-400"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  }`}
                  title="Switch to Student Dashboard"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-red-200" />
                  <span className="hidden xs:inline sm:inline">Student View</span>
                </button>
              </div>
            )}

            {/* Counter QR Code Poster Button */}
            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition shrink-0"
              title="Show equipment room counter QR code"
            >
              <QrCode className="w-4 h-4 text-red-400" />
              <span className="hidden md:inline">Room QR</span>
            </button>

            {/* User Profile & Logout */}
            {currentUser && (
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <div className="text-right hidden sm:block">
                  <span className="block font-bold leading-none text-xs text-white truncate max-w-[140px]">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-red-300 font-semibold uppercase">
                    {isAdmin
                      ? adminViewMode === "student"
                        ? "Admin (Student View)"
                        : "Administrator"
                      : "Student"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/10 hover:bg-red-600/80 text-white text-xs font-semibold transition border border-white/10"
                  title="Sign out of your session"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Counter Sign Modal */}
      {showQrModal && <QrCodeModal onClose={() => setShowQrModal(false)} />}
    </>
  );
}
