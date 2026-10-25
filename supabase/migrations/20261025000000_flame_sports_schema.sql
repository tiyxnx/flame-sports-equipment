-- ====================================================================
-- FLAME University — Digital Sports Equipment Room
-- Production PostgreSQL Database Schema & Row Level Security (RLS)
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

-- Index for fast email lookup
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (lower(email));

-- 3. Sports Table
CREATE TABLE IF NOT EXISTS public.sports (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    icon TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 4. Equipment Types Table
CREATE TABLE IF NOT EXISTS public.equipment_types (
    id TEXT PRIMARY KEY,
    sport_id TEXT NOT NULL REFERENCES public.sports(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(sport_id, name)
);

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

-- CRITICAL RULE 1: Exactly ONE active issue per student at any time!
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_issue_per_student
ON public.equipment_issues (user_id)
WHERE status IN ('issued', 'return_submitted', 'overdue', 'not_returned');

-- CRITICAL RULE 2: Exactly ONE active issue per inventory item at any time!
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_issue_per_item
ON public.equipment_issues (inventory_item_id)
WHERE status IN ('issued', 'return_submitted', 'overdue', 'not_returned');

CREATE INDEX IF NOT EXISTS idx_issues_user_id ON public.equipment_issues(user_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON public.equipment_issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_due_timestamp ON public.equipment_issues(due_timestamp);

-- 7. Return Verification Events (Audit of Physical Receipt / Not Returned checks)
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

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_verification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.damage_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Public can read sports, equipment types, and available inventory
CREATE POLICY "Anyone can view active sports" ON public.sports FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view active equipment types" ON public.equipment_types FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view inventory items" ON public.inventory_items FOR SELECT USING (true);

-- Students can read their own issues
CREATE POLICY "Students can view their own issues" ON public.equipment_issues
FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

-- Admins can view and manage all tables
CREATE POLICY "Admins full access users" ON public.users FOR ALL
USING (auth.jwt() ->> 'email' = 'asmi.malushte@flame.edu.in');

CREATE POLICY "Admins full access issues" ON public.equipment_issues FOR ALL
USING (auth.jwt() ->> 'email' = 'asmi.malushte@flame.edu.in');

CREATE POLICY "Admins full access inventory" ON public.inventory_items FOR ALL
USING (auth.jwt() ->> 'email' = 'asmi.malushte@flame.edu.in');

CREATE POLICY "Admins full access verifications" ON public.return_verification_events FOR ALL
USING (auth.jwt() ->> 'email' = 'asmi.malushte@flame.edu.in');

CREATE POLICY "Admins full access damages" ON public.damage_reports FOR ALL
USING (auth.jwt() ->> 'email' = 'asmi.malushte@flame.edu.in');

CREATE POLICY "Admins full access notifications" ON public.notification_logs FOR ALL
USING (auth.jwt() ->> 'email' = 'asmi.malushte@flame.edu.in');

CREATE POLICY "Admins full access audits" ON public.audit_logs FOR ALL
USING (auth.jwt() ->> 'email' = 'asmi.malushte@flame.edu.in');
