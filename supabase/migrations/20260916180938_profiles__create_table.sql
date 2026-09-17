create type user_role as enum ('user', 'admin');

create table
  public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    created_at timestamptz not null default now (),
    updated_at timestamptz not null default now (),
    name text,
    avatar_url text,
    role user_role not null default 'user'
  );

alter table if exists public.profiles enable row level security;