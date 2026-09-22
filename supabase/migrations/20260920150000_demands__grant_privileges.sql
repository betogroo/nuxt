-- Grant base privileges to roles for the demands table
grant select, insert, update, delete on public.demands to authenticated;
grant select, insert, update, delete on public.demands to service_role;
