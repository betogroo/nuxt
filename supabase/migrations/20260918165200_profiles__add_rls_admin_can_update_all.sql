create policy "Admins can update all profiles" on public.profiles
  as PERMISSIVE for UPDATE
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
