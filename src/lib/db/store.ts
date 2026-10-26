import crypto from "crypto";
import {
  User,
  Sport,
  EquipmentType,
  InventoryItem,
  EquipmentIssue,
  ReturnVerificationEvent,
  DamageReport,
  NotificationLog,
  AuditLog,
  IssueStatus,
  InventoryItemStatus,
} from "@/types";
import {
  INITIAL_USERS,
  INITIAL_SPORTS,
  INITIAL_EQUIPMENT_TYPES,
  generateInitialInventory,
  INITIAL_ISSUES,
  INITIAL_DAMAGE_REPORTS,
  INITIAL_AUDIT_LOGS,
} from "./seed-data";
import { getReturnDeadlineForDate, isOverdue } from "../date-utils";
import { sendEmailNotification } from "../email-service";
import { supabase } from "../supabase/client";

const FLAME_DOMAIN = "@flame.edu.in";
export const ADMIN_EMAILS = new Set(["asmi.malushte@flame.edu.in", "tiyana.shah@flame.edu.in"]);
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.has(email.trim().toLowerCase());
}
const ADMIN_EMAIL = "asmi.malushte@flame.edu.in";
const ADMIN_UUID = "00000000-0000-0000-0000-000000000001";

function safeRun(p: PromiseLike<unknown>): void {
  Promise.resolve(p).catch(() => {});
}

class HybridDataStore {
  private users: Map<string, User> = new Map();
  private sports: Map<string, Sport> = new Map();
  private equipmentTypes: Map<string, EquipmentType> = new Map();
  private inventory: Map<string, InventoryItem> = new Map();
  private issues: Map<string, EquipmentIssue> = new Map();
  private verificationEvents: Map<string, ReturnVerificationEvent> = new Map();
  private damageReports: Map<string, DamageReport> = new Map();
  private notificationLogs: Map<string, NotificationLog> = new Map();
  private auditLogs: Map<string, AuditLog> = new Map();

  constructor() {
    this.seed();
    this.hydrateFromSupabase();
  }

  private seed() {
    INITIAL_USERS.forEach((u) => this.users.set(u.id, { ...u }));
    INITIAL_SPORTS.forEach((s) => this.sports.set(s.id, { ...s }));
    INITIAL_EQUIPMENT_TYPES.forEach((eq) => this.equipmentTypes.set(eq.id, { ...eq }));
    generateInitialInventory().forEach((item) => this.inventory.set(item.id, { ...item }));
    INITIAL_ISSUES.forEach((iss) => this.issues.set(iss.id, { ...iss }));
    INITIAL_DAMAGE_REPORTS.forEach((d) => this.damageReports.set(d.id, { ...d }));
    INITIAL_AUDIT_LOGS.forEach((a) => this.auditLogs.set(a.id, { ...a }));
  }

  // Hydrate persistent data from Supabase in background
  public async hydrateFromSupabase(): Promise<void> {
    try {
      // 1. Hydrate users
      const { data: usersData } = await supabase.from("users").select("*");
      if (usersData && usersData.length > 0) {
        usersData.forEach((u) => this.users.set(u.id, u as User));
      }

      // 2. Hydrate inventory items
      const { data: invData } = await supabase.from("inventory_items").select("*");
      if (invData && invData.length > 0) {
        invData.forEach((item) => {
          const sport = this.sports.get(item.sport_id);
          const eqType = this.equipmentTypes.get(item.equipment_type_id);
          const enriched: InventoryItem = {
            ...item,
            sport_name: sport?.name || item.sport_name || "",
            equipment_type_name: eqType?.name || item.equipment_type_name || "",
          };
          this.inventory.set(enriched.id, enriched);
        });
      }

      // 3. Hydrate equipment issues
      const { data: issuesData } = await supabase.from("equipment_issues").select("*");
      if (issuesData && issuesData.length > 0) {
        issuesData.forEach((iss) => this.issues.set(iss.id, iss as EquipmentIssue));
      }

      // 4. Hydrate damage reports
      const { data: dmgData } = await supabase.from("damage_reports").select("*");
      if (dmgData && dmgData.length > 0) {
        dmgData.forEach((d) => this.damageReports.set(d.id, d as DamageReport));
      }

      // 5. Hydrate audit logs
      const { data: auditData } = await supabase.from("audit_logs").select("*");
      if (auditData && auditData.length > 0) {
        auditData.forEach((a) => this.auditLogs.set(a.id, a as AuditLog));
      }

      // 6. Hydrate notifications
      const { data: notifData } = await supabase.from("notification_logs").select("*");
      if (notifData && notifData.length > 0) {
        notifData.forEach((n) => this.notificationLogs.set(n.id, n as NotificationLog));
      }
    } catch {
      // Graceful fallback to memory store
    }
  }

