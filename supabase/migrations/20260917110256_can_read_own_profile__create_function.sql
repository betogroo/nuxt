create or replace function public.can_read_own_profile(profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    profile_id = auth.uid()
    or public.is_admin();
$$;