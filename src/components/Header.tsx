"use client";

import React, { useState } from "react";
import { User } from "@/types";
import { QrCode, LogOut } from "lucide-react";
import QrCodeModal from "./QrCodeModal";

interface HeaderProps {
  currentUser: User | null;
  onLogout: () => void;
}

export default function Header({ currentUser, onLogout }: HeaderProps) {
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

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

            {/* User Profile & Logout */}
            {currentUser && (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <span className="block font-bold leading-none text-xs text-white">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-red-300 font-semibold uppercase">
                    {currentUser.role === "admin" ? "Administrator" : "Student"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-red-600/80 text-white text-xs font-semibold transition border border-white/10"
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
