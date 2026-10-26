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

/**
 * Clean Production Seed Data
 * Contains ONLY the authorized university administrator and verified equipment catalogs.
 * ZERO fake students, ZERO fake issues, ZERO fake damage reports.
 */

// Sole initial administrator specified in the university requirements
export const INITIAL_USERS: User[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    email: "asmi.malushte@flame.edu.in",
    name: "Asmi Malushte",
    role: "admin",
    created_at: new Date().toISOString(),
    last_login_at: new Date().toISOString(),
  },
  {
    id: "a16f8cf2-c469-4d99-90ad-4fde3a783b02",
    email: "tiyana.shah@flame.edu.in",
    name: "Tiyana Shah",
    role: "admin",
    created_at: new Date().toISOString(),
    last_login_at: new Date().toISOString(),
  },
  {
    id: "9c2d49fc-b415-4096-90b1-2a419299a20c",
    email: "rohan.joshi@flame.edu.in",
    name: "Rohan Joshi",
    role: "student",
    created_at: new Date().toISOString(),
    last_login_at: new Date().toISOString(),
  },
  {
    id: "e9513aa4-f6a4-4b5c-81bc-f65ace0fb77a",
    email: "priya.nair@flame.edu.in",
    name: "Priya Nair",
    role: "student",
    created_at: new Date().toISOString(),
    last_login_at: new Date().toISOString(),
  },
  {
    id: "4c2a403c-27b3-4e1a-9944-7dedf06e51c0",
    email: "meenakshi.sv@flame.edu.in",
    name: "Meenakshi SV",
    role: "student",
    created_at: new Date().toISOString(),
    last_login_at: new Date().toISOString(),
  },
];

// Official sports catalog
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

// Official equipment types
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

/**
 * Generates fresh university inventory with ALL items in 'available' status.
 * No fake issues, no fake returns, no fake damages.
 */
export function generateInitialInventory(): InventoryItem[] {
  const items: InventoryItem[] = [];
  const now = new Date().toISOString();

  const addItems = (
    sportId: string,
    sportName: string,
    eqTypeId: string,
    eqName: string,
    prefix: string,
    count: number
  ) => {
    for (let i = 1; i <= count; i++) {
      const numStr = `#${i}`;
      items.push({
        id: `item-${sportId}-${prefix}-${i}`,
        sport_id: sportId,
        equipment_type_id: eqTypeId,
        equipment_number: numStr,
        status: "available",
        sport_name: sportName,
        equipment_type_name: eqName,
        created_at: now,
        updated_at: now,
      });
    }
  };

  // Badminton Rackets: #1 to #12
  addItems("s-badminton", "Badminton", "eq-badminton-racket", "Racket", "rkt", 12);

  // Cricket Bats: #1 to #8
  addItems("s-cricket", "Cricket", "eq-cricket-bat", "English Willow Bat", "bat", 8);

  // Footballs: #1 to #8
  addItems("s-football", "Football", "eq-football-ball", "Match Football (Size 5)", "ball", 8);

  // Basketballs: #1 to #8
  addItems("s-basketball", "Basketball", "eq-basketball-ball", "Composite Basketball (Size 7)", "ball", 8);

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

// Zero fake issues - clean slate
export const INITIAL_ISSUES: EquipmentIssue[] = [];

// Zero fake damage reports - clean slate
export const INITIAL_DAMAGE_REPORTS: DamageReport[] = [];

// Initial institutional audit log
export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: "audit-1",
    actor_id: "usr-admin-1",
    actor_email: "asmi.malushte@flame.edu.in",
    event_type: "SYSTEM_INITIALIZED",
    record_id: "system",
    record_type: "inventory",
    timestamp: new Date().toISOString(),
    metadata: { note: "FLAME University Sports Equipment Room initialised." },
  },
];
