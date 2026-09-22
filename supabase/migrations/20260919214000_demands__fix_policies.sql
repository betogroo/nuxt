drop policy if exists "Anyone can read demands" on public.demands;
drop policy if exists "Users can insert demands" on public.demands;
drop policy if exists "Users can update their own demands" on public.demands;
drop policy if exists "Admins can update all demands" on public.demands;
drop policy if exists "Users can delete their own demands" on public.demands;
drop policy if exists "Admins can delete all demands" on public.demands;

create policy "Anyone can read demands"
  on public.demands
  for select
  to authenticated
  using (true);

create policy "Users can insert demands"
  on public.demands
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own demands"
  on public.demands
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins can update all demands"
  on public.demands
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Users can delete their own demands"
  on public.demands
  for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "Admins can delete all demands"
  on public.demands
  for delete
  to authenticated
  using (public.is_admin());
