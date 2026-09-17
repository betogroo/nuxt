create policy "User can read own profile" on public.profiles as PERMISSIVE for
SELECT
    to authenticated using (public.can_read_own_profile (id));