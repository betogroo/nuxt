create policy "Admins can read all profiles" on public.profiles for
select
    to authenticated using (
        (
            select
                public.is_admin ()
        )
    );