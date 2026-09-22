-- Cria uma função segura (que ignora RLS interno) para ler o cargo atual do usuário
create or replace function public.get_my_current_role()
returns user_role
language sql
security definer
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Remove a política antiga insegura
drop policy if exists "User can update own profile" on public.profiles;

-- Cria a nova política garantindo que o valor da coluna 'role' enviado seja idêntico ao atual
create policy "User can update own profile" on public.profiles
  as PERMISSIVE for UPDATE
  to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid() AND
    role = public.get_my_current_role()
  );
