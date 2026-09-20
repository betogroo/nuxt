-- 1. Create table product_categories
create table public.product_categories (
  id uuid not null default gen_random_uuid() primary key,
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Enable RLS
alter table public.product_categories enable row level security;

-- Policies for product_categories
create policy "Anyone can read active categories"
  on public.product_categories
  for select
  using (true);

create policy "Admins can insert categories"
  on public.product_categories
  for insert
  with check (public.is_admin());

create policy "Admins can update categories"
  on public.product_categories
  for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete categories"
  on public.product_categories
  for delete
  using (public.is_admin());

-- Trigger for updated_at
create trigger set_product_categories_updated_at
  before update on public.product_categories
  for each row
  execute function public.set_updated_at();

-- Grant privileges
grant select on public.product_categories to authenticated;
grant insert, update, delete on public.product_categories to authenticated; -- Actual insert/update restricted by RLS is_admin()
grant select, insert, update, delete on public.product_categories to service_role;

-- 2. Insert existing unique categories from products
insert into public.product_categories (name)
select distinct material_category from public.products where material_category is not null;

-- 3. Add column to products
alter table public.products add column category_id uuid references public.product_categories(id);

-- 4. Migrate data
update public.products p
set category_id = c.id
from public.product_categories c
where p.material_category = c.name;

-- 5. Make category_id not null and drop material_category
alter table public.products alter column category_id set not null;
alter table public.products drop column material_category;
