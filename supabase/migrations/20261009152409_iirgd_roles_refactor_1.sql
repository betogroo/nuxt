-- Rename existing role
ALTER TYPE public.user_role RENAME VALUE 'iirgd' TO 'iirgd_user';

-- Add new role
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'iirgd_manager';
