export type UserRole = "student" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
  last_login_at: string;
}

export interface Sport {
  id: string;
  name: string;
  icon?: string;
  is_active: boolean;
  created_at: string;
}

export interface EquipmentType {
  id: string;
  sport_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export type InventoryItemStatus =
  | "available"
  | "issued"
  | "return_submitted"
  | "damaged"
  | "missing"
  | "retired"
  | "under_inspection";

export interface InventoryItem {
  id: string;
  sport_id: string;
  equipment_type_id: string;
  equipment_number: string;
  status: InventoryItemStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Computed / joined fields
  sport_name?: string;
  equipment_type_name?: string;
}

export type IssueStatus =
  | "issued"
  | "return_submitted"
  | "returned"
  | "overdue"
  | "not_returned";

export interface EquipmentIssue {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  inventory_item_id: string;
  sport_id: string;
  sport_name: string;
  equipment_type_id: string;
  equipment_type_name: string;
  equipment_number: string;
  issue_timestamp: string; // ISO UTC
  due_timestamp: string; // 11:00 PM IST of date
  return_submitted_at?: string | null;
  physical_returned_at?: string | null;
  confirmed_by_admin_id?: string | null;
  confirmed_by_admin_email?: string | null;
  return_acknowledgement: boolean;
  return_photo_url?: string | null;
  status: IssueStatus;
  damage_reported: boolean;
  damage_description?: string | null;
  student_notes?: string | null;
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReturnVerificationEvent {
  id: string;
  issue_id: string;
  inventory_item_id: string;
  admin_id: string;
  admin_email: string;
  outcome: "confirmed_returned" | "not_returned";
  verification_timestamp: string;
  notes?: string | null;
  photo_url?: string | null;
  created_at: string;
}

export interface DamageReport {
  id: string;
  inventory_item_id: string;
  equipment_number: string;
  sport_name: string;
  equipment_type_name: string;
  issue_id?: string | null;
  last_issuer_user_id?: string | null;
  last_issuer_email?: string | null;
  reporting_admin_id: string;
  reporting_admin_email: string;
  description: string;
  photo_url?: string | null;
  report_timestamp: string;
  resolution_status: "pending" | "resolved";
  resolution_notes?: string | null;
  created_at: string;
}

export type NotificationType =
  | "issue_confirmation"
  | "return_submitted"
  | "reminder_10pm"
  | "overdue_11pm"
  | "damage_report"
  | "admin_unreturned_reminder";

export interface NotificationLog {
  id: string;
  issue_id?: string | null;
  recipient_email: string;
  recipient_name?: string | null;
  notification_type: NotificationType;
  subject: string;
  body: string;
  scheduled_time: string;
  attempt_time: string;
  delivery_status: "sent" | "queued" | "failed";
  error_message?: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  actor_email: string;
  event_type: string;
  record_id: string;
  record_type: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}
