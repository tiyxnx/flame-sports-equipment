"use client";

import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Printer, Copy, Check, QrCode } from "lucide-react";

interface QrCodeModalProps {
  onClose: () => void;
}

export default function QrCodeModal({ onClose }: QrCodeModalProps) {
  const [appUrl, setAppUrl] = useState<string>("https://flame-sports.vercel.app");
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAppUrl(window.location.origin);
    }
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Modal Top */}
        <div className="px-6 py-4 bg-[#0B2545] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-red-500" />
            <h3 className="text-base font-bold">Equipment Room Counter QR Code</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Poster Area */}
        <div id="printable-qr-sign" className="p-6 text-center space-y-4 bg-white">
          <div className="border-4 border-[#0B2545] rounded-2xl p-6 bg-slate-50 shadow-inner space-y-3">
            <div className="space-y-1">
              <span className="text-[10px] font-black tracking-widest uppercase text-red-600 block">
                FLAME UNIVERSITY, PUNE
              </span>
              <h2 className="text-lg font-black text-[#0B2545]">
                Digital Sports Equipment Room
              </h2>
              <p className="text-xs text-slate-500">
                Department of Sports • Issue &amp; Return Portal
              </p>
            </div>

            {/* QR Code */}
            <div className="flex items-center justify-center p-4 bg-white rounded-xl shadow-sm border border-slate-200 mx-auto w-fit">
              <QRCodeSVG
                value={appUrl}
                size={180}
                level="H"
                fgColor="#0B2545"
                bgColor="#FFFFFF"
              />
            </div>

            <div className="space-y-1 text-xs">
              <p className="font-bold text-slate-800">
                Scan with phone camera to Issue or Return
              </p>
              <p className="text-[11px] text-slate-500">
                Log in with your official @flame.edu.in account
              </p>
              <p className="text-[10px] text-red-700 font-bold uppercase mt-2">
                Return Deadline: 11:00 PM IST Daily
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2.5 bg-[#0B2545] hover:bg-[#133966] text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-4 h-4 text-red-400" /> Print Sign for Counter
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? "URL Copied" : "Copy URL"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
