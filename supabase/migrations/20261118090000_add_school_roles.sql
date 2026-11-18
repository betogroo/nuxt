-- Migration: 20261118090000_add_school_roles.sql
-- Description: Add school roles ('school-user', 'school-manager') to user_role enum.

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'school-user';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'school-manager';
