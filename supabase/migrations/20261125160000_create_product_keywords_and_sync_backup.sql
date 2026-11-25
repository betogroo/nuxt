-- Migration: 20261125160000_create_product_keywords_and_sync_backup.sql
-- Description: Create public.product_keywords table with indexes and RLS, and sync generate_system_backup and restore_system_backup.

CREATE TABLE IF NOT EXISTS public.product_keywords (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_keywords_unique ON public.product_keywords (product_id, LOWER(TRIM(keyword)));
CREATE INDEX IF NOT EXISTS idx_product_keywords_product_id ON public.product_keywords (product_id);
CREATE INDEX IF NOT EXISTS idx_product_keywords_keyword ON public.product_keywords (LOWER(TRIM(keyword)));

ALTER TABLE public.product_keywords ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'product_keywords' AND policyname = 'Authenticated users can view product_keywords'
  ) THEN
    CREATE POLICY "Authenticated users can view product_keywords"
      ON public.product_keywords FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'product_keywords' AND policyname = 'Authenticated users can insert product_keywords'
  ) THEN
    CREATE POLICY "Authenticated users can insert product_keywords"
      ON public.product_keywords FOR INSERT TO authenticated WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'product_keywords' AND policyname = 'Authenticated users can update product_keywords'
  ) THEN
    CREATE POLICY "Authenticated users can update product_keywords"
      ON public.product_keywords FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'product_keywords' AND policyname = 'Authenticated users can delete product_keywords'
  ) THEN
    CREATE POLICY "Authenticated users can delete product_keywords"
      ON public.product_keywords FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_keywords TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.generate_system_backup()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_result jsonb;
  v_caller_name text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem gerar backups do sistema.';
  END IF;

  SELECT name INTO v_caller_name FROM public.profiles WHERE id = auth.uid();

  SELECT jsonb_build_object(
    'system', 'Demandas, IIRGD & Eleições',
    'version', '1.9',
    'timestamp', now(),
    'generated_by', jsonb_build_object(
      'id', auth.uid(),
      'name', COALESCE(v_caller_name, 'Admin')
    ),
    'summary', jsonb_build_object(
      'profiles', (SELECT count(*) FROM public.profiles),
      'suppliers', (SELECT count(*) FROM public.suppliers),
      'expense_natures', (SELECT count(*) FROM public.expense_natures),
      'product_classes', (SELECT count(*) FROM public.product_classes),
      'measurement_units', (SELECT count(*) FROM public.measurement_units),
      'measurement_unit_aliases', (SELECT count(*) FROM public.measurement_unit_aliases),
      'measurement_unit_alias_links', (SELECT count(*) FROM public.measurement_unit_alias_links),
      'product_characteristic_keys', (SELECT count(*) FROM public.product_characteristic_keys),
      'products', (SELECT count(*) FROM public.products),
      'product_units', (SELECT count(*) FROM public.product_units),
      'product_characteristics', (SELECT count(*) FROM public.product_characteristics),
      'brands', (SELECT count(*) FROM public.brands),
      'real_products', (SELECT count(*) FROM public.real_products),
      'product_keywords', (SELECT count(*) FROM public.product_keywords),
      'demands', (SELECT count(*) FROM public.demands),
      'demand_commitments', (SELECT count(*) FROM public.demand_commitments),
      'demand_commitment_liquidations', (SELECT count(*) FROM public.demand_commitment_liquidations),
      'demand_products', (SELECT count(*) FROM public.demand_products),
      'demand_product_bids', (SELECT count(*) FROM public.demand_product_bids),
      'demand_responsibles', (SELECT count(*) FROM public.demand_responsibles),
      'demand_item_status_history', (SELECT count(*) FROM public.demand_item_status_history),
      'iirgd_document_types', (SELECT count(*) FROM public.iirgd_document_types),
      'iirgd_citizens', (SELECT count(*) FROM public.iirgd_citizens),
      'iirgd_demands', (SELECT count(*) FROM public.iirgd_demands),
      'iirgd_demand_status_history', (SELECT count(*) FROM public.iirgd_demand_status_history),
      'iirgd_settings', (SELECT count(*) FROM public.iirgd_settings),
      'system_settings', (SELECT count(*) FROM public.system_settings),
      'elections', (SELECT count(*) FROM public.elections),
      'candidates', (SELECT count(*) FROM public.candidates),
      'ballot_boxes', (SELECT count(*) FROM public.ballot_boxes),
      'election_committee_members', (SELECT count(*) FROM public.election_committee_members),
      'election_voters', (SELECT count(*) FROM public.election_voters),
      'election_voter_attendance', (SELECT count(*) FROM public.election_voter_attendance),
      'election_votes', (SELECT count(*) FROM public.election_votes),
      'school_incidents', (SELECT count(*) FROM public.school_incidents),
      'school_incident_participants', (SELECT count(*) FROM public.school_incident_participants),
      'logs', (SELECT count(*) FROM public.logs)
    ),
    'data', jsonb_build_object(
      'profiles', COALESCE((
        SELECT jsonb_agg(
          to_jsonb(p) || jsonb_build_object('email', u.email)
        )
        FROM public.profiles p
        LEFT JOIN auth.users u ON u.id = p.id
      ), '[]'::jsonb),
      'suppliers', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.suppliers t), '[]'::jsonb),
      'expense_natures', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.expense_natures t), '[]'::jsonb),
      'product_classes', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.product_classes t), '[]'::jsonb),
      'measurement_units', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.measurement_units t), '[]'::jsonb),
      'measurement_unit_aliases', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.measurement_unit_aliases t), '[]'::jsonb),
      'measurement_unit_alias_links', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.measurement_unit_alias_links t), '[]'::jsonb),
      'product_characteristic_keys', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.product_characteristic_keys t), '[]'::jsonb),
      'products', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.products t), '[]'::jsonb),
      'product_units', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.product_units t), '[]'::jsonb),
      'product_characteristics', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.product_characteristics t), '[]'::jsonb),
      'brands', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.name ASC, t.ctid ASC) FROM public.brands t), '[]'::jsonb),
      'real_products', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.created_at ASC, t.ctid ASC) FROM public.real_products t), '[]'::jsonb),
      'product_keywords', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.keyword ASC, t.ctid ASC) FROM public.product_keywords t), '[]'::jsonb),
      'demands', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.demands t), '[]'::jsonb),
      'demand_commitments', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.demand_commitments t), '[]'::jsonb),
      'demand_commitment_liquidations', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.demand_commitment_liquidations t), '[]'::jsonb),
      'demand_products', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.sort_order ASC, t.created_at ASC, t.ctid ASC) FROM public.demand_products t), '[]'::jsonb),
      'demand_product_bids', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.created_at ASC, t.ctid ASC) FROM public.demand_product_bids t), '[]'::jsonb),
      'demand_responsibles', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.demand_responsibles t), '[]'::jsonb),
      'demand_item_status_history', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.created_at ASC, t.ctid ASC) FROM public.demand_item_status_history t), '[]'::jsonb),
      'iirgd_document_types', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.iirgd_document_types t), '[]'::jsonb),
      'iirgd_citizens', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.iirgd_citizens t), '[]'::jsonb),
      'iirgd_demands', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.iirgd_demands t), '[]'::jsonb),
      'iirgd_demand_status_history', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.created_at ASC, t.ctid ASC) FROM public.iirgd_demand_status_history t), '[]'::jsonb),
      'iirgd_settings', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.iirgd_settings t), '[]'::jsonb),
      'system_settings', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.system_settings t), '[]'::jsonb),
      'elections', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.elections t), '[]'::jsonb),
      'candidates', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.candidates t), '[]'::jsonb),
      'ballot_boxes', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.ballot_boxes t), '[]'::jsonb),
      'election_committee_members', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.election_committee_members t), '[]'::jsonb),
      'election_voters', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.election_voters t), '[]'::jsonb),
      'election_voter_attendance', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.election_voter_attendance t), '[]'::jsonb),
      'election_votes', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.election_votes t), '[]'::jsonb),
      'school_incidents', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.created_at ASC, t.ctid ASC) FROM public.school_incidents t), '[]'::jsonb),
      'school_incident_participants', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.created_at ASC, t.ctid ASC) FROM public.school_incident_participants t), '[]'::jsonb),
      'logs', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.logs t), '[]'::jsonb)
    )
  ) INTO v_result;

  INSERT INTO public.logs (user_id, action, description)
  VALUES (auth.uid(), 'GENERATE_SYSTEM_BACKUP', 'Backup completo do sistema gerado com sucesso.');

  RETURN v_result;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.generate_system_backup() TO authenticated;

