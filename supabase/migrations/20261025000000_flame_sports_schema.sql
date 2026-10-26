-- ====================================================================
-- FLAME University — Digital Sports Equipment Room
-- Production PostgreSQL Database Schema & Row Level Security (RLS)
-- Safe to run and re-run (idempotent)
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@flame\.edu\.in$'),
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    last_login_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (lower(email));

INSERT INTO public.users (id, email, name, role) VALUES
    ('00000000-0000-0000-0000-000000000001', 'asmi.malushte@flame.edu.in', 'Asmi Malushte', 'admin')
ON CONFLICT (email) DO UPDATE SET role = 'admin';

-- 3. Sports Table
CREATE TABLE IF NOT EXISTS public.sports (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    icon TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
ALTER TABLE public.sports ENABLE ROW LEVEL SECURITY;

-- 4. Equipment Types Table
CREATE TABLE IF NOT EXISTS public.equipment_types (
    id TEXT PRIMARY KEY,
    sport_id TEXT NOT NULL REFERENCES public.sports(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(sport_id, name)
);
ALTER TABLE public.equipment_types ENABLE ROW LEVEL SECURITY;

-- 5. Inventory Items Table
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id TEXT PRIMARY KEY,
    sport_id TEXT NOT NULL REFERENCES public.sports(id) ON DELETE RESTRICT,
    equipment_type_id TEXT NOT NULL REFERENCES public.equipment_types(id) ON DELETE RESTRICT,
    equipment_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'available' CHECK (
        status IN ('available', 'issued', 'return_submitted', 'damaged', 'missing', 'retired', 'under_inspection')
    ),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(sport_id, equipment_type_id, equipment_number)
);
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_inventory_status ON public.inventory_items(status);
CREATE INDEX IF NOT EXISTS idx_inventory_sport ON public.inventory_items(sport_id, equipment_type_id);

-- 6. Equipment Issues Table
CREATE TABLE IF NOT EXISTS public.equipment_issues (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    user_email TEXT NOT NULL,
    user_name TEXT NOT NULL,
    inventory_item_id TEXT NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
    sport_id TEXT NOT NULL REFERENCES public.sports(id) ON DELETE RESTRICT,
    sport_name TEXT NOT NULL,
    equipment_type_id TEXT NOT NULL REFERENCES public.equipment_types(id) ON DELETE RESTRICT,
    equipment_type_name TEXT NOT NULL,
    equipment_number TEXT NOT NULL,
    issue_timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    due_timestamp TIMESTAMPTZ NOT NULL,
    return_submitted_at TIMESTAMPTZ,
    physical_returned_at TIMESTAMPTZ,
    confirmed_by_admin_id UUID REFERENCES public.users(id),
    confirmed_by_admin_email TEXT,
    return_acknowledgement BOOLEAN NOT NULL DEFAULT false,
    return_photo_url TEXT,
    status TEXT NOT NULL DEFAULT 'issued' CHECK (
        status IN ('issued', 'return_submitted', 'returned', 'overdue', 'not_returned')
    ),
    damage_reported BOOLEAN NOT NULL DEFAULT false,
    damage_description TEXT,
    student_notes TEXT,
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
ALTER TABLE public.equipment_issues ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_issue_per_student
ON public.equipment_issues (user_id)
WHERE status IN ('issued', 'return_submitted', 'overdue', 'not_returned');

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_issue_per_item
ON public.equipment_issues (inventory_item_id)
WHERE status IN ('issued', 'return_submitted', 'overdue', 'not_returned');

CREATE INDEX IF NOT EXISTS idx_issues_user_id ON public.equipment_issues(user_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON public.equipment_issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_due_timestamp ON public.equipment_issues(due_timestamp);

-- 7. Return Verification Events
CREATE TABLE IF NOT EXISTS public.return_verification_events (
    id TEXT PRIMARY KEY,
    issue_id TEXT NOT NULL REFERENCES public.equipment_issues(id) ON DELETE RESTRICT,
    inventory_item_id TEXT NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
    admin_id UUID NOT NULL REFERENCES public.users(id),
    admin_email TEXT NOT NULL,
    outcome TEXT NOT NULL CHECK (outcome IN ('confirmed_returned', 'not_returned')),
    verification_timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    notes TEXT,
    photo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
ALTER TABLE public.return_verification_events ENABLE ROW LEVEL SECURITY;

-- 8. Damage Reports
CREATE TABLE IF NOT EXISTS public.damage_reports (
    id TEXT PRIMARY KEY,
    inventory_item_id TEXT NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
    equipment_number TEXT NOT NULL,
    sport_name TEXT NOT NULL,
    equipment_type_name TEXT NOT NULL,
    issue_id TEXT REFERENCES public.equipment_issues(id),
    last_issuer_user_id UUID REFERENCES public.users(id),
    last_issuer_email TEXT,
    reporting_admin_id UUID NOT NULL REFERENCES public.users(id),
    reporting_admin_email TEXT NOT NULL,
    description TEXT NOT NULL,
    photo_url TEXT,
    report_timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    resolution_status TEXT NOT NULL DEFAULT 'pending' CHECK (resolution_status IN ('pending', 'resolved')),
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
ALTER TABLE public.damage_reports ENABLE ROW LEVEL SECURITY;

-- 9. Notification Log
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id TEXT PRIMARY KEY,
    issue_id TEXT REFERENCES public.equipment_issues(id),
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    notification_type TEXT NOT NULL CHECK (
        notification_type IN ('issue_confirmation', 'return_submitted', 'reminder_10pm', 'overdue_11pm', 'damage_report')
    ),
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    scheduled_time TIMESTAMPTZ NOT NULL,
    attempt_time TIMESTAMPTZ NOT NULL,
    delivery_status TEXT NOT NULL CHECK (delivery_status IN ('sent', 'queued', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- 10. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    actor_id TEXT NOT NULL,
    actor_email TEXT NOT NULL,
    event_type TEXT NOT NULL,
    record_id TEXT NOT NULL,
    record_type TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 11. Row Level Security Policies (Disabled for Next.js Server-Side API Handler Access)
-- Security is strictly enforced server-side in Next.js API route handlers using verified Google OAuth tokens
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_issues DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.damage_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_verification_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_types DISABLE ROW LEVEL SECURITY;

-- 12. Initial Sports & Equipment Seed Data
INSERT INTO public.sports (id, name, is_active) VALUES
    ('s-badminton', 'Badminton', true),
    ('s-cricket', 'Cricket', true),
    ('s-football', 'Football', true),
    ('s-basketball', 'Basketball', true),
    ('s-volleyball', 'Volleyball', true),
    ('s-tennis', 'Tennis', true),
    ('s-pickleball', 'Pickleball', true),
    ('s-padel', 'Padel', true),
    ('s-squash', 'Squash', true),
    ('s-table-tennis', 'Table Tennis', true),
    ('s-throwball', 'Throwball', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.equipment_types (id, sport_id, name, is_active) VALUES
    ('eq-badminton-racket', 's-badminton', 'Racket', true),
    ('eq-cricket-bat', 's-cricket', 'English Willow Bat', true),
    ('eq-cricket-ball', 's-cricket', 'Leather Match Ball', true),
    ('eq-cricket-stumps', 's-cricket', 'Stumps Set', true),
    ('eq-football-ball', 's-football', 'Match Football (Size 5)', true),
    ('eq-basketball-ball', 's-basketball', 'Composite Basketball (Size 7)', true),
    ('eq-volleyball-ball', 's-volleyball', 'Match Volleyball', true),
    ('eq-tennis-racket', 's-tennis', 'Graphite Tennis Racket', true),
    ('eq-pickleball-paddle', 's-pickleball', 'Pickleball Paddle', true),
    ('eq-padel-racket', 's-padel', 'Carbon Padel Racket', true),
    ('eq-squash-racket', 's-squash', 'Squash Racket', true),
    ('eq-tt-paddle', 's-table-tennis', 'Table Tennis Paddle', true),
    ('eq-throwball-ball', 's-throwball', 'Match Throwball', true)
ON CONFLICT (id) DO NOTHING;

-- 13. Seed Individual Physical Inventory Items (All 78 Items Across All 10 Sports)
INSERT INTO public.inventory_items (id, sport_id, equipment_type_id, equipment_number, status) VALUES
    -- Badminton: 12 Rackets (#1 - #12)
    ('item-s-badminton-rkt-1', 's-badminton', 'eq-badminton-racket', '#1', 'available'),
    ('item-s-badminton-rkt-2', 's-badminton', 'eq-badminton-racket', '#2', 'available'),
    ('item-s-badminton-rkt-3', 's-badminton', 'eq-badminton-racket', '#3', 'available'),
    ('item-s-badminton-rkt-4', 's-badminton', 'eq-badminton-racket', '#4', 'available'),
    ('item-s-badminton-rkt-5', 's-badminton', 'eq-badminton-racket', '#5', 'available'),
    ('item-s-badminton-rkt-6', 's-badminton', 'eq-badminton-racket', '#6', 'available'),
    ('item-s-badminton-rkt-7', 's-badminton', 'eq-badminton-racket', '#7', 'available'),
    ('item-s-badminton-rkt-8', 's-badminton', 'eq-badminton-racket', '#8', 'available'),
    ('item-s-badminton-rkt-9', 's-badminton', 'eq-badminton-racket', '#9', 'available'),
    ('item-s-badminton-rkt-10', 's-badminton', 'eq-badminton-racket', '#10', 'available'),
    ('item-s-badminton-rkt-11', 's-badminton', 'eq-badminton-racket', '#11', 'available'),
    ('item-s-badminton-rkt-12', 's-badminton', 'eq-badminton-racket', '#12', 'available'),

    -- Cricket: 8 Bats (#1 - #8)
    ('item-s-cricket-bat-1', 's-cricket', 'eq-cricket-bat', '#1', 'available'),
    ('item-s-cricket-bat-2', 's-cricket', 'eq-cricket-bat', '#2', 'available'),
    ('item-s-cricket-bat-3', 's-cricket', 'eq-cricket-bat', '#3', 'available'),
    ('item-s-cricket-bat-4', 's-cricket', 'eq-cricket-bat', '#4', 'available'),
    ('item-s-cricket-bat-5', 's-cricket', 'eq-cricket-bat', '#5', 'available'),
    ('item-s-cricket-bat-6', 's-cricket', 'eq-cricket-bat', '#6', 'available'),
    ('item-s-cricket-bat-7', 's-cricket', 'eq-cricket-bat', '#7', 'available'),
    ('item-s-cricket-bat-8', 's-cricket', 'eq-cricket-bat', '#8', 'available'),

    -- Football: 8 Match Footballs (#1 - #8)
    ('item-s-football-ball-1', 's-football', 'eq-football-ball', '#1', 'available'),
    ('item-s-football-ball-2', 's-football', 'eq-football-ball', '#2', 'available'),
    ('item-s-football-ball-3', 's-football', 'eq-football-ball', '#3', 'available'),
    ('item-s-football-ball-4', 's-football', 'eq-football-ball', '#4', 'available'),
    ('item-s-football-ball-5', 's-football', 'eq-football-ball', '#5', 'available'),
    ('item-s-football-ball-6', 's-football', 'eq-football-ball', '#6', 'available'),
    ('item-s-football-ball-7', 's-football', 'eq-football-ball', '#7', 'available'),
    ('item-s-football-ball-8', 's-football', 'eq-football-ball', '#8', 'available'),

    -- Basketball: 8 Basketballs (#1 - #8)
    ('item-s-basketball-ball-1', 's-basketball', 'eq-basketball-ball', '#1', 'available'),
    ('item-s-basketball-ball-2', 's-basketball', 'eq-basketball-ball', '#2', 'available'),
    ('item-s-basketball-ball-3', 's-basketball', 'eq-basketball-ball', '#3', 'available'),
    ('item-s-basketball-ball-4', 's-basketball', 'eq-basketball-ball', '#4', 'available'),
    ('item-s-basketball-ball-5', 's-basketball', 'eq-basketball-ball', '#5', 'available'),
    ('item-s-basketball-ball-6', 's-basketball', 'eq-basketball-ball', '#6', 'available'),
    ('item-s-basketball-ball-7', 's-basketball', 'eq-basketball-ball', '#7', 'available'),
    ('item-s-basketball-ball-8', 's-basketball', 'eq-basketball-ball', '#8', 'available'),

    -- Volleyball: 6 Volleyballs (#1 - #6)
    ('item-s-volleyball-ball-1', 's-volleyball', 'eq-volleyball-ball', '#1', 'available'),
    ('item-s-volleyball-ball-2', 's-volleyball', 'eq-volleyball-ball', '#2', 'available'),
    ('item-s-volleyball-ball-3', 's-volleyball', 'eq-volleyball-ball', '#3', 'available'),
    ('item-s-volleyball-ball-4', 's-volleyball', 'eq-volleyball-ball', '#4', 'available'),
    ('item-s-volleyball-ball-5', 's-volleyball', 'eq-volleyball-ball', '#5', 'available'),
    ('item-s-volleyball-ball-6', 's-volleyball', 'eq-volleyball-ball', '#6', 'available'),

    -- Tennis: 6 Tennis Rackets (#1 - #6)
    ('item-s-tennis-rkt-1', 's-tennis', 'eq-tennis-racket', '#1', 'available'),
    ('item-s-tennis-rkt-2', 's-tennis', 'eq-tennis-racket', '#2', 'available'),
    ('item-s-tennis-rkt-3', 's-tennis', 'eq-tennis-racket', '#3', 'available'),
    ('item-s-tennis-rkt-4', 's-tennis', 'eq-tennis-racket', '#4', 'available'),
    ('item-s-tennis-rkt-5', 's-tennis', 'eq-tennis-racket', '#5', 'available'),
    ('item-s-tennis-rkt-6', 's-tennis', 'eq-tennis-racket', '#6', 'available'),

    -- Pickleball: 8 Pickleball Paddles (#1 - #8)
    ('item-s-pickleball-pdl-1', 's-pickleball', 'eq-pickleball-paddle', '#1', 'available'),
    ('item-s-pickleball-pdl-2', 's-pickleball', 'eq-pickleball-paddle', '#2', 'available'),
    ('item-s-pickleball-pdl-3', 's-pickleball', 'eq-pickleball-paddle', '#3', 'available'),
    ('item-s-pickleball-pdl-4', 's-pickleball', 'eq-pickleball-paddle', '#4', 'available'),
    ('item-s-pickleball-pdl-5', 's-pickleball', 'eq-pickleball-paddle', '#5', 'available'),
    ('item-s-pickleball-pdl-6', 's-pickleball', 'eq-pickleball-paddle', '#6', 'available'),
    ('item-s-pickleball-pdl-7', 's-pickleball', 'eq-pickleball-paddle', '#7', 'available'),
    ('item-s-pickleball-pdl-8', 's-pickleball', 'eq-pickleball-paddle', '#8', 'available'),

    -- Padel: 6 Padel Rackets (#1 - #6)
    ('item-s-padel-rkt-1', 's-padel', 'eq-padel-racket', '#1', 'available'),
    ('item-s-padel-rkt-2', 's-padel', 'eq-padel-racket', '#2', 'available'),
    ('item-s-padel-rkt-3', 's-padel', 'eq-padel-racket', '#3', 'available'),
    ('item-s-padel-rkt-4', 's-padel', 'eq-padel-racket', '#4', 'available'),
    ('item-s-padel-rkt-5', 's-padel', 'eq-padel-racket', '#5', 'available'),
    ('item-s-padel-rkt-6', 's-padel', 'eq-padel-racket', '#6', 'available'),

    -- Squash: 6 Squash Rackets (#1 - #6)
    ('item-s-squash-rkt-1', 's-squash', 'eq-squash-racket', '#1', 'available'),
    ('item-s-squash-rkt-2', 's-squash', 'eq-squash-racket', '#2', 'available'),
    ('item-s-squash-rkt-3', 's-squash', 'eq-squash-racket', '#3', 'available'),
    ('item-s-squash-rkt-4', 's-squash', 'eq-squash-racket', '#4', 'available'),
    ('item-s-squash-rkt-5', 's-squash', 'eq-squash-racket', '#5', 'available'),
    ('item-s-squash-rkt-6', 's-squash', 'eq-squash-racket', '#6', 'available'),

    -- Table Tennis: 10 TT Paddles (#1 - #10)
    ('item-s-tt-pdl-1', 's-table-tennis', 'eq-tt-paddle', '#1', 'available'),
    ('item-s-tt-pdl-2', 's-table-tennis', 'eq-tt-paddle', '#2', 'available'),
    ('item-s-tt-pdl-3', 's-table-tennis', 'eq-tt-paddle', '#3', 'available'),
    ('item-s-tt-pdl-4', 's-table-tennis', 'eq-tt-paddle', '#4', 'available'),
    ('item-s-tt-pdl-5', 's-table-tennis', 'eq-tt-paddle', '#5', 'available'),
    ('item-s-tt-pdl-6', 's-table-tennis', 'eq-tt-paddle', '#6', 'available'),
    ('item-s-tt-pdl-7', 's-table-tennis', 'eq-tt-paddle', '#7', 'available'),
    ('item-s-tt-pdl-8', 's-table-tennis', 'eq-tt-paddle', '#8', 'available'),
    ('item-s-tt-pdl-9', 's-table-tennis', 'eq-tt-paddle', '#9', 'available'),
    ('item-s-tt-pdl-10', 's-table-tennis', 'eq-tt-paddle', '#10', 'available')
ON CONFLICT (id) DO UPDATE SET
    sport_id = EXCLUDED.sport_id,
    equipment_type_id = EXCLUDED.equipment_type_id,
    equipment_number = EXCLUDED.equipment_number;