  // --- Auth & Users ---
  public authenticateUser(email: string, name?: string): { user: User; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith(FLAME_DOMAIN)) {
      return {
        user: null as unknown as User,
        error: `Access restricted. Only verified FLAME University accounts (${FLAME_DOMAIN}) are permitted.`,
      };
    }

    const isAdmin = isAdminEmail(cleanEmail);
    const role = isAdmin ? "admin" : "student";
    const now = new Date().toISOString();

    let existingUser = Array.from(this.users.values()).find(
      (u) => u.email.toLowerCase() === cleanEmail
    );

    if (!existingUser) {
      const userId = cleanEmail === "asmi.malushte@flame.edu.in"
        ? ADMIN_UUID
        : cleanEmail === "tiyana.shah@flame.edu.in"
        ? "00000000-0000-0000-0000-000000000002"
        : crypto.randomUUID();
      const newUser: User = {
        id: userId,
        email: cleanEmail,
        name: name || cleanEmail.split("@")[0].replace(".", " "),
        role,
        created_at: now,
        last_login_at: now,
      };
      this.users.set(newUser.id, newUser);
      existingUser = newUser;

      // Async persist to Supabase
      safeRun(
        supabase.from("users").upsert({
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          created_at: newUser.created_at,
          last_login_at: newUser.last_login_at,
        })
      );

      this.logAudit(newUser.id, cleanEmail, "USER_REGISTERED", newUser.id, "user", {
        role,
      });
    } else {
      existingUser.last_login_at = now;
      if (isAdmin && existingUser.role !== "admin") {
        existingUser.role = "admin";
      }
      this.users.set(existingUser.id, existingUser);

      safeRun(
        supabase
          .from("users")
          .update({ role: existingUser.role, last_login_at: now })
          .eq("id", existingUser.id)
      );
    }

