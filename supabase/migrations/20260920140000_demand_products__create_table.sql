create table public.demand_products (
  id uuid not null default gen_random_uuid() primary key,
  demand_id uuid not null references public.demands(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity numeric not null default 1 check (quantity > 0),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid references auth.users(id) default auth.uid(),
  unique(demand_id, product_id)
);

-- Enable RLS
alter table public.demand_products enable row level security;

-- Policies
create policy "Authenticated users can view demand products"
  on public.demand_products
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert demand products"
  on public.demand_products
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update demand products"
  on public.demand_products
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete demand products"
  on public.demand_products
  for delete
  to authenticated
  using (true);

-- Create trigger for updated_at
create trigger set_demand_products_updated_at
  before update on public.demand_products
  for each row
  execute function public.set_updated_at();

-- Grant privileges
grant select, insert, update, delete on public.demand_products to authenticated;
grant select, insert, update, delete on public.demand_products to service_role;
