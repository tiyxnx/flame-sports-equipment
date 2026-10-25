"use client";

import React, { useState } from "react";
import { User } from "@/types";
import { QrCode, LogOut, ChevronDown, Check } from "lucide-react";
import QrCodeModal from "./QrCodeModal";

interface HeaderProps {
  currentUser: User | null;
  onSwitchUser: (email: string) => void;
  onLogout: () => void;
}

export default function Header({ currentUser, onSwitchUser, onLogout }: HeaderProps) {
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [showSwitchMenu, setShowSwitchMenu] = useState<boolean>(false);

  const sampleAccounts = [
    { email: "asmi.malushte@flame.edu.in", name: "Asmi Malushte", role: "admin", note: "Sports Administrator" },
    { email: "rohan.sharma@flame.edu.in", name: "Rohan Sharma", role: "student", note: "Student (Issued Badminton #3)" },
    { email: "ananya.verma@flame.edu.in", name: "Ananya Verma", role: "student", note: "Student (Return Submitted #2)" },
    { email: "kabir.patel@flame.edu.in", name: "Kabir Patel", role: "student", note: "Student (Overdue Basketball #1)" },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0B2545] text-white shadow-md border-b-2 border-red-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & University Title */}
          <div className="flex items-center gap-3">
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

          {/* Right Action Area */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Counter QR Code Poster Button */}
            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition"
              title="Show equipment room counter QR code"
            >
              <QrCode className="w-4 h-4 text-red-400" />
              <span className="hidden sm:inline">Room QR</span>
            </button>

            {/* User Profile / Quick Switcher */}
            {currentUser && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSwitchMenu(!showSwitchMenu)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition border border-white/10"
                >
                  <div className="text-left hidden sm:block">
                    <span className="block font-bold leading-none">{currentUser.name}</span>
                    <span className="text-[10px] text-red-300 font-semibold uppercase">
                      {currentUser.role === "admin" ? "Sports Administrator" : "FLAME Student"}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
                </button>

                {/* Dropdown Menu */}
                {showSwitchMenu && (
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white shadow-2xl border border-slate-200 py-2 text-slate-800 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Active Account
                      </span>
                      <p className="font-bold text-slate-900">{currentUser.name}</p>
                      <p className="text-[11px] text-slate-500 font-mono truncate">{currentUser.email}</p>
                    </div>

                    <div className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Quick Demo Switch
                    </div>

                    <div className="divide-y divide-slate-50">
                      {sampleAccounts.map((acc) => {
                        const isCurrent = currentUser.email.toLowerCase() === acc.email.toLowerCase();
                        return (
                          <button
                            key={acc.email}
                            type="button"
                            onClick={() => {
                              onSwitchUser(acc.email);
                              setShowSwitchMenu(false);
                            }}
                            className={`w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center justify-between transition ${
                              isCurrent ? "bg-red-50/50" : ""
                            }`}
                          >
                            <div>
                              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                {acc.name}
                                {acc.role === "admin" && (
                                  <span className="px-1.5 py-0.2 bg-red-100 text-red-800 text-[9px] font-bold rounded">
                                    ADMIN
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 block">{acc.note}</span>
                            </div>
                            {isCurrent && <Check className="w-4 h-4 text-red-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-1 mt-1 border-t border-slate-100 px-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowSwitchMenu(false);
                          onLogout();
                        }}
                        className="w-full px-3 py-2 text-left rounded-xl hover:bg-red-50 text-red-700 font-semibold flex items-center gap-2 transition"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
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
