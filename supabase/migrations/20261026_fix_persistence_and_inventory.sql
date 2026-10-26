-- ====================================================================
-- FLAME University — Digital Sports Equipment Room
-- Fix Persistence & Seed Complete 78 Inventory Items
-- ====================================================================

-- 1. Enable Full Access for Next.js API Routes (Disable RLS on application tables)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_issues DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.damage_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_verification_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_types DISABLE ROW LEVEL SECURITY;

-- 2. Insert Official Administrator Records (asmi.malushte@flame.edu.in & tiyana.shah@flame.edu.in)
INSERT INTO public.users (id, email, name, role) VALUES
    ('00000000-0000-0000-0000-000000000001', 'asmi.malushte@flame.edu.in', 'Asmi Malushte', 'admin'),
    ('a16f8cf2-c469-4d99-90ad-4fde3a783b02', 'tiyana.shah@flame.edu.in', 'Tiyana Shah', 'admin')
ON CONFLICT (email) DO UPDATE SET role = 'admin';

-- 3. Insert All 78 Physical Inventory Items into Equipment Room Catalog
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
