-- Migration: 20261103170000_add_commitment_cancellation_and_failed_status.sql
-- Description: 
-- 1. Add 'cancelled' value to public.demand_item_execution_status enum.
-- 2. Add is_cancellation boolean column to public.demand_commitment_liquidations.
-- 3. Update restore_system_backup procedure to restore is_cancellation.

-- 1. Add 'cancelled' to demand_item_execution_status enum
ALTER TYPE public.demand_item_execution_status ADD VALUE IF NOT EXISTS 'cancelled';

-- 2. Add is_cancellation column to demand_commitment_liquidations
ALTER TABLE public.demand_commitment_liquidations
  ADD COLUMN IF NOT EXISTS is_cancellation BOOLEAN NOT NULL DEFAULT false;

-- 3. Update restore_system_backup procedure to include is_cancellation
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
  v_count_demand_commitments int := 0;
  v_count_demand_commitment_liquidations int := 0;
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

  ALTER TABLE public.demands DISABLE TRIGGER trg_demand_status_transition;
  ALTER TABLE public.demands DISABLE TRIGGER trg_validate_offer_opening_date;
  ALTER TABLE public.elections DISABLE TRIGGER trg_check_election_digits_count_update;
  ALTER TABLE public.iirgd_demands DISABLE TRIGGER trigger_iirgd_demand_status_change;
  ALTER TABLE public.demand_product_bids DISABLE TRIGGER trg_check_bid_reference_price;

  -- 1. PROFILES
  IF v_data ? 'profiles' AND jsonb_typeof(v_data->'profiles') = 'array' THEN
    INSERT INTO public.profiles (id, name, role, email, phone, is_active, theme, created_at, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      elem->>'name',
      COALESCE((elem->>'role')::public.user_role, 'user'::public.user_role),
      elem->>'email',
      elem->>'phone',
      COALESCE((elem->>'is_active')::boolean, true),
      COALESCE(elem->>'theme', 'light'),
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'profiles') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      role = EXCLUDED.role,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      is_active = EXCLUDED.is_active,
      theme = EXCLUDED.theme;

    GET DIAGNOSTICS v_count_profiles = ROW_COUNT;
  END IF;

  -- 2. SUPPLIERS
  IF v_data ? 'suppliers' AND jsonb_typeof(v_data->'suppliers') = 'array' THEN
    DELETE FROM public.suppliers s
    WHERE s.cnpj IN (
      SELECT regexp_replace(elem->>'cnpj', '\D', '', 'g')
      FROM jsonb_array_elements(v_data->'suppliers') elem
      WHERE (elem->>'cnpj') IS NOT NULL
    )
    AND s.id NOT IN (
      SELECT (elem->>'id')::uuid
      FROM jsonb_array_elements(v_data->'suppliers') elem
      WHERE (elem->>'id') IS NOT NULL
    );

    INSERT INTO public.suppliers (
      id, company_name, trade_name, cnpj, state_registration, municipal_registration,
      email, phone, address, complement, neighborhood, city, state, zip_code,
      contact_person, contact_phone, is_active, notes, created_at, updated_at,
      has_bb_account, is_simples_optant, legal_nature, main_activity
    )
    SELECT 
      (elem->>'id')::uuid,
      elem->>'company_name',
      elem->>'trade_name',
      regexp_replace(elem->>'cnpj', '\D', '', 'g'),
      elem->>'state_registration',
      elem->>'municipal_registration',
      elem->>'email',
      elem->>'phone',
      elem->>'address',
      elem->>'complement',
      elem->>'neighborhood',
      elem->>'city',
      elem->>'state',
      elem->>'zip_code',
      elem->>'contact_person',
      elem->>'contact_phone',
      COALESCE((elem->>'is_active')::boolean, true),
      elem->>'notes',
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now()),
      elem->>'has_bb_account',
      COALESCE((elem->>'is_simples_optant')::boolean, false),
      elem->>'legal_nature',
      elem->>'main_activity'
    FROM jsonb_array_elements(v_data->'suppliers') elem
    WHERE (elem->>'id') IS NOT NULL
      AND (elem->>'cnpj') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      company_name = EXCLUDED.company_name,
      trade_name = EXCLUDED.trade_name,
      cnpj = EXCLUDED.cnpj,
      state_registration = EXCLUDED.state_registration,
      municipal_registration = EXCLUDED.municipal_registration,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      address = EXCLUDED.address,
      complement = EXCLUDED.complement,
      neighborhood = EXCLUDED.neighborhood,
      city = EXCLUDED.city,
      state = EXCLUDED.state,
      zip_code = EXCLUDED.zip_code,
      contact_person = EXCLUDED.contact_person,
      contact_phone = EXCLUDED.contact_phone,
      is_active = EXCLUDED.is_active,
      notes = EXCLUDED.notes,
      has_bb_account = EXCLUDED.has_bb_account,
      is_simples_optant = EXCLUDED.is_simples_optant,
      legal_nature = EXCLUDED.legal_nature,
      main_activity = EXCLUDED.main_activity;

    GET DIAGNOSTICS v_count_suppliers = ROW_COUNT;
  END IF;

  -- 3. EXPENSE_NATURES
  IF v_data ? 'expense_natures' AND jsonb_typeof(v_data->'expense_natures') = 'array' THEN
    INSERT INTO public.expense_natures (id, name, is_active, is_pending, created_by, created_at, updated_at)
    SELECT 
      elem->>'id',
      elem->>'name',
      COALESCE((elem->>'is_active')::boolean, true),
      COALESCE((elem->>'is_pending')::boolean, false),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'expense_natures') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      is_active = EXCLUDED.is_active,
      is_pending = EXCLUDED.is_pending;

    GET DIAGNOSTICS v_count_expense_natures = ROW_COUNT;
  END IF;

  -- 4. PRODUCT_CLASSES
  IF v_data ? 'product_classes' AND jsonb_typeof(v_data->'product_classes') = 'array' THEN
    DELETE FROM public.product_classes pc
    WHERE pc.name IN (
      SELECT elem->>'name'
      FROM jsonb_array_elements(v_data->'product_classes') elem
      WHERE (elem->>'name') IS NOT NULL
    )
    AND pc.id NOT IN (
      SELECT elem->>'id'
      FROM jsonb_array_elements(v_data->'product_classes') elem
      WHERE (elem->>'id') IS NOT NULL
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
      is_pending = EXCLUDED.is_pending;

    GET DIAGNOSTICS v_count_product_classes = ROW_COUNT;
  END IF;

  -- 5. MEASUREMENT_UNITS
  IF v_data ? 'measurement_units' AND jsonb_typeof(v_data->'measurement_units') = 'array' THEN
    DELETE FROM public.measurement_units mu
    WHERE (
      mu.name IN (
        SELECT elem->>'name'
        FROM jsonb_array_elements(v_data->'measurement_units') elem
        WHERE (elem->>'name') IS NOT NULL
      )
      OR
      mu.symbol IN (
        SELECT elem->>'symbol'
        FROM jsonb_array_elements(v_data->'measurement_units') elem
        WHERE (elem->>'symbol') IS NOT NULL
      )
    )
    AND mu.id NOT IN (
      SELECT (elem->>'id')::uuid
      FROM jsonb_array_elements(v_data->'measurement_units') elem
      WHERE (elem->>'id') IS NOT NULL
    );

    INSERT INTO public.measurement_units (id, name, symbol, is_active, is_pending, created_by, created_at, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      elem->>'name',
      elem->>'symbol',
      COALESCE((elem->>'is_active')::boolean, true),
      COALESCE((elem->>'is_pending')::boolean, false),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'measurement_units') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      symbol = EXCLUDED.symbol,
      is_active = EXCLUDED.is_active,
      is_pending = EXCLUDED.is_pending;

    GET DIAGNOSTICS v_count_measurement_units = ROW_COUNT;
  END IF;

  -- 6. MEASUREMENT_UNIT_ALIASES
  IF v_data ? 'measurement_unit_aliases' AND jsonb_typeof(v_data->'measurement_unit_aliases') = 'array' THEN
    INSERT INTO public.measurement_unit_aliases (id, code, name, is_active, created_by, created_at, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'code')::int,
      elem->>'name',
      COALESCE((elem->>'is_active')::boolean, true),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'measurement_unit_aliases') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      code = EXCLUDED.code,
      name = EXCLUDED.name,
      is_active = EXCLUDED.is_active;

    GET DIAGNOSTICS v_count_unit_aliases = ROW_COUNT;
  END IF;

  -- 7. MEASUREMENT_UNIT_ALIAS_LINKS
  IF v_data ? 'measurement_unit_alias_links' AND jsonb_typeof(v_data->'measurement_unit_alias_links') = 'array' THEN
    INSERT INTO public.measurement_unit_alias_links (id, alias_id, unit_id, is_default, created_at)
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'alias_id')::uuid,
      (elem->>'unit_id')::uuid,
      COALESCE((elem->>'is_default')::boolean, false),
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'measurement_unit_alias_links') elem
    WHERE (elem->>'id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.measurement_unit_aliases WHERE id = (elem->>'alias_id')::uuid)
      AND EXISTS (SELECT 1 FROM public.measurement_units WHERE id = (elem->>'unit_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      alias_id = EXCLUDED.alias_id,
      unit_id = EXCLUDED.unit_id,
      is_default = EXCLUDED.is_default;

    GET DIAGNOSTICS v_count_unit_alias_links = ROW_COUNT;
  END IF;

  -- 8. PRODUCT_CHARACTERISTIC_KEYS
  IF v_data ? 'product_characteristic_keys' AND jsonb_typeof(v_data->'product_characteristic_keys') = 'array' THEN
    DELETE FROM public.product_characteristic_keys pck
    WHERE pck.name IN (
      SELECT elem->>'name'
      FROM jsonb_array_elements(v_data->'product_characteristic_keys') elem
      WHERE (elem->>'name') IS NOT NULL
    )
    AND pck.id NOT IN (
      SELECT (elem->>'id')::uuid
      FROM jsonb_array_elements(v_data->'product_characteristic_keys') elem
      WHERE (elem->>'id') IS NOT NULL
    );

    INSERT INTO public.product_characteristic_keys (id, name, is_active, is_pending, created_by, created_at, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      elem->>'name',
      COALESCE((elem->>'is_active')::boolean, true),
      COALESCE((elem->>'is_pending')::boolean, false),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'product_characteristic_keys') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      is_active = EXCLUDED.is_active,
      is_pending = EXCLUDED.is_pending;

    GET DIAGNOSTICS v_count_characteristic_keys = ROW_COUNT;
  END IF;

  -- 9. PRODUCTS
  IF v_data ? 'products' AND jsonb_typeof(v_data->'products') = 'array' THEN
    INSERT INTO public.products (
      id, name, expense_nature_id, product_class_id, cat_bec, cat_mat,
      is_active, created_by, created_at, updated_at
    )
    SELECT 
      (elem->>'id')::uuid,
      elem->>'name',
      elem->>'expense_nature_id',
      elem->>'product_class_id',
      (elem->>'cat_bec')::int,
      (elem->>'cat_mat')::int,
      COALESCE((elem->>'is_active')::boolean, true),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'products') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      expense_nature_id = EXCLUDED.expense_nature_id,
      product_class_id = EXCLUDED.product_class_id,
      cat_bec = EXCLUDED.cat_bec,
      cat_mat = EXCLUDED.cat_mat,
      is_active = EXCLUDED.is_active;

    GET DIAGNOSTICS v_count_products = ROW_COUNT;
  END IF;

  -- 10. PRODUCT_UNITS
  IF v_data ? 'product_units' AND jsonb_typeof(v_data->'product_units') = 'array' THEN
    INSERT INTO public.product_units (id, product_id, unit_id, is_default, created_at)
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'product_id')::uuid,
      (elem->>'unit_id')::uuid,
      COALESCE((elem->>'is_default')::boolean, false),
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'product_units') elem
    WHERE (elem->>'id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.products WHERE id = (elem->>'product_id')::uuid)
      AND EXISTS (SELECT 1 FROM public.measurement_units WHERE id = (elem->>'unit_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      product_id = EXCLUDED.product_id,
      unit_id = EXCLUDED.unit_id,
      is_default = EXCLUDED.is_default;

    GET DIAGNOSTICS v_count_product_units = ROW_COUNT;
  END IF;

  -- 11. PRODUCT_CHARACTERISTICS
  IF v_data ? 'product_characteristics' AND jsonb_typeof(v_data->'product_characteristics') = 'array' THEN
    INSERT INTO public.product_characteristics (id, product_id, key_id, value, created_at)
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'product_id')::uuid,
      (elem->>'key_id')::uuid,
      elem->>'value',
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'product_characteristics') elem
    WHERE (elem->>'id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.products WHERE id = (elem->>'product_id')::uuid)
      AND EXISTS (SELECT 1 FROM public.product_characteristic_keys WHERE id = (elem->>'key_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      product_id = EXCLUDED.product_id,
      key_id = EXCLUDED.key_id,
      value = EXCLUDED.value;

    GET DIAGNOSTICS v_count_product_characteristics = ROW_COUNT;
  END IF;

  -- 12. DEMANDS
  IF v_data ? 'demands' AND jsonb_typeof(v_data->'demands') = 'array' THEN
    INSERT INTO public.demands (
      id, name, type, status, offer_opening_date, dispute_date,
      process_number, internal_process_number, id_pca, siafem_number,
      created_by, deleted_at, created_at, updated_at
    )
    SELECT 
      (elem->>'id')::uuid,
      elem->>'name',
      COALESCE((elem->>'type')::public.demand_type, 'consumption'::public.demand_type),
      COALESCE((elem->>'status')::public.demand_status, 'planning'::public.demand_status),
      (elem->>'offer_opening_date')::date,
      (elem->>'dispute_date')::date,
      elem->>'process_number',
      elem->>'internal_process_number',
      elem->>'id_pca',
      elem->>'siafem_number',
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      (elem->>'deleted_at')::timestamptz,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'demands') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      type = EXCLUDED.type,
      status = EXCLUDED.status,
      offer_opening_date = EXCLUDED.offer_opening_date,
      dispute_date = EXCLUDED.dispute_date,
      process_number = EXCLUDED.process_number,
      internal_process_number = EXCLUDED.internal_process_number,
      id_pca = EXCLUDED.id_pca,
      siafem_number = EXCLUDED.siafem_number,
      deleted_at = EXCLUDED.deleted_at;

    GET DIAGNOSTICS v_count_demands = ROW_COUNT;
  END IF;

  -- 13. DEMAND_COMMITMENTS
  IF v_data ? 'demand_commitments' AND jsonb_typeof(v_data->'demand_commitments') = 'array' THEN
    DELETE FROM public.demand_commitments dc
    WHERE dc.commitment_number IN (
      SELECT UPPER(TRIM(elem->>'commitment_number'))
      FROM jsonb_array_elements(v_data->'demand_commitments') elem
      WHERE (elem->>'commitment_number') IS NOT NULL
    )
    AND dc.id NOT IN (
      SELECT (elem->>'id')::uuid
      FROM jsonb_array_elements(v_data->'demand_commitments') elem
      WHERE (elem->>'id') IS NOT NULL
    );

    INSERT INTO public.demand_commitments (
      id, commitment_number, demand_id, supplier_id, expense_nature_id,
      status, issue_date, observation, error_details,
      disbursement_program_number, disbursement_program_issued_at, disbursement_program_observation,
      bank_order_number, bank_order_issued_at, bank_order_observation,
      created_by, created_at, updated_at
    )
    SELECT
      COALESCE((elem->>'id')::uuid, gen_random_uuid()),
      UPPER(TRIM(elem->>'commitment_number')),
      (elem->>'demand_id')::uuid,
      (elem->>'supplier_id')::uuid,
      elem->>'expense_nature_id',
      COALESCE((elem->>'status')::public.demand_item_execution_status, 'commitment_issued'::public.demand_item_execution_status),
      COALESCE((elem->>'issue_date')::date, CURRENT_DATE),
      NULLIF(TRIM(elem->>'observation'), ''),
      NULLIF(TRIM(elem->>'error_details'), ''),
      NULLIF(UPPER(TRIM(elem->>'disbursement_program_number')), ''),
      (elem->>'disbursement_program_issued_at')::date,
      NULLIF(TRIM(elem->>'disbursement_program_observation'), ''),
      NULLIF(UPPER(TRIM(elem->>'bank_order_number')), ''),
      (elem->>'bank_order_issued_at')::date,
      NULLIF(TRIM(elem->>'bank_order_observation'), ''),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'demand_commitments') elem
    WHERE (elem->>'commitment_number') IS NOT NULL
      AND (elem->>'demand_id') IS NOT NULL
      AND (elem->>'supplier_id') IS NOT NULL
      AND UPPER(TRIM(elem->>'commitment_number')) ~ '^\d{4}NE\d{5}$'
      AND EXISTS (SELECT 1 FROM public.demands WHERE id = (elem->>'demand_id')::uuid)
      AND EXISTS (SELECT 1 FROM public.suppliers WHERE id = (elem->>'supplier_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      commitment_number = EXCLUDED.commitment_number,
      demand_id = EXCLUDED.demand_id,
      supplier_id = EXCLUDED.supplier_id,
      expense_nature_id = EXCLUDED.expense_nature_id,
      status = EXCLUDED.status,
      issue_date = EXCLUDED.issue_date,
      observation = EXCLUDED.observation,
      error_details = EXCLUDED.error_details,
      disbursement_program_number = EXCLUDED.disbursement_program_number,
      disbursement_program_issued_at = EXCLUDED.disbursement_program_issued_at,
      disbursement_program_observation = EXCLUDED.disbursement_program_observation,
      bank_order_number = EXCLUDED.bank_order_number,
      bank_order_issued_at = EXCLUDED.bank_order_issued_at,
      bank_order_observation = EXCLUDED.bank_order_observation;

    GET DIAGNOSTICS v_count_demand_commitments = ROW_COUNT;
  END IF;

  -- 14. DEMAND_COMMITMENT_LIQUIDATIONS (includes is_cancellation)
  IF v_data ? 'demand_commitment_liquidations' AND jsonb_typeof(v_data->'demand_commitment_liquidations') = 'array' THEN
    DELETE FROM public.demand_commitment_liquidations dcl
    WHERE dcl.liquidation_number IN (
      SELECT UPPER(TRIM(elem->>'liquidation_number'))
      FROM jsonb_array_elements(v_data->'demand_commitment_liquidations') elem
      WHERE (elem->>'liquidation_number') IS NOT NULL
    )
    AND dcl.id NOT IN (
      SELECT (elem->>'id')::uuid
      FROM jsonb_array_elements(v_data->'demand_commitment_liquidations') elem
      WHERE (elem->>'id') IS NOT NULL
    );

    INSERT INTO public.demand_commitment_liquidations (
      id, commitment_id, liquidation_number, issue_date, observation, is_cancellation, created_by, created_at
    )
    SELECT
      COALESCE((elem->>'id')::uuid, gen_random_uuid()),
      (elem->>'commitment_id')::uuid,
      UPPER(TRIM(elem->>'liquidation_number')),
      COALESCE((elem->>'issue_date')::date, CURRENT_DATE),
      NULLIF(TRIM(elem->>'observation'), ''),
      COALESCE((elem->>'is_cancellation')::boolean, false),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'demand_commitment_liquidations') elem
    WHERE (elem->>'commitment_id') IS NOT NULL
      AND (elem->>'liquidation_number') IS NOT NULL
      AND UPPER(TRIM(elem->>'liquidation_number')) ~ '^\d{4}NL\d{5}$'
      AND EXISTS (SELECT 1 FROM public.demand_commitments WHERE id = (elem->>'commitment_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      commitment_id = EXCLUDED.commitment_id,
      liquidation_number = EXCLUDED.liquidation_number,
      issue_date = EXCLUDED.issue_date,
      observation = EXCLUDED.observation,
      is_cancellation = EXCLUDED.is_cancellation;

    GET DIAGNOSTICS v_count_demand_commitment_liquidations = ROW_COUNT;
  END IF;

  -- 15. DEMAND_PRODUCTS
  IF v_data ? 'demand_products' AND jsonb_typeof(v_data->'demand_products') = 'array' THEN
    INSERT INTO public.demand_products (
      id, demand_id, product_id, unit_id, alias_id, quantity, reference_price,
      sort_order, bid_interval, bid_interval_type, commitment_number,
      execution_status, execution_error_details, execution_status_updated_at,
      product_name_snapshot, unit_name_snapshot, alias_name_snapshot,
      alias_code_snapshot, expense_nature_name_snapshot,
      created_by, created_at, updated_at
    )
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'demand_id')::uuid,
      (elem->>'product_id')::uuid,
      (elem->>'unit_id')::uuid,
      (elem->>'alias_id')::uuid,
      COALESCE((elem->>'quantity')::numeric, 1),
      (elem->>'reference_price')::numeric,
      COALESCE((elem->>'sort_order')::int, 0),
      (elem->>'bid_interval')::numeric,
      elem->>'bid_interval_type',
      elem->>'commitment_number',
      (elem->>'execution_status')::public.demand_item_execution_status,
      elem->>'execution_error_details',
      (elem->>'execution_status_updated_at')::timestamptz,
      elem->>'product_name_snapshot',
      elem->>'unit_name_snapshot',
      elem->>'alias_name_snapshot',
      (elem->>'alias_code_snapshot')::int,
      elem->>'expense_nature_name_snapshot',
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'demand_products') elem
    WHERE (elem->>'id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.demands WHERE id = (elem->>'demand_id')::uuid)
      AND EXISTS (SELECT 1 FROM public.products WHERE id = (elem->>'product_id')::uuid)
      AND EXISTS (SELECT 1 FROM public.measurement_units WHERE id = (elem->>'unit_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      quantity = EXCLUDED.quantity,
      reference_price = EXCLUDED.reference_price,
      sort_order = EXCLUDED.sort_order,
      bid_interval = EXCLUDED.bid_interval,
      bid_interval_type = EXCLUDED.bid_interval_type,
      commitment_number = EXCLUDED.commitment_number,
      execution_status = EXCLUDED.execution_status,
      execution_error_details = EXCLUDED.execution_error_details,
      execution_status_updated_at = EXCLUDED.execution_status_updated_at;

    GET DIAGNOSTICS v_count_demand_products = ROW_COUNT;
  END IF;

  -- 16. DEMAND_PRODUCT_BIDS
  IF v_data ? 'demand_product_bids' AND jsonb_typeof(v_data->'demand_product_bids') = 'array' THEN
    INSERT INTO public.demand_product_bids (id, demand_product_id, supplier_id, amount, status, disqualification_reason, created_at)
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'demand_product_id')::uuid,
      (elem->>'supplier_id')::uuid,
      (elem->>'amount')::numeric,
      COALESCE((elem->>'status')::public.bid_status, 'classified'::public.bid_status),
      elem->>'disqualification_reason',
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'demand_product_bids') elem
    WHERE (elem->>'id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.demand_products WHERE id = (elem->>'demand_product_id')::uuid)
      AND EXISTS (SELECT 1 FROM public.suppliers WHERE id = (elem->>'supplier_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      amount = EXCLUDED.amount,
      status = EXCLUDED.status,
      disqualification_reason = EXCLUDED.disqualification_reason;

    GET DIAGNOSTICS v_count_demand_bids = ROW_COUNT;
  END IF;

  -- 17. DEMAND_RESPONSIBLES
  IF v_data ? 'demand_responsibles' AND jsonb_typeof(v_data->'demand_responsibles') = 'array' THEN
    INSERT INTO public.demand_responsibles (id, demand_id, user_id, created_at)
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'demand_id')::uuid,
      (elem->>'user_id')::uuid,
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'demand_responsibles') elem
    WHERE (elem->>'id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.demands WHERE id = (elem->>'demand_id')::uuid)
      AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'user_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      demand_id = EXCLUDED.demand_id,
      user_id = EXCLUDED.user_id;

    GET DIAGNOSTICS v_count_demand_responsibles = ROW_COUNT;
  END IF;

  -- 18. DEMAND_ITEM_STATUS_HISTORY
  IF v_data ? 'demand_item_status_history' AND jsonb_typeof(v_data->'demand_item_status_history') = 'array' THEN
    INSERT INTO public.demand_item_status_history (
      id, demand_product_id, status, observation, error_details, commitment_number, created_by, created_at
    )
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

  -- 19. IIRGD_DOCUMENT_TYPES
  IF v_data ? 'iirgd_document_types' AND jsonb_typeof(v_data->'iirgd_document_types') = 'array' THEN
    INSERT INTO public.iirgd_document_types (id, name, is_active, is_pending, created_by, created_at, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      elem->>'name',
      COALESCE((elem->>'is_active')::boolean, true),
      COALESCE((elem->>'is_pending')::boolean, false),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'iirgd_document_types') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      is_active = EXCLUDED.is_active,
      is_pending = EXCLUDED.is_pending;

    GET DIAGNOSTICS v_count_doc_types = ROW_COUNT;
  END IF;

  -- 20. IIRGD_CITIZENS
  IF v_data ? 'iirgd_citizens' AND jsonb_typeof(v_data->'iirgd_citizens') = 'array' THEN
    INSERT INTO public.iirgd_citizens (
      id, name, rg, cpf, other_document, other_document_type_id,
      birth_date, notes, created_by, created_at, updated_at
    )
    SELECT 
      (elem->>'id')::uuid,
      UPPER(elem->>'name'),
      elem->>'rg',
      elem->>'cpf',
      elem->>'other_document',
      (elem->>'other_document_type_id')::uuid,
      (elem->>'birth_date')::date,
      elem->>'notes',
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
      other_document_type_id = EXCLUDED.other_document_type_id,
      birth_date = EXCLUDED.birth_date,
      notes = EXCLUDED.notes;

    GET DIAGNOSTICS v_count_citizens = ROW_COUNT;
  END IF;

  -- 21. IIRGD_DEMANDS
  IF v_data ? 'iirgd_demands' AND jsonb_typeof(v_data->'iirgd_demands') = 'array' THEN
    INSERT INTO public.iirgd_demands (
      id, demand_number, citizen_id, status, description, notes,
      assigned_to, priority, error_details, created_by, created_at, updated_at
    )
    SELECT 
      (elem->>'id')::uuid,
      elem->>'demand_number',
      (elem->>'citizen_id')::uuid,
      COALESCE((elem->>'status')::public.iirgd_demand_status, 'pending'::public.iirgd_demand_status),
      elem->>'description',
      elem->>'notes',
      (elem->>'assigned_to')::uuid,
      COALESCE((elem->>'priority')::public.iirgd_priority, 'medium'::public.iirgd_priority),
      elem->>'error_details',
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'iirgd_demands') elem
    WHERE (elem->>'id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.iirgd_citizens WHERE id = (elem->>'citizen_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status,
      description = EXCLUDED.description,
      notes = EXCLUDED.notes,
      assigned_to = EXCLUDED.assigned_to,
      priority = EXCLUDED.priority,
      error_details = EXCLUDED.error_details;

    GET DIAGNOSTICS v_count_iirgd_demands = ROW_COUNT;
  END IF;

  -- 22. IIRGD_DEMAND_STATUS_HISTORY
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

  -- 23. IIRGD_SETTINGS
  IF v_data ? 'iirgd_settings' AND jsonb_typeof(v_data->'iirgd_settings') = 'array' THEN
    INSERT INTO public.iirgd_settings (id, sla_hours_by_priority, updated_at)
    SELECT 
      COALESCE((elem->>'id')::uuid, '00000000-0000-0000-0000-000000000001'::uuid),
      COALESCE(elem->'sla_hours_by_priority', '{"low": 72, "high": 24, "urgent": 12, "medium": 48}'::jsonb),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'iirgd_settings') elem
    ON CONFLICT (id) DO UPDATE SET
      sla_hours_by_priority = EXCLUDED.sla_hours_by_priority;

    GET DIAGNOSTICS v_count_iirgd_settings = ROW_COUNT;
  END IF;

  -- 24. SYSTEM_SETTINGS
  IF v_data ? 'system_settings' AND jsonb_typeof(v_data->'system_settings') = 'array' THEN
    INSERT INTO public.system_settings (id, product_class_annual_ceilings, updated_at)
    SELECT 
      COALESCE((elem->>'id')::uuid, '00000000-0000-0000-0000-000000000002'::uuid),
      COALESCE(elem->'product_class_annual_ceilings', '{"2026": 65492.11}'::jsonb),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'system_settings') elem
    ON CONFLICT (id) DO UPDATE SET
      product_class_annual_ceilings = EXCLUDED.product_class_annual_ceilings;

    GET DIAGNOSTICS v_count_system_settings = ROW_COUNT;
  END IF;

  -- 25. ELECTIONS
  IF v_data ? 'elections' AND jsonb_typeof(v_data->'elections') = 'array' THEN
    INSERT INTO public.elections (
      id, name, election_date, digits_count, is_uppercase, status, voting_mode, is_anonymous,
      description, created_by, deleted_at, created_at, updated_at
    )
    SELECT 
      (elem->>'id')::uuid,
      elem->>'name',
      (elem->>'election_date')::date,
      COALESCE((elem->>'digits_count')::int, 2),
      COALESCE((elem->>'is_uppercase')::boolean, true),
      COALESCE((elem->>'status')::public.election_status, 'awaiting_release'::public.election_status),
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
      deleted_at = EXCLUDED.deleted_at;

    GET DIAGNOSTICS v_count_elections = ROW_COUNT;
  END IF;

  -- 26. CANDIDATES
  IF v_data ? 'candidates' AND jsonb_typeof(v_data->'candidates') = 'array' THEN
    INSERT INTO public.candidates (id, election_id, name, number, photo_url, created_at, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'election_id')::uuid,
      elem->>'name',
      elem->>'number',
      elem->>'photo_url',
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'candidates') elem
    WHERE (elem->>'id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.elections WHERE id = (elem->>'election_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      number = EXCLUDED.number,
      photo_url = EXCLUDED.photo_url;

    GET DIAGNOSTICS v_count_candidates = ROW_COUNT;
  END IF;

  -- 27. BALLOT_BOXES
  IF v_data ? 'ballot_boxes' AND jsonb_typeof(v_data->'ballot_boxes') = 'array' THEN
    INSERT INTO public.ballot_boxes (id, election_id, name, is_active, created_at, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'election_id')::uuid,
      elem->>'name',
      COALESCE((elem->>'is_active')::boolean, true),
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'ballot_boxes') elem
    WHERE (elem->>'id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.elections WHERE id = (elem->>'election_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      is_active = EXCLUDED.is_active;

    GET DIAGNOSTICS v_count_ballot_boxes = ROW_COUNT;
  END IF;

  -- 28. ELECTION_COMMITTEE_MEMBERS
  IF v_data ? 'election_committee_members' AND jsonb_typeof(v_data->'election_committee_members') = 'array' THEN
    INSERT INTO public.election_committee_members (id, election_id, user_id, created_at)
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'election_id')::uuid,
      (elem->>'user_id')::uuid,
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'election_committee_members') elem
    WHERE (elem->>'id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.elections WHERE id = (elem->>'election_id')::uuid)
      AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'user_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      election_id = EXCLUDED.election_id,
      user_id = EXCLUDED.user_id;

    GET DIAGNOSTICS v_count_committee_members = ROW_COUNT;
  END IF;

  -- 29. ELECTION_VOTERS
  IF v_data ? 'election_voters' AND jsonb_typeof(v_data->'election_voters') = 'array' THEN
    INSERT INTO public.election_voters (
      id, election_id, name, cpf, registration_number, observation,
      status, attendance_status, voted_at, ballot_box_id,
      created_by, created_at, updated_at
    )
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'election_id')::uuid,
      elem->>'name',
      elem->>'cpf',
      elem->>'registration_number',
      elem->>'observation',
      COALESCE((elem->>'status')::public.election_voter_status, 'active'::public.election_voter_status),
      COALESCE((elem->>'attendance_status')::public.election_voter_attendance_status, 'pending'::public.election_voter_attendance_status),
      (elem->>'voted_at')::timestamptz,
      (elem->>'ballot_box_id')::uuid,
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'election_voters') elem
    WHERE (elem->>'id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.elections WHERE id = (elem->>'election_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      cpf = EXCLUDED.cpf,
      registration_number = EXCLUDED.registration_number,
      observation = EXCLUDED.observation,
      status = EXCLUDED.status,
      attendance_status = EXCLUDED.attendance_status,
      voted_at = EXCLUDED.voted_at,
      ballot_box_id = EXCLUDED.ballot_box_id;

    GET DIAGNOSTICS v_count_voters = ROW_COUNT;
  END IF;

  -- 30. ELECTION_VOTER_ATTENDANCE
  IF v_data ? 'election_voter_attendance' AND jsonb_typeof(v_data->'election_voter_attendance') = 'array' THEN
    INSERT INTO public.election_voter_attendance (id, election_id, voter_id, ballot_box_id, created_by, created_at)
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'election_id')::uuid,
      (elem->>'voter_id')::uuid,
      (elem->>'ballot_box_id')::uuid,
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'election_voter_attendance') elem
    WHERE (elem->>'id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.elections WHERE id = (elem->>'election_id')::uuid)
      AND EXISTS (SELECT 1 FROM public.election_voters WHERE id = (elem->>'voter_id')::uuid)
      AND EXISTS (SELECT 1 FROM public.ballot_boxes WHERE id = (elem->>'ballot_box_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      ballot_box_id = EXCLUDED.ballot_box_id;

    GET DIAGNOSTICS v_count_voter_attendance = ROW_COUNT;
  END IF;

  -- 31. ELECTION_VOTES
  IF v_data ? 'election_votes' AND jsonb_typeof(v_data->'election_votes') = 'array' THEN
    INSERT INTO public.election_votes (id, election_id, ballot_box_id, candidate_id, voter_id, vote_type, created_at)
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'election_id')::uuid,
      (elem->>'ballot_box_id')::uuid,
      (elem->>'candidate_id')::uuid,
      (elem->>'voter_id')::uuid,
      (elem->>'vote_type')::public.election_vote_type,
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'election_votes') elem
    WHERE (elem->>'id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.elections WHERE id = (elem->>'election_id')::uuid)
      AND EXISTS (SELECT 1 FROM public.ballot_boxes WHERE id = (elem->>'ballot_box_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      candidate_id = EXCLUDED.candidate_id,
      vote_type = EXCLUDED.vote_type;

    GET DIAGNOSTICS v_count_election_votes = ROW_COUNT;
  END IF;

  -- 32. LOGS
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
  ALTER TABLE public.demand_product_bids ENABLE TRIGGER trg_check_bid_reference_price;

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
      'logs', v_count_logs
    )
  ) INTO v_restored_counts;

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