    return { user: existingUser };
  }

  public getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  public getUserByEmail(email: string): User | undefined {
    const cleanEmail = email.trim().toLowerCase();
    return Array.from(this.users.values()).find(
      (u) => u.email.toLowerCase() === cleanEmail
    );
  }

  // --- Sports & Inventory ---
  public getSports(): Sport[] {
    safeRun(
      supabase.from("sports").select("*").then(({ data }) => {
        if (data && data.length > 0) {
          data.forEach((s) => this.sports.set(s.id, s as Sport));
        }
      })
    );
    return Array.from(this.sports.values()).filter((s) => s.is_active);
  }

  public getEquipmentTypes(sportId?: string): EquipmentType[] {
    safeRun(
      supabase.from("equipment_types").select("*").then(({ data }) => {
        if (data && data.length > 0) {
          data.forEach((eq) => this.equipmentTypes.set(eq.id, eq as EquipmentType));
        }
      })
    );
    const all = Array.from(this.equipmentTypes.values()).filter((eq) => eq.is_active);
    if (sportId) {
      return all.filter((eq) => eq.sport_id === sportId);
    }
    return all;
  }

  public getInventory(): InventoryItem[] {
    safeRun(
      supabase.from("inventory_items").select("*").then(({ data }) => {
        if (data && data.length > 0) {
          data.forEach((item) => {
            const sport = this.sports.get(item.sport_id);
            const eqType = this.equipmentTypes.get(item.equipment_type_id);
            const enriched: InventoryItem = {
              ...item,
              sport_name: sport?.name || item.sport_name || "",
              equipment_type_name: eqType?.name || item.equipment_type_name || "",
            };
            this.inventory.set(enriched.id, enriched);
          });
        }
      })
    );

    // Cross-reference with active issues (if an item is currently issued, it is NOT available)
    const activeIssuesByItem = new Map<string, EquipmentIssue>();
    for (const iss of this.issues.values()) {
      if (["issued", "return_submitted", "overdue", "not_returned"].includes(iss.status)) {
        activeIssuesByItem.set(iss.inventory_item_id, iss);
      }
    }

    // Cross-reference with active damage reports
    const damagedItemIds = new Set<string>();
    for (const dmg of this.damageReports.values()) {
      if (dmg.resolution_status === "pending") {
        damagedItemIds.add(dmg.inventory_item_id);
      }
    }

    return Array.from(this.inventory.values()).map((item) => {
      let realStatus = item.status;
      if (damagedItemIds.has(item.id)) {
        realStatus = "damaged";
      } else if (activeIssuesByItem.has(item.id)) {
        const active = activeIssuesByItem.get(item.id)!;
        realStatus = active.status === "return_submitted" ? "return_submitted" : "issued";
      } else if (item.status === "issued" || item.status === "return_submitted") {
        realStatus = "available";
      }

      if (item.status !== realStatus) {
        item.status = realStatus;
        this.inventory.set(item.id, item);
      }

      return {
        ...item,
        status: realStatus,
      };
    }).sort((a, b) => {
      if (a.sport_name === b.sport_name) {
        return a.equipment_number.localeCompare(b.equipment_number, undefined, { numeric: true });
      }
      return (a.sport_name || "").localeCompare(b.sport_name || "");
    });
  }

  public getAvailableItems(sportId: string, equipmentTypeId: string): InventoryItem[] {
    const inv = this.getInventory();
    return inv.filter(
      (item) =>
        item.sport_id === sportId &&
        item.equipment_type_id === equipmentTypeId &&
        item.status === "available"
    );
  }

  public addInventoryItem(params: {
    sport_id: string;
    equipment_type_id: string;
    equipment_number: string;
    admin_id: string;
  }): { item?: InventoryItem; error?: string } {
    const sport = this.sports.get(params.sport_id);
    const eqType = this.equipmentTypes.get(params.equipment_type_id);
    if (!sport || !eqType) {
      return { error: "Invalid sport or equipment type specified." };
    }

    const duplicate = Array.from(this.inventory.values()).find(
      (i) =>
        i.sport_id === params.sport_id &&
        i.equipment_type_id === params.equipment_type_id &&
        i.equipment_number.toLowerCase() === params.equipment_number.toLowerCase() &&
        i.status !== "retired"
    );

    if (duplicate) {
      return { error: `Equipment number ${params.equipment_number} already exists for this equipment type.` };
    }

    const now = new Date().toISOString();
    const newItem: InventoryItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sport_id: params.sport_id,
      equipment_type_id: params.equipment_type_id,
      equipment_number: params.equipment_number,
      status: "available",
      sport_name: sport.name,
      equipment_type_name: eqType.name,
      created_at: now,
      updated_at: now,
    };

    this.inventory.set(newItem.id, newItem);

    safeRun(
      supabase.from("inventory_items").insert({
        id: newItem.id,
        sport_id: newItem.sport_id,
        equipment_type_id: newItem.equipment_type_id,
        equipment_number: newItem.equipment_number,
        status: newItem.status,
        created_at: now,
        updated_at: now,
      })
    );

    this.logAudit(params.admin_id, ADMIN_EMAIL, "INVENTORY_ITEM_ADDED", newItem.id, "inventory_item", {
      sport: sport.name,
      equipment: eqType.name,
      number: newItem.equipment_number,
    });

    return { item: newItem };
  }

  public updateInventoryItemStatus(
    itemId: string,
    status: InventoryItemStatus,
    adminId: string,
    notes?: string
  ): { success: boolean; error?: string } {
    const item = this.inventory.get(itemId);
    if (!item) return { success: false, error: "Inventory item not found." };

    const oldStatus = item.status;
    const now = new Date().toISOString();
    item.status = status;
    item.updated_at = now;
    if (notes) item.notes = notes;
    this.inventory.set(itemId, item);

    if (status === "available") {
      for (const dmg of this.damageReports.values()) {
        if (dmg.inventory_item_id === itemId && dmg.resolution_status === "pending") {
          dmg.resolution_status = "resolved";
          dmg.resolution_notes = notes || "Cleared and restored to available by administrator.";
          this.damageReports.set(dmg.id, dmg);
          safeRun(
            supabase.from("damage_reports").update({
              resolution_status: "resolved",
              resolution_notes: dmg.resolution_notes,
            }).eq("id", dmg.id)
          );
        }
      }
    }

    safeRun(
      supabase
        .from("inventory_items")
        .update({ status, updated_at: now, notes })
        .eq("id", itemId)
    );

    this.logAudit(adminId, ADMIN_EMAIL, "INVENTORY_STATUS_CHANGED", itemId, "inventory_item", {
      from: oldStatus,
      to: status,
      notes,
    });

    return { success: true };
  }

  // --- Active Issue Check ---
  public getActiveIssueForUser(userId: string, userEmail?: string): EquipmentIssue | null {
    const activeStatuses: IssueStatus[] = ["issued", "return_submitted", "overdue", "not_returned"];
    const cleanEmail = userEmail?.trim().toLowerCase();

    // Background sync check
    if (userId || cleanEmail) {
      let query = supabase.from("equipment_issues").select("*").in("status", activeStatuses);
      if (cleanEmail && userId) {
        query = query.or(`user_id.eq.${userId},user_email.ilike.${cleanEmail}`);
      } else if (cleanEmail) {
        query = query.ilike("user_email", cleanEmail);
      } else if (userId) {
        query = query.eq("user_id", userId);
      }
      safeRun(
        query.then(({ data }) => {
          if (data && data.length > 0) {
            data.forEach((iss) => this.issues.set(iss.id, iss as EquipmentIssue));
          }
        })
      );
    }

    const found = Array.from(this.issues.values()).find(
      (iss) =>
        activeStatuses.includes(iss.status) &&
        (iss.user_id === userId || (cleanEmail && iss.user_email.toLowerCase() === cleanEmail))
    );
    return found || null;
  }

  // --- Issue Equipment (Atomic) ---
  public async issueEquipment(params: {
    userId?: string;
    userEmail?: string;
    userName?: string;
    inventoryItemId: string;
  }): Promise<{ issue?: EquipmentIssue; error?: string }> {
    const cleanEmail = (params.userEmail || "").trim().toLowerCase();
    let user = params.userId ? this.getUserById(params.userId) : undefined;
    if (!user && cleanEmail) {
      user = this.getUserByEmail(cleanEmail);
    }
    if (!user && cleanEmail.endsWith(FLAME_DOMAIN)) {
      const authRes = this.authenticateUser(cleanEmail, params.userName);
      user = authRes.user;
    }
    if (!user && params.userId) {
      try {
        const { data: su } = await supabase.from("users").select("*").eq("id", params.userId).maybeSingle();
        if (su && su.email.toLowerCase().endsWith(FLAME_DOMAIN)) {
          user = this.authenticateUser(su.email, su.name).user;
        }
      } catch {}
    }
    if (!user) {
      return { error: "User not found or unauthenticated." };
    }

    // Enforce 1 active issue rule
    const activeIssue = this.getActiveIssueForUser(user.id, user.email);
    if (activeIssue) {
      return {
        error: `Active equipment issue detected (${activeIssue.sport_name} ${activeIssue.equipment_type_name} ${activeIssue.equipment_number}). You must return your current equipment before issuing another item.`,
      };
    }

    // Enforce availability
    const item = this.inventory.get(params.inventoryItemId);
    if (!item) return { error: "Selected inventory item does not exist." };

    const isItemAlreadyIssued = Array.from(this.issues.values()).some(
      (iss) =>
        iss.inventory_item_id === params.inventoryItemId &&
        ["issued", "return_submitted", "overdue", "not_returned"].includes(iss.status)
    );
    if (isItemAlreadyIssued || item.status !== "available") {
      return { error: `Selected item is currently in use or unavailable and cannot be issued.` };
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const dueTimestamp = getReturnDeadlineForDate(now);

    const sport = this.sports.get(item.sport_id);
    const eqType = this.equipmentTypes.get(item.equipment_type_id);

    const newIssue: EquipmentIssue = {
      id: `issue-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: user.id,
      user_email: user.email,
      user_name: user.name,
      inventory_item_id: item.id,
      sport_id: item.sport_id,
      sport_name: sport?.name || item.sport_name || "Sport",
      equipment_type_id: item.equipment_type_id,
      equipment_type_name: eqType?.name || item.equipment_type_name || "Equipment",
      equipment_number: item.equipment_number,
      issue_timestamp: nowIso,
      due_timestamp: dueTimestamp,
      return_acknowledgement: true,
      status: "issued",
      damage_reported: false,
      created_at: nowIso,
      updated_at: nowIso,
    };

    item.status = "issued";
    item.updated_at = nowIso;
    this.issues.set(newIssue.id, newIssue);
    this.inventory.set(item.id, item);

    safeRun(supabase.from("equipment_issues").insert(newIssue));
    safeRun(supabase.from("inventory_items").update({ status: "issued", updated_at: nowIso }).eq("id", item.id));

    this.logAudit(user.id, user.email, "EQUIPMENT_ISSUED", newIssue.id, "equipment_issue", {
      sport: newIssue.sport_name,
      equipment: newIssue.equipment_type_name,
      number: newIssue.equipment_number,
      due: dueTimestamp,
    });

    const emailLog = await sendEmailNotification({
      type: "issue_confirmation",
      recipientEmail: user.email,
      recipientName: user.name,
      issueId: newIssue.id,
      sportName: newIssue.sport_name,
      equipmentTypeName: newIssue.equipment_type_name,
      equipmentNumber: newIssue.equipment_number,
      issueTimestamp: nowIso,
    });
    this.notificationLogs.set(emailLog.id, emailLog);

    safeRun(supabase.from("notification_logs").insert(emailLog));

    return { issue: newIssue };
  }

  // --- Student Return Submission ---
  public async submitReturn(params: {
    userId?: string;
    userEmail?: string;
    issueId: string;
    acknowledgement: boolean;
    photoUrl?: string;
    studentNotes?: string;
    damageReported?: boolean;
    damageDescription?: string;
  }): Promise<{ issue?: EquipmentIssue; error?: string }> {
    // 1. Fetch issue record first to know item and owner
    let issue = this.issues.get(params.issueId);
    if (!issue) {
      try {
        const { data } = await supabase.from("equipment_issues").select("*").eq("id", params.issueId).maybeSingle();
        if (data) {
          issue = data as EquipmentIssue;
          this.issues.set(issue.id, issue);
        }
      } catch {}
    }
    if (!issue) return { error: "Issue record not found." };

    // 2. Resolve user safely
    const cleanEmail = (params.userEmail || "").trim().toLowerCase();
    let user = params.userId ? this.getUserById(params.userId) : undefined;
    if (!user && cleanEmail) {
      user = this.getUserByEmail(cleanEmail);
    }
    if (!user && cleanEmail.endsWith(FLAME_DOMAIN)) {
      const authRes = this.authenticateUser(cleanEmail);
      user = authRes.user;
    }
    // If not found yet, but this issue belongs to this user ID or email:
    if (!user && (params.userId === issue.user_id || (cleanEmail && cleanEmail === issue.user_email.toLowerCase()))) {
      user = this.authenticateUser(issue.user_email, issue.user_name).user;
    }
    // If only userId was passed and matches issue.user_id:
    if (!user && params.userId && params.userId === issue.user_id) {
      user = this.authenticateUser(issue.user_email, issue.user_name).user;
    }
    // Fallback: check Supabase users table
    if (!user && params.userId) {
      try {
        const { data: su } = await supabase.from("users").select("*").eq("id", params.userId).maybeSingle();
        if (su && su.email.toLowerCase().endsWith(FLAME_DOMAIN)) {
          user = this.authenticateUser(su.email, su.name).user;
        }
      } catch {}
    }

    if (!user) return { error: "Unauthenticated user." };

    if (issue.user_id !== user.id && issue.user_email.toLowerCase() !== user.email.toLowerCase()) {
      return { error: "Security violation: You can only return equipment issued under your own name." };
    }

    if (issue.status === "returned") {
      return { error: "This equipment issue has already been returned and confirmed." };
    }

    if (!params.acknowledgement) {
      return { error: "You must accept the mandatory condition acknowledgement before returning." };
    }

    const now = new Date().toISOString();
    issue.return_submitted_at = now;
    issue.return_acknowledgement = true;
    issue.return_photo_url = params.photoUrl || "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=400&q=80";
    issue.student_notes = params.studentNotes || null;
    issue.status = "return_submitted";
    issue.updated_at = now;

    if (params.damageReported) {
      issue.damage_reported = true;
      issue.damage_description = params.damageDescription || "Reported by student during return.";
    }

    this.issues.set(issue.id, issue);

    const item = this.inventory.get(issue.inventory_item_id);
    if (item) {
      item.status = "return_submitted";
      item.updated_at = now;
      this.inventory.set(item.id, item);
    }

    safeRun(
      supabase.from("equipment_issues").update({
        return_submitted_at: issue.return_submitted_at,
        return_acknowledgement: true,
        return_photo_url: issue.return_photo_url,
        student_notes: issue.student_notes,
        status: "return_submitted",
        damage_reported: issue.damage_reported,
        damage_description: issue.damage_description,
        updated_at: now,
      }).eq("id", issue.id)
    );

    safeRun(
      supabase.from("inventory_items").update({
        status: "return_submitted",
        updated_at: now,
      }).eq("id", issue.inventory_item_id)
    );

    this.logAudit(user.id, user.email, "RETURN_SUBMITTED", issue.id, "equipment_issue", {
      sport: issue.sport_name,
      equipment: issue.equipment_type_name,
      number: issue.equipment_number,
      hasPhoto: Boolean(params.photoUrl),
      damageReported: Boolean(params.damageReported),
    });

    const emailLog = await sendEmailNotification({
      type: "return_submitted",
      recipientEmail: user.email,
      recipientName: user.name,
      issueId: issue.id,
      sportName: issue.sport_name,
      equipmentTypeName: issue.equipment_type_name,
      equipmentNumber: issue.equipment_number,
      issueTimestamp: issue.issue_timestamp,
      returnSubmittedTimestamp: now,
      damageDescription: params.damageDescription,
    });
    this.notificationLogs.set(emailLog.id, emailLog);

    safeRun(supabase.from("notification_logs").insert(emailLog));

    return { issue };
  }

  // --- Admin Action 1: Confirm Return ---
  public confirmPhysicalReturn(params: {
    issueId: string;
    adminId: string;
    notes?: string;
  }): { issue?: EquipmentIssue; error?: string } {
    const admin = this.users.get(params.adminId) || this.getUserByEmail(ADMIN_EMAIL);
    if (!admin || admin.role !== "admin") {
      return { error: "Unauthorized: Administrator privileges required." };
    }

    const issue = this.issues.get(params.issueId);
    if (!issue) return { error: "Issue record not found." };

    if (issue.status === "returned") {
      return { error: "This return has already been confirmed." };
    }

    const now = new Date().toISOString();
    issue.status = "returned";
    issue.physical_returned_at = now;
    issue.confirmed_by_admin_id = admin.id;
    issue.confirmed_by_admin_email = admin.email;
    issue.admin_notes = params.notes || null;
    issue.updated_at = now;
    this.issues.set(issue.id, issue);

    const item = this.inventory.get(issue.inventory_item_id);
    if (item && item.status !== "damaged" && item.status !== "missing" && item.status !== "retired") {
      item.status = "available";
      item.updated_at = now;
      this.inventory.set(item.id, item);
    }

    const eventId = `verif-${Date.now()}`;
    const verifEvent: ReturnVerificationEvent = {
      id: eventId,
      issue_id: issue.id,
      inventory_item_id: issue.inventory_item_id,
      admin_id: admin.id,
      admin_email: admin.email,
      outcome: "confirmed_returned",
      verification_timestamp: now,
      notes: params.notes,
      created_at: now,
    };
    this.verificationEvents.set(eventId, verifEvent);

    safeRun(
      supabase.from("equipment_issues").update({
        status: "returned",
        physical_returned_at: now,
        confirmed_by_admin_id: admin.id,
        confirmed_by_admin_email: admin.email,
        admin_notes: issue.admin_notes,
        updated_at: now,
      }).eq("id", issue.id)
    );

    if (item && item.status !== "damaged") {
      safeRun(
        supabase.from("inventory_items").update({
          status: "available",
          updated_at: now,
        }).eq("id", issue.inventory_item_id)
      );
    }

    safeRun(supabase.from("return_verification_events").insert(verifEvent));

    this.logAudit(admin.id, admin.email, "PHYSICAL_RETURN_CONFIRMED", issue.id, "equipment_issue", {
      studentEmail: issue.user_email,
      equipment: `${issue.sport_name} ${issue.equipment_type_name} ${issue.equipment_number}`,
      notes: params.notes,
    });

    return { issue };
  }

  // --- Admin Action 2: Not Returned ---
  public markNotReturned(params: {
    issueId: string;
    adminId: string;
    notes?: string;
  }): { issue?: EquipmentIssue; error?: string } {
    const admin = this.users.get(params.adminId) || this.getUserByEmail(ADMIN_EMAIL);
    if (!admin || admin.role !== "admin") {
      return { error: "Unauthorized: Administrator privileges required." };
    }

    const issue = this.issues.get(params.issueId);
    if (!issue) return { error: "Issue record not found." };

    const now = new Date().toISOString();
    const hadOnlineSubmission = Boolean(issue.return_submitted_at);

    issue.status = "not_returned";
    issue.admin_notes = params.notes || "Item checked in equipment room but not found physically.";
    issue.updated_at = now;
    this.issues.set(issue.id, issue);

    const item = this.inventory.get(issue.inventory_item_id);
    if (item) {
      item.status = "issued";
      item.updated_at = now;
      this.inventory.set(item.id, item);
    }

    const eventId = `verif-${Date.now()}`;
    const verifEvent: ReturnVerificationEvent = {
      id: eventId,
      issue_id: issue.id,
      inventory_item_id: issue.inventory_item_id,
      admin_id: admin.id,
      admin_email: admin.email,
      outcome: "not_returned",
      verification_timestamp: now,
      notes: params.notes || "Physically checked counter and shelf; item not received.",
      created_at: now,
    };
    this.verificationEvents.set(eventId, verifEvent);

    safeRun(
      supabase.from("equipment_issues").update({
        status: "not_returned",
        admin_notes: issue.admin_notes,
        updated_at: now,
      }).eq("id", issue.id)
    );

    safeRun(supabase.from("return_verification_events").insert(verifEvent));

    this.logAudit(admin.id, admin.email, "PHYSICAL_CHECK_NOT_RETURNED", issue.id, "equipment_issue", {
      studentEmail: issue.user_email,
      hadOnlineSubmission,
      notes: params.notes,
    });

    return { issue };
  }

  // --- Admin Action 3: Report Damage (Persisted) ---
  public async reportDamage(params: {
    inventoryItemId: string;
    adminId: string;
    description: string;
    photoUrl?: string;
    issueId?: string;
  }): Promise<{ report?: DamageReport; error?: string }> {
    const admin = this.users.get(params.adminId) || this.getUserByEmail(ADMIN_EMAIL);
    if (!admin || admin.role !== "admin") {
      return { error: "Unauthorized: Administrator privileges required." };
    }

    let item = this.inventory.get(params.inventoryItemId);
    if (!item) {
      try {
        const { data } = await supabase.from("inventory_items").select("*").eq("id", params.inventoryItemId).maybeSingle();
        if (data) {
          const sport = this.sports.get(data.sport_id);
          const eqType = this.equipmentTypes.get(data.equipment_type_id);
          const enriched: InventoryItem = {
            ...data,
            sport_name: sport?.name || data.sport_name || "",
            equipment_type_name: eqType?.name || data.equipment_type_name || "",
          };
          this.inventory.set(enriched.id, enriched);
          item = enriched;
        }
      } catch {}
    }
    if (!item) return { error: "Inventory item not found." };

    const now = new Date().toISOString();
    item.status = "damaged";
    item.updated_at = now;
    this.inventory.set(item.id, item);

    // Find last issue
    let issue: EquipmentIssue | undefined;
    if (params.issueId) {
      issue = this.issues.get(params.issueId);
    } else {
      issue = Array.from(this.issues.values())
        .filter((i) => i.inventory_item_id === item.id)
        .sort((a, b) => new Date(b.issue_timestamp).getTime() - new Date(a.issue_timestamp).getTime())[0];
    }

    if (issue) {
      issue.damage_reported = true;
      issue.damage_description = params.description;
      this.issues.set(issue.id, issue);
    }

    const reportId = `dmg-${Date.now()}`;
    const report: DamageReport = {
      id: reportId,
      inventory_item_id: item.id,
      equipment_number: item.equipment_number,
      sport_name: item.sport_name || "",
      equipment_type_name: item.equipment_type_name || "",
      issue_id: issue?.id || null,
      last_issuer_user_id: issue?.user_id || null,
      last_issuer_email: issue?.user_email || null,
      reporting_admin_id: admin.id,
      reporting_admin_email: admin.email,
      description: params.description,
      photo_url: params.photoUrl || null,
      report_timestamp: now,
      resolution_status: "pending",
      created_at: now,
    };
    this.damageReports.set(reportId, report);

    safeRun(supabase.from("inventory_items").update({ status: "damaged", updated_at: now }).eq("id", item.id));
    if (issue) {
      safeRun(
        supabase.from("equipment_issues").update({
          damage_reported: true,
          damage_description: params.description,
          updated_at: now,
        }).eq("id", issue.id)
      );
    }
    safeRun(supabase.from("damage_reports").insert(report));

    this.logAudit(admin.id, admin.email, "DAMAGE_REPORTED", reportId, "damage_report", {
      item: `${item.sport_name} ${item.equipment_type_name} ${item.equipment_number}`,
      lastIssuer: issue?.user_email,
      description: params.description,
    });

    if (issue?.user_email) {
      const emailLog = await sendEmailNotification({
        type: "damage_report",
        recipientEmail: issue.user_email,
        recipientName: issue.user_name,
        issueId: issue.id,
        sportName: item.sport_name || "",
        equipmentTypeName: item.equipment_type_name || "",
        equipmentNumber: item.equipment_number,
        issueTimestamp: issue.issue_timestamp,
        damageDescription: params.description,
        reportTimestamp: now,
      });
      this.notificationLogs.set(emailLog.id, emailLog);

      safeRun(supabase.from("notification_logs").insert(emailLog));
    }

    return { report };
  }

  // --- Scheduled Jobs: 10 PM Reminder ---
  public async run10PmReminders(): Promise<{ count: number; logs: NotificationLog[] }> {
    const outstandingStatuses: IssueStatus[] = ["issued", "return_submitted", "not_returned"];
    const eligibleIssues = Array.from(this.issues.values()).filter(
      (iss) => outstandingStatuses.includes(iss.status)
    );

    const dispatchedLogs: NotificationLog[] = [];

    for (const issue of eligibleIssues) {
      const alreadySent = Array.from(this.notificationLogs.values()).some(
        (n) => n.issue_id === issue.id && n.notification_type === "reminder_10pm"
      );

      if (!alreadySent) {
        const log = await sendEmailNotification({
          type: "reminder_10pm",
          recipientEmail: issue.user_email,
          recipientName: issue.user_name,
          issueId: issue.id,
          sportName: issue.sport_name,
          equipmentTypeName: issue.equipment_type_name,
          equipmentNumber: issue.equipment_number,
          issueTimestamp: issue.issue_timestamp,
        });
        this.notificationLogs.set(log.id, log);
        dispatchedLogs.push(log);

        safeRun(supabase.from("notification_logs").insert(log));
      }
    }

    return { count: dispatchedLogs.length, logs: dispatchedLogs };
  }

  // --- Scheduled Jobs: 11 PM Overdue ---
  public async run11PmOverdueJob(): Promise<{ count: number; logs: NotificationLog[] }> {
    const outstandingStatuses: IssueStatus[] = ["issued", "return_submitted", "not_returned", "overdue"];
    const eligibleIssues = Array.from(this.issues.values()).filter(
      (iss) => outstandingStatuses.includes(iss.status) && isOverdue(iss.due_timestamp)
    );

    const dispatchedLogs: NotificationLog[] = [];

    for (const issue of eligibleIssues) {
      if (issue.status !== "overdue") {
        issue.status = "overdue";
        issue.updated_at = new Date().toISOString();
        this.issues.set(issue.id, issue);

        safeRun(supabase.from("equipment_issues").update({ status: "overdue", updated_at: issue.updated_at }).eq("id", issue.id));
      }

      const alreadySent = Array.from(this.notificationLogs.values()).some(
        (n) => n.issue_id === issue.id && n.notification_type === "overdue_11pm"
      );

      if (!alreadySent) {
        const log = await sendEmailNotification({
          type: "overdue_11pm",
          recipientEmail: issue.user_email,
          recipientName: issue.user_name,
          issueId: issue.id,
          sportName: issue.sport_name,
          equipmentTypeName: issue.equipment_type_name,
          equipmentNumber: issue.equipment_number,
          issueTimestamp: issue.issue_timestamp,
        });
        this.notificationLogs.set(log.id, log);
        dispatchedLogs.push(log);

        try {
          await supabase.from("notification_logs").insert(log);
        } catch {}
      }
    }

    return { count: dispatchedLogs.length, logs: dispatchedLogs };
  }

  // --- Queries ---
  public getAllIssues(): EquipmentIssue[] {
    safeRun(
      supabase.from("equipment_issues").select("*").then(({ data }) => {
        if (data && data.length > 0) {
          data.forEach((iss) => this.issues.set(iss.id, iss as EquipmentIssue));
        }
      })
    );
    return Array.from(this.issues.values()).sort(
      (a, b) => new Date(b.issue_timestamp).getTime() - new Date(a.issue_timestamp).getTime()
    );
  }

  public getDamageReports(): DamageReport[] {
    safeRun(
      supabase.from("damage_reports").select("*").then(({ data }) => {
        if (data && data.length > 0) {
          data.forEach((d) => this.damageReports.set(d.id, d as DamageReport));
        }
      })
    );
    return Array.from(this.damageReports.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  public getAuditLogs(): AuditLog[] {
    safeRun(
      supabase.from("audit_logs").select("*").then(({ data }) => {
        if (data && data.length > 0) {
          data.forEach((a) => this.auditLogs.set(a.id, a as AuditLog));
        }
      })
    );
    return Array.from(this.auditLogs.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  public getNotificationLogs(): NotificationLog[] {
    safeRun(
      supabase.from("notification_logs").select("*").then(({ data }) => {
        if (data && data.length > 0) {
          data.forEach((n) => this.notificationLogs.set(n.id, n as NotificationLog));
        }
      })
    );
    return Array.from(this.notificationLogs.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  public getVerificationEvents(): ReturnVerificationEvent[] {
    safeRun(
      supabase.from("return_verification_events").select("*").then(({ data }) => {
        if (data && data.length > 0) {
          data.forEach((v) => this.verificationEvents.set(v.id, v as ReturnVerificationEvent));
        }
      })
    );
    return Array.from(this.verificationEvents.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  private logAudit(
    actorId: string,
    actorEmail: string,
    eventType: string,
    recordId: string,
    recordType: string,
    metadata: Record<string, unknown>
  ) {
    const id = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const log: AuditLog = {
      id,
      actor_id: actorId,
      actor_email: actorEmail,
      event_type: eventType,
      record_id: recordId,
      record_type: recordType,
      timestamp: new Date().toISOString(),
      metadata,
    };
    this.auditLogs.set(id, log);

    safeRun(supabase.from("audit_logs").insert(log));
  }
}

// Global persistent instance in Node environment
const globalForStore = global as unknown as { flameStore: HybridDataStore };
export const dbStore = globalForStore.flameStore || new HybridDataStore();
if (process.env.NODE_ENV !== "production") globalForStore.flameStore = dbStore;
