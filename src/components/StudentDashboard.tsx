"use client";

import React, { useState, useEffect, useCallback } from "react";
import { User, EquipmentIssue } from "@/types";
import { formatIstDateTime } from "@/lib/date-utils";
import IssueModal from "./IssueModal";
import ReturnModal from "./ReturnModal";
import {
  Clock,
  ArrowUpRight,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface StudentDashboardProps {
  user: User;
}

export default function StudentDashboard({ user }: StudentDashboardProps) {
  const [activeIssue, setActiveIssue] = useState<EquipmentIssue | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showIssueModal, setShowIssueModal] = useState<boolean>(false);
  const [showReturnModal, setShowReturnModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchActiveIssue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/issues/active?userId=${encodeURIComponent(user.id)}&userEmail=${encodeURIComponent(user.email)}`);
      const data = await res.json();
      if (res.ok && data.activeIssue) {
        setActiveIssue(data.activeIssue);
      } else {
        setActiveIssue(null);
      }
    } catch {
      setActiveIssue(null);
    } finally {
      setLoading(false);
    }
  }, [user.id, user.email]);

  // Full Real-time Sync + 10s auto-refresh fallback
  useEffect(() => {
    fetchActiveIssue();

    const channel = supabase
      .channel(`student-sync-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "equipment_issues" },
        () => {
          fetchActiveIssue();
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      fetchActiveIssue();
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user.id, fetchActiveIssue]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleIssueSuccess = () => {
    setShowIssueModal(false);
    showToast("Equipment issued successfully! An email summary has been sent to your FLAME address.");
    fetchActiveIssue();
  };

  const handleReturnSuccess = () => {
    setShowReturnModal(false);
    showToast("Return submitted! Physical confirmation by the sports handler is pending.");
    fetchActiveIssue();
  };

  const isReturnSubmitted = activeIssue?.status === "return_submitted";
  const isOverdue = activeIssue?.status === "overdue";
  const isNotReturned = activeIssue?.status === "not_returned";

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xl shadow-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs font-medium">{toastMessage}</div>
        </div>
      )}

      {/* Student Greeting Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-red-600">
              FLAME University Student
            </span>
            <h2 className="text-xl font-bold text-[#0B2545]">{user.name}</h2>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                fetchActiveIssue();
                showToast("Equipment status refreshed.");
              }}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
              title="Refresh status"
            >
              <RotateCcw className={`w-4 h-4 ${loading ? "animate-spin text-red-600" : ""}`} />
            </button>
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-700 font-bold flex items-center justify-center border border-red-100 text-base">
              {user.name.charAt(0)}
            </div>
          </div>
        </div>
      </div>

      {/* Main Action Area */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400 text-xs">
          Loading current equipment status...
        </div>
      ) : activeIssue ? (
        /* CASE B: Student has an active issue -> Only "Return Equipment" or Pending Verification Status */
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-[11px] font-semibold uppercase text-slate-400">
                Current Equipment Issue
              </span>
              <h3 className="text-lg font-bold text-slate-900">
                {activeIssue.sport_name} — {activeIssue.equipment_type_name}
              </h3>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-red-600">
                {activeIssue.equipment_number}
              </span>
              <span className="block text-[10px] text-slate-400 font-medium">Item Number</span>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-slate-400 block text-[11px]">Issued At</span>
              <span className="font-semibold text-slate-800">
                {formatIstDateTime(activeIssue.issue_timestamp)}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-slate-400 block text-[11px]">Return Deadline</span>
              <span className="font-semibold text-red-700 flex items-center gap-1 mt-0.5">
                <Clock className="w-3.5 h-3.5" /> 11:00 PM IST Today
              </span>
            </div>
          </div>

          {/* Status Banners */}
          {isReturnSubmitted && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 space-y-1 text-xs">
              <div className="flex items-center gap-2 font-bold text-sm text-[#0B2545]">
                <Clock className="w-4 h-4 text-blue-600" />
                Return Submitted — Pending Handler Verification
              </div>
              <p className="text-blue-800 text-[11px] leading-relaxed">
                Your return request has been submitted with photo evidence. The equipment room handler will physically verify the equipment on the counter. You cannot issue another item until this return is confirmed.
              </p>
            </div>
          )}

          {isNotReturned && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 space-y-1 text-xs">
              <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
                <AlertOctagon className="w-4 h-4 text-amber-600" />
                Notice: Item Checked & Not Received
              </div>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                The sports equipment room handler checked the counter and shelves and could not locate this item physically. Please visit the equipment room counter immediately to resolve this discrepancy.
              </p>
            </div>
          )}

          {isOverdue && !isReturnSubmitted && (
            <div className="p-4 bg-red-50 border border-red-300 rounded-xl text-red-900 space-y-1 text-xs">
              <div className="flex items-center gap-2 font-bold text-sm text-red-800">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                Equipment Overdue (Past 11:00 PM IST)
              </div>
              <p className="text-red-700 text-[11px] leading-relaxed">
                This item has passed the return deadline. Please return the equipment to the sports equipment room immediately to avoid university liability review or fines.
              </p>
            </div>
          )}

          {/* Action Button: Return Equipment */}
          {!isReturnSubmitted ? (
            <button
              type="button"
              onClick={() => setShowReturnModal(true)}
              className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-sm active:scale-[0.99]"
            >
              <RotateCcw className="w-4 h-4" /> Return Equipment
            </button>
          ) : (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={fetchActiveIssue}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Refresh Verification Status
              </button>
            </div>
          )}

          <div className="text-center text-[11px] text-slate-400">
            University policy: Only 1 sports item may be issued at a time per student.
          </div>
        </div>
      ) : (
        /* CASE A: Student has NO active issue -> Only "Issue Equipment" */
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
            <ArrowUpRight className="w-8 h-8" />
          </div>

          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-lg font-bold text-[#0B2545]">
              No Equipment Currently Issued
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              You are eligible to borrow sports equipment. Select your sport and equipment number to begin.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowIssueModal(true)}
            className="w-full py-4 px-6 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-base active:scale-[0.99]"
          >
            <ArrowUpRight className="w-5 h-5" /> Issue Equipment
          </button>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-4 text-[11px] text-slate-400">
            <span>• Return deadline: 11:00 PM IST</span>
            <span>• 1 item limit</span>
          </div>
        </div>
      )}

      {/* Rules & Guidelines Footnote */}
      <div className="bg-slate-100/70 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-1">
        <p className="font-semibold text-slate-800 flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-red-600" />
          FLAME Sports Department Equipment Guidelines
        </p>
        <p className="text-[11px] text-slate-500">
          All equipment must be returned to the sports room counter by 11:00 PM IST on the day of issue. Inspect items before checking out. Damaged equipment will be reviewed by the Sports Committee.
        </p>
      </div>

      {/* Modals */}
      {showIssueModal && (
        <IssueModal
          user={user}
          onClose={() => setShowIssueModal(false)}
          onSuccess={handleIssueSuccess}
        />
      )}

      {showReturnModal && activeIssue && (
        <ReturnModal
          user={user}
          activeIssue={activeIssue}
          onClose={() => setShowReturnModal(false)}
          onSuccess={handleReturnSuccess}
        />
      )}
    </div>
  );
}
