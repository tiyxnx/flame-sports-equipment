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
} from "@/types";
import { getReturnDeadlineForDate, getLiabilityDisclaimer } from "../date-utils";

export const INITIAL_USERS: User[] = [
  {
    id: "usr-admin-1",
    email: "asmi.malushte@flame.edu.in",
    name: "Asmi Malushte",
    role: "admin",
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    last_login_at: new Date().toISOString(),
  },
  {
    id: "usr-student-1",
    email: "rohan.sharma@flame.edu.in",
    name: "Rohan Sharma",
    role: "student",
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    last_login_at: new Date().toISOString(),
  },
  {
    id: "usr-student-2",
    email: "ananya.verma@flame.edu.in",
    name: "Ananya Verma",
    role: "student",
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    last_login_at: new Date().toISOString(),
  },
  {
    id: "usr-student-3",
    email: "kabir.patel@flame.edu.in",
    name: "Kabir Patel",
    role: "student",
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    last_login_at: new Date().toISOString(),
  },
];

export const INITIAL_SPORTS: Sport[] = [
  { id: "s-badminton", name: "Badminton", is_active: true, created_at: new Date().toISOString() },
  { id: "s-cricket", name: "Cricket", is_active: true, created_at: new Date().toISOString() },
  { id: "s-football", name: "Football", is_active: true, created_at: new Date().toISOString() },
  { id: "s-basketball", name: "Basketball", is_active: true, created_at: new Date().toISOString() },
  { id: "s-volleyball", name: "Volleyball", is_active: true, created_at: new Date().toISOString() },
  { id: "s-tennis", name: "Tennis", is_active: true, created_at: new Date().toISOString() },
  { id: "s-pickleball", name: "Pickleball", is_active: true, created_at: new Date().toISOString() },
  { id: "s-padel", name: "Padel", is_active: true, created_at: new Date().toISOString() },
  { id: "s-squash", name: "Squash", is_active: true, created_at: new Date().toISOString() },
  { id: "s-table-tennis", name: "Table Tennis", is_active: true, created_at: new Date().toISOString() },
  { id: "s-throwball", name: "Throwball", is_active: true, created_at: new Date().toISOString() },
];

export const INITIAL_EQUIPMENT_TYPES: EquipmentType[] = [
  { id: "eq-badminton-racket", sport_id: "s-badminton", name: "Racket", is_active: true, created_at: new Date().toISOString() },
  { id: "eq-cricket-bat", sport_id: "s-cricket", name: "English Willow Bat", is_active: true, created_at: new Date().toISOString() },
  { id: "eq-cricket-ball", sport_id: "s-cricket", name: "Leather Match Ball", is_active: true, created_at: new Date().toISOString() },
  { id: "eq-cricket-stumps", sport_id: "s-cricket", name: "Stumps Set", is_active: true, created_at: new Date().toISOString() },
  { id: "eq-football-ball", sport_id: "s-football", name: "Match Football (Size 5)", is_active: true, created_at: new Date().toISOString() },
  { id: "eq-basketball-ball", sport_id: "s-basketball", name: "Composite Basketball (Size 7)", is_active: true, created_at: new Date().toISOString() },
  { id: "eq-volleyball-ball", sport_id: "s-volleyball", name: "Match Volleyball", is_active: true, created_at: new Date().toISOString() },
  { id: "eq-tennis-racket", sport_id: "s-tennis", name: "Graphite Tennis Racket", is_active: true, created_at: new Date().toISOString() },
  { id: "eq-pickleball-paddle", sport_id: "s-pickleball", name: "Pickleball Paddle", is_active: true, created_at: new Date().toISOString() },
  { id: "eq-padel-racket", sport_id: "s-padel", name: "Carbon Padel Racket", is_active: true, created_at: new Date().toISOString() },
  { id: "eq-squash-racket", sport_id: "s-squash", name: "Squash Racket", is_active: true, created_at: new Date().toISOString() },
  { id: "eq-tt-paddle", sport_id: "s-table-tennis", name: "Table Tennis Paddle", is_active: true, created_at: new Date().toISOString() },
  { id: "eq-throwball-ball", sport_id: "s-throwball", name: "Match Throwball", is_active: true, created_at: new Date().toISOString() },
];