CREATE OR REPLACE FUNCTION public.restore_system_backup(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_data jsonb;
  v_restored_counts jsonb;
  v_count_profiles int := 0;
  v_count_suppliers int := 0;
  v_count_expense_natures int := 0;
  v_count_product_classes int := 0;
  v_count_measurement_units int := 0;
  v_count_unit_aliases int := 0;
  v_count_unit_alias_links int := 0;
  v_count_characteristic_keys int := 0;
  v_count_products int := 0;
  v_count_product_units int := 0;
  v_count_product_characteristics int := 0;
  v_count_brands int := 0;
  v_count_real_products int := 0;
  v_count_product_keywords int := 0;
  v_count_doc_types int := 0;
  v_count_iirgd_settings int := 0;
  v_count_system_settings int := 0;
  v_count_citizens int := 0;
  v_count_demands int := 0;
  v_count_demand_commitments int := 0;
  v_count_demand_commitment_liquidations int := 0;
  v_count_demand_products int := 0;
  v_count_demand_bids int := 0;
  v_count_demand_responsibles int := 0;
  v_count_demand_item_history int := 0;
  v_count_school_incidents int := 0;
  v_count_school_incident_participants int := 0;
  v_count_iirgd_demands int := 0;
  v_count_iirgd_history int := 0;
  v_count_elections int := 0;
  v_count_candidates int := 0;
  v_count_ballot_boxes int := 0;
  v_count_committee_members int := 0;
  v_count_voters int := 0;
  v_count_voter_attendance int := 0;
  v_count_election_votes int := 0;
  v_count_logs int := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem restaurar backups do sistema.';
  END IF;

  IF p_payload ? 'data' THEN
    v_data := p_payload->'data';
  ELSE
    v_data := p_payload;
  END IF;

  ALTER TABLE public.iirgd_demands DISABLE TRIGGER trigger_iirgd_demand_status_change;
  ALTER TABLE public.elections DISABLE TRIGGER trg_check_election_digits_count_update;
  ALTER TABLE public.demands DISABLE TRIGGER trg_demand_status_transition;
  ALTER TABLE public.demands DISABLE TRIGGER trg_validate_offer_opening_date;
  ALTER TABLE public.demand_product_bids DISABLE TRIGGER trg_check_bid_reference_price;

  -- 0. AUTH USERS (stub accounts for foreign keys if missing)
  IF v_data ? 'profiles' AND jsonb_typeof(v_data->'profiles') = 'array' THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    SELECT
      (elem->>'id')::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid,
      'authenticated',
      'authenticated',
      COALESCE(
        NULLIF(TRIM(elem->>'email'), ''),
        'user_' || substr(md5((elem->>'id')::text), 1, 8) || '@backup.system'
      ),
      crypt('123456', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', COALESCE(elem->>'name', 'Usuário Restaurado')),
      now(),
      now()
    FROM jsonb_array_elements(v_data->'profiles') elem
    WHERE (elem->>'id') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM auth.users u WHERE u.id = (elem->>'id')::uuid
      )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    SELECT
      gen_random_uuid(),
      u.id,
      u.id::text,
      format('{"sub":"%s","email":"%s"}', u.id, u.email)::jsonb,
      'email',
      now(),
      now(),
      now()
    FROM auth.users u
    WHERE u.id IN (
      SELECT (elem->>'id')::uuid 
      FROM jsonb_array_elements(v_data->'profiles') elem 
      WHERE (elem->>'id') IS NOT NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM auth.identities i WHERE i.user_id = u.id
    );
  END IF;

  -- 1. PROFILES
  IF v_data ? 'profiles' AND jsonb_typeof(v_data->'profiles') = 'array' THEN
    INSERT INTO public.profiles (id, name, role, is_active, theme, avatar_url, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      elem->>'name',
      COALESCE((elem->>'role')::public.user_role, 'user'::public.user_role),
      COALESCE((elem->>'is_active')::boolean, true),
      elem->>'theme',
      elem->>'avatar_url',
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'profiles') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      role = EXCLUDED.role,
      is_active = EXCLUDED.is_active,
      theme = COALESCE(EXCLUDED.theme, profiles.theme),
      avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_profiles = ROW_COUNT;
  END IF;

  -- 2. SUPPLIERS
  IF v_data ? 'suppliers' AND jsonb_typeof(v_data->'suppliers') = 'array' THEN
    DELETE FROM public.suppliers s
    WHERE s.cnpj IS NOT NULL 
      AND s.cnpj IN (
        SELECT elem->>'cnpj' 
        FROM jsonb_array_elements(v_data->'suppliers') elem 
        WHERE (elem->>'cnpj') IS NOT NULL
      )
      AND s.id NOT IN (
        SELECT (elem->>'id')::uuid 
        FROM jsonb_array_elements(v_data->'suppliers') elem 
        WHERE (elem->>'id') IS NOT NULL
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.demand_product_bids dpb WHERE dpb.supplier_id = s.id
      );

    INSERT INTO public.suppliers (id, name, trade_name, cnpj, email, phone, is_active, created_at, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      elem->>'name',
      elem->>'trade_name',
      elem->>'cnpj',
      elem->>'email',
      elem->>'phone',
      COALESCE((elem->>'is_active')::boolean, true),
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'suppliers') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      trade_name = EXCLUDED.trade_name,
      cnpj = EXCLUDED.cnpj,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      is_active = EXCLUDED.is_active,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_suppliers = ROW_COUNT;
  END IF;

  -- 3. EXPENSE_NATURES
  IF v_data ? 'expense_natures' AND jsonb_typeof(v_data->'expense_natures') = 'array' THEN
    DELETE FROM public.expense_natures en
    WHERE en.name IN (
        SELECT elem->>'name' 
        FROM jsonb_array_elements(v_data->'expense_natures') elem 
        WHERE (elem->>'name') IS NOT NULL
      )
      AND en.id NOT IN (
        SELECT elem->>'id' 
        FROM jsonb_array_elements(v_data->'expense_natures') elem 
        WHERE (elem->>'id') IS NOT NULL
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.products p WHERE p.expense_nature_id = en.id
      );

    INSERT INTO public.expense_natures (id, name, is_active, is_pending, created_at, updated_at)
    SELECT 
      elem->>'id',
      elem->>'name',
      COALESCE((elem->>'is_active')::boolean, true),
      COALESCE((elem->>'is_pending')::boolean, false),
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'expense_natures') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      is_active = EXCLUDED.is_active,
      is_pending = EXCLUDED.is_pending,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_expense_natures = ROW_COUNT;
  END IF;

  -- 4. PRODUCT_CLASSES
  IF v_data ? 'product_classes' AND jsonb_typeof(v_data->'product_classes') = 'array' THEN
    DELETE FROM public.product_classes pc
    WHERE (
      pc.id IN (
        SELECT elem->>'id' 
        FROM jsonb_array_elements(v_data->'product_classes') elem 
        WHERE (elem->>'id') IS NOT NULL
      )
      OR pc.name IN (
        SELECT elem->>'name' 
        FROM jsonb_array_elements(v_data->'product_classes') elem 
        WHERE (elem->>'name') IS NOT NULL
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.products p WHERE p.product_class_id = pc.id
    );

    INSERT INTO public.product_classes (id, name, is_active, is_pending, created_at, updated_at)
    SELECT 
      elem->>'id',
      elem->>'name',
      COALESCE((elem->>'is_active')::boolean, true),
      COALESCE((elem->>'is_pending')::boolean, false),
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'product_classes') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      is_active = EXCLUDED.is_active,
      is_pending = EXCLUDED.is_pending,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_product_classes = ROW_COUNT;
  END IF;

  -- 5. MEASUREMENT_UNITS
  IF v_data ? 'measurement_units' AND jsonb_typeof(v_data->'measurement_units') = 'array' THEN
    DELETE FROM public.measurement_units mu
    WHERE (
      mu.id IN (
        SELECT (elem->>'id')::uuid 
        FROM jsonb_array_elements(v_data->'measurement_units') elem 
        WHERE (elem->>'id') IS NOT NULL
      )
      OR LOWER(TRIM(mu.name)) IN (
        SELECT LOWER(TRIM(elem->>'name')) 
        FROM jsonb_array_elements(v_data->'measurement_units') elem 
        WHERE (elem->>'name') IS NOT NULL
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.product_units pu WHERE pu.unit_id = mu.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.demand_products dp WHERE dp.unit_id = mu.id
    );

    INSERT INTO public.measurement_units (id, name, is_active, is_pending, created_at, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      elem->>'name',
      COALESCE((elem->>'is_active')::boolean, true),
      COALESCE((elem->>'is_pending')::boolean, false),
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'measurement_units') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      is_active = EXCLUDED.is_active,
      is_pending = EXCLUDED.is_pending,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_measurement_units = ROW_COUNT;
  END IF;

  -- 6. MEASUREMENT_UNIT_ALIASES
  IF v_data ? 'measurement_unit_aliases' AND jsonb_typeof(v_data->'measurement_unit_aliases') = 'array' THEN
    INSERT INTO public.measurement_unit_aliases (id, code, name, is_active, is_pending, created_at, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'code')::integer,
      elem->>'name',
      COALESCE((elem->>'is_active')::boolean, true),
      COALESCE((elem->>'is_pending')::boolean, false),
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'measurement_unit_aliases') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      code = EXCLUDED.code,
      name = EXCLUDED.name,
      is_active = EXCLUDED.is_active,
      is_pending = EXCLUDED.is_pending,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_unit_aliases = ROW_COUNT;
  END IF;

  -- 7. MEASUREMENT_UNIT_ALIAS_LINKS
  IF v_data ? 'measurement_unit_alias_links' AND jsonb_typeof(v_data->'measurement_unit_alias_links') = 'array' THEN
    INSERT INTO public.measurement_unit_alias_links (id, unit_id, alias_id, created_at)
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'unit_id')::uuid,
      (elem->>'alias_id')::uuid,
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'measurement_unit_alias_links') elem
    WHERE (elem->>'id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.measurement_units WHERE id = (elem->>'unit_id')::uuid)
      AND EXISTS (SELECT 1 FROM public.measurement_unit_aliases WHERE id = (elem->>'alias_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      unit_id = EXCLUDED.unit_id,
      alias_id = EXCLUDED.alias_id;

    GET DIAGNOSTICS v_count_unit_alias_links = ROW_COUNT;
  END IF;

  -- 8. PRODUCT_CHARACTERISTIC_KEYS
  IF v_data ? 'product_characteristic_keys' AND jsonb_typeof(v_data->'product_characteristic_keys') = 'array' THEN
    DELETE FROM public.product_characteristic_keys pck
    WHERE (
      pck.id IN (
        SELECT (elem->>'id')::uuid 
        FROM jsonb_array_elements(v_data->'product_characteristic_keys') elem 
        WHERE (elem->>'id') IS NOT NULL
      )
      OR LOWER(TRIM(pck.name)) IN (
        SELECT LOWER(TRIM(elem->>'name')) 
        FROM jsonb_array_elements(v_data->'product_characteristic_keys') elem 
        WHERE (elem->>'name') IS NOT NULL
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.product_characteristics pc WHERE pc.key_id = pck.id
    );

    INSERT INTO public.product_characteristic_keys (id, name, is_active, is_pending, created_at, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      elem->>'name',
      COALESCE((elem->>'is_active')::boolean, true),
      COALESCE((elem->>'is_pending')::boolean, false),
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'product_characteristic_keys') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      is_active = EXCLUDED.is_active,
      is_pending = EXCLUDED.is_pending,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_characteristic_keys = ROW_COUNT;
  END IF;

  -- 9. BRANDS
  IF v_data ? 'brands' AND jsonb_typeof(v_data->'brands') = 'array' THEN
    INSERT INTO public.brands (id, name, is_active, is_pending, created_by, created_at, updated_at)
    SELECT
      COALESCE((elem->>'id')::uuid, gen_random_uuid()),
      TRIM(elem->>'name'),
      COALESCE((elem->>'is_active')::boolean, true),
      COALESCE((elem->>'is_pending')::boolean, false),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'brands') elem
    WHERE (elem->>'name') IS NOT NULL AND TRIM(elem->>'name') != ''
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      is_active = EXCLUDED.is_active,
      is_pending = EXCLUDED.is_pending,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_brands = ROW_COUNT;
  END IF;

  -- 10. PRODUCTS
  IF v_data ? 'products' AND jsonb_typeof(v_data->'products') = 'array' THEN
    DELETE FROM public.products p
    WHERE p.cat_mat IS NOT NULL
      AND p.cat_mat IN (
        SELECT COALESCE((elem->>'cat_mat')::bigint, (elem->>'catmat')::bigint)
        FROM jsonb_array_elements(v_data->'products') elem 
        WHERE (elem->>'cat_mat') IS NOT NULL OR (elem->>'catmat') IS NOT NULL
      )
      AND p.id NOT IN (
        SELECT (elem->>'id')::uuid 
        FROM jsonb_array_elements(v_data->'products') elem 
        WHERE (elem->>'id') IS NOT NULL
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.demand_products dp WHERE dp.product_id = p.id
      );

    INSERT INTO public.products (id, name, cat_mat, cat_bec, expense_nature_id, product_class_id, is_active, created_by, created_at, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      elem->>'name',
      COALESCE((elem->>'cat_mat')::bigint, (elem->>'catmat')::bigint),
      COALESCE((elem->>'cat_bec')::bigint, (elem->>'catbec')::bigint),
      COALESCE(
        elem->>'expense_nature_id',
        (
          SELECT ben.id 
          FROM jsonb_array_elements(v_data->'expense_natures') ben
          WHERE (ben->>'id' = elem->>'expense_nature_id' OR ben->>'name' = elem->>'expense_nature_name')
          LIMIT 1
        )
      ),
      elem->>'product_class_id',
      COALESCE((elem->>'is_active')::boolean, true),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'products') elem
    WHERE (elem->>'id') IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.expense_natures WHERE id = elem->>'expense_nature_id'
        UNION ALL
        SELECT 1 FROM jsonb_array_elements(v_data->'expense_natures') ben WHERE ben->>'id' = elem->>'expense_nature_id'
      )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      cat_mat = EXCLUDED.cat_mat,
      cat_bec = EXCLUDED.cat_bec,
      expense_nature_id = EXCLUDED.expense_nature_id,
      product_class_id = EXCLUDED.product_class_id,
      is_active = EXCLUDED.is_active,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_products = ROW_COUNT;
  END IF;

  -- 10b. PRODUCT_CHARACTERISTICS
  IF v_data ? 'product_characteristics' AND jsonb_typeof(v_data->'product_characteristics') = 'array' THEN
    INSERT INTO public.product_characteristics (id, product_id, key_id, value, created_at, updated_at)
    SELECT
      COALESCE((elem->>'id')::uuid, gen_random_uuid()),
      (elem->>'product_id')::uuid,
      COALESCE(
        (elem->>'key_id')::uuid,
        (
          SELECT (bpck->>'id')::uuid 
          FROM jsonb_array_elements(v_data->'product_characteristic_keys') bpck
          WHERE (bpck->>'id')::uuid = (elem->>'key_id')::uuid
             OR LOWER(TRIM(bpck->>'name')) = LOWER(TRIM(elem->>'key_name'))
          LIMIT 1
        )
      ),
      elem->>'value',
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'product_characteristics') elem
    WHERE (elem->>'product_id') IS NOT NULL
      AND (elem->>'value') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.products WHERE id = (elem->>'product_id')::uuid)
      AND (
        EXISTS (SELECT 1 FROM public.product_characteristic_keys WHERE id = (elem->>'key_id')::uuid)
        OR (
          v_data ? 'product_characteristic_keys' 
          AND EXISTS (
            SELECT 1 
            FROM jsonb_array_elements(v_data->'product_characteristic_keys') bpck
            WHERE (bpck->>'id')::uuid = (elem->>'key_id')::uuid
            LIMIT 1
          )
        )
      )
    ON CONFLICT (product_id, key_id) DO UPDATE SET
      value = EXCLUDED.value,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_product_characteristics = ROW_COUNT;
  END IF;

  -- 10c. REAL_PRODUCTS
  IF v_data ? 'real_products' AND jsonb_typeof(v_data->'real_products') = 'array' THEN
    INSERT INTO public.real_products (id, product_id, brand_id, brand, name, link, created_by, created_at, updated_at)
    SELECT
      COALESCE((elem->>'id')::uuid, gen_random_uuid()),
      (elem->>'product_id')::uuid,
      CASE WHEN (elem->>'brand_id') IS NOT NULL AND EXISTS (SELECT 1 FROM public.brands b WHERE b.id = (elem->>'brand_id')::uuid)
           THEN (elem->>'brand_id')::uuid
           ELSE (SELECT id FROM public.brands b WHERE LOWER(TRIM(b.name)) = LOWER(TRIM(elem->>'brand')) LIMIT 1)
      END,
      TRIM(elem->>'brand'),
      TRIM(elem->>'name'),
      NULLIF(TRIM(elem->>'link'), ''),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'real_products') elem
    WHERE (elem->>'product_id') IS NOT NULL
      AND NULLIF(TRIM(elem->>'brand'), '') IS NOT NULL
      AND NULLIF(TRIM(elem->>'name'), '') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.products WHERE id = (elem->>'product_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      product_id = EXCLUDED.product_id,
      brand_id = EXCLUDED.brand_id,
      brand = EXCLUDED.brand,
      name = EXCLUDED.name,
      link = EXCLUDED.link,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_real_products = ROW_COUNT;
  END IF;

  -- 10d. PRODUCT_KEYWORDS
  IF v_data ? 'product_keywords' AND jsonb_typeof(v_data->'product_keywords') = 'array' THEN
    INSERT INTO public.product_keywords (id, product_id, keyword, created_by, created_at)
    SELECT
      COALESCE((elem->>'id')::uuid, gen_random_uuid()),
      (elem->>'product_id')::uuid,
      TRIM(elem->>'keyword'),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'product_keywords') elem
    WHERE (elem->>'product_id') IS NOT NULL
      AND NULLIF(TRIM(elem->>'keyword'), '') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = (elem->>'product_id')::uuid)
    ON CONFLICT (product_id, LOWER(TRIM(keyword))) DO UPDATE SET
      created_at = EXCLUDED.created_at;

    GET DIAGNOSTICS v_count_product_keywords = ROW_COUNT;
  END IF;

  -- 11. IIRGD_CITIZENS
  IF v_data ? 'iirgd_citizens' AND jsonb_typeof(v_data->'iirgd_citizens') = 'array' THEN
    INSERT INTO public.iirgd_citizens (id, name, rg, cpf, other_document, created_by, created_at, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      UPPER(TRIM(elem->>'name')),
      NULLIF(TRIM(elem->>'rg'), ''),
      NULLIF(TRIM(elem->>'cpf'), ''),
      NULLIF(TRIM(elem->>'other_document'), ''),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'iirgd_citizens') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      rg = EXCLUDED.rg,
      cpf = EXCLUDED.cpf,
      other_document = EXCLUDED.other_document,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_citizens = ROW_COUNT;
  END IF;

  -- 12. IIRGD_DOCUMENT_TYPES
  IF v_data ? 'iirgd_document_types' AND jsonb_typeof(v_data->'iirgd_document_types') = 'array' THEN
    DELETE FROM public.iirgd_document_types dt
    WHERE (
      dt.id IN (
        SELECT (elem->>'id')::uuid 
        FROM jsonb_array_elements(v_data->'iirgd_document_types') elem 
        WHERE (elem->>'id') IS NOT NULL
      )
      OR dt.name IN (
        SELECT elem->>'name' 
        FROM jsonb_array_elements(v_data->'iirgd_document_types') elem 
        WHERE (elem->>'name') IS NOT NULL
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.iirgd_demands id WHERE id.document_type_id = dt.id
    );

    INSERT INTO public.iirgd_document_types (id, name, is_active, is_pending, created_at, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      elem->>'name',
      COALESCE((elem->>'is_active')::boolean, true),
      COALESCE((elem->>'is_pending')::boolean, false),
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'iirgd_document_types') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      is_active = EXCLUDED.is_active,
      is_pending = EXCLUDED.is_pending,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_doc_types = ROW_COUNT;
  END IF;

  -- 13. IIRGD_SETTINGS
  IF v_data ? 'iirgd_settings' AND jsonb_typeof(v_data->'iirgd_settings') = 'array' THEN
    INSERT INTO public.iirgd_settings (id, key, value, created_at, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      elem->>'key',
      elem->>'value',
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'iirgd_settings') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      key = EXCLUDED.key,
      value = EXCLUDED.value,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_iirgd_settings = ROW_COUNT;
  END IF;

  -- 14. SYSTEM_SETTINGS
  IF v_data ? 'system_settings' AND jsonb_typeof(v_data->'system_settings') = 'array' THEN
    INSERT INTO public.system_settings (key, value, description, updated_at, updated_by)
    SELECT 
      elem->>'key',
      elem->>'value',
      elem->>'description',
      COALESCE((elem->>'updated_at')::timestamptz, now()),
      CASE WHEN (elem->>'updated_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'updated_by')::uuid)
           THEN (elem->>'updated_by')::uuid
           ELSE auth.uid()
      END
    FROM jsonb_array_elements(v_data->'system_settings') elem
    WHERE (elem->>'key') IS NOT NULL
    ON CONFLICT (key) DO UPDATE SET
      value = EXCLUDED.value,
      description = EXCLUDED.description,
      updated_at = EXCLUDED.updated_at,
      updated_by = EXCLUDED.updated_by;

    GET DIAGNOSTICS v_count_system_settings = ROW_COUNT;
  END IF;

  -- 15. PRODUCT_UNITS
  IF v_data ? 'product_units' AND jsonb_typeof(v_data->'product_units') = 'array' THEN
    DELETE FROM public.product_units pu
    WHERE (pu.product_id, pu.unit_id) IN (
      SELECT (elem->>'product_id')::uuid, (elem->>'unit_id')::uuid
      FROM jsonb_array_elements(v_data->'product_units') elem
      WHERE (elem->>'product_id') IS NOT NULL AND (elem->>'unit_id') IS NOT NULL
    )
    AND pu.id NOT IN (
      SELECT (elem->>'id')::uuid 
      FROM jsonb_array_elements(v_data->'product_units') elem 
      WHERE (elem->>'id') IS NOT NULL
    );

    INSERT INTO public.product_units (id, product_id, unit_id, created_at)
    SELECT 
      COALESCE((elem->>'id')::uuid, gen_random_uuid()),
      (elem->>'product_id')::uuid,
      (elem->>'unit_id')::uuid,
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'product_units') elem
    WHERE (elem->>'product_id') IS NOT NULL
      AND (elem->>'unit_id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.products WHERE id = (elem->>'product_id')::uuid)
      AND EXISTS (SELECT 1 FROM public.measurement_units WHERE id = (elem->>'unit_id')::uuid)
    ON CONFLICT (product_id, unit_id) DO UPDATE SET
      created_at = EXCLUDED.created_at;

    GET DIAGNOSTICS v_count_product_units = ROW_COUNT;
  END IF;

  -- 16. DEMANDS
  IF v_data ? 'demands' AND jsonb_typeof(v_data->'demands') = 'array' THEN
    INSERT INTO public.demands (
      id, name, status, process_number, offer_opening_date,
      dispute_date, remarks, is_archived, created_by, created_at, updated_at
    )
    SELECT 
      (elem->>'id')::uuid,
      elem->>'name',
      COALESCE((elem->>'status')::public.demand_status, 'draft'::public.demand_status),
      elem->>'process_number',
      (elem->>'offer_opening_date')::timestamptz,
      (elem->>'dispute_date')::timestamptz,
      elem->>'remarks',
      COALESCE((elem->>'is_archived')::boolean, false),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'demands') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      status = EXCLUDED.status,
      process_number = EXCLUDED.process_number,
      offer_opening_date = EXCLUDED.offer_opening_date,
      dispute_date = EXCLUDED.dispute_date,
      remarks = EXCLUDED.remarks,
      is_archived = EXCLUDED.is_archived,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_demands = ROW_COUNT;
  END IF;

  -- 17. DEMAND_COMMITMENTS
  IF v_data ? 'demand_commitments' AND jsonb_typeof(v_data->'demand_commitments') = 'array' THEN
    INSERT INTO public.demand_commitments (
      id, demand_id, supplier_id, commitment_number, bank_order_number,
      delivery_deadline, penalty_percentage, notes, is_cancelled, cancellation_reason,
      cancelled_at, cancelled_by, created_by, created_at, updated_at
    )
    SELECT
      (elem->>'id')::uuid,
      (elem->>'demand_id')::uuid,
      (elem->>'supplier_id')::uuid,
      UPPER(TRIM(elem->>'commitment_number')),
      UPPER(TRIM(NULLIF(elem->>'bank_order_number', ''))),
      (elem->>'delivery_deadline')::date,
      COALESCE((elem->>'penalty_percentage')::numeric, 0),
      elem->>'notes',
      COALESCE((elem->>'is_cancelled')::boolean, false),
      elem->>'cancellation_reason',
      (elem->>'cancelled_at')::timestamptz,
      CASE WHEN (elem->>'cancelled_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'cancelled_by')::uuid)
           THEN (elem->>'cancelled_by')::uuid
           ELSE NULL
      END,
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'demand_commitments') elem
    WHERE (elem->>'id') IS NOT NULL
      AND (elem->>'demand_id') IS NOT NULL
      AND (elem->>'commitment_number') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.demands WHERE id = (elem->>'demand_id')::uuid)
      AND (
        (elem->>'supplier_id') IS NULL
        OR EXISTS (SELECT 1 FROM public.suppliers WHERE id = (elem->>'supplier_id')::uuid)
      )
    ON CONFLICT (id) DO UPDATE SET
      demand_id = EXCLUDED.demand_id,
      supplier_id = EXCLUDED.supplier_id,
      commitment_number = EXCLUDED.commitment_number,
      bank_order_number = EXCLUDED.bank_order_number,
      delivery_deadline = EXCLUDED.delivery_deadline,
      penalty_percentage = EXCLUDED.penalty_percentage,
      notes = EXCLUDED.notes,
      is_cancelled = EXCLUDED.is_cancelled,
      cancellation_reason = EXCLUDED.cancellation_reason,
      cancelled_at = EXCLUDED.cancelled_at,
      cancelled_by = EXCLUDED.cancelled_by,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_demand_commitments = ROW_COUNT;
  END IF;

  -- 17b. DEMAND_COMMITMENT_LIQUIDATIONS
  IF v_data ? 'demand_commitment_liquidations' AND jsonb_typeof(v_data->'demand_commitment_liquidations') = 'array' THEN
    INSERT INTO public.demand_commitment_liquidations (
      id, commitment_id, liquidation_number, is_cancellation,
      is_ir_retention, ir_retention_amount, created_by, created_at, updated_at
    )
    SELECT
      (elem->>'id')::uuid,
      (elem->>'commitment_id')::uuid,
      UPPER(TRIM(elem->>'liquidation_number')),
      COALESCE((elem->>'is_cancellation')::boolean, false),
      COALESCE((elem->>'is_ir_retention')::boolean, false),
      (elem->>'ir_retention_amount')::numeric,
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'demand_commitment_liquidations') elem
    WHERE (elem->>'id') IS NOT NULL
      AND (elem->>'commitment_id') IS NOT NULL
      AND (elem->>'liquidation_number') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.demand_commitments WHERE id = (elem->>'commitment_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      commitment_id = EXCLUDED.commitment_id,
      liquidation_number = EXCLUDED.liquidation_number,
      is_cancellation = EXCLUDED.is_cancellation,
      is_ir_retention = EXCLUDED.is_ir_retention,
      ir_retention_amount = EXCLUDED.ir_retention_amount,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_demand_commitment_liquidations = ROW_COUNT;
  END IF;

  -- 18. ELECTIONS
  IF v_data ? 'elections' AND jsonb_typeof(v_data->'elections') = 'array' THEN
    INSERT INTO public.elections (
      id, title, description, start_time, end_time,
      status, allow_blank_votes, is_active, created_by, created_at, updated_at
    )
    SELECT 
      (elem->>'id')::uuid,
      elem->>'title',
      elem->>'description',
      (elem->>'start_time')::timestamptz,
      (elem->>'end_time')::timestamptz,
      COALESCE((elem->>'status')::public.election_status, 'draft'::public.election_status),
      COALESCE((elem->>'allow_blank_votes')::boolean, true),
      COALESCE((elem->>'is_active')::boolean, true),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'elections') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      start_time = EXCLUDED.start_time,
      end_time = EXCLUDED.end_time,
      status = EXCLUDED.status,
      allow_blank_votes = EXCLUDED.allow_blank_votes,
      is_active = EXCLUDED.is_active,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_elections = ROW_COUNT;
  END IF;

  -- 19. CANDIDATES
  IF v_data ? 'candidates' AND jsonb_typeof(v_data->'candidates') = 'array' THEN
    INSERT INTO public.candidates (
      id, election_id, name, candidate_number, photo_url,
      deleted_at, created_at, updated_at
    )
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'election_id')::uuid,
      elem->>'name',
      elem->>'candidate_number',
      elem->>'photo_url',
      (elem->>'deleted_at')::timestamptz,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'candidates') elem
    WHERE (elem->>'id') IS NOT NULL
      AND (elem->>'election_id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.elections WHERE id = (elem->>'election_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      election_id = EXCLUDED.election_id,
      name = EXCLUDED.name,
      candidate_number = EXCLUDED.candidate_number,
      photo_url = EXCLUDED.photo_url,
      deleted_at = EXCLUDED.deleted_at,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_candidates = ROW_COUNT;
  END IF;

  -- 20. BALLOT_BOXES
  IF v_data ? 'ballot_boxes' AND jsonb_typeof(v_data->'ballot_boxes') = 'array' THEN
    INSERT INTO public.ballot_boxes (
      id, election_id, name, device_info,
      is_active, created_by, deleted_at, created_at, updated_at
    )
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'election_id')::uuid,
      elem->>'name',
      elem->>'device_info',
      COALESCE((elem->>'is_active')::boolean, false),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      (elem->>'deleted_at')::timestamptz,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'ballot_boxes') elem
    WHERE (elem->>'id') IS NOT NULL
      AND (elem->>'election_id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.elections WHERE id = (elem->>'election_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      election_id = EXCLUDED.election_id,
      name = EXCLUDED.name,
      device_info = EXCLUDED.device_info,
      is_active = EXCLUDED.is_active,
      created_by = EXCLUDED.created_by,
      deleted_at = EXCLUDED.deleted_at,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_ballot_boxes = ROW_COUNT;
  END IF;

  -- 21. ELECTION_COMMITTEE_MEMBERS
  IF v_data ? 'election_committee_members' AND jsonb_typeof(v_data->'election_committee_members') = 'array' THEN
    INSERT INTO public.election_committee_members (
      id, election_id, name, role_name, sort_order,
      created_by, created_at, updated_at
    )
    SELECT 
      COALESCE((elem->>'id')::uuid, gen_random_uuid()),
      (elem->>'election_id')::uuid,
      TRIM(elem->>'name'),
      TRIM(elem->>'role_name'),
      COALESCE((elem->>'sort_order')::integer, 0),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'election_committee_members') elem
    WHERE (elem->>'id') IS NOT NULL
      AND (elem->>'election_id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.elections WHERE id = (elem->>'election_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      role_name = EXCLUDED.role_name,
      sort_order = EXCLUDED.sort_order,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_committee_members = ROW_COUNT;
  END IF;

  -- 22. ELECTION_VOTERS
  IF v_data ? 'election_voters' AND jsonb_typeof(v_data->'election_voters') = 'array' THEN
    INSERT INTO public.election_voters (
      id, election_id, name, document_number, role,
      status, attendance_confirmed, confirmation_source, confirmed_by, confirmed_at, created_at
    )
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'election_id')::uuid,
      elem->>'name',
      elem->>'document_number',
      elem->>'role',
      COALESCE((elem->>'status')::public.election_voter_status, 'eligible'::public.election_voter_status),
      COALESCE((elem->>'attendance_confirmed')::boolean, false),
      elem->>'confirmation_source',
      CASE WHEN (elem->>'confirmed_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'confirmed_by')::uuid)
           THEN (elem->>'confirmed_by')::uuid
           ELSE NULL
      END,
      (elem->>'confirmed_at')::timestamptz,
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'election_voters') elem
    WHERE (elem->>'id') IS NOT NULL
      AND (elem->>'election_id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.elections WHERE id = (elem->>'election_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      election_id = EXCLUDED.election_id,
      name = EXCLUDED.name,
      document_number = EXCLUDED.document_number,
      role = EXCLUDED.role,
      status = EXCLUDED.status,
      attendance_confirmed = EXCLUDED.attendance_confirmed,
      confirmation_source = EXCLUDED.confirmation_source,
      confirmed_by = EXCLUDED.confirmed_by,
      confirmed_at = EXCLUDED.confirmed_at;

    GET DIAGNOSTICS v_count_voters = ROW_COUNT;
  END IF;

  -- 23. ELECTION_VOTER_ATTENDANCE
  IF v_data ? 'election_voter_attendance' AND jsonb_typeof(v_data->'election_voter_attendance') = 'array' THEN
    INSERT INTO public.election_voter_attendance (
      id, election_id, voter_id, confirmed_by, confirmed_at,
      source, notes, created_at
    )
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'election_id')::uuid,
      (elem->>'voter_id')::uuid,
      CASE WHEN (elem->>'confirmed_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'confirmed_by')::uuid)
           THEN (elem->>'confirmed_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'confirmed_at')::timestamptz, now()),
      elem->>'source',
      elem->>'notes',
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'election_voter_attendance') elem
    WHERE (elem->>'id') IS NOT NULL
      AND (elem->>'election_id') IS NOT NULL
      AND (elem->>'voter_id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.elections WHERE id = (elem->>'election_id')::uuid)
      AND EXISTS (SELECT 1 FROM public.election_voters WHERE id = (elem->>'voter_id')::uuid)
    ON CONFLICT (id) DO NOTHING;

    GET DIAGNOSTICS v_count_voter_attendance = ROW_COUNT;
  END IF;

  -- 24. DEMAND_PRODUCTS
  IF v_data ? 'demand_products' AND jsonb_typeof(v_data->'demand_products') = 'array' THEN
    INSERT INTO public.demand_products (
      id, demand_id, product_id, unit_id, alias_id,
      product_name_snapshot, unit_name_snapshot, alias_name_snapshot, alias_code_snapshot,
      expense_nature_name_snapshot, quantity, reference_price, bid_interval,
      bid_interval_type, execution_status, execution_status_updated_at,
      execution_error_details, commitment_number, sort_order, created_by, created_at, updated_at
    )
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'demand_id')::uuid,
      (elem->>'product_id')::uuid,
      (elem->>'unit_id')::uuid,
      (elem->>'alias_id')::uuid,
      elem->>'product_name_snapshot',
      elem->>'unit_name_snapshot',
      elem->>'alias_name_snapshot',
      (elem->>'alias_code_snapshot')::integer,
      elem->>'expense_nature_name_snapshot',
      COALESCE((elem->>'quantity')::numeric, 1),
      (elem->>'reference_price')::numeric,
      (elem->>'bid_interval')::numeric,
      elem->>'bid_interval_type',
      (elem->>'execution_status')::public.demand_item_execution_status,
      (elem->>'execution_status_updated_at')::timestamptz,
      elem->>'execution_error_details',
      UPPER(TRIM(elem->>'commitment_number')),
      COALESCE((elem->>'sort_order')::integer, 0),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'demand_products') elem
    WHERE (elem->>'id') IS NOT NULL
      AND (elem->>'demand_id') IS NOT NULL
      AND (elem->>'product_id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.demands WHERE id = (elem->>'demand_id')::uuid)
      AND EXISTS (SELECT 1 FROM public.products WHERE id = (elem->>'product_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      demand_id = EXCLUDED.demand_id,
      product_id = EXCLUDED.product_id,
      unit_id = EXCLUDED.unit_id,
      alias_id = EXCLUDED.alias_id,
      product_name_snapshot = EXCLUDED.product_name_snapshot,
      unit_name_snapshot = EXCLUDED.unit_name_snapshot,
      alias_name_snapshot = EXCLUDED.alias_name_snapshot,
      alias_code_snapshot = EXCLUDED.alias_code_snapshot,
      expense_nature_name_snapshot = EXCLUDED.expense_nature_name_snapshot,
      quantity = EXCLUDED.quantity,
      reference_price = EXCLUDED.reference_price,
      bid_interval = EXCLUDED.bid_interval,
      bid_interval_type = EXCLUDED.bid_interval_type,
      execution_status = EXCLUDED.execution_status,
      execution_status_updated_at = EXCLUDED.execution_status_updated_at,
      execution_error_details = EXCLUDED.execution_error_details,
      commitment_number = EXCLUDED.commitment_number,
      sort_order = EXCLUDED.sort_order,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_demand_products = ROW_COUNT;
  END IF;

  -- 25. DEMAND_PRODUCT_BIDS
  IF v_data ? 'demand_product_bids' AND jsonb_typeof(v_data->'demand_product_bids') = 'array' THEN
    INSERT INTO public.demand_product_bids (
      id, demand_product_id, supplier_id, amount, status, disqualification_reason, created_by, created_at
    )
    SELECT 
      ordered_bids.id,
      ordered_bids.demand_product_id,
      ordered_bids.supplier_id,
      ordered_bids.amount,
      ordered_bids.status,
      ordered_bids.disqualification_reason,
      ordered_bids.created_by,
      ordered_bids.base_created_at
        + ((ROW_NUMBER() OVER (
            PARTITION BY ordered_bids.demand_product_id, ordered_bids.base_created_at
            ORDER BY ordered_bids.ord ASC
          ) - 1) * INTERVAL '1 millisecond') AS created_at
    FROM (
      SELECT
        (elem->>'id')::uuid AS id,
        (elem->>'demand_product_id')::uuid AS demand_product_id,
        (elem->>'supplier_id')::uuid AS supplier_id,
        COALESCE((elem->>'amount')::numeric, 0) AS amount,
        COALESCE((elem->>'status')::public.bid_status, 'classified'::public.bid_status) AS status,
        elem->>'disqualification_reason' AS disqualification_reason,
        CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
             THEN (elem->>'created_by')::uuid
             ELSE auth.uid()
        END AS created_by,
        COALESCE((elem->>'created_at')::timestamptz, now()) AS base_created_at,
        ord
      FROM jsonb_array_elements(v_data->'demand_product_bids') WITH ORDINALITY AS t(elem, ord)
      WHERE (elem->>'id') IS NOT NULL
        AND EXISTS (SELECT 1 FROM public.demand_products WHERE id = (elem->>'demand_product_id')::uuid)
        AND EXISTS (SELECT 1 FROM public.suppliers WHERE id = (elem->>'supplier_id')::uuid)
    ) ordered_bids
    ORDER BY ordered_bids.ord ASC
    ON CONFLICT (id) DO UPDATE SET
      demand_product_id = EXCLUDED.demand_product_id,
      supplier_id = EXCLUDED.supplier_id,
      amount = EXCLUDED.amount,
      status = EXCLUDED.status,
      disqualification_reason = EXCLUDED.disqualification_reason,
      created_at = EXCLUDED.created_at;

    GET DIAGNOSTICS v_count_demand_bids = ROW_COUNT;
  END IF;

  -- Fallback backfill for legacy backups that did not include demand_commitments
  IF NOT (v_data ? 'demand_commitments') THEN
    v_count_demand_commitments := public.backfill_demand_commitments_from_products();
  END IF;

  -- 26. DEMAND_ITEM_STATUS_HISTORY
  IF v_data ? 'demand_item_status_history' AND jsonb_typeof(v_data->'demand_item_status_history') = 'array' THEN
    INSERT INTO public.demand_item_status_history (id, demand_product_id, status, observation, error_details, commitment_number, created_by, created_at)
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'demand_product_id')::uuid,
      (elem->>'status')::public.demand_item_execution_status,
      elem->>'observation',
      elem->>'error_details',
      UPPER(TRIM(elem->>'commitment_number')),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'demand_item_status_history') elem
    WHERE (elem->>'id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.demand_products WHERE id = (elem->>'demand_product_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status,
      observation = EXCLUDED.observation,
      error_details = EXCLUDED.error_details,
      commitment_number = EXCLUDED.commitment_number;

    GET DIAGNOSTICS v_count_demand_item_history = ROW_COUNT;
  END IF;

  -- 27. IIRGD_DEMAND_STATUS_HISTORY
  IF v_data ? 'iirgd_demand_status_history' AND jsonb_typeof(v_data->'iirgd_demand_status_history') = 'array' THEN
    INSERT INTO public.iirgd_demand_status_history (id, demand_id, status, observation, created_by, created_at)
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'demand_id')::uuid,
      (elem->>'status')::public.iirgd_demand_status,
      elem->>'observation',
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'iirgd_demand_status_history') elem
    WHERE (elem->>'id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.iirgd_demands WHERE id = (elem->>'demand_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status,
      observation = EXCLUDED.observation;

    GET DIAGNOSTICS v_count_iirgd_history = ROW_COUNT;
  END IF;

  -- 28. DEMAND_RESPONSIBLES
  IF v_data ? 'demand_responsibles' AND jsonb_typeof(v_data->'demand_responsibles') = 'array' THEN
    INSERT INTO public.demand_responsibles (id, demand_id, user_id, assigned_by, created_at)
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'demand_id')::uuid,
      (elem->>'user_id')::uuid,
      CASE WHEN (elem->>'assigned_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'assigned_by')::uuid)
           THEN (elem->>'assigned_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'demand_responsibles') elem
    WHERE (elem->>'id') IS NOT NULL
      AND (elem->>'demand_id') IS NOT NULL
      AND (elem->>'user_id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.demands WHERE id = (elem->>'demand_id')::uuid)
      AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'user_id')::uuid)
    ON CONFLICT (id) DO NOTHING;

    GET DIAGNOSTICS v_count_demand_responsibles = ROW_COUNT;
  END IF;

  -- 29. IIRGD_DEMANDS
  IF v_data ? 'iirgd_demands' AND jsonb_typeof(v_data->'iirgd_demands') = 'array' THEN
    INSERT INTO public.iirgd_demands (
      id, citizen_id, document_type_id, status, delivery_prediction,
      is_archived, created_by, created_at, updated_at
    )
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'citizen_id')::uuid,
      (elem->>'document_type_id')::uuid,
      COALESCE((elem->>'status')::public.iirgd_demand_status, 'registered'::public.iirgd_demand_status),
      (elem->>'delivery_prediction')::date,
      COALESCE((elem->>'is_archived')::boolean, false),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'iirgd_demands') elem
    WHERE (elem->>'id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.iirgd_citizens WHERE id = (elem->>'citizen_id')::uuid)
      AND EXISTS (SELECT 1 FROM public.iirgd_document_types WHERE id = (elem->>'document_type_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      citizen_id = EXCLUDED.citizen_id,
      document_type_id = EXCLUDED.document_type_id,
      status = EXCLUDED.status,
      delivery_prediction = EXCLUDED.delivery_prediction,
      is_archived = EXCLUDED.is_archived,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_iirgd_demands = ROW_COUNT;
  END IF;

  -- 30. SCHOOL_INCIDENTS
  IF v_data ? 'school_incidents' AND jsonb_typeof(v_data->'school_incidents') = 'array' THEN
    INSERT INTO public.school_incidents (
      id, title, description, status, terms_accepted,
      created_by, read_by, read_at, created_at, updated_at
    )
    SELECT 
      (elem->>'id')::uuid,
      elem->>'title',
      elem->>'description',
      COALESCE((elem->>'status')::public.school_incident_status, 'under_review'::public.school_incident_status),
      COALESCE((elem->>'terms_accepted')::boolean, true),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      CASE WHEN (elem->>'read_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'read_by')::uuid)
           THEN (elem->>'read_by')::uuid
           ELSE NULL
      END,
      (elem->>'read_at')::timestamptz,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'school_incidents') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      status = EXCLUDED.status,
      terms_accepted = EXCLUDED.terms_accepted,
      read_by = EXCLUDED.read_by,
      read_at = EXCLUDED.read_at,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_school_incidents = ROW_COUNT;
  END IF;

  -- 31. SCHOOL_INCIDENT_PARTICIPANTS
  IF v_data ? 'school_incident_participants' AND jsonb_typeof(v_data->'school_incident_participants') = 'array' THEN
    INSERT INTO public.school_incident_participants (
      id, incident_id, name, role, class_name, other_role, created_at
    )
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'incident_id')::uuid,
      elem->>'name',
      COALESCE((elem->>'role')::public.school_incident_participant_role, 'other'::public.school_incident_participant_role),
      elem->>'class_name',
      elem->>'other_role',
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'school_incident_participants') elem
    WHERE (elem->>'id') IS NOT NULL
      AND (elem->>'incident_id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.school_incidents WHERE id = (elem->>'incident_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      incident_id = EXCLUDED.incident_id,
      name = EXCLUDED.name,
      role = EXCLUDED.role,
      class_name = EXCLUDED.class_name,
      other_role = EXCLUDED.other_role;

    GET DIAGNOSTICS v_count_school_incident_participants = ROW_COUNT;
  END IF;

  -- 32. ELECTION_VOTES
  IF v_data ? 'election_votes' AND jsonb_typeof(v_data->'election_votes') = 'array' THEN
    INSERT INTO public.election_votes (
      id, election_id, ballot_box_id, candidate_id, is_blank,
      is_null, vote_hash, vote_timestamp, signature, created_at
    )
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'election_id')::uuid,
      (elem->>'ballot_box_id')::uuid,
      (elem->>'candidate_id')::uuid,
      COALESCE((elem->>'is_blank')::boolean, false),
      COALESCE((elem->>'is_null')::boolean, false),
      elem->>'vote_hash',
      COALESCE((elem->>'vote_timestamp')::timestamptz, now()),
      elem->>'signature',
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'election_votes') elem
    WHERE (elem->>'id') IS NOT NULL
      AND (elem->>'election_id') IS NOT NULL
      AND (elem->>'ballot_box_id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.elections WHERE id = (elem->>'election_id')::uuid)
      AND EXISTS (SELECT 1 FROM public.ballot_boxes WHERE id = (elem->>'ballot_box_id')::uuid)
      AND (
        (elem->>'candidate_id') IS NULL 
        OR EXISTS (SELECT 1 FROM public.candidates WHERE id = (elem->>'candidate_id')::uuid)
      )
    ON CONFLICT (id) DO NOTHING;

    GET DIAGNOSTICS v_count_election_votes = ROW_COUNT;
  END IF;

  -- 33. LOGS
  IF v_data ? 'logs' AND jsonb_typeof(v_data->'logs') = 'array' THEN
    INSERT INTO public.logs (id, user_id, action, description, created_at)
    SELECT 
      (elem->>'id')::uuid,
      CASE WHEN (elem->>'user_id') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'user_id')::uuid)
           THEN (elem->>'user_id')::uuid
           ELSE auth.uid()
      END,
      elem->>'action',
      elem->>'description',
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'logs') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO NOTHING;

    GET DIAGNOSTICS v_count_logs = ROW_COUNT;
  END IF;

  ALTER TABLE public.iirgd_demands ENABLE TRIGGER trigger_iirgd_demand_status_change;
  ALTER TABLE public.elections ENABLE TRIGGER trg_check_election_digits_count_update;
  ALTER TABLE public.demands ENABLE TRIGGER trg_demand_status_transition;
  ALTER TABLE public.demands ENABLE TRIGGER trg_validate_offer_opening_date;

  INSERT INTO public.logs (user_id, action, description)
  VALUES (auth.uid(), 'RESTORE_SYSTEM_BACKUP', 'Restauração de backup concluída com sucesso.');

  SELECT jsonb_build_object(
    'success', true,
    'restored_at', now(),
    'counts', jsonb_build_object(
      'profiles', v_count_profiles,
      'suppliers', v_count_suppliers,
      'expense_natures', v_count_expense_natures,
      'product_classes', v_count_product_classes,
      'measurement_units', v_count_measurement_units,
      'measurement_unit_aliases', v_count_unit_aliases,
      'measurement_unit_alias_links', v_count_unit_alias_links,
      'product_characteristic_keys', v_count_characteristic_keys,
      'products', v_count_products,
      'product_units', v_count_product_units,
      'product_characteristics', v_count_product_characteristics,
      'brands', v_count_brands,
      'real_products', v_count_real_products,
      'product_keywords', v_count_product_keywords,
      'iirgd_document_types', v_count_doc_types,
      'iirgd_settings', v_count_iirgd_settings,
      'system_settings', v_count_system_settings,
      'iirgd_citizens', v_count_citizens,
      'demands', v_count_demands,
      'demand_commitments', v_count_demand_commitments,
      'demand_commitment_liquidations', v_count_demand_commitment_liquidations,
      'demand_products', v_count_demand_products,
      'demand_product_bids', v_count_demand_bids,
      'demand_responsibles', v_count_demand_responsibles,
      'demand_item_status_history', v_count_demand_item_history,
      'iirgd_demands', v_count_iirgd_demands,
      'iirgd_demand_status_history', v_count_iirgd_history,
      'elections', v_count_elections,
      'candidates', v_count_candidates,
      'ballot_boxes', v_count_ballot_boxes,
      'election_committee_members', v_count_committee_members,
      'election_voters', v_count_voters,
      'election_voter_attendance', v_count_voter_attendance,
      'election_votes', v_count_election_votes,
      'school_incidents', v_count_school_incidents,
      'school_incident_participants', v_count_school_incident_participants,
      'logs', v_count_logs
    )
  ) INTO v_restored_counts;

  ALTER TABLE public.demand_product_bids ENABLE TRIGGER trg_check_bid_reference_price;
  RETURN v_restored_counts;

EXCEPTION WHEN OTHERS THEN
  ALTER TABLE public.iirgd_demands ENABLE TRIGGER trigger_iirgd_demand_status_change;
  ALTER TABLE public.elections ENABLE TRIGGER trg_check_election_digits_count_update;
  ALTER TABLE public.demands ENABLE TRIGGER trg_demand_status_transition;
  ALTER TABLE public.demands ENABLE TRIGGER trg_validate_offer_opening_date;
  ALTER TABLE public.demand_product_bids ENABLE TRIGGER trg_check_bid_reference_price;
  RAISE;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.restore_system_backup(jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
