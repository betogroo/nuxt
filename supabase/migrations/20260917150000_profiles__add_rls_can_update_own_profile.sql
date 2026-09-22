create policy "User can update own profile" on public.profiles as PERMISSIVE for
UPDATE
    to authenticated using (id = auth.uid()) with check (id = auth.uid());
