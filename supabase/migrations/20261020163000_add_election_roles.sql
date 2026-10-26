-- Migration: 20261020163000_add_election_roles.sql
-- Description: Add election roles ('user-election', 'manager-election', 'admin-election') to user_role enum.
-- Default test accounts are seeded in supabase/seed.sql.

-- 1. Add roles to user_role enum
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'user-election';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'manager-election';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin-election';

