create table public.suppliers (
  id uuid not null default gen_random_uuid() primary key,
  cnpj text not null unique,
  company_name text not null,
  responsible_name text,
  email text not null,
  cell_phone text,
  landline text,
  address text,
  has_bb_account text,
  is_simples_optant boolean not null default false,
  simples_optant_verified_at timestamp with time zone,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid references auth.users(id) default auth.uid()
);

-- Enable Row Level Security
alter table public.suppliers enable row level security;

-- Create policies for logged in users
create policy "Authenticated users can view all suppliers"
  on public.suppliers
  for select
  to authenticated
  using (true);

create policy "Authenticated users can create suppliers"
  on public.suppliers
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update suppliers"
  on public.suppliers
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete suppliers"
  on public.suppliers
  for delete
  to authenticated
  using (true);

-- Create trigger for updated_at
create trigger set_suppliers_updated_at
  before update on public.suppliers
  for each row
  execute function public.set_updated_at();

-- Grant privileges
grant select, insert, update, delete on public.suppliers to authenticated;
grant select, insert, update, delete on public.suppliers to service_role;
