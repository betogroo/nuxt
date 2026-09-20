create table public.products (
  id uuid not null default gen_random_uuid() primary key,
  name text not null,
  material_category text not null,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid references auth.users(id) default auth.uid()
);

-- Enable Row Level Security
alter table public.products enable row level security;

-- Create policies for logged in users
create policy "Authenticated users can view all products"
  on public.products
  for select
  to authenticated
  using (true);

create policy "Authenticated users can create products"
  on public.products
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update products"
  on public.products
  for update
  to authenticated
  using (true)
  with check (true);

-- Create trigger for updated_at
create trigger set_products_updated_at
  before update on public.products
  for each row
  execute function public.set_updated_at();

-- Grant privileges
grant select, insert, update on public.products to authenticated;
grant select, insert, update on public.products to service_role;
