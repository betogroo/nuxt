-- Grant table permissions to authenticated and service_role for tables missing explicit grants
GRANT ALL ON TABLE public.measurement_unit_aliases TO authenticated, service_role;
GRANT ALL ON TABLE public.measurement_unit_alias_links TO authenticated, service_role;
GRANT ALL ON TABLE public.candidates TO authenticated, service_role;
GRANT ALL ON TABLE public.expense_natures TO service_role;

-- Grant select to anon where appropriate for public/preview reads
GRANT SELECT ON public.measurement_unit_aliases TO anon;
GRANT SELECT ON public.measurement_unit_alias_links TO anon;

-- Ensure future tables created in public schema automatically grant access to API roles
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated, service_role;
