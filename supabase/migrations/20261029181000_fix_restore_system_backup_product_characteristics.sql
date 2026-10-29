-- Migration: 20261029181000_fix_restore_system_backup_product_characteristics.sql
-- Description:
-- 1. Update generate_system_backup to version 1.8 (30 tables).
-- 2. Fix restore_system_backup to restore all 30 tables including product_characteristic_keys,
--    product_characteristics, election tables, and demands.is_historical.
-- 3. Disable demand validation triggers during restore so historical or in-progress demands
--    can be restored at level 2 before demand_products at level 3.

-- 1. Update generate_system_backup to v1.8 (30 tables)
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
    'version', '1.8',
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
      'demands', (SELECT count(*) FROM public.demands),
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
      'logs', (SELECT count(*) FROM public.logs)
    ),
    'data', jsonb_build_object(
      'profiles', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.profiles t), '[]'::jsonb),
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
      'demands', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.demands t), '[]'::jsonb),
      'demand_products', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.demand_products t), '[]'::jsonb),
      'demand_product_bids', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.demand_product_bids t), '[]'::jsonb),
      'demand_responsibles', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.demand_responsibles t), '[]'::jsonb),
      'demand_item_status_history', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.demand_item_status_history t), '[]'::jsonb),
      'iirgd_document_types', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.iirgd_document_types t), '[]'::jsonb),
      'iirgd_citizens', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.iirgd_citizens t), '[]'::jsonb),
      'iirgd_demands', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.iirgd_demands t), '[]'::jsonb),
      'iirgd_demand_status_history', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.iirgd_demand_status_history t), '[]'::jsonb),
      'iirgd_settings', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.iirgd_settings t), '[]'::jsonb),
      'system_settings', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.system_settings t), '[]'::jsonb),
      'elections', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.elections t), '[]'::jsonb),
      'candidates', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.candidates t), '[]'::jsonb),
      'ballot_boxes', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.ballot_boxes t), '[]'::jsonb),
      'election_committee_members', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.election_committee_members t), '[]'::jsonb),
      'election_voters', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.election_voters t), '[]'::jsonb),
      'election_voter_attendance', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.election_voter_attendance t), '[]'::jsonb),
      'election_votes', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.election_votes t), '[]'::jsonb),
      'logs', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.logs t), '[]'::jsonb)
    )
  ) INTO v_result;

  INSERT INTO public.logs (user_id, action, description)
  VALUES (auth.uid(), 'GENERATE_SYSTEM_BACKUP', 'Backup completo do sistema gerado com sucesso.');

  RETURN v_result;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.generate_system_backup() TO authenticated;

