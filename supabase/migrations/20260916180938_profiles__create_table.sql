create type user_role as enum ('user', 'admin');

create table
  public.profiles (id uuid primary key references auth.users (id) on delete cascade,
    created_at timestamptz not null default now (),
    updated_at timestamptz not null default now (),
    name text,
    avatar_url text,
    role user_role not null default 'user'
  );

alter table if exists public.profiles enable row level security;

grant select, insert, update, delete on public.profiles to authenticated;
grant select on public.profiles to anon;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user ();

