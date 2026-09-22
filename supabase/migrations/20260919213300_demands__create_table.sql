create type demand_type as enum ('consumption', 'permanent');

create table
  public.demands (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now (),
    updated_at timestamptz not null default now (),
    name text not null,
    type demand_type not null,
    dispute_date timestamptz,
    user_id uuid not null references public.profiles (id) on delete cascade
  );

-- Trigger for updated_at
create trigger handle_updated_at before update on public.demands
  for each row execute procedure public.set_updated_at();

-- Enable RLS
alter table public.demands enable row level security;

-- Policies
create policy "Anyone can read demands"
  on public.demands
  for select
  using (auth.uid() is not null);

create policy "Users can insert demands"
  on public.demands
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own demands"
  on public.demands
  for update
  using (auth.uid() = user_id);

create policy "Admins can update all demands"
  on public.demands
  for update
  using (public.is_admin());

create policy "Users can delete their own demands"
  on public.demands
  for delete
  using (auth.uid() = user_id);

create policy "Admins can delete all demands"
  on public.demands
  for delete
  using (public.is_admin());