export function generateInitialInventory(): InventoryItem[] {
  const items: InventoryItem[] = [];
  const now = new Date().toISOString();

  // Helper to add items
  const addItems = (
    sportId: string,
    sportName: string,
    eqTypeId: string,
    eqName: string,
    prefix: string,
    count: number,
    statusOverride?: { [key: number]: InventoryItem["status"] }
  ) => {
    for (let i = 1; i <= count; i++) {
      const numStr = `#${i}`;
      const status = statusOverride && statusOverride[i] ? statusOverride[i] : "available";
      items.push({
        id: `item-${sportId}-${prefix}-${i}`,
        sport_id: sportId,
        equipment_type_id: eqTypeId,
        equipment_number: numStr,
        status,
        sport_name: sportName,
        equipment_type_name: eqName,
        created_at: now,
        updated_at: now,
      });
    }
  };

  // Badminton Rackets: #1 to #12. #3 is currently issued, #9 is available, #12 is damaged
  addItems("s-badminton", "Badminton", "eq-badminton-racket", "Racket", "rkt", 12, {
    3: "issued",
    12: "damaged",
  });

  // Cricket Bats: #1 to #8
  addItems("s-cricket", "Cricket", "eq-cricket-bat", "English Willow Bat", "bat", 8);

  // Footballs: #1 to #8. #2 is return_submitted awaiting physical check
  addItems("s-football", "Football", "eq-football-ball", "Match Football (Size 5)", "ball", 8, {
    2: "return_submitted",
  });

  // Basketballs: #1 to #8. #1 is overdue
  addItems("s-basketball", "Basketball", "eq-basketball-ball", "Composite Basketball (Size 7)", "ball", 8, {
    1: "issued",
  });

  // Volleyballs: #1 to #6
  addItems("s-volleyball", "Volleyball", "eq-volleyball-ball", "Match Volleyball", "ball", 6);

  // Tennis Rackets: #1 to #6
  addItems("s-tennis", "Tennis", "eq-tennis-racket", "Graphite Tennis Racket", "rkt", 6);

  // Pickleball Paddles: #1 to #8
  addItems("s-pickleball", "Pickleball", "eq-pickleball-paddle", "Pickleball Paddle", "pdl", 8);

  // Padel Rackets: #1 to #6
  addItems("s-padel", "Padel", "eq-padel-racket", "Carbon Padel Racket", "rkt", 6);

  // Squash Rackets: #1 to #6
  addItems("s-squash", "Squash", "eq-squash-racket", "Squash Racket", "rkt", 6);

  // TT Paddles: #1 to #10
  addItems("s-table-tennis", "Table Tennis", "eq-tt-paddle", "Table Tennis Paddle", "pdl", 10);

  return items;
}

