-- 1. Grant missing privileges on iirgd_demand_status_history
GRANT SELECT, INSERT, UPDATE, DELETE ON public.iirgd_demand_status_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.iirgd_demand_status_history TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.iirgd_demand_status_history TO service_role;
