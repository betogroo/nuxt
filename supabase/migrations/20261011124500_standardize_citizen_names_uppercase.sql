UPDATE public.iirgd_citizens
SET name = UPPER(TRIM(name))
WHERE name IS NOT NULL;
