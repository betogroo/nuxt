-- Grant base privileges to roles for the measurement_units table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.measurement_units TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.measurement_units TO service_role;

-- Grant base privileges to roles for the product_units table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_units TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_units TO service_role;
