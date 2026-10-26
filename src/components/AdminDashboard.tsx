"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Mail,
  RotateCcw,
  ExternalLink,
  Copy,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface AdminDashboardProps {
  adminUser: User;
}

interface EmailDraftState {
  recipientEmails: string[];
  recipientNames: string[];
  subject: string;
  body: string;
  issueId?: string;
  isBatch?: boolean;
}

export default function AdminDashboard({ adminUser }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"issues" | "inventory" | "audit" | "notifications">("issues");
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [autoSync, setAutoSync] = useState<boolean>(false); // Disabled by default for manual control

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
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(true);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>("");
  const [sendEmailOnNotReturned, setSendEmailOnNotReturned] = useState<boolean>(true);

  // Email Draft Modal State (1-Click FLAME Gmail & Mailto sender)
  const [emailDraftModal, setEmailDraftModal] = useState<EmailDraftState | null>(null);
  const [editedSubject, setEditedSubject] = useState<string>("");
  const [editedBody, setEditedBody] = useState<string>("");

  // Email Test state
  const [testEmailRecipient, setTestEmailRecipient] = useState<string>("tiyanashah21@gmail.com");
  const [isSendingTestEmail, setIsSendingTestEmail] = useState<boolean>(false);

  // Inventory Add Modal
  const [showAddInventoryModal, setShowAddInventoryModal] = useState<boolean>(false);
  const [newSportId, setNewSportId] = useState<string>("s-badminton");
  const [newEqTypeId, setNewEqTypeId] = useState<string>("eq-badminton-racket");
  const [newEqNumber, setNewEqNumber] = useState<string>("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const fetchIssuesData = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) setIsRefreshing(true);
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
        setInitialLoading(false);
        if (showRefreshing) setIsRefreshing(false);
      }
    },
    [adminUser.email, searchQuery, statusFilter, sportFilter]
  );

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

  // Stable references for realtime event handlers
  const fetchIssuesRef = useRef(fetchIssuesData);
  fetchIssuesRef.current = fetchIssuesData;
  const fetchInventoryRef = useRef(fetchInventoryData);
  fetchInventoryRef.current = fetchInventoryData;
  const fetchAuditRef = useRef(fetchAuditData);
  fetchAuditRef.current = fetchAuditData;
  const fetchNotificationsRef = useRef(fetchNotificationsData);
  fetchNotificationsRef.current = fetchNotificationsData;

  // Manual & unified refresh function
  const refreshAllData = useCallback(async (isManual = false) => {
    setIsRefreshing(true);
    try {
      await Promise.allSettled([
        fetchIssuesRef.current(false),
        fetchInventoryRef.current(),
        fetchAuditRef.current(),
        fetchNotificationsRef.current(),
      ]);
      setLastSyncedTime(
        new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })
      );
      if (isManual) {
        showToast("Dashboard synchronized with live database.");
      }
    } finally {
      setIsRefreshing(false);
      setInitialLoading(false);
    }
  }, []);

  // 1. Initial Mount: Load all datasets once and establish single Realtime channel
  useEffect(() => {
    refreshAllData(false);

    const channel = supabase
      .channel("admin-realtime-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "equipment_issues" },
        () => {
          fetchIssuesRef.current(false);
          fetchInventoryRef.current();
          setLastSyncedTime(
            new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory_items" },
        () => {
          fetchInventoryRef.current();
          fetchIssuesRef.current(false);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "return_verification_events" },
        () => {
          fetchIssuesRef.current(false);
          fetchAuditRef.current();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "damage_reports" },
        () => {
          fetchInventoryRef.current();
          fetchAuditRef.current();
        }
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshAllData]);

  // 2. Fetch issues when filters change (without tearing down Realtime)
  useEffect(() => {
    fetchIssuesData(false);
  }, [fetchIssuesData]);

  // 3. User-controlled Auto-Sync: ONLY runs if the user checks 'Auto-sync'
  useEffect(() => {
    if (!autoSync) return;
    const interval = setInterval(() => {
      refreshAllData(false);
    }, 30000);
    return () => clearInterval(interval);
  }, [autoSync, refreshAllData]);

  // Manual Live Test Email Dispatcher
  const handleSendTestEmail = async () => {
    if (!testEmailRecipient.trim()) return;
    setIsSendingTestEmail(true);
    try {
      const res = await fetch("/api/admin/notifications/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminEmail: adminUser.email,
          recipientEmail: testEmailRecipient.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Test email sent! Check your inbox.");
        fetchNotificationsData();
      } else {
        showToast(data.message || data.error || "Failed to send test email.");
        fetchNotificationsData();
      }
    } catch {
      showToast("Network error dispatching test email.");
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  // 1-Click Instant Pre-Drafted Return Reminder Email
  const handleSendReminder = async (issue: EquipmentIssue) => {
    setSendingReminderId(issue.id);
    try {
      const res = await fetch("/api/admin/issues/send-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminEmail: adminUser.email,
          issueId: issue.id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Pre-drafted return reminder email dispatched to ${issue.user_email}!`);
        fetchNotificationsData();
        fetchAuditData();
      } else {
        showToast(data.error || "Failed to send reminder email.");
      }
    } catch {
      showToast("Network error dispatching reminder email.");
    } finally {
      setSendingReminderId(null);
    }
  };

  // Open Pre-Drafted Return Reminder for an Individual Issue
  const openSingleDraft = (issue: EquipmentIssue) => {
    const subject = `URGENT: Sports Equipment Return Notice — ${issue.sport_name} ${issue.equipment_type_name} ${issue.equipment_number}`;
    const body = `Dear ${issue.user_name},

This is an urgent notice from the FLAME University Sports Equipment Room regarding the equipment currently checked out under your account:

• Sport: ${issue.sport_name}
• Equipment: ${issue.equipment_type_name} ${issue.equipment_number}
• Issued At: ${formatIstDateTime(issue.issue_timestamp)}
• Mandatory Return Deadline: 11:00 PM IST Today

Our live sports equipment room records show that this item has NOT yet been returned and verified at the sports room counter.

Please return this item immediately to the sports equipment room handler before 11:00 PM IST today to avoid disciplinary holds, replacement penalties, or restrictions on your future sports checkout privileges.

If you have already deposited this equipment at the counter, please report to the equipment room handler so your physical return can be verified in the portal.

Regards,
${adminUser.name || "Sports Administrator"}
Department of Sports
FLAME University, Pune`;

    setEmailDraftModal({
      recipientEmails: [issue.user_email],
      recipientNames: [issue.user_name],
      subject,
      body,
      issueId: issue.id,
      isBatch: false,
    });
    setEditedSubject(subject);
    setEditedBody(body);
  };

  // Instant 1-Click Open in FLAME Gmail (Single Issue)
  const directOpenSingleGmail = (issue: EquipmentIssue) => {
    const subject = `URGENT: Sports Equipment Return Notice — ${issue.sport_name} ${issue.equipment_type_name} ${issue.equipment_number}`;
    const body = `Dear ${issue.user_name},

This is an urgent notice from the FLAME University Sports Equipment Room regarding the equipment currently checked out under your account:

• Sport: ${issue.sport_name}
• Equipment: ${issue.equipment_type_name} ${issue.equipment_number}
• Issued At: ${formatIstDateTime(issue.issue_timestamp)}
• Mandatory Return Deadline: 11:00 PM IST Today

Our live sports equipment room records show that this item has NOT yet been returned and verified at the sports room counter.

Please return this item immediately to the sports equipment room handler before 11:00 PM IST today to avoid disciplinary holds, replacement penalties, or restrictions on your future sports checkout privileges.

If you have already deposited this equipment at the counter, please report to the equipment room handler so your physical return can be verified in the portal.

Regards,
${adminUser.name || "Sports Administrator"}
Department of Sports
FLAME University, Pune`;

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      issue.user_email
    )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, "_blank");

    handleSendReminder(issue);
    showToast(`Draft opened in FLAME Gmail! Ready to send to ${issue.user_email}.`);
  };

  // Open Batch Pre-Drafted Email for ALL Unreturned Students Before 11 PM
  const openBatchDraft = () => {
    const unreturned = issues.filter((i) =>
      ["issued", "return_submitted", "overdue", "not_returned"].includes(i.status)
    );
    if (unreturned.length === 0) {
      showToast("No unreturned equipment items found.");
      return;
    }

    const emailMap = new Map<string, string>();
    unreturned.forEach((i) => {
      if (!emailMap.has(i.user_email)) {
        emailMap.set(i.user_email, i.user_name);
      }
    });

    const emails = Array.from(emailMap.keys());
    const names = Array.from(emailMap.values());

    const subject = `URGENT: Sports Equipment Return Notice (Mandatory Return Before 11:00 PM IST)`;
    const body = `Dear FLAME University Students,

This is an official notice from the Department of Sports regarding sports equipment currently checked out under your student account today.

MANDATORY RETURN DEADLINE: 11:00 PM IST Today

Our live sports equipment room records indicate that your checked-out sports equipment has NOT yet been returned to the equipment room counter.

Please return and deposit all issued equipment (rackets, bats, balls, etc.) at the sports equipment room counter immediately before 11:00 PM IST today.

Failure to physically return items before 11:00 PM IST will flag your account as overdue and may result in replacement charges or temporary suspension of sports room checkout privileges.

If you have already deposited your equipment at the counter, please inform the counter handler so your return is physically confirmed in the portal.

Regards,
${adminUser.name || "Sports Administrator"}
Department of Sports
FLAME University, Pune`;

    setEmailDraftModal({
      recipientEmails: emails,
      recipientNames: names,
      subject,
      body,
      isBatch: true,
    });
    setEditedSubject(subject);
    setEditedBody(body);
  };

  // Instant 1-Click Open in FLAME Gmail for ALL Unreturned Students
  const directOpenBatchGmail = () => {
    const unreturned = issues.filter((i) =>
      ["issued", "return_submitted", "overdue", "not_returned"].includes(i.status)
    );
    if (unreturned.length === 0) {
      showToast("No unreturned equipment items found.");
      return;
    }

    const emails = Array.from(new Set(unreturned.map((i) => i.user_email)));
    const subject = `URGENT: Sports Equipment Return Notice (Mandatory Return Before 11:00 PM IST)`;
    const body = `Dear FLAME University Students,

This is an official notice from the Department of Sports regarding sports equipment currently checked out under your student account today.

MANDATORY RETURN DEADLINE: 11:00 PM IST Today

Our live sports equipment room records indicate that your checked-out sports equipment has NOT yet been returned to the equipment room counter.

Please return and deposit all issued equipment (rackets, bats, balls, etc.) at the sports equipment room counter immediately before 11:00 PM IST today.

Failure to physically return items before 11:00 PM IST will flag your account as overdue and may result in replacement charges or temporary suspension of sports room checkout privileges.

If you have already deposited your equipment at the counter, please inform the counter handler so your return is physically confirmed in the portal.

Regards,
${adminUser.name || "Sports Administrator"}
Department of Sports
FLAME University, Pune`;

    // Put student recipients in BCC to protect privacy
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&bcc=${encodeURIComponent(
      emails.join(",")
    )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, "_blank");

    showToast(`Group draft opened in FLAME Gmail with ${emails.length} unreturned student(s) in BCC!`);
  };

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
      const targetIssueId = selectedIssueForAction.id;
      const res = await fetch("/api/admin/issues/not-returned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueId: targetIssueId,
          adminId: adminUser.id,
          adminEmail: adminUser.email,
          notes: actionNotes,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        if (sendEmailOnNotReturned) {
          fetch("/api/admin/issues/send-reminder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              adminEmail: adminUser.email,
              issueId: targetIssueId,
            }),
          }).catch(() => {});
        }
        showToast("Recorded as Not Returned. Outstanding issue preserved and student notice dispatched.");
        closeModal();
        fetchIssuesData();
        fetchAuditData();
        fetchNotificationsData();
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
            Logged in as {adminUser.email} ({adminUser.name || "Administrator"})
          </p>
        </div>

        {/* Quick Action Buttons & Manual Load Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Manual Load / Refresh Button */}
          <button
            type="button"
            onClick={() => refreshAllData(true)}
            disabled={isRefreshing}
            title="Manually reload latest issues and inventory from database"
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl transition border border-slate-300 shadow-xs flex items-center gap-2 active:scale-95 disabled:opacity-60"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-red-600" : "text-slate-600"}`} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh Data"}</span>
          </button>

          {/* User-controlled Auto-Sync Toggle */}
          <label
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer select-none transition"
            title="Toggle background auto-refresh every 30 seconds"
          >
            <input
              type="checkbox"
              checked={autoSync}
              onChange={(e) => {
                setAutoSync(e.target.checked);
                showToast(
                  e.target.checked
                    ? "Auto-sync enabled (refreshes every 30s)"
                    : "Auto-sync disabled. Use 'Refresh Data' button to load manually."
                );
              }}
              className="w-3.5 h-3.5 rounded text-red-600 focus:ring-red-500 border-slate-300"
            />
            <span>Auto-sync (30s)</span>
          </label>

          {/* Real-time sync badge */}
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition shadow-2xs ${
              isRealtimeConnected
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-slate-50 border-slate-200 text-slate-600"
            }`}
            title="Real-time Supabase database listener active"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>{isRealtimeConnected ? "Live" : "Offline"}</span>
            {lastSyncedTime && (
              <span className="text-[11px] text-slate-500 font-normal font-mono hidden sm:inline">
                • {lastSyncedTime}
              </span>
            )}
          </div>

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
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
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
                  <option value="unreturned_all">⚠️ All Unreturned &amp; Overdue</option>
                  <option value="issued">Currently Issued</option>
                  <option value="return_submitted">Return Submitted (Pending Check)</option>
                  <option value="overdue">Overdue (Past 11 PM)</option>
                  <option value="not_returned">Not Returned (Checked &amp; Missing)</option>
                  <option value="returned">Returned &amp; Confirmed</option>
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
                onClick={() => fetchIssuesData(true)}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition"
                title="Refresh table"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-red-600" : ""}`} />
              </button>
            </div>

            {/* Quick Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                  statusFilter === "all"
                    ? "bg-[#0B2545] text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All Issues ({issues.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("unreturned_all")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  statusFilter === "unreturned_all"
                    ? "bg-red-600 text-white shadow-2xs ring-2 ring-red-300"
                    : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Unreturned &amp; Overdue ({issues.filter((i) => ["issued", "return_submitted", "overdue", "not_returned"].includes(i.status)).length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("return_submitted")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                  statusFilter === "return_submitted"
                    ? "bg-amber-600 text-white shadow-2xs"
                    : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
                }`}
              >
                Pending Return Check ({metrics.pendingReturnConfirmations})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("issued")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                  statusFilter === "issued"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                }`}
              >
                Currently Issued ({metrics.currentlyIssued})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("returned")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                  statusFilter === "returned"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                }`}
              >
                Confirmed Returned
              </button>
            </div>
          </div>

          {/* Unreturned Alert Banner */}
          {issues.filter((i) => ["issued", "return_submitted", "overdue", "not_returned"].includes(i.status)).length > 0 && (
            <div className="mx-4 p-3.5 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs text-red-900 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-black text-red-950 text-sm">
                    {issues.filter((i) => ["issued", "return_submitted", "overdue", "not_returned"].includes(i.status)).length} Equipment Item(s) Awaiting Physical Return (Due by 11:00 PM IST)
                  </p>
                  <p className="text-[11px] text-red-700">
                    Students are required to return items before 11 PM. You can 1-click email all unreturned students directly from your FLAME Google account.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto shrink-0">
                {/* 1-Click Send Email to All Unreturned Students */}
                <button
                  type="button"
                  onClick={openBatchDraft}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs transition shadow-sm flex items-center gap-1.5 active:scale-95"
                  title="Open pre-drafted 11 PM return notice for all unreturned students in FLAME Gmail"
                >
                  <Mail className="w-3.5 h-3.5 text-white" />
                  1-Click Email All Before 11 PM
                </button>

                {/* Instant Gmail compose for all */}
                <button
                  type="button"
                  onClick={directOpenBatchGmail}
                  className="p-2 bg-white hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition shadow-xs"
                  title="Direct 1-Click: Open FLAME Gmail compose with all unreturned students in BCC"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter(statusFilter === "unreturned_all" ? "all" : "unreturned_all")}
                  className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded-xl text-xs transition shadow-xs"
                >
                  {statusFilter === "unreturned_all" ? "Show All" : "Filter List"}
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Equipment</th>
                  <th className="py-3 px-4">Issued At (Got)</th>
                  <th className="py-3 px-4">Return Time / Deadline</th>
                  <th className="py-3 px-4">Lifecycle Status</th>
                  <th className="py-3 px-4 text-center bg-slate-100/70 border-l border-slate-200">
                    Mandatory Administrative Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {initialLoading && issues.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RotateCcw className="w-5 h-5 animate-spin text-red-600" />
                        <span>Loading equipment issues...</span>
                      </div>
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
                          <span className="font-semibold text-slate-800">{formatIstDate(iss.issue_timestamp)}</span>
                          <span className="block text-[11px] text-slate-500 font-mono">
                            {formatIstTime(iss.issue_timestamp)}
                          </span>
                        </td>

                        {/* Return Time or Deadline */}
                        <td className="py-3.5 px-4">
                          {iss.physical_returned_at ? (
                            <div>
                              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Returned:</span>
                              <span className="font-semibold text-emerald-800">{formatIstDate(iss.physical_returned_at)}</span>
                              <span className="block text-[11px] text-emerald-600 font-mono">{formatIstTime(iss.physical_returned_at)}</span>
                            </div>
                          ) : iss.return_submitted_at ? (
                            <div>
                              <span className="text-[10px] uppercase font-bold text-blue-700 block">Submitted:</span>
                              <span className="font-semibold text-blue-800">{formatIstDate(iss.return_submitted_at)}</span>
                              <span className="block text-[11px] text-blue-600 font-mono">{formatIstTime(iss.return_submitted_at)}</span>
                            </div>
                          ) : (
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">Deadline:</span>
                              <span className="font-semibold text-slate-700">11:00 PM IST Today</span>
                            </div>
                          )}
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

                              {/* Action 4: Pre-Drafted Email & 1-Click FLAME Gmail Send */}
                              <div className="inline-flex items-center rounded-lg shadow-xs">
                                <button
                                  type="button"
                                  onClick={() => openSingleDraft(iss)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-l-lg text-[11px] font-bold transition"
                                  title="View pre-drafted 11 PM return notice and send via FLAME Gmail"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                  Draft / Send 11 PM Notice
                                </button>
                                <button
                                  type="button"
                                  onClick={() => directOpenSingleGmail(iss)}
                                  className="p-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-r-lg text-[11px] border-l border-blue-500 transition"
                                  title="Instant 1-Click: Open compose in FLAME Gmail now"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                              </div>
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
        <div className="space-y-4">
          {/* Email Service Status & Test Trigger */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-red-600" />
                  Live Email Notification Service
                </h3>
                <p className="text-xs text-slate-500">
                  Automated return reminders (10 PM), overdue alerts (11 PM), damage notices, and 1-click urgent notices
                </p>
              </div>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-bold text-[11px] self-start sm:self-auto flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Resend API Connected
              </span>
            </div>

            {/* Trial Sandbox explanation banner */}
            <div className="p-3.5 bg-blue-50/90 border border-blue-200 rounded-xl text-xs text-blue-950 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-blue-900">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Resend Sandbox Mode (Free Tier)</span>
              </div>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                Your Resend API key is registered to <strong>tiyanashah21@gmail.com</strong>.
                In Resend trial sandbox mode without a verified domain, all automated and manual emails are safely delivered into your developer Gmail (<strong>tiyanashah21@gmail.com</strong>) with full student headers.
              </p>
              <p className="text-[10px] text-blue-700">
                To send emails directly to all student @flame.edu.in inboxes, verify your institutional domain at{" "}
                <a
                  href="https://resend.com/domains"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-bold hover:text-blue-900"
                >
                  resend.com/domains
                </a>
                .
              </p>
            </div>

            {/* Instant Live Test Email Trigger */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Send Instant Test Email to Verify Delivery:
                </label>
                <input
                  type="email"
                  value={testEmailRecipient}
                  onChange={(e) => setTestEmailRecipient(e.target.value)}
                  placeholder="e.g. tiyanashah21@gmail.com"
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-mono text-slate-800"
                />
              </div>
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={isSendingTestEmail || !testEmailRecipient.trim()}
                className="self-end sm:self-auto px-4 py-2.5 bg-[#0B2545] hover:bg-[#133966] text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-2 disabled:opacity-50 shrink-0"
              >
                <Send className={`w-3.5 h-3.5 ${isSendingTestEmail ? "animate-spin" : ""}`} />
                {isSendingTestEmail ? "Dispatching..." : "Send Test Email"}
              </button>
            </div>
          </div>

          {/* Outbox List */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-4">
            <div className="p-4 bg-slate-50/70 border-b border-slate-200 text-xs flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900">Automated Email Outbox</h3>
                <p className="text-slate-500">
                  Chronological history of all return reminders, notices, and test dispatches
                </p>
              </div>
              <button
                type="button"
                onClick={() => fetchNotificationsData()}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
              >
                Refresh Outbox
              </button>
            </div>

            <div className="p-4 divide-y divide-slate-100 space-y-3">
              {notifications.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  No notification emails dispatched yet. Click &quot;Send Test Email&quot; above to verify delivery!
                </p>
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
                        <span>
                          To: <strong className="text-slate-800 font-semibold">{notif.recipient_email}</strong>
                        </span>
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
                          <span
                            className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded-full border border-amber-200 uppercase"
                            title="Add RESEND_API_KEY to send directly to Gmail"
                          >
                            Logged in Outbox
                          </span>
                        )}
                      </div>
                      {notif.error_message && (
                        <p className="text-[11px] text-emerald-700 bg-emerald-50/80 border border-emerald-200 p-2 rounded-lg font-medium">
                          {notif.error_message}
                        </p>
                      )}
                      <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 whitespace-pre-line text-[11px]">
                        {notif.body}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
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

            <label className="flex items-center gap-2.5 text-xs text-amber-950 font-semibold cursor-pointer select-none bg-amber-50/70 p-3 rounded-xl border border-amber-200">
              <input
                type="checkbox"
                checked={sendEmailOnNotReturned}
                onChange={(e) => setSendEmailOnNotReturned(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
              />
              <span>Also dispatch pre-drafted unreturned notice email to student immediately</span>
            </label>

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

      {/* ACTION MODAL 4: Pre-Drafted Email Modal (Single & Batch 11 PM Return Notice) */}
      {emailDraftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-[#0B2545] font-black text-base">
                <Mail className="w-5 h-5 text-red-600" />
                {emailDraftModal.isBatch
                  ? `Pre-Drafted 11 PM Return Notice for All Unreturned Students (${emailDraftModal.recipientEmails.length})`
                  : `Pre-Drafted 11 PM Return Notice: ${emailDraftModal.recipientNames[0] || "Student"}`}
              </div>
              <button
                type="button"
                onClick={() => setEmailDraftModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Sender and Domain Notice */}
            <div className="p-3.5 bg-blue-50/90 border border-blue-200 rounded-xl text-xs text-blue-950 space-y-1">
              <div className="flex items-center justify-between">
                <span>
                  <strong>Sending From:</strong> {adminUser.email} (Official FLAME Google Account)
                </span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold text-[10px] rounded-full">
                  FLAME Internal Delivery
                </span>
              </div>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                Opening in FLAME Gmail dispatches directly from your authenticated @flame.edu.in account to students within FLAME University, completely bypassing external email restrictions.
              </p>
            </div>

            {/* Recipient(s) List */}
            <div className="text-xs space-y-1">
              <label className="font-bold text-slate-700 block">
                {emailDraftModal.isBatch ? "Recipients (BCC to protect student privacy):" : "Recipient Student:"}
              </label>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {emailDraftModal.recipientEmails.map((email, idx) => (
                  <span
                    key={email}
                    className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-[11px] font-mono text-slate-700 shadow-2xs"
                  >
                    {emailDraftModal.recipientNames[idx] ? `${emailDraftModal.recipientNames[idx]} <${email}>` : email}
                  </span>
                ))}
              </div>
            </div>

            {/* Subject Field */}
            <div className="text-xs space-y-1">
              <label className="font-bold text-slate-700 block">Email Subject:</label>
              <input
                type="text"
                value={editedSubject}
                onChange={(e) => setEditedSubject(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* Message Body Field */}
            <div className="text-xs space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700">Pre-Drafted Message Body (Editable):</label>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`Subject: ${editedSubject}\n\n${editedBody}`);
                    showToast("Draft copied to clipboard!");
                  }}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy Text
                </button>
              </div>
              <textarea
                rows={9}
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEmailDraftModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition text-center"
              >
                Close
              </button>

              <div className="flex flex-wrap items-center gap-2">
                {/* Mailto link */}
                <a
                  href={`mailto:${emailDraftModal.recipientEmails.join(",")}?subject=${encodeURIComponent(
                    editedSubject
                  )}&body=${encodeURIComponent(editedBody)}`}
                  onClick={() => {
                    if (emailDraftModal.issueId) {
                      const targetIssue = issues.find((i) => i.id === emailDraftModal.issueId);
                      if (targetIssue) handleSendReminder(targetIssue);
                    }
                    showToast("Opened in default mail app.");
                    setEmailDraftModal(null);
                  }}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Default Mail App
                </a>

                {/* Primary 1-Click Send via FLAME Gmail */}
                <button
                  type="button"
                  onClick={() => {
                    const recipientParam = emailDraftModal.isBatch
                      ? `bcc=${encodeURIComponent(emailDraftModal.recipientEmails.join(","))}`
                      : `to=${encodeURIComponent(emailDraftModal.recipientEmails.join(","))}`;
                    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&${recipientParam}&su=${encodeURIComponent(
                      editedSubject
                    )}&body=${encodeURIComponent(editedBody)}`;
                    window.open(gmailUrl, "_blank");

                    if (emailDraftModal.issueId) {
                      const targetIssue = issues.find((i) => i.id === emailDraftModal.issueId);
                      if (targetIssue) handleSendReminder(targetIssue);
                    }

                    showToast(
                      `Draft opened in FLAME Gmail! Ready to send from ${adminUser.email} in 1 click.`
                    );
                    setEmailDraftModal(null);
                  }}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl transition shadow-sm flex items-center gap-2 active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  Send via FLAME Gmail (1-Click)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