-- 2. Update restore_system_backup to v1.8 (30 tables)
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
  v_count_doc_types int := 0;
  v_count_iirgd_settings int := 0;
  v_count_system_settings int := 0;
  v_count_citizens int := 0;
  v_count_demands int := 0;
  v_count_demand_products int := 0;
  v_count_demand_bids int := 0;
  v_count_demand_responsibles int := 0;
  v_count_demand_item_history int := 0;
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

  IF v_data IS NULL OR jsonb_typeof(v_data) != 'object' THEN
    RAISE EXCEPTION 'Payload de backup inválido: bloco de dados ausente.';
  END IF;

  ALTER TABLE public.iirgd_demands DISABLE TRIGGER trigger_iirgd_demand_status_change;
  ALTER TABLE public.elections DISABLE TRIGGER trg_check_election_digits_count_update;
  ALTER TABLE public.demands DISABLE TRIGGER trg_demand_status_transition;
  ALTER TABLE public.demands DISABLE TRIGGER trg_validate_offer_opening_date;

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
    WHERE s.cnpj IN (
      SELECT elem->>'cnpj' 
      FROM jsonb_array_elements(v_data->'suppliers') elem
      WHERE (elem->>'cnpj') IS NOT NULL AND (elem->>'cnpj') != ''
    )
    AND s.id NOT IN (
      SELECT (elem->>'id')::uuid 
      FROM jsonb_array_elements(v_data->'suppliers') elem
      WHERE (elem->>'id') IS NOT NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.demand_product_bids b WHERE b.supplier_id = s.id
    );

    INSERT INTO public.suppliers (id, cnpj, company_name, responsible_name, email, cell_phone, landline, address, has_bb_account, is_simples_optant, simples_optant_verified_at, is_active, created_at, updated_at, created_by)
    SELECT 
      (elem->>'id')::uuid,
      elem->>'cnpj',
      elem->>'company_name',
      NULLIF(TRIM(elem->>'responsible_name'), ''),
      NULLIF(TRIM(elem->>'email'), ''),
      NULLIF(TRIM(elem->>'cell_phone'), ''),
      NULLIF(TRIM(elem->>'landline'), ''),
      NULLIF(TRIM(elem->>'address'), ''),
      NULLIF(TRIM(elem->>'has_bb_account'), ''),
      COALESCE((elem->>'is_simples_optant')::boolean, false),
      (elem->>'simples_optant_verified_at')::timestamptz,
      COALESCE((elem->>'is_active')::boolean, true),
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now()),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END
    FROM jsonb_array_elements(v_data->'suppliers') elem
    WHERE (elem->>'id') IS NOT NULL AND (elem->>'cnpj') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      cnpj = EXCLUDED.cnpj,
      company_name = EXCLUDED.company_name,
      responsible_name = EXCLUDED.responsible_name,
      email = EXCLUDED.email,
      cell_phone = EXCLUDED.cell_phone,
      landline = EXCLUDED.landline,
      address = EXCLUDED.address,
      has_bb_account = EXCLUDED.has_bb_account,
      is_simples_optant = EXCLUDED.is_simples_optant,
      simples_optant_verified_at = EXCLUDED.simples_optant_verified_at,
      is_active = EXCLUDED.is_active,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_suppliers = ROW_COUNT;
  END IF;

  -- 3. EXPENSE_NATURES
  IF v_data ? 'expense_natures' AND jsonb_typeof(v_data->'expense_natures') = 'array' THEN
    DELETE FROM public.expense_natures en
    WHERE (
      en.id IN (
        SELECT elem->>'id' 
        FROM jsonb_array_elements(v_data->'expense_natures') elem
        WHERE (elem->>'id') IS NOT NULL
      )
      OR en.name IN (
        SELECT elem->>'name' 
        FROM jsonb_array_elements(v_data->'expense_natures') elem
        WHERE (elem->>'name') IS NOT NULL
      )
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
    WHERE mu.name IN (
      SELECT elem->>'name' 
      FROM jsonb_array_elements(v_data->'measurement_units') elem
      WHERE (elem->>'name') IS NOT NULL
    )
    AND mu.id NOT IN (
      SELECT (elem->>'id')::uuid 
      FROM jsonb_array_elements(v_data->'measurement_units') elem
      WHERE (elem->>'id') IS NOT NULL
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
    DELETE FROM public.measurement_unit_aliases mua
    WHERE (
      mua.code IN (
        SELECT (elem->>'code')::integer 
        FROM jsonb_array_elements(v_data->'measurement_unit_aliases') elem
        WHERE (elem->>'code') IS NOT NULL
      )
      OR mua.name IN (
        SELECT elem->>'name' 
        FROM jsonb_array_elements(v_data->'measurement_unit_aliases') elem
        WHERE (elem->>'name') IS NOT NULL
      )
    )
    AND mua.id NOT IN (
      SELECT (elem->>'id')::uuid 
      FROM jsonb_array_elements(v_data->'measurement_unit_aliases') elem
      WHERE (elem->>'id') IS NOT NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.demand_products dp WHERE dp.alias_id = mua.id
    );

    INSERT INTO public.measurement_unit_aliases (id, code, name, unit_id, is_pending, created_at)
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'code')::integer,
      elem->>'name',
      CASE WHEN (elem->>'unit_id') IS NOT NULL AND EXISTS (SELECT 1 FROM public.measurement_units WHERE id = (elem->>'unit_id')::uuid)
           THEN (elem->>'unit_id')::uuid
           ELSE NULL
      END,
      COALESCE((elem->>'is_pending')::boolean, false),
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'measurement_unit_aliases') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      code = EXCLUDED.code,
      name = EXCLUDED.name,
      unit_id = EXCLUDED.unit_id,
      is_pending = EXCLUDED.is_pending;

    GET DIAGNOSTICS v_count_unit_aliases = ROW_COUNT;
  END IF;

  -- 6b. PRODUCT_CHARACTERISTIC_KEYS
  IF v_data ? 'product_characteristic_keys' AND jsonb_typeof(v_data->'product_characteristic_keys') = 'array' THEN
    DELETE FROM public.product_characteristic_keys pck
    WHERE LOWER(TRIM(pck.name)) IN (
      SELECT LOWER(TRIM(elem->>'name'))
      FROM jsonb_array_elements(v_data->'product_characteristic_keys') elem
      WHERE (elem->>'name') IS NOT NULL
    )
    AND pck.id NOT IN (
      SELECT (elem->>'id')::uuid
      FROM jsonb_array_elements(v_data->'product_characteristic_keys') elem
      WHERE (elem->>'id') IS NOT NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.product_characteristics pc WHERE pc.key_id = pck.id
    );

    INSERT INTO public.product_characteristic_keys (id, name, is_active, is_pending, created_at, updated_at)
    SELECT
      COALESCE((elem->>'id')::uuid, gen_random_uuid()),
      TRIM(elem->>'name'),
      COALESCE((elem->>'is_active')::boolean, true),
      COALESCE((elem->>'is_pending')::boolean, false),
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'product_characteristic_keys') elem
    WHERE NULLIF(TRIM(elem->>'name'), '') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.product_characteristic_keys existing
        WHERE existing.name = TRIM(elem->>'name')
          AND existing.id != COALESCE((elem->>'id')::uuid, existing.id)
      )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      is_active = EXCLUDED.is_active,
      is_pending = EXCLUDED.is_pending,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_characteristic_keys = ROW_COUNT;
  END IF;

  -- 7. IIRGD_DOCUMENT_TYPES
  IF v_data ? 'iirgd_document_types' AND jsonb_typeof(v_data->'iirgd_document_types') = 'array' THEN
    DELETE FROM public.iirgd_document_types dt
    WHERE dt.name IN (
      SELECT elem->>'name' 
      FROM jsonb_array_elements(v_data->'iirgd_document_types') elem
      WHERE (elem->>'name') IS NOT NULL
    )
    AND dt.id NOT IN (
      SELECT (elem->>'id')::uuid 
      FROM jsonb_array_elements(v_data->'iirgd_document_types') elem
      WHERE (elem->>'id') IS NOT NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.iirgd_demands d WHERE d.document_type_id = dt.id
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

  -- 8. IIRGD_SETTINGS
  IF v_data ? 'iirgd_settings' AND jsonb_typeof(v_data->'iirgd_settings') = 'array' THEN
    INSERT INTO public.iirgd_settings (id, alert_days, delay_days, updated_by, singleton_key, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      COALESCE((elem->>'alert_days')::integer, (elem->>'warning_days')::integer, 10),
      COALESCE((elem->>'delay_days')::integer, (elem->>'deadline_days')::integer, 5),
      CASE WHEN (elem->>'updated_by') IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = (elem->>'updated_by')::uuid)
           THEN (elem->>'updated_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'singleton_key')::boolean, true),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'iirgd_settings') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (singleton_key) DO UPDATE SET
      alert_days = EXCLUDED.alert_days,
      delay_days = EXCLUDED.delay_days,
      updated_by = EXCLUDED.updated_by,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_iirgd_settings = ROW_COUNT;
  END IF;

  -- 9. SYSTEM_SETTINGS
  IF v_data ? 'system_settings' AND jsonb_typeof(v_data->'system_settings') = 'array' THEN
    INSERT INTO public.system_settings (key, value, description, updated_by, updated_at)
    SELECT 
      elem->>'key',
      elem->>'value',
      elem->>'description',
      CASE WHEN (elem->>'updated_by') IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = (elem->>'updated_by')::uuid)
           THEN (elem->>'updated_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'system_settings') elem
    WHERE (elem->>'key') IS NOT NULL
    ON CONFLICT (key) DO UPDATE SET
      value = EXCLUDED.value,
      description = EXCLUDED.description,
      updated_by = EXCLUDED.updated_by,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_system_settings = ROW_COUNT;
  END IF;

  -- 10. PRODUCTS
  IF v_data ? 'products' AND jsonb_typeof(v_data->'products') = 'array' THEN
    DELETE FROM public.products p
    WHERE (
      (p.cat_mat IS NOT NULL AND p.cat_mat IN (
        SELECT COALESCE((elem->>'cat_mat')::bigint, (elem->>'catmat')::bigint)
        FROM jsonb_array_elements(v_data->'products') elem 
        WHERE (elem->>'cat_mat') IS NOT NULL OR (elem->>'catmat') IS NOT NULL
      ))
      OR (p.cat_bec IS NOT NULL AND p.cat_bec IN (
        SELECT COALESCE((elem->>'cat_bec')::bigint, (elem->>'catbec')::bigint)
        FROM jsonb_array_elements(v_data->'products') elem 
        WHERE (elem->>'cat_bec') IS NOT NULL OR (elem->>'catbec') IS NOT NULL
      ))
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
      elem->>'expense_nature_id',
      elem->>'product_class_id',
      COALESCE((elem->>'is_active')::boolean, true),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'products') elem
    WHERE (elem->>'id') IS NOT NULL
      AND (
        (elem->>'expense_nature_id') IS NULL 
        OR EXISTS (SELECT 1 FROM public.expense_natures WHERE id = elem->>'expense_nature_id')
      )
      AND (
        (elem->>'product_class_id') IS NULL 
        OR EXISTS (SELECT 1 FROM public.product_classes WHERE id = elem->>'product_class_id')
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
        (SELECT id FROM public.product_characteristic_keys WHERE id = (elem->>'key_id')::uuid),
        (SELECT pck.id FROM public.product_characteristic_keys pck
         WHERE LOWER(TRIM(pck.name)) = (
           SELECT LOWER(TRIM(bpck->>'name'))
           FROM jsonb_array_elements(v_data->'product_characteristic_keys') bpck
           WHERE (bpck->>'id')::uuid = (elem->>'key_id')::uuid
           LIMIT 1
         )
         LIMIT 1
        )
      ),
      TRIM(elem->>'value'),
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'product_characteristics') elem
    WHERE (elem->>'product_id') IS NOT NULL
      AND (elem->>'key_id') IS NOT NULL
      AND NULLIF(TRIM(elem->>'value'), '') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.products WHERE id = (elem->>'product_id')::uuid)
      AND (
        EXISTS (SELECT 1 FROM public.product_characteristic_keys WHERE id = (elem->>'key_id')::uuid)
        OR EXISTS (
          SELECT 1 FROM public.product_characteristic_keys pck
          WHERE LOWER(TRIM(pck.name)) = (
            SELECT LOWER(TRIM(bpck->>'name'))
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
      AND (
        NULLIF(TRIM(elem->>'rg'), '') IS NOT NULL 
        OR NULLIF(TRIM(elem->>'cpf'), '') IS NOT NULL 
        OR NULLIF(TRIM(elem->>'other_document'), '') IS NOT NULL
      )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      rg = EXCLUDED.rg,
      cpf = EXCLUDED.cpf,
      other_document = EXCLUDED.other_document,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_citizens = ROW_COUNT;
  END IF;

  -- 12. DEMANDS
  IF v_data ? 'demands' AND jsonb_typeof(v_data->'demands') = 'array' THEN
    DELETE FROM public.demands d
    WHERE d.internal_process_number IN (
      SELECT elem->>'internal_process_number'
      FROM jsonb_array_elements(v_data->'demands') elem
      WHERE (elem->>'internal_process_number') IS NOT NULL AND (elem->>'internal_process_number') != ''
    )
    AND d.id NOT IN (
      SELECT (elem->>'id')::uuid
      FROM jsonb_array_elements(v_data->'demands') elem
      WHERE (elem->>'id') IS NOT NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.demand_products dp WHERE dp.demand_id = d.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.demand_responsibles dr WHERE dr.demand_id = d.id
    );

    INSERT INTO public.demands (
      id, name, type, status, user_id,
      internal_process_number, process_number, id_pca,
      bidding_notice_number, dispute_number, contract_number,
      dispute_date, offer_opening_date, siafem_number,
      is_return_requested, is_historical, deleted_at, created_at, updated_at
    )
    SELECT 
      (elem->>'id')::uuid,
      elem->>'name',
      COALESCE((elem->>'type')::public.demand_type, 'consumption'::public.demand_type),
      COALESCE((elem->>'status')::public.demand_status, 'planning'::public.demand_status),
      CASE WHEN (elem->>'user_id') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'user_id')::uuid)
           THEN (elem->>'user_id')::uuid
           WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      elem->>'internal_process_number',
      elem->>'process_number',
      COALESCE(elem->>'id_pca', elem->>'pca_number'),
      elem->>'bidding_notice_number',
      elem->>'dispute_number',
      elem->>'contract_number',
      (elem->>'dispute_date')::timestamptz,
      (elem->>'offer_opening_date')::timestamptz,
      elem->>'siafem_number',
      COALESCE((elem->>'is_return_requested')::boolean, false),
      COALESCE((elem->>'is_historical')::boolean, false),
      (elem->>'deleted_at')::timestamptz,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'demands') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      type = EXCLUDED.type,
      status = EXCLUDED.status,
      user_id = EXCLUDED.user_id,
      internal_process_number = EXCLUDED.internal_process_number,
      process_number = EXCLUDED.process_number,
      id_pca = EXCLUDED.id_pca,
      bidding_notice_number = EXCLUDED.bidding_notice_number,
      dispute_number = EXCLUDED.dispute_number,
      contract_number = EXCLUDED.contract_number,
      dispute_date = EXCLUDED.dispute_date,
      offer_opening_date = EXCLUDED.offer_opening_date,
      siafem_number = EXCLUDED.siafem_number,
      is_return_requested = EXCLUDED.is_return_requested,
      is_historical = EXCLUDED.is_historical,
      deleted_at = EXCLUDED.deleted_at,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_demands = ROW_COUNT;
  END IF;

  -- 13. ELECTIONS
  IF v_data ? 'elections' AND jsonb_typeof(v_data->'elections') = 'array' THEN
    INSERT INTO public.elections (
      id, name, election_date, digits_count, is_uppercase, status, voting_mode, is_anonymous,
      description, created_by, deleted_at, created_at, updated_at
    )
    SELECT 
      (elem->>'id')::uuid,
      elem->>'name',
      (elem->>'election_date')::timestamptz,
      COALESCE((elem->>'digits_count')::integer, 2),
      COALESCE((elem->>'is_uppercase')::boolean, false),
      (elem->>'status')::public.election_status,
      COALESCE((elem->>'voting_mode')::public.election_voting_mode, 'simple'::public.election_voting_mode),
      COALESCE((elem->>'is_anonymous')::boolean, true),
      elem->>'description',
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      (elem->>'deleted_at')::timestamptz,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'elections') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      election_date = EXCLUDED.election_date,
      digits_count = EXCLUDED.digits_count,
      is_uppercase = EXCLUDED.is_uppercase,
      status = EXCLUDED.status,
      voting_mode = EXCLUDED.voting_mode,
      is_anonymous = EXCLUDED.is_anonymous,
      description = EXCLUDED.description,
      created_by = EXCLUDED.created_by,
      deleted_at = EXCLUDED.deleted_at,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_elections = ROW_COUNT;
  END IF;

  -- 14. MEASUREMENT_UNIT_ALIAS_LINKS
  IF v_data ? 'measurement_unit_alias_links' AND jsonb_typeof(v_data->'measurement_unit_alias_links') = 'array' THEN
    INSERT INTO public.measurement_unit_alias_links (id, unit_id, alias_id, created_at)
    SELECT 
      COALESCE((elem->>'id')::uuid, gen_random_uuid()),
      (elem->>'unit_id')::uuid,
      (elem->>'alias_id')::uuid,
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'measurement_unit_alias_links') elem
    WHERE (elem->>'unit_id') IS NOT NULL
      AND (elem->>'alias_id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.measurement_units WHERE id = (elem->>'unit_id')::uuid)
      AND EXISTS (SELECT 1 FROM public.measurement_unit_aliases WHERE id = (elem->>'alias_id')::uuid)
    ON CONFLICT (unit_id, alias_id) DO NOTHING;

    GET DIAGNOSTICS v_count_unit_alias_links = ROW_COUNT;
  END IF;

  INSERT INTO public.measurement_unit_alias_links (unit_id, alias_id)
  SELECT mu.id, mua.id
  FROM public.measurement_units mu
  CROSS JOIN public.measurement_unit_aliases mua
  WHERE LOWER(mu.name) = 'unidade' AND mua.code = 1
  ON CONFLICT (unit_id, alias_id) DO NOTHING;

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
    ON CONFLICT (id) DO UPDATE SET
      product_id = EXCLUDED.product_id,
      unit_id = EXCLUDED.unit_id;

    GET DIAGNOSTICS v_count_product_units = ROW_COUNT;
  END IF;

  -- 16. DEMAND_RESPONSIBLES
  IF v_data ? 'demand_responsibles' AND jsonb_typeof(v_data->'demand_responsibles') = 'array' THEN
    INSERT INTO public.demand_responsibles (demand_id, user_id, created_at)
    SELECT 
      (elem->>'demand_id')::uuid,
      (elem->>'user_id')::uuid,
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'demand_responsibles') elem
    WHERE (elem->>'demand_id') IS NOT NULL
      AND (elem->>'user_id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.demands WHERE id = (elem->>'demand_id')::uuid)
      AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'user_id')::uuid)
    ON CONFLICT (demand_id, user_id) DO NOTHING;

    GET DIAGNOSTICS v_count_demand_responsibles = ROW_COUNT;
  END IF;

  -- 17. DEMAND_PRODUCTS
  IF v_data ? 'demand_products' AND jsonb_typeof(v_data->'demand_products') = 'array' THEN
    INSERT INTO public.demand_products (
      id, demand_id, product_id, quantity, created_by, unit_id,
      alias_id, alias_name_snapshot, alias_code_snapshot,
      product_name_snapshot, unit_name_snapshot, reference_price,
      bid_interval, bid_interval_type, expense_nature_name_snapshot,
      sort_order, execution_status, execution_error_details, execution_status_updated_at,
      commitment_number, created_at, updated_at
    )
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'demand_id')::uuid,
      (elem->>'product_id')::uuid,
      COALESCE((elem->>'quantity')::numeric, 0),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      (elem->>'unit_id')::uuid,
      CASE WHEN (elem->>'alias_id') IS NOT NULL AND EXISTS (SELECT 1 FROM public.measurement_unit_aliases WHERE id = (elem->>'alias_id')::uuid)
           THEN (elem->>'alias_id')::uuid
           ELSE NULL
      END,
      elem->>'alias_name_snapshot',
      (elem->>'alias_code_snapshot')::integer,
      elem->>'product_name_snapshot',
      elem->>'unit_name_snapshot',
      (elem->>'reference_price')::numeric,
      (elem->>'bid_interval')::numeric,
      elem->>'bid_interval_type',
      elem->>'expense_nature_name_snapshot',
      COALESCE((elem->>'sort_order')::integer, 0),
      (elem->>'execution_status')::public.demand_item_execution_status,
      elem->>'execution_error_details',
      (elem->>'execution_status_updated_at')::timestamptz,
      elem->>'commitment_number',
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'demand_products') elem
    WHERE (elem->>'id') IS NOT NULL
      AND (elem->>'demand_id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.demands WHERE id = (elem->>'demand_id')::uuid)
      AND EXISTS (SELECT 1 FROM public.products WHERE id = (elem->>'product_id')::uuid)
      AND EXISTS (SELECT 1 FROM public.measurement_units WHERE id = (elem->>'unit_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      quantity = EXCLUDED.quantity,
      unit_id = EXCLUDED.unit_id,
      alias_id = EXCLUDED.alias_id,
      alias_name_snapshot = EXCLUDED.alias_name_snapshot,
      alias_code_snapshot = EXCLUDED.alias_code_snapshot,
      product_name_snapshot = EXCLUDED.product_name_snapshot,
      unit_name_snapshot = EXCLUDED.unit_name_snapshot,
      reference_price = EXCLUDED.reference_price,
      bid_interval = EXCLUDED.bid_interval,
      bid_interval_type = EXCLUDED.bid_interval_type,
      expense_nature_name_snapshot = EXCLUDED.expense_nature_name_snapshot,
      sort_order = EXCLUDED.sort_order,
      execution_status = EXCLUDED.execution_status,
      execution_error_details = EXCLUDED.execution_error_details,
      execution_status_updated_at = EXCLUDED.execution_status_updated_at,
      commitment_number = EXCLUDED.commitment_number,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_demand_products = ROW_COUNT;
  END IF;

  -- 18. IIRGD_DEMANDS
  IF v_data ? 'iirgd_demands' AND jsonb_typeof(v_data->'iirgd_demands') = 'array' THEN
    INSERT INTO public.iirgd_demands (id, station_code, observation, status, created_by, citizen_id, document_type_id, created_at, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      elem->>'station_code',
      elem->>'observation',
      (elem->>'status')::public.iirgd_demand_status,
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      (elem->>'citizen_id')::uuid,
      COALESCE(
        (SELECT id FROM public.iirgd_document_types WHERE id = (elem->>'document_type_id')::uuid),
        (SELECT dt.id FROM public.iirgd_document_types dt 
         WHERE dt.name = (
           SELECT bdt->>'name' 
           FROM jsonb_array_elements(v_data->'iirgd_document_types') bdt 
           WHERE (bdt->>'id')::uuid = (elem->>'document_type_id')::uuid
         )
         LIMIT 1
        ),
        NULL
      ),
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'iirgd_demands') elem
    WHERE (elem->>'id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.iirgd_citizens WHERE id = (elem->>'citizen_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      station_code = EXCLUDED.station_code,
      observation = EXCLUDED.observation,
      status = EXCLUDED.status,
      document_type_id = EXCLUDED.document_type_id,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_iirgd_demands = ROW_COUNT;
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
    WHERE (elem->>'election_id') IS NOT NULL
      AND NULLIF(TRIM(elem->>'name'), '') IS NOT NULL
      AND NULLIF(TRIM(elem->>'role_name'), '') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.elections WHERE id = (elem->>'election_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      election_id = EXCLUDED.election_id,
      name = EXCLUDED.name,
      role_name = EXCLUDED.role_name,
      sort_order = EXCLUDED.sort_order,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_committee_members = ROW_COUNT;
  END IF;

  -- 22. ELECTION_VOTERS
  IF v_data ? 'election_voters' AND jsonb_typeof(v_data->'election_voters') = 'array' THEN
    INSERT INTO public.election_voters (
      id, voter_registration_number, name, is_active, created_at, updated_at
    )
    SELECT 
      COALESCE((elem->>'id')::uuid, gen_random_uuid()),
      TRIM(elem->>'voter_registration_number'),
      TRIM(elem->>'name'),
      COALESCE((elem->>'is_active')::boolean, true),
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'election_voters') elem
    WHERE (elem->>'id') IS NOT NULL
      AND NULLIF(TRIM(elem->>'voter_registration_number'), '') IS NOT NULL
      AND NULLIF(TRIM(elem->>'name'), '') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      voter_registration_number = EXCLUDED.voter_registration_number,
      name = EXCLUDED.name,
      is_active = EXCLUDED.is_active,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_voters = ROW_COUNT;
  END IF;

  -- 23. ELECTION_VOTER_ATTENDANCE
  IF v_data ? 'election_voter_attendance' AND jsonb_typeof(v_data->'election_voter_attendance') = 'array' THEN
    INSERT INTO public.election_voter_attendance (
      id, election_id, ballot_box_id, voter_id, voter_registration_number,
      released_by, voted_at, created_at
    )
    SELECT 
      COALESCE((elem->>'id')::uuid, gen_random_uuid()),
      (elem->>'election_id')::uuid,
      CASE WHEN (elem->>'ballot_box_id') IS NOT NULL AND EXISTS (SELECT 1 FROM public.ballot_boxes WHERE id = (elem->>'ballot_box_id')::uuid)
           THEN (elem->>'ballot_box_id')::uuid
           ELSE NULL
      END,
      CASE WHEN (elem->>'voter_id') IS NOT NULL AND EXISTS (SELECT 1 FROM public.election_voters WHERE id = (elem->>'voter_id')::uuid)
           THEN (elem->>'voter_id')::uuid
           ELSE (SELECT id FROM public.election_voters WHERE voter_registration_number = TRIM(elem->>'voter_registration_number') LIMIT 1)
      END,
      TRIM(elem->>'voter_registration_number'),
      CASE WHEN (elem->>'released_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'released_by')::uuid)
           THEN (elem->>'released_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'voted_at')::timestamptz, now()),
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'election_voter_attendance') elem
    WHERE (elem->>'election_id') IS NOT NULL
      AND NULLIF(TRIM(elem->>'voter_registration_number'), '') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.elections WHERE id = (elem->>'election_id')::uuid)
    ON CONFLICT (election_id, voter_registration_number) DO UPDATE SET
      ballot_box_id = EXCLUDED.ballot_box_id,
      voter_id = EXCLUDED.voter_id,
      released_by = EXCLUDED.released_by,
      voted_at = EXCLUDED.voted_at;

    GET DIAGNOSTICS v_count_voter_attendance = ROW_COUNT;
  END IF;

  -- 24. ELECTION_VOTES
  IF v_data ? 'election_votes' AND jsonb_typeof(v_data->'election_votes') = 'array' THEN
    INSERT INTO public.election_votes (
      id, election_id, ballot_box_id, candidate_id,
      candidate_number, is_blank, is_null,
      voter_id, voter_registration_number, voter_name,
      created_at
    )
    SELECT 
      COALESCE((elem->>'id')::uuid, gen_random_uuid()),
      (elem->>'election_id')::uuid,
      CASE WHEN (elem->>'ballot_box_id') IS NOT NULL AND EXISTS (SELECT 1 FROM public.ballot_boxes WHERE id = (elem->>'ballot_box_id')::uuid)
           THEN (elem->>'ballot_box_id')::uuid
           ELSE NULL
      END,
      CASE WHEN (elem->>'candidate_id') IS NOT NULL AND EXISTS (SELECT 1 FROM public.candidates WHERE id = (elem->>'candidate_id')::uuid)
           THEN (elem->>'candidate_id')::uuid
           ELSE NULL
      END,
      elem->>'candidate_number',
      COALESCE((elem->>'is_blank')::boolean, false),
      COALESCE((elem->>'is_null')::boolean, false),
      CASE WHEN (elem->>'voter_id') IS NOT NULL AND EXISTS (SELECT 1 FROM public.election_voters WHERE id = (elem->>'voter_id')::uuid)
           THEN (elem->>'voter_id')::uuid
           ELSE NULL
      END,
      elem->>'voter_registration_number',
      elem->>'voter_name',
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'election_votes') elem
    WHERE (elem->>'election_id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.elections WHERE id = (elem->>'election_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      ballot_box_id = EXCLUDED.ballot_box_id,
      candidate_id = EXCLUDED.candidate_id,
      candidate_number = EXCLUDED.candidate_number,
      is_blank = EXCLUDED.is_blank,
      is_null = EXCLUDED.is_null,
      voter_id = EXCLUDED.voter_id,
      voter_registration_number = EXCLUDED.voter_registration_number,
      voter_name = EXCLUDED.voter_name;

    GET DIAGNOSTICS v_count_election_votes = ROW_COUNT;
  END IF;

  -- 25. DEMAND_PRODUCT_BIDS
  IF v_data ? 'demand_product_bids' AND jsonb_typeof(v_data->'demand_product_bids') = 'array' THEN
    INSERT INTO public.demand_product_bids (id, demand_product_id, supplier_id, amount, status, disqualification_reason, created_by, created_at)
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'demand_product_id')::uuid,
      (elem->>'supplier_id')::uuid,
      COALESCE((elem->>'amount')::numeric, 0),
      COALESCE((elem->>'status')::public.bid_status, 'classified'::public.bid_status),
      elem->>'disqualification_reason',
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'demand_product_bids') elem
    WHERE (elem->>'id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.demand_products WHERE id = (elem->>'demand_product_id')::uuid)
      AND EXISTS (SELECT 1 FROM public.suppliers WHERE id = (elem->>'supplier_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      supplier_id = EXCLUDED.supplier_id,
      amount = EXCLUDED.amount,
      status = EXCLUDED.status,
      disqualification_reason = EXCLUDED.disqualification_reason;

    GET DIAGNOSTICS v_count_demand_bids = ROW_COUNT;
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
      elem->>'commitment_number',
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

  -- 28. LOGS
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
      'iirgd_document_types', v_count_doc_types,
      'iirgd_settings', v_count_iirgd_settings,
      'system_settings', v_count_system_settings,
      'iirgd_citizens', v_count_citizens,
      'demands', v_count_demands,
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
      'logs', v_count_logs
    )
  ) INTO v_restored_counts;

  RETURN v_restored_counts;

EXCEPTION WHEN OTHERS THEN
  ALTER TABLE public.iirgd_demands ENABLE TRIGGER trigger_iirgd_demand_status_change;
  ALTER TABLE public.elections ENABLE TRIGGER trg_check_election_digits_count_update;
  ALTER TABLE public.demands ENABLE TRIGGER trg_demand_status_transition;
  ALTER TABLE public.demands ENABLE TRIGGER trg_validate_offer_opening_date;
  RAISE;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.restore_system_backup(jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
