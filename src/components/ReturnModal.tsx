"use client";

import React, { useState } from "react";
import { EquipmentIssue, User } from "@/types";
import { formatIstDateTime } from "@/lib/date-utils";
import CameraCapture from "./CameraCapture";
import { X, Check, AlertCircle, AlertTriangle, ShieldAlert } from "lucide-react";

interface ReturnModalProps {
  user: User;
  activeIssue: EquipmentIssue;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReturnModal({ user, activeIssue, onClose, onSuccess }: ReturnModalProps) {
  const [acknowledgement, setAcknowledgement] = useState<boolean>(false);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [hasDamage, setHasDamage] = useState<boolean>(false);
  const [damageDescription, setDamageDescription] = useState<string>("");
  const [studentNotes, setStudentNotes] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmitReturn = async () => {
    if (!acknowledgement) {
      setError("Please check the mandatory return acknowledgement box before submitting.");
      return;
    }

    if (hasDamage && !damageDescription.trim()) {
      setError("Please provide a brief description of the observed damage or wear.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/issues/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.email,
          issueId: activeIssue.id,
          acknowledgement,
          photoUrl: photoUrl || undefined,
          studentNotes: studentNotes || undefined,
          damageReported: hasDamage,
          damageDescription: hasDamage ? damageDescription : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to submit return.");
        setLoading(false);
        return;
      }

      onSuccess();
    } catch {
      setError("A network error occurred while submitting your return.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#0B2545] text-white flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-red-400">
              Equipment Return
            </span>
            <h3 className="text-lg font-bold">
              Return {activeIssue.sport_name} {activeIssue.equipment_type_name} {activeIssue.equipment_number}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="flex items-start gap-3 p-3.5 bg-red-50 text-red-800 border border-red-200 rounded-xl text-sm">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Notice</p>
                <p className="text-xs text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Current Issue Overview Card */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                Currently Issued Item
              </span>
              <span className="px-2 py-0.5 bg-blue-100 text-[#0B2545] font-semibold rounded-md">
                Active Issue
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-slate-800 font-medium">
              <div>
                <span className="text-slate-400 block text-[11px]">Sport</span>
                <span className="text-slate-900 font-bold">{activeIssue.sport_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Equipment & Number</span>
                <span className="text-red-700 font-extrabold">
                  {activeIssue.equipment_type_name} {activeIssue.equipment_number}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Issued At</span>
                <span className="text-slate-700">{formatIstDateTime(activeIssue.issue_timestamp)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Return Deadline</span>
                <span className="text-slate-700 font-semibold">11:00 PM IST Today</span>
              </div>
            </div>
          </div>

          {/* Camera Capture Component */}
          <div className="space-y-2">
            <CameraCapture
              onPhotoCaptured={(url) => setPhotoUrl(url)}
              photoUrl={photoUrl}
            />
          </div>

          {/* Separate Damage Disclosure Path (Section 7.1) */}
          <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-2.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasDamage}
                onChange={(e) => setHasDamage(e.target.checked)}
                className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                Report wear, tear, or damage with this return
              </span>
            </label>

            {hasDamage && (
              <div className="pt-2 animate-in fade-in duration-150">
                <textarea
                  value={damageDescription}
                  onChange={(e) => setDamageDescription(e.target.value)}
                  placeholder="Describe any damage, broken strings, crack, puncture, or issue with this item..."
                  rows={2}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-800"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Disclosing damage helps the sports committee inspect and maintain safe equipment for all students.
                </p>
              </div>
            )}
          </div>

          {/* Mandatory Return Acknowledgement Checkbox (Section 7.1) */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acknowledgement}
                onChange={(e) => setAcknowledgement(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-[#0B2545] rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-800 leading-snug">
                I confirm that I am returning the same equipment issued under my name and that I have checked its condition. I acknowledge that any damage or discrepancy may be reviewed by the Department of Sports.
              </span>
            </label>
          </div>

          {/* Notice about physical confirmation */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px]">
              Submitting records your return online with photo proof. The sports equipment room handler will physically verify the equipment on the counter to complete your return.
            </p>
          </div>

          {/* Submit Return Button */}
          <button
            type="button"
            onClick={handleSubmitReturn}
            disabled={!acknowledgement || loading}
            className="w-full py-3 px-4 bg-[#0B2545] hover:bg-[#133966] disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-sm disabled:cursor-not-allowed"
          >
            {loading ? (
              "Recording Return..."
            ) : (
              <>
                <Check className="w-4 h-4 text-red-400" /> Complete Return Submission
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