export const INITIAL_ISSUES: EquipmentIssue[] = [
  // 1. Rohan Sharma currently has Badminton Racket #3 issued
  {
    id: "issue-live-1",
    user_id: "usr-student-1",
    user_email: "rohan.sharma@flame.edu.in",
    user_name: "Rohan Sharma",
    inventory_item_id: "item-s-badminton-rkt-3",
    sport_id: "s-badminton",
    sport_name: "Badminton",
    equipment_type_id: "eq-badminton-racket",
    equipment_type_name: "Racket",
    equipment_number: "#3",
    issue_timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
    due_timestamp: getReturnDeadlineForDate(new Date()),
    return_acknowledgement: true,
    status: "issued",
    damage_reported: false,
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  // 2. Ananya Verma has submitted return for Football #2 with camera photo, pending admin verification
  {
    id: "issue-live-2",
    user_id: "usr-student-2",
    user_email: "ananya.verma@flame.edu.in",
    user_name: "Ananya Verma",
    inventory_item_id: "item-s-football-ball-2",
    sport_id: "s-football",
    sport_name: "Football",
    equipment_type_id: "eq-football-ball",
    equipment_type_name: "Match Football (Size 5)",
    equipment_number: "#2",
    issue_timestamp: new Date(Date.now() - 4 * 3600000).toISOString(),
    due_timestamp: getReturnDeadlineForDate(new Date()),
    return_submitted_at: new Date(Date.now() - 30 * 60000).toISOString(),
    return_acknowledgement: true,
    return_photo_url: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=400&q=80",
    student_notes: "Placed carefully on rack A3 in equipment room.",
    status: "return_submitted",
    damage_reported: false,
    created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 60000).toISOString(),
  },
  // 3. Kabir Patel has an overdue Basketball #1
  {
    id: "issue-live-3",
    user_id: "usr-student-3",
    user_email: "kabir.patel@flame.edu.in",
    user_name: "Kabir Patel",
    inventory_item_id: "item-s-basketball-ball-1",
    sport_id: "s-basketball",
    sport_name: "Basketball",
    equipment_type_id: "eq-basketball-ball",
    equipment_type_name: "Composite Basketball (Size 7)",
    equipment_number: "#1",
    issue_timestamp: new Date(Date.now() - 28 * 3600000).toISOString(),
    due_timestamp: new Date(Date.now() - 4 * 3600000).toISOString(), // Missed deadline
    return_acknowledgement: true,
    status: "overdue",
    damage_reported: false,
    created_at: new Date(Date.now() - 28 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
  // 4. Historical issue: Badminton Racket #9 returned successfully
  {
    id: "issue-hist-1",
    user_id: "usr-student-1",
    user_email: "rohan.sharma@flame.edu.in",
    user_name: "Rohan Sharma",
    inventory_item_id: "item-s-badminton-rkt-9",
    sport_id: "s-badminton",
    sport_name: "Badminton",
    equipment_type_id: "eq-badminton-racket",
    equipment_type_name: "Racket",
    equipment_number: "#9",
    issue_timestamp: new Date(Date.now() - 48 * 3600000).toISOString(),
    due_timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
    return_submitted_at: new Date(Date.now() - 46 * 3600000).toISOString(),
    physical_returned_at: new Date(Date.now() - 45 * 3600000).toISOString(),
    confirmed_by_admin_id: "usr-admin-1",
    confirmed_by_admin_email: "asmi.malushte@flame.edu.in",
    return_acknowledgement: true,
    return_photo_url: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=400&q=80",
    status: "returned",
    damage_reported: false,
    created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 45 * 3600000).toISOString(),
  },
];

export const INITIAL_DAMAGE_REPORTS: DamageReport[] = [
  {
    id: "dmg-1",
    inventory_item_id: "item-s-badminton-rkt-12",
    equipment_number: "#12",
    sport_name: "Badminton",
    equipment_type_name: "Racket",
    reporting_admin_id: "usr-admin-1",
    reporting_admin_email: "asmi.malushte@flame.edu.in",
    description: "Strings snapped near top rim and frame cracked during inter-house practice.",
    report_timestamp: new Date(Date.now() - 86400000).toISOString(),
    resolution_status: "pending",
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: "audit-1",
    actor_id: "usr-admin-1",
    actor_email: "asmi.malushte@flame.edu.in",
    event_type: "SYSTEM_INITIALIZED",
    record_id: "system",
    record_type: "inventory",
    timestamp: new Date(Date.now() - 30 * 86400000).toISOString(),
    metadata: { note: "FLAME Digital Sports Equipment Room initialised with verified inventory." },
  },
  {
    id: "audit-2",
    actor_id: "usr-admin-1",
    actor_email: "asmi.malushte@flame.edu.in",
    event_type: "PHYSICAL_RETURN_CONFIRMED",
    record_id: "issue-hist-1",
    record_type: "equipment_issue",
    timestamp: new Date(Date.now() - 45 * 3600000).toISOString(),
    metadata: {
      equipment: "Badminton Racket #9",
      student: "rohan.sharma@flame.edu.in",
      outcome: "Item verified intact and returned to circulation.",
    },
  },
];
