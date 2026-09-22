create table if not exists public.logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.profiles (id) on delete set null,
    action text not null,
    description text,
    created_at timestamptz not null default now ()
);

alter table public.logs enable row level security;

create policy "Admins can view all logs" on public.logs
    for select
    to authenticated
    using ( public.is_admin() );

create policy "Users can insert their own logs" on public.logs
    for insert
    to authenticated
    with check ( auth.uid() = user_id );

grant all privileges on table public.logs to anon, authenticated, service_role;
