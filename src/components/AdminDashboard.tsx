"use client";

import React, { useState, useEffect, useCallback } from "react";
import { User, EquipmentIssue, InventoryItem, AuditLog, NotificationLog } from "@/types";
import { formatIstDate, formatIstTime, formatIstDateTime } from "@/lib/date-utils";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  Search,
  RefreshCw,
  Bell,
  History,
  Archive,
  Layers,
  Check,
  Send,
  Eye,
  Info,
} from "lucide-react";

interface AdminDashboardProps {
  adminUser: User;
}

export default function AdminDashboard({ adminUser }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"issues" | "inventory" | "audit" | "notifications">("issues");
  const [loading, setLoading] = useState<boolean>(true);

  // Issues and metrics
  const [issues, setIssues] = useState<EquipmentIssue[]>([]);
  const [metrics, setMetrics] = useState({
    totalInventory: 0,
    availableItems: 0,
    currentlyIssued: 0,
    pendingReturnConfirmations: 0,
    overdueItems: 0,
    reportedDamaged: 0,
    missingOrInspection: 0,
  });

  // Inventory, Audit, Notifications
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sportFilter, setSportFilter] = useState<string>("all");

  // Action Modals state
  const [selectedIssueForAction, setSelectedIssueForAction] = useState<EquipmentIssue | null>(null);
  const [actionType, setActionType] = useState<"confirm" | "not_returned" | "damage" | null>(null);
  const [actionNotes, setActionNotes] = useState<string>("");
  const [damageDescription, setDamageDescription] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Inventory Add Modal
  const [showAddInventoryModal, setShowAddInventoryModal] = useState<boolean>(false);
  const [newSportId, setNewSportId] = useState<string>("s-badminton");
  const [newEqTypeId, setNewEqTypeId] = useState<string>("eq-badminton-racket");
  const [newEqNumber, setNewEqNumber] = useState<string>("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const fetchIssuesData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        adminEmail: adminUser.email,
        search: searchQuery,
        status: statusFilter,
        sport: sportFilter,
      });

      const res = await fetch(`/api/admin/issues?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setIssues(data.issues || []);
        if (data.metrics) setMetrics(data.metrics);
      }
    } catch {
      showToast("Error loading equipment issues.");
    } finally {
      setLoading(false);
    }
  }, [adminUser.email, searchQuery, statusFilter, sportFilter]);

  const fetchInventoryData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/inventory?adminEmail=${adminUser.email}`);
      const data = await res.json();
      if (res.ok) setInventory(data.items || []);
    } catch {
      // ignore
    }
  }, [adminUser.email]);

  const fetchAuditData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/audit?adminEmail=${adminUser.email}`);
      const data = await res.json();
      if (res.ok) setAuditLogs(data.auditLogs || []);
    } catch {
      // ignore
    }
  }, [adminUser.email]);

  const fetchNotificationsData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/notifications?adminEmail=${adminUser.email}`);
      const data = await res.json();
      if (res.ok) setNotifications(data.notifications || []);
    } catch {
      // ignore
    }
  }, [adminUser.email]);

  useEffect(() => {
    fetchIssuesData();
    fetchInventoryData();
    fetchAuditData();
    fetchNotificationsData();
  }, [fetchIssuesData, fetchInventoryData, fetchAuditData, fetchNotificationsData]);

  // Execute Action 1: Confirm Return
  const handleConfirmReturn = async () => {
    if (!selectedIssueForAction) return;
    setActionLoading(true);

    try {
      const res = await fetch("/api/admin/issues/confirm-return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueId: selectedIssueForAction.id,
          adminId: adminUser.id,
          adminEmail: adminUser.email,
          notes: actionNotes,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast("Physical return confirmed. Active issue cleared and inventory item restored.");
        closeModal();
        fetchIssuesData();
        fetchInventoryData();
        fetchAuditData();
      } else {
        showToast(data.error || "Failed to confirm return.");
      }
    } catch {
      showToast("Network error executing confirmation.");
    } finally {
      setActionLoading(false);
    }
  };

  // Execute Action 2: Not Returned
  const handleMarkNotReturned = async () => {
    if (!selectedIssueForAction) return;
    setActionLoading(true);

    try {
      const res = await fetch("/api/admin/issues/not-returned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueId: selectedIssueForAction.id,
          adminId: adminUser.id,
          adminEmail: adminUser.email,
          notes: actionNotes,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast("Recorded as Not Returned. Item remains unavailable and issue active.");
        closeModal();
        fetchIssuesData();
        fetchAuditData();
      } else {
        showToast(data.error || "Failed to update status.");
      }
    } catch {
      showToast("Network error recording Not Returned.");
    } finally {
      setActionLoading(false);
    }
  };

  // Execute Action 3: Report Damage
  const handleReportDamage = async () => {
    if (!selectedIssueForAction) return;
    if (!damageDescription.trim()) {
      showToast("Please provide a description of the damage.");
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch("/api/admin/issues/report-damage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryItemId: selectedIssueForAction.inventory_item_id,
          issueId: selectedIssueForAction.id,
          adminId: adminUser.id,
          adminEmail: adminUser.email,
          description: damageDescription,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast("Damage report filed. Item marked damaged and notice emailed to student issuer.");
        closeModal();
        fetchIssuesData();
        fetchInventoryData();
        fetchAuditData();
        fetchNotificationsData();
      } else {
        showToast(data.error || "Failed to report damage.");
      }
    } catch {
      showToast("Network error submitting damage report.");
    } finally {
      setActionLoading(false);
    }
  };

  // Manual cron triggers
  const trigger10PmReminders = async () => {
    try {
      const res = await fetch("/api/cron/reminders", { method: "POST" });
      const data = await res.json();
      showToast(data.message || "10 PM reminder check executed.");
      fetchNotificationsData();
    } catch {
      showToast("Failed to run 10 PM reminder check.");
    }
  };

  const trigger11PmOverdue = async () => {
    try {
      const res = await fetch("/api/cron/overdue", { method: "POST" });
      const data = await res.json();
      showToast(data.message || "11 PM overdue check executed.");
      fetchIssuesData();
      fetchNotificationsData();
    } catch {
      showToast("Failed to run 11 PM overdue check.");
    }
  };

  // Add Inventory Item
  const handleAddInventory = async () => {
    if (!newEqNumber.trim()) {
      showToast("Please specify an equipment number (e.g. #13).");
      return;
    }

    try {
      const res = await fetch("/api/admin/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport_id: newSportId,
          equipment_type_id: newEqTypeId,
          equipment_number: newEqNumber.startsWith("#") ? newEqNumber : `#${newEqNumber}`,
          admin_id: adminUser.id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Item ${newEqNumber} added to inventory.`);
        setShowAddInventoryModal(false);
        setNewEqNumber("");
        fetchInventoryData();
        fetchIssuesData();
      } else {
        showToast(data.error || "Failed to add inventory item.");
      }
    } catch {
      showToast("Network error adding equipment item.");
    }
  };

  // Update Inventory Item Status (e.g. restore to available after repair)
  const handleUpdateItemStatus = async (itemId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/admin/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          status: newStatus,
          admin_id: adminUser.id,
          notes: `Status changed to ${newStatus} by administrator.`,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Item status updated to ${newStatus}.`);
        fetchInventoryData();
        fetchIssuesData();
      } else {
        showToast(data.error || "Failed to update item status.");
      }
    } catch {
      showToast("Error updating item status.");
    }
  };

  const closeModal = () => {
    setSelectedIssueForAction(null);
    setActionType(null);
    setActionNotes("");
    setDamageDescription("");
  };

  return (
    <div className="w-full space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 p-4 bg-slate-900 text-white rounded-xl shadow-2xl flex items-center gap-3 text-xs font-semibold animate-in fade-in duration-200">
          <Check className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-red-100 text-red-800 font-bold rounded-md text-[11px] uppercase tracking-wider">
              Administrator Console
            </span>
            <span className="text-xs text-slate-400">• FLAME Sports Equipment Room</span>
          </div>
          <h2 className="text-xl font-black text-[#0B2545] mt-1">
            Sports Inventory &amp; Issue Management
          </h2>
          <p className="text-xs text-slate-500">
            Logged in as {adminUser.email} (Asmi Malushte)
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={trigger10PmReminders}
            title="Test run 10 PM IST return reminder email job"
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
          >
            <Bell className="w-3.5 h-3.5 text-blue-600" /> Run 10 PM Reminder
          </button>
          <button
            type="button"
            onClick={trigger11PmOverdue}
            title="Test run 11 PM IST overdue notification email job"
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Run 11 PM Overdue
          </button>
          <button
            type="button"
            onClick={() => setShowAddInventoryModal(true)}
            className="px-4 py-2 bg-[#0B2545] hover:bg-[#133966] text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-red-400" /> Add Equipment
          </button>
        </div>
      </div>

      {/* 8.1 Overview KPI Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Items
          </span>
          <span className="text-2xl font-black text-[#0B2545]">{metrics.totalInventory}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-sm">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
            Available
          </span>
          <span className="text-2xl font-black text-emerald-700">{metrics.availableItems}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-sm">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
            Issued
          </span>
          <span className="text-2xl font-black text-blue-800">{metrics.currentlyIssued}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-300 bg-amber-50/40 shadow-sm">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
            Pending Return
          </span>
          <span className="text-2xl font-black text-amber-700">{metrics.pendingReturnConfirmations}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-red-200 bg-red-50/30 shadow-sm">
          <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider block">
            Overdue
          </span>
          <span className="text-2xl font-black text-red-600">{metrics.overdueItems}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
            Damaged
          </span>
          <span className="text-2xl font-black text-rose-700">{metrics.reportedDamaged}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Inspection/Miss
          </span>
          <span className="text-2xl font-black text-slate-600">{metrics.missingOrInspection}</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab("issues")}
          className={`pb-3 px-3 transition border-b-2 flex items-center gap-1.5 ${
            activeTab === "issues"
              ? "border-red-600 text-red-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Layers className="w-4 h-4" /> Equipment Issues &amp; Returns
          <span className="px-1.5 py-0.2 bg-slate-100 rounded-full text-[10px] font-bold">
            {issues.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("inventory")}
          className={`pb-3 px-3 transition border-b-2 flex items-center gap-1.5 ${
            activeTab === "inventory"
              ? "border-red-600 text-red-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Archive className="w-4 h-4" /> Inventory Management
          <span className="px-1.5 py-0.2 bg-slate-100 rounded-full text-[10px] font-bold">
            {inventory.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("audit")}
          className={`pb-3 px-3 transition border-b-2 flex items-center gap-1.5 ${
            activeTab === "audit"
              ? "border-red-600 text-red-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <History className="w-4 h-4" /> Audit Log &amp; Verification Trail
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("notifications")}
          className={`pb-3 px-3 transition border-b-2 flex items-center gap-1.5 ${
            activeTab === "notifications"
              ? "border-red-600 text-red-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Send className="w-4 h-4" /> Dispatched Notifications Outbox
          <span className="px-1.5 py-0.2 bg-slate-100 rounded-full text-[10px] font-bold">
            {notifications.length}
          </span>
        </button>
      </div>

      {/* TAB 1: Equipment Issues Table with 3 Mandatory Actions */}
      {activeTab === "issues" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-4">
          {/* Filters Bar */}
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 max-w-xl">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by student, email, equipment, or #number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-800"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-2 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-700 font-medium focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="issued">Currently Issued</option>
                <option value="return_submitted">Return Submitted (Pending Check)</option>
                <option value="overdue">Overdue (Past 11 PM)</option>
                <option value="not_returned">Not Returned (Checked & Missing)</option>
                <option value="returned">Returned & Confirmed</option>
              </select>

              {/* Sport Filter */}
              <select
                value={sportFilter}
                onChange={(e) => setSportFilter(e.target.value)}
                className="py-2 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-700 font-medium focus:outline-none"
              >
                <option value="all">All Sports</option>
                <option value="s-badminton">Badminton</option>
                <option value="s-football">Football</option>
                <option value="s-basketball">Basketball</option>
                <option value="s-cricket">Cricket</option>
                <option value="s-volleyball">Volleyball</option>
                <option value="s-tennis">Tennis</option>
                <option value="s-pickleball">Pickleball</option>
              </select>
            </div>

            <button
              type="button"
              onClick={fetchIssuesData}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition"
              title="Refresh table"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Equipment</th>
                  <th className="py-3 px-4">Issued At</th>
                  <th className="py-3 px-4">Deadline</th>
                  <th className="py-3 px-4">Lifecycle Status</th>
                  <th className="py-3 px-4 text-center bg-slate-100/70 border-l border-slate-200">
                    Mandatory Administrative Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Loading issues...
                    </td>
                  </tr>
                ) : issues.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No equipment issue records match your criteria.
                    </td>
                  </tr>
                ) : (
                  issues.map((iss) => {
                    const isOutstanding =
                      iss.status === "issued" ||
                      iss.status === "return_submitted" ||
                      iss.status === "overdue" ||
                      iss.status === "not_returned";

                    return (
                      <tr key={iss.id} className="hover:bg-slate-50/60 transition">
                        {/* Student */}
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{iss.user_name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">{iss.user_email}</p>
                        </td>

                        {/* Equipment */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-[#0B2545]">{iss.sport_name}</span>
                          <span className="block text-slate-600 text-[11px]">
                            {iss.equipment_type_name}{" "}
                            <span className="font-extrabold text-red-600">{iss.equipment_number}</span>
                          </span>
                        </td>

                        {/* Issued At */}
                        <td className="py-3.5 px-4 text-slate-600">
                          {formatIstDate(iss.issue_timestamp)}
                          <span className="block text-[11px] text-slate-400">
                            {formatIstTime(iss.issue_timestamp)}
                          </span>
                        </td>

                        {/* Deadline */}
                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          11:00 PM IST
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          {iss.status === "issued" && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              Issued (In Use)
                            </span>
                          )}
                          {iss.status === "return_submitted" && (
                            <div>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                                Return Submitted
                              </span>
                              <span className="block text-[10px] text-amber-700 font-normal mt-0.5">
                                Pending Physical Check
                              </span>
                            </div>
                          )}
                          {iss.status === "overdue" && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                              Overdue
                            </span>
                          )}
                          {iss.status === "not_returned" && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-orange-800 border border-orange-300">
                              Checked &amp; Missing
                            </span>
                          )}
                          {iss.status === "returned" && (
                            <div>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Confirmed Returned
                              </span>
                              <span className="block text-[10px] text-slate-400 mt-0.5">
                                Verified by {iss.confirmed_by_admin_email || "Admin"}
                              </span>
                            </div>
                          )}

                          {iss.damage_reported && (
                            <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Damage Flagged
                            </span>
                          )}
                        </td>

                        {/* 8.3 The Three Mandatory Actions */}
                        <td className="py-3.5 px-4 text-center bg-slate-50/50 border-l border-slate-200">
                          {isOutstanding ? (
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {/* Action 1: Confirm Return */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedIssueForAction(iss);
                                  setActionType("confirm");
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-sm transition"
                                title="Physically confirmed return"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Confirm Return
                              </button>

                              {/* Action 2: Not Returned */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedIssueForAction(iss);
                                  setActionType("not_returned");
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold shadow-sm transition"
                                title="Checked counter & not received"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Not Returned
                              </button>

                              {/* Action 3: Report Damage */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedIssueForAction(iss);
                                  setActionType("damage");
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-[11px] font-bold shadow-sm transition"
                                title="Report damage on this equipment"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" /> Report Damage
                              </button>
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400">
                              Resolved • No pending actions
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Inventory Management */}
      {activeTab === "inventory" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-4">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between text-xs">
            <div>
              <h3 className="font-bold text-slate-900">Physical Equipment Inventory</h3>
              <p className="text-slate-500">Every individually numbered piece of sports equipment</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddInventoryModal(true)}
              className="px-3.5 py-2 bg-[#0B2545] hover:bg-[#133966] text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add Equipment Item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Item #</th>
                  <th className="py-3 px-4">Sport</th>
                  <th className="py-3 px-4">Equipment Type</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {inventory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-black text-red-600 text-sm">
                      {item.equipment_number}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">{item.sport_name}</td>
                    <td className="py-3 px-4 text-slate-700">{item.equipment_type_name}</td>
                    <td className="py-3 px-4">
                      {item.status === "available" && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Available
                        </span>
                      )}
                      {item.status === "issued" && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Issued
                        </span>
                      )}
                      {item.status === "return_submitted" && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                          Return Submitted
                        </span>
                      )}
                      {item.status === "damaged" && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Damaged
                        </span>
                      )}
                      {item.status === "retired" && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-300">
                          Retired
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5">
                      {item.status === "damaged" || item.status === "under_inspection" ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateItemStatus(item.id, "available")}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-bold border border-emerald-300 transition"
                        >
                          Clear &amp; Restore to Available
                        </button>
                      ) : null}

                      {item.status !== "retired" && item.status !== "issued" && (
                        <button
                          type="button"
                          onClick={() => handleUpdateItemStatus(item.id, "retired")}
                          className="px-2 py-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg text-[11px] transition"
                        >
                          Retire
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Audit Trail & Verification Events */}
      {activeTab === "audit" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-4">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 text-xs">
            <h3 className="font-bold text-slate-900">Administrative Audit Trail</h3>
            <p className="text-slate-500">
              Immutable institutional record of equipment checkouts, return confirmations, missing checks, and damage reports
            </p>
          </div>

          <div className="p-4 divide-y divide-slate-100 space-y-3">
            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No audit trail records logged yet.</p>
            ) : (
              auditLogs.map((log) => {
                const meta = (log.metadata || {}) as Record<string, unknown>;
                let actionLabel = "Activity Logged";
                let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200";
                let summaryText = `Event logged by ${log.actor_email}`;
                let subText: string | undefined;

                if (log.event_type === "EQUIPMENT_ISSUED") {
                  const itemStr = `${meta.sport || ""} ${meta.equipment || ""} ${meta.number || ""}`.trim();
                  actionLabel = "Equipment Issued";
                  badgeStyle = "bg-blue-100 text-blue-800 border-blue-200";
                  summaryText = `${itemStr || "Equipment"} checked out by ${log.actor_email}`;
                  subText = "Return deadline: 11:00 PM IST today • Institutional liability disclaimer accepted";
                } else if (log.event_type === "USER_REGISTERED") {
                  const roleStr = meta.role === "admin" ? "Administrator" : "Student";
                  actionLabel = "Account Registered";
                  badgeStyle = "bg-purple-100 text-purple-800 border-purple-200";
                  summaryText = `New ${roleStr} profile registered: ${log.actor_email}`;
                  subText = "Authenticated with official @flame.edu.in institutional Google account";
                } else if (log.event_type === "SYSTEM_INITIALIZED") {
                  actionLabel = "System Initialized";
                  badgeStyle = "bg-slate-100 text-slate-700 border-slate-300";
                  summaryText = (meta.note as string) || "FLAME University Sports Equipment Room portal initialised";
                  subText = "Standard institutional equipment guidelines and 11:00 PM IST return schedule active";
                } else if (log.event_type === "RETURN_SUBMITTED") {
                  const itemStr = `${meta.sport || ""} ${meta.equipment || ""} ${meta.number || ""}`.trim();
                  const damageNote = meta.damageReported ? " (Wear or damage flagged by student)" : "";
                  actionLabel = "Return Submitted";
                  badgeStyle = "bg-amber-100 text-amber-800 border-amber-200";
                  summaryText = `Student submitted return for ${itemStr || "equipment"} with camera evidence${damageNote}`;
                  subText = "Awaiting physical verification on sports room counter by administrator";
                } else if (log.event_type === "PHYSICAL_RETURN_CONFIRMED") {
                  const itemStr = (meta.equipment as string) || "Equipment";
                  const studentStr = meta.studentEmail ? ` from ${meta.studentEmail}` : "";
                  actionLabel = "Return Confirmed";
                  badgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-200";
                  summaryText = `Admin verified ${itemStr}${studentStr} on physical shelves and marked available`;
                  subText = meta.notes ? `Admin notes: "${meta.notes}"` : "Physical condition verified clean";
                } else if (log.event_type === "PHYSICAL_CHECK_NOT_RETURNED") {
                  const itemStr = (meta.equipment as string) || "Equipment";
                  const studentStr = meta.studentEmail ? ` from ${meta.studentEmail}` : "";
                  actionLabel = "Physical Check Failed";
                  badgeStyle = "bg-red-100 text-red-800 border-red-200";
                  summaryText = `Physical check failed: ${itemStr}${studentStr} was NOT found in return area`;
                  subText = meta.notes ? `Admin notes: "${meta.notes}"` : "Item remains marked active/unreturned";
                } else if (log.event_type === "DAMAGE_REPORTED") {
                  const itemStr = (meta.item as string) || "Equipment";
                  const issuerStr = meta.lastIssuer ? ` (Last issuer: ${meta.lastIssuer})` : "";
                  actionLabel = "Damage Report Filed";
                  badgeStyle = "bg-rose-100 text-rose-800 border-rose-200";
                  summaryText = `Damage reported on ${itemStr}${issuerStr}: ${(meta.description as string) || "Damage recorded"}`;
                  subText = "Item taken out of circulation for Sports Committee review and repair";
                } else if (log.event_type === "INVENTORY_ITEM_ADDED") {
                  const itemStr = `${meta.sport || ""} ${meta.equipment || ""} ${meta.number || ""}`.trim();
                  actionLabel = "Equipment Added";
                  badgeStyle = "bg-indigo-100 text-indigo-800 border-indigo-200";
                  summaryText = `Added new physical item ${itemStr} to equipment catalog`;
                  subText = "Available immediately for student check-out";
                } else if (log.event_type === "INVENTORY_STATUS_CHANGED") {
                  actionLabel = "Status Changed";
                  badgeStyle = "bg-cyan-100 text-cyan-800 border-cyan-200";
                  summaryText = `Equipment status updated from "${meta.from || "unknown"}" to "${meta.to || "updated"}"`;
                  subText = meta.notes ? `Notes: "${meta.notes}"` : undefined;
                }

                return (
                  <div key={log.id} className="pt-3 first:pt-0 p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 text-xs space-y-1.5 transition hover:bg-slate-50">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] tracking-wide border uppercase ${badgeStyle}`}>
                          {actionLabel}
                        </span>
                        <span className="text-slate-500 text-[11px]">
                          By <strong className="text-slate-800 font-semibold">{log.actor_email}</strong>
                        </span>
                      </div>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {formatIstDateTime(log.timestamp)}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-900 text-xs">
                      {summaryText}
                    </p>
                    {subText && (
                      <p className="text-slate-500 text-[11px] leading-relaxed">
                        {subText}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Dispatched Notifications Outbox */}
      {activeTab === "notifications" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-4">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 text-xs space-y-2">
            <h3 className="font-bold text-slate-900">Automated Email Outbox</h3>
            <p className="text-slate-500">
              Dispatched 10 PM reminders, 11 PM overdue notifications, and issue/return confirmations
            </p>
            <div className="p-3 bg-blue-50/90 border border-blue-200 rounded-xl text-[11px] text-blue-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong>Live Email Delivery:</strong> All notification logs are recorded below. To deliver real emails directly into student Gmail inboxes, provide a free Resend API key in Vercel as <code className="bg-blue-100 text-blue-900 px-1 py-0.5 rounded font-mono">RESEND_API_KEY</code>.
              </div>
            </div>
          </div>

          <div className="p-4 divide-y divide-slate-100 space-y-3">
            {notifications.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No notification emails dispatched yet.</p>
            ) : (
              notifications.map((notif) => {
                const isSent = notif.delivery_status === "sent";
                const isFailed = notif.delivery_status === "failed";
                return (
                  <div key={notif.id} className="pt-3 first:pt-0 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{notif.subject}</span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatIstDateTime(notif.attempt_time)}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px] flex items-center gap-2 flex-wrap">
                      <span>To: <strong className="text-slate-800 font-semibold">{notif.recipient_email}</strong></span>
                      <span>•</span>
                      <span>Status:</span>
                      {isSent ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full border border-emerald-200 uppercase">
                          Delivered via Resend
                        </span>
                      ) : isFailed ? (
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 font-bold text-[10px] rounded-full border border-red-200 uppercase">
                          Delivery Failed
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded-full border border-amber-200 uppercase" title="Add RESEND_API_KEY to send directly to Gmail">
                          Logged in Outbox (Needs Email API Key)
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 whitespace-pre-line text-[11px]">
                      {notif.body}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ACTION MODAL 1: Confirm Return */}
      {actionType === "confirm" && selectedIssueForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-700 font-bold">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              Confirm Physical Return of Equipment
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 text-slate-800">
              <p>
                <strong>Student:</strong> {selectedIssueForAction.user_name} ({selectedIssueForAction.user_email})
              </p>
              <p>
                <strong>Equipment:</strong> {selectedIssueForAction.sport_name} — {selectedIssueForAction.equipment_type_name}{" "}
                <span className="font-black text-red-600">{selectedIssueForAction.equipment_number}</span>
              </p>
              <p>
                <strong>Issue Timestamp:</strong> {formatIstDateTime(selectedIssueForAction.issue_timestamp)}
              </p>
              {selectedIssueForAction.return_submitted_at && (
                <p>
                  <strong>Student Submission:</strong> {formatIstDateTime(selectedIssueForAction.return_submitted_at)}
                </p>
              )}
            </div>

            {/* Return Photo if submitted */}
            {selectedIssueForAction.return_photo_url && (
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-blue-600" /> Student Photographic Proof
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedIssueForAction.return_photo_url}
                  alt="Student return photo"
                  className="w-full h-44 object-cover rounded-xl border border-slate-200"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Optional Inspection / Counter Notes:
              </label>
              <input
                type="text"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="e.g., Placed back in Badminton Rack A, condition verified good."
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <p className="text-[11px] text-slate-500">
              Confirming physical return will clear the student&apos;s active issue record and restore item #{selectedIssueForAction.equipment_number} to Available.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReturn}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition"
              >
                {actionLoading ? "Confirming..." : "Confirm Physical Return"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTION MODAL 2: Not Returned */}
      {actionType === "not_returned" && selectedIssueForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-2 text-amber-700 font-bold">
              <XCircle className="w-5 h-5 text-amber-600" />
              Physically Checked &amp; Not Returned
            </div>

            {selectedIssueForAction.return_submitted_at && (
              <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-xs text-red-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block">Discrepancy Warning</strong>
                  Student submitted a return online on {formatIstDateTime(selectedIssueForAction.return_submitted_at)}, but equipment was not physically located on the counter. The student submission evidence will be preserved and flagged for sports committee follow-up.
                </div>
              </div>
            )}

            <p className="text-xs text-slate-600">
              Confirm that you inspected the sports equipment room and {selectedIssueForAction.sport_name}{" "}
              {selectedIssueForAction.equipment_type_name} {selectedIssueForAction.equipment_number} was not received.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Verification Notes:
              </label>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="e.g., Checked counter and rack; item is not present. Followed up with student."
                rows={2}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMarkNotReturned}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm transition"
              >
                {actionLoading ? "Recording..." : "Record as Not Returned"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTION MODAL 3: Report Damage */}
      {actionType === "damage" && selectedIssueForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-2 text-rose-700 font-bold">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              File Equipment Damage Report
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 text-slate-700">
              <p>
                <strong>Equipment:</strong> {selectedIssueForAction.sport_name} — {selectedIssueForAction.equipment_type_name}{" "}
                <span className="font-black text-red-600">{selectedIssueForAction.equipment_number}</span>
              </p>
              <p>
                <strong>Last Student Issuer:</strong> {selectedIssueForAction.user_name} ({selectedIssueForAction.user_email})
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Damage Description (Required):
              </label>
              <textarea
                value={damageDescription}
                onChange={(e) => setDamageDescription(e.target.value)}
                placeholder="Detail the damage observed (e.g., Frame cracked along upper left edge, broken strings, tear in leather)..."
                rows={3}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <p className="text-[11px] text-slate-500">
              An institutional notification email will be dispatched to {selectedIssueForAction.user_email} requesting coordination with the Sports Department.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReportDamage}
                disabled={actionLoading || !damageDescription.trim()}
                className="px-4 py-2 text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white rounded-lg shadow-sm transition disabled:bg-slate-300"
              >
                {actionLoading ? "Submitting..." : "Submit Damage Report"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD INVENTORY MODAL */}
      {showAddInventoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-base text-[#0B2545]">Add New Equipment Item</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Sport</label>
                <select
                  value={newSportId}
                  onChange={(e) => {
                    setNewSportId(e.target.value);
                    if (e.target.value === "s-badminton") setNewEqTypeId("eq-badminton-racket");
                    if (e.target.value === "s-football") setNewEqTypeId("eq-football-ball");
                    if (e.target.value === "s-basketball") setNewEqTypeId("eq-basketball-ball");
                    if (e.target.value === "s-cricket") setNewEqTypeId("eq-cricket-bat");
                    if (e.target.value === "s-volleyball") setNewEqTypeId("eq-volleyball-ball");
                    if (e.target.value === "s-tennis") setNewEqTypeId("eq-tennis-racket");
                    if (e.target.value === "s-pickleball") setNewEqTypeId("eq-pickleball-paddle");
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                >
                  <option value="s-badminton">Badminton</option>
                  <option value="s-football">Football</option>
                  <option value="s-basketball">Basketball</option>
                  <option value="s-cricket">Cricket</option>
                  <option value="s-volleyball">Volleyball</option>
                  <option value="s-tennis">Tennis</option>
                  <option value="s-pickleball">Pickleball</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Equipment Number (e.g. #15)</label>
                <input
                  type="text"
                  placeholder="#15"
                  value={newEqNumber}
                  onChange={(e) => setNewEqNumber(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddInventoryModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddInventory}
                className="px-4 py-2 text-xs font-bold bg-[#0B2545] hover:bg-[#133966] text-white rounded-lg transition"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
