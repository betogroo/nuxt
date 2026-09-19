-- Grant basic privileges to anon and authenticated roles
-- This is necessary because table-level permissions are evaluated before RLS policies.
-- By default, when a table is created via SQL migration, these aren't granted automatically.

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO service_role;
