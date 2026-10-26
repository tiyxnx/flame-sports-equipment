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
  History,
  Calendar,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface StudentDashboardProps {
  user: User;
}

export default function StudentDashboard({ user }: StudentDashboardProps) {
  const [activeIssue, setActiveIssue] = useState<EquipmentIssue | null>(null);
  const [historyIssues, setHistoryIssues] = useState<EquipmentIssue[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [showIssueModal, setShowIssueModal] = useState<boolean>(false);
  const [showReturnModal, setShowReturnModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchActiveIssue = useCallback(async () => {
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

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/issues/history?userId=${encodeURIComponent(user.id)}&userEmail=${encodeURIComponent(user.email)}`);
      const data = await res.json();
      if (res.ok && data.issues) {
        setHistoryIssues(data.issues);
      }
    } catch {} finally {
      setHistoryLoading(false);
    }
  }, [user.id, user.email]);

  // Full Real-time Sync + 10s auto-refresh fallback
  useEffect(() => {
    fetchActiveIssue();
    fetchHistory();

    const channel = supabase
      .channel(`student-sync-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "equipment_issues" },
        () => {
          fetchActiveIssue();
          fetchHistory();
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      fetchActiveIssue();
      fetchHistory();
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user.id, fetchActiveIssue, fetchHistory]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleIssueSuccess = (newIssue?: EquipmentIssue) => {
    setShowIssueModal(false);
    // Instant zero-lag state update: locks out booking another item immediately
    if (newIssue) {
      setActiveIssue(newIssue);
      setHistoryIssues((prev) => [newIssue, ...prev.filter((i) => i.id !== newIssue.id)]);
    }
    showToast("Equipment issued successfully! Recorded in database and confirmation email sent.");
    fetchActiveIssue();
    fetchHistory();
  };

  const handleReturnSuccess = (updatedIssue?: EquipmentIssue) => {
    setShowReturnModal(false);
    // Instant zero-lag state update: updates status immediately
    if (updatedIssue) {
      setActiveIssue(updatedIssue);
      setHistoryIssues((prev) => [updatedIssue, ...prev.filter((i) => i.id !== updatedIssue.id)]);
    } else if (activeIssue) {
      const optimistic: EquipmentIssue = {
        ...activeIssue,
        status: "return_submitted",
        return_submitted_at: new Date().toISOString(),
      };
      setActiveIssue(optimistic);
      setHistoryIssues((prev) => [optimistic, ...prev.filter((i) => i.id !== optimistic.id)]);
    }
    showToast("Return submitted! Logged in database with timestamp. Handler verification pending.");
    fetchActiveIssue();
    fetchHistory();
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
              <span className="text-slate-400 block text-[11px]">Issued At (Recorded)</span>
              <span className="font-semibold text-slate-800">
                {formatIstDateTime(activeIssue.issue_timestamp)}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              {activeIssue.return_submitted_at ? (
                <>
                  <span className="text-slate-400 block text-[11px]">Return Submitted</span>
                  <span className="font-semibold text-blue-700">
                    {formatIstDateTime(activeIssue.return_submitted_at)}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-slate-400 block text-[11px]">Return Deadline</span>
                  <span className="font-semibold text-red-700 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5" /> 11:00 PM IST Today
                  </span>
                </>
              )}
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
                Your return request was logged at {activeIssue.return_submitted_at ? formatIstDateTime(activeIssue.return_submitted_at) : "now"}. The sports room handler will physically verify the equipment on the counter. You cannot issue another item until this return is confirmed.
              </p>
            </div>
          )}

          {isNotReturned && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 space-y-1 text-xs">
              <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
                <AlertOctagon className="w-4 h-4 text-amber-600" />
                Notice: Item Checked &amp; Not Received
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

      {/* Activity & Return Log Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-red-600" />
            <h3 className="font-bold text-sm text-[#0B2545]">My Equipment Activity &amp; Return Log</h3>
          </div>
          <button
            type="button"
            onClick={fetchHistory}
            className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 transition"
          >
            <RotateCcw className={`w-3 h-3 ${historyLoading ? "animate-spin text-red-600" : ""}`} />
            Refresh Log
          </button>
        </div>

        {historyLoading && historyIssues.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">Loading your equipment checkout records...</div>
        ) : historyIssues.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">No equipment checkout records logged yet.</div>
        ) : (
          <div className="space-y-3">
            {historyIssues.map((iss) => (
              <div
                key={iss.id}
                className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{iss.sport_name} — {iss.equipment_type_name}</span>
                    <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-extrabold text-[11px]">
                      {iss.equipment_number}
                    </span>
                  </div>
                  <div className="mt-1 space-y-0.5 text-[11px] text-slate-500">
                    <div>
                      <span className="text-slate-400">Got item at: </span>
                      <span className="font-medium text-slate-700">{formatIstDateTime(iss.issue_timestamp)}</span>
                    </div>
                    {iss.physical_returned_at ? (
                      <div>
                        <span className="text-slate-400">Returned at: </span>
                        <span className="font-semibold text-emerald-700">{formatIstDateTime(iss.physical_returned_at)}</span>
                        {iss.confirmed_by_admin_email && (
                          <span className="text-slate-400"> (Verified by {iss.confirmed_by_admin_email})</span>
                        )}
                      </div>
                    ) : iss.return_submitted_at ? (
                      <div>
                        <span className="text-slate-400">Return submitted: </span>
                        <span className="font-semibold text-blue-700">{formatIstDateTime(iss.return_submitted_at)}</span>
                        <span className="text-amber-700"> (Pending counter check)</span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-slate-400">Return deadline: </span>
                        <span className="font-semibold text-red-600">11:00 PM IST Today</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  {iss.status === "returned" && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Returned &amp; Confirmed
                    </span>
                  )}
                  {iss.status === "return_submitted" && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                      Return Pending Check
                    </span>
                  )}
                  {iss.status === "issued" && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                      Currently In Use
                    </span>
                  )}
                  {iss.status === "overdue" && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                      Overdue (Past 11 PM)
                    </span>
                  )}
                  {iss.status === "not_returned" && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      Checked &amp; Missing
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
