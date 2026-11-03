-- Migration: Sincronização automática entre demand_products e demand_commitments
-- Data: 2026-11-03 18:00:00

-- 1. Sincronizar dados existentes descompassados (ex: 2026NE00032 e outros)
UPDATE public.demand_commitments c
SET 
  status = p.execution_status,
  updated_at = NOW()
FROM (
  SELECT DISTINCT ON (commitment_number)
    commitment_number,
    execution_status
  FROM public.demand_products
  WHERE commitment_number IS NOT NULL
  ORDER BY commitment_number, execution_status_updated_at DESC NULLS LAST, updated_at DESC
) p
WHERE c.commitment_number = p.commitment_number
  AND c.status <> p.execution_status;

-- 2. Criar função e trigger para manter demand_commitments sempre sincronizado com demand_products
CREATE OR REPLACE FUNCTION public.sync_demand_product_commitment_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.commitment_number IS NOT NULL AND (
    TG_OP = 'INSERT' 
    OR OLD.execution_status IS DISTINCT FROM NEW.execution_status 
    OR OLD.commitment_number IS DISTINCT FROM NEW.commitment_number
  ) THEN
    IF NEW.execution_status IN ('commitment_issued', 'commitment_sent', 'commitment_confirmed', 'shipped', 'delivered', 'completed', 'cancelled', 'error') THEN
      UPDATE public.demand_commitments
      SET
        status = NEW.execution_status,
        error_details = CASE WHEN NEW.execution_status = 'error' THEN NEW.execution_error_details ELSE error_details END,
        updated_at = NOW()
      WHERE commitment_number = NEW.commitment_number
        AND status <> NEW.execution_status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_demand_product_commitment_status ON public.demand_products;
CREATE TRIGGER trg_sync_demand_product_commitment_status
AFTER INSERT OR UPDATE OF execution_status, commitment_number, execution_error_details
ON public.demand_products
FOR EACH ROW
EXECUTE FUNCTION public.sync_demand_product_commitment_status();

-- 3. Atualizar restore_system_backup para desativar/reativar a trigger
CREATE OR REPLACE FUNCTION public.restore_system_backup(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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
  ALTER TABLE public.demand_products DISABLE TRIGGER trg_sync_demand_product_commitment_status;

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
    INSERT INTO public.suppliers (
      id, company_name, trade_name, cnpj, state_registration, municipal_registration,
      address, email, phone, mobile_phone, legal_representative_name,
      legal_representative_cpf, has_bb_account, is_simples_optant,
      is_active, notes, created_at, updated_at
    )
    SELECT 
      (elem->>'id')::uuid,
      elem->>'company_name',
      elem->>'trade_name',
      elem->>'cnpj',
      elem->>'state_registration',
      elem->>'municipal_registration',
      elem->>'address',
      elem->>'email',
      elem->>'phone',
      elem->>'mobile_phone',
      elem->>'legal_representative_name',
      elem->>'legal_representative_cpf',
      COALESCE((elem->>'has_bb_account')::boolean, false),
      COALESCE((elem->>'is_simples_optant')::boolean, false),
      COALESCE((elem->>'is_active')::boolean, true),
      elem->>'notes',
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'suppliers') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      company_name = EXCLUDED.company_name,
      trade_name = EXCLUDED.trade_name,
      cnpj = EXCLUDED.cnpj,
      state_registration = EXCLUDED.state_registration,
      municipal_registration = EXCLUDED.municipal_registration,
      address = EXCLUDED.address,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      mobile_phone = EXCLUDED.mobile_phone,
      legal_representative_name = EXCLUDED.legal_representative_name,
      legal_representative_cpf = EXCLUDED.legal_representative_cpf,
      has_bb_account = EXCLUDED.has_bb_account,
      is_simples_optant = EXCLUDED.is_simples_optant,
      is_active = EXCLUDED.is_active,
      notes = EXCLUDED.notes;

    GET DIAGNOSTICS v_count_suppliers = ROW_COUNT;
  END IF;

  -- 3. EXPENSE NATURES
  IF v_data ? 'expense_natures' AND jsonb_typeof(v_data->'expense_natures') = 'array' THEN
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
      is_pending = EXCLUDED.is_pending;

    GET DIAGNOSTICS v_count_expense_natures = ROW_COUNT;
  END IF;

  -- 4. PRODUCT CLASSES
  IF v_data ? 'product_classes' AND jsonb_typeof(v_data->'product_classes') = 'array' THEN
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

  -- 5. MEASUREMENT UNITS
  IF v_data ? 'measurement_units' AND jsonb_typeof(v_data->'measurement_units') = 'array' THEN
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
      is_pending = EXCLUDED.is_pending;

    GET DIAGNOSTICS v_count_measurement_units = ROW_COUNT;
  END IF;

  -- 6. MEASUREMENT UNIT ALIASES
  IF v_data ? 'measurement_unit_aliases' AND jsonb_typeof(v_data->'measurement_unit_aliases') = 'array' THEN
    INSERT INTO public.measurement_unit_aliases (id, name, created_at)
    SELECT 
      (elem->>'id')::uuid,
      elem->>'name',
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'measurement_unit_aliases') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name;

    GET DIAGNOSTICS v_count_unit_aliases = ROW_COUNT;
  END IF;

  -- 7. MEASUREMENT UNIT ALIAS LINKS
  IF v_data ? 'measurement_unit_alias_links' AND jsonb_typeof(v_data->'measurement_unit_alias_links') = 'array' THEN
    INSERT INTO public.measurement_unit_alias_links (id, unit_id, alias_id, created_at)
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'unit_id')::uuid,
      (elem->>'alias_id')::uuid,
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'measurement_unit_alias_links') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      unit_id = EXCLUDED.unit_id,
      alias_id = EXCLUDED.alias_id;

    GET DIAGNOSTICS v_count_unit_alias_links = ROW_COUNT;
  END IF;

  -- 8. PRODUCT CHARACTERISTIC KEYS
  IF v_data ? 'product_characteristic_keys' AND jsonb_typeof(v_data->'product_characteristic_keys') = 'array' THEN
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
      is_pending = EXCLUDED.is_pending;

    GET DIAGNOSTICS v_count_characteristic_keys = ROW_COUNT;
  END IF;

  -- 9. PRODUCTS
  IF v_data ? 'products' AND jsonb_typeof(v_data->'products') = 'array' THEN
    INSERT INTO public.products (
      id, name, expense_nature_id, product_class_id, default_measurement_unit_id,
      final_measurement_unit_id, cat_mat, cat_bec, is_active, created_at, updated_at
    )
    SELECT 
      (elem->>'id')::uuid,
      elem->>'name',
      elem->>'expense_nature_id',
      elem->>'product_class_id',
      (elem->>'default_measurement_unit_id')::uuid,
      (elem->>'final_measurement_unit_id')::uuid,
      elem->>'cat_mat',
      elem->>'cat_bec',
      COALESCE((elem->>'is_active')::boolean, true),
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'products') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      expense_nature_id = EXCLUDED.expense_nature_id,
      product_class_id = EXCLUDED.product_class_id,
      default_measurement_unit_id = EXCLUDED.default_measurement_unit_id,
      final_measurement_unit_id = EXCLUDED.final_measurement_unit_id,
      cat_mat = EXCLUDED.cat_mat,
      cat_bec = EXCLUDED.cat_bec,
      is_active = EXCLUDED.is_active;

    GET DIAGNOSTICS v_count_products = ROW_COUNT;
  END IF;

  -- 10. PRODUCT UNITS
  IF v_data ? 'product_units' AND jsonb_typeof(v_data->'product_units') = 'array' THEN
    INSERT INTO public.product_units (id, product_id, unit_id, created_at)
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'product_id')::uuid,
      (elem->>'unit_id')::uuid,
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'product_units') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      product_id = EXCLUDED.product_id,
      unit_id = EXCLUDED.unit_id;

    GET DIAGNOSTICS v_count_product_units = ROW_COUNT;
  END IF;

  -- 11. PRODUCT CHARACTERISTICS
  IF v_data ? 'product_characteristics' AND jsonb_typeof(v_data->'product_characteristics') = 'array' THEN
    INSERT INTO public.product_characteristics (id, product_id, characteristic_key_id, value, is_active, created_at, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'product_id')::uuid,
      (elem->>'characteristic_key_id')::uuid,
      elem->>'value',
      COALESCE((elem->>'is_active')::boolean, true),
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'product_characteristics') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      product_id = EXCLUDED.product_id,
      characteristic_key_id = EXCLUDED.characteristic_key_id,
      value = EXCLUDED.value,
      is_active = EXCLUDED.is_active;

    GET DIAGNOSTICS v_count_product_characteristics = ROW_COUNT;
  END IF;

  -- 12. IIRGD DOCUMENT TYPES
  IF v_data ? 'iirgd_document_types' AND jsonb_typeof(v_data->'iirgd_document_types') = 'array' THEN
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
      is_pending = EXCLUDED.is_pending;

    GET DIAGNOSTICS v_count_doc_types = ROW_COUNT;
  END IF;

  -- 13. IIRGD SETTINGS
  IF v_data ? 'iirgd_settings' AND jsonb_typeof(v_data->'iirgd_settings') = 'array' THEN
    INSERT INTO public.iirgd_settings (id, key, value, description, created_at, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      elem->>'key',
      elem->'value',
      elem->>'description',
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'iirgd_settings') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      key = EXCLUDED.key,
      value = EXCLUDED.value,
      description = EXCLUDED.description;

    GET DIAGNOSTICS v_count_iirgd_settings = ROW_COUNT;
  END IF;

  -- 14. SYSTEM SETTINGS
  IF v_data ? 'system_settings' AND jsonb_typeof(v_data->'system_settings') = 'array' THEN
    INSERT INTO public.system_settings (id, key, value, description, created_at, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      elem->>'key',
      elem->'value',
      elem->>'description',
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'system_settings') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      key = EXCLUDED.key,
      value = EXCLUDED.value,
      description = EXCLUDED.description;

    GET DIAGNOSTICS v_count_system_settings = ROW_COUNT;
  END IF;

  -- 15. IIRGD CITIZENS
  IF v_data ? 'iirgd_citizens' AND jsonb_typeof(v_data->'iirgd_citizens') = 'array' THEN
    INSERT INTO public.iirgd_citizens (id, name, cpf, rg, other_document, is_other_state, created_at, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      elem->>'name',
      elem->>'cpf',
      elem->>'rg',
      elem->>'other_document',
      COALESCE((elem->>'is_other_state')::boolean, false),
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'iirgd_citizens') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      cpf = EXCLUDED.cpf,
      rg = EXCLUDED.rg,
      other_document = EXCLUDED.other_document,
      is_other_state = EXCLUDED.is_other_state;

    GET DIAGNOSTICS v_count_citizens = ROW_COUNT;
  END IF;

  -- 16. DEMANDS
  IF v_data ? 'demands' AND jsonb_typeof(v_data->'demands') = 'array' THEN
    INSERT INTO public.demands (
      id, name, description, status, internal_process_number, process_number,
      id_pca, contract_number, dispute_date, dispute_number, bidding_notice_number,
      is_historical, observation, session_ended_at, offer_opening_date,
      created_by, created_at, updated_at, deleted_at, siafem_number
    )
    SELECT 
      (elem->>'id')::uuid,
      elem->>'name',
      elem->>'description',
      COALESCE((elem->>'status')::public.demand_status, 'planning'::public.demand_status),
      elem->>'internal_process_number',
      elem->>'process_number',
      elem->>'id_pca',
      elem->>'contract_number',
      (elem->>'dispute_date')::date,
      elem->>'dispute_number',
      elem->>'bidding_notice_number',
      COALESCE((elem->>'is_historical')::boolean, false),
      elem->>'observation',
      (elem->>'session_ended_at')::timestamptz,
      (elem->>'offer_opening_date')::timestamptz,
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS(SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now()),
      (elem->>'deleted_at')::timestamptz,
      elem->>'siafem_number'
    FROM jsonb_array_elements(v_data->'demands') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      status = EXCLUDED.status,
      internal_process_number = EXCLUDED.internal_process_number,
      process_number = EXCLUDED.process_number,
      id_pca = EXCLUDED.id_pca,
      contract_number = EXCLUDED.contract_number,
      dispute_date = EXCLUDED.dispute_date,
      dispute_number = EXCLUDED.dispute_number,
      bidding_notice_number = EXCLUDED.bidding_notice_number,
      is_historical = EXCLUDED.is_historical,
      observation = EXCLUDED.observation,
      session_ended_at = EXCLUDED.session_ended_at,
      offer_opening_date = EXCLUDED.offer_opening_date,
      deleted_at = EXCLUDED.deleted_at,
      siafem_number = EXCLUDED.siafem_number;

    GET DIAGNOSTICS v_count_demands = ROW_COUNT;
  END IF;

  -- 17. DEMAND COMMITMENTS
  IF v_data ? 'demand_commitments' AND jsonb_typeof(v_data->'demand_commitments') = 'array' THEN
    INSERT INTO public.demand_commitments (
      id, demand_id, commitment_number, status, issue_date, supplier_id,
      expense_nature_id, observation, error_details, disbursement_program_number,
      disbursement_program_issued_at, disbursement_program_observation,
      bank_order_number, bank_order_issued_at, bank_order_observation,
      created_by, created_at, updated_at
    )
    SELECT
      (elem->>'id')::uuid,
      (elem->>'demand_id')::uuid,
      elem->>'commitment_number',
      COALESCE((elem->>'status')::public.demand_item_execution_status, 'commitment_issued'::public.demand_item_execution_status),
      (elem->>'issue_date')::date,
      (elem->>'supplier_id')::uuid,
      elem->>'expense_nature_id',
      elem->>'observation',
      elem->>'error_details',
      elem->>'disbursement_program_number',
      (elem->>'disbursement_program_issued_at')::date,
      elem->>'disbursement_program_observation',
      elem->>'bank_order_number',
      (elem->>'bank_order_issued_at')::date,
      elem->>'bank_order_observation',
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS(SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'demand_commitments') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      demand_id = EXCLUDED.demand_id,
      commitment_number = EXCLUDED.commitment_number,
      status = EXCLUDED.status,
      issue_date = EXCLUDED.issue_date,
      supplier_id = EXCLUDED.supplier_id,
      expense_nature_id = EXCLUDED.expense_nature_id,
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

  -- 18. DEMAND COMMITMENT LIQUIDATIONS
  IF v_data ? 'demand_commitment_liquidations' AND jsonb_typeof(v_data->'demand_commitment_liquidations') = 'array' THEN
    INSERT INTO public.demand_commitment_liquidations (
      id, commitment_id, liquidation_number, issue_date, observation,
      is_cancellation, created_by, created_at
    )
    SELECT
      (elem->>'id')::uuid,
      (elem->>'commitment_id')::uuid,
      elem->>'liquidation_number',
      (elem->>'issue_date')::date,
      elem->>'observation',
      COALESCE((elem->>'is_cancellation')::boolean, false),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS(SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'demand_commitment_liquidations') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      commitment_id = EXCLUDED.commitment_id,
      liquidation_number = EXCLUDED.liquidation_number,
      issue_date = EXCLUDED.issue_date,
      observation = EXCLUDED.observation,
      is_cancellation = EXCLUDED.is_cancellation;

    GET DIAGNOSTICS v_count_demand_commitment_liquidations = ROW_COUNT;
  END IF;

  -- 19. DEMAND PRODUCTS
  IF v_data ? 'demand_products' AND jsonb_typeof(v_data->'demand_products') = 'array' THEN
    INSERT INTO public.demand_products (
      id, demand_id, product_id, custom_description, quantity, unit_id,
      sort_order, reference_price, execution_status, execution_error_details,
      execution_status_updated_at, commitment_number, product_name_snapshot,
      unit_name_snapshot, created_at, updated_at
    )
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'demand_id')::uuid,
      (elem->>'product_id')::uuid,
      elem->>'custom_description',
      (elem->>'quantity')::numeric,
      (elem->>'unit_id')::uuid,
      COALESCE((elem->>'sort_order')::int, 0),
      (elem->>'reference_price')::numeric,
      COALESCE((elem->>'execution_status')::public.demand_item_execution_status, 'homologated'::public.demand_item_execution_status),
      elem->>'execution_error_details',
      (elem->>'execution_status_updated_at')::timestamptz,
      elem->>'commitment_number',
      elem->>'product_name_snapshot',
      elem->>'unit_name_snapshot',
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'demand_products') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      demand_id = EXCLUDED.demand_id,
      product_id = EXCLUDED.product_id,
      custom_description = EXCLUDED.custom_description,
      quantity = EXCLUDED.quantity,
      unit_id = EXCLUDED.unit_id,
      sort_order = EXCLUDED.sort_order,
      reference_price = EXCLUDED.reference_price,
      execution_status = EXCLUDED.execution_status,
      execution_error_details = EXCLUDED.execution_error_details,
      execution_status_updated_at = EXCLUDED.execution_status_updated_at,
      commitment_number = EXCLUDED.commitment_number,
      product_name_snapshot = EXCLUDED.product_name_snapshot,
      unit_name_snapshot = EXCLUDED.unit_name_snapshot;

    GET DIAGNOSTICS v_count_demand_products = ROW_COUNT;
  END IF;

  -- 20. DEMAND PRODUCT BIDS
  IF v_data ? 'demand_product_bids' AND jsonb_typeof(v_data->'demand_product_bids') = 'array' THEN
    INSERT INTO public.demand_product_bids (
      id, demand_product_id, supplier_id, amount, status,
      disqualification_reason, created_at, updated_at
    )
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'demand_product_id')::uuid,
      (elem->>'supplier_id')::uuid,
      (elem->>'amount')::numeric,
      COALESCE((elem->>'status')::public.demand_product_bid_status, 'classified'::public.demand_product_bid_status),
      elem->>'disqualification_reason',
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'demand_product_bids') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      demand_product_id = EXCLUDED.demand_product_id,
      supplier_id = EXCLUDED.supplier_id,
      amount = EXCLUDED.amount,
      status = EXCLUDED.status,
      disqualification_reason = EXCLUDED.disqualification_reason;

    GET DIAGNOSTICS v_count_demand_bids = ROW_COUNT;
  END IF;

  -- 21. DEMAND RESPONSIBLES
  IF v_data ? 'demand_responsibles' AND jsonb_typeof(v_data->'demand_responsibles') = 'array' THEN
    INSERT INTO public.demand_responsibles (id, demand_id, user_id, role, created_at)
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'demand_id')::uuid,
      (elem->>'user_id')::uuid,
      (elem->>'role')::public.demand_responsible_role,
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'demand_responsibles') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      demand_id = EXCLUDED.demand_id,
      user_id = EXCLUDED.user_id,
      role = EXCLUDED.role;

    GET DIAGNOSTICS v_count_demand_responsibles = ROW_COUNT;
  END IF;

  -- 22. DEMAND ITEM STATUS HISTORY
  IF v_data ? 'demand_item_status_history' AND jsonb_typeof(v_data->'demand_item_status_history') = 'array' THEN
    INSERT INTO public.demand_item_status_history (
      id, demand_product_id, status, commitment_number, observation, error_details, created_by, created_at
    )
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'demand_product_id')::uuid,
      COALESCE((elem->>'status')::public.demand_item_execution_status, 'homologated'::public.demand_item_execution_status),
      elem->>'commitment_number',
      elem->>'observation',
      elem->>'error_details',
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS(SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'demand_item_status_history') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      demand_product_id = EXCLUDED.demand_product_id,
      status = EXCLUDED.status,
      commitment_number = EXCLUDED.commitment_number,
      observation = EXCLUDED.observation,
      error_details = EXCLUDED.error_details;

    GET DIAGNOSTICS v_count_demand_item_history = ROW_COUNT;
  END IF;

  -- 23. IIRGD DEMANDS
  IF v_data ? 'iirgd_demands' AND jsonb_typeof(v_data->'iirgd_demands') = 'array' THEN
    INSERT INTO public.iirgd_demands (
      id, internal_process_number, station_code, document_type_id,
      status, citizen_id, name, cpf, rg, other_document, is_other_state,
      observation, error_details, created_by, created_at, updated_at
    )
    SELECT 
      (elem->>'id')::uuid,
      elem->>'internal_process_number',
      elem->>'station_code',
      (elem->>'document_type_id')::uuid,
      COALESCE((elem->>'status')::public.iirgd_demand_status, 'received'::public.iirgd_demand_status),
      (elem->>'citizen_id')::uuid,
      elem->>'name',
      elem->>'cpf',
      elem->>'rg',
      elem->>'other_document',
      COALESCE((elem->>'is_other_state')::boolean, false),
      elem->>'observation',
      elem->>'error_details',
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS(SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'iirgd_demands') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      internal_process_number = EXCLUDED.internal_process_number,
      station_code = EXCLUDED.station_code,
      document_type_id = EXCLUDED.document_type_id,
      status = EXCLUDED.status,
      citizen_id = EXCLUDED.citizen_id,
      name = EXCLUDED.name,
      cpf = EXCLUDED.cpf,
      rg = EXCLUDED.rg,
      other_document = EXCLUDED.other_document,
      is_other_state = EXCLUDED.is_other_state,
      observation = EXCLUDED.observation,
      error_details = EXCLUDED.error_details;

    GET DIAGNOSTICS v_count_iirgd_demands = ROW_COUNT;
  END IF;

  -- 24. IIRGD DEMAND STATUS HISTORY
  IF v_data ? 'iirgd_demand_status_history' AND jsonb_typeof(v_data->'iirgd_demand_status_history') = 'array' THEN
    INSERT INTO public.iirgd_demand_status_history (
      id, iirgd_demand_id, status, station_code, document_type_id,
      observation, error_details, created_by, created_at
    )
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'iirgd_demand_id')::uuid,
      COALESCE((elem->>'status')::public.iirgd_demand_status, 'received'::public.iirgd_demand_status),
      elem->>'station_code',
      (elem->>'document_type_id')::uuid,
      elem->>'observation',
      elem->>'error_details',
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS(SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'iirgd_demand_status_history') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      iirgd_demand_id = EXCLUDED.iirgd_demand_id,
      status = EXCLUDED.status,
      station_code = EXCLUDED.station_code,
      document_type_id = EXCLUDED.document_type_id,
      observation = EXCLUDED.observation,
      error_details = EXCLUDED.error_details;

    GET DIAGNOSTICS v_count_iirgd_history = ROW_COUNT;
  END IF;

  -- 25. ELECTIONS
  IF v_data ? 'elections' AND jsonb_typeof(v_data->'elections') = 'array' THEN
    INSERT INTO public.elections (
      id, name, description, election_date, digits_count, is_uppercase,
      status, voting_mode, is_anonymous, created_by, created_at, updated_at
    )
    SELECT 
      (elem->>'id')::uuid,
      elem->>'name',
      elem->>'description',
      (elem->>'election_date')::date,
      COALESCE((elem->>'digits_count')::int, 4),
      COALESCE((elem->>'is_uppercase')::boolean, true),
      COALESCE((elem->>'status')::public.election_status, 'draft'::public.election_status),
      COALESCE((elem->>'voting_mode')::public.election_voting_mode, 'hybrid'::public.election_voting_mode),
      COALESCE((elem->>'is_anonymous')::boolean, false),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS(SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'elections') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      election_date = EXCLUDED.election_date,
      digits_count = EXCLUDED.digits_count,
      is_uppercase = EXCLUDED.is_uppercase,
      status = EXCLUDED.status,
      voting_mode = EXCLUDED.voting_mode,
      is_anonymous = EXCLUDED.is_anonymous;

    GET DIAGNOSTICS v_count_elections = ROW_COUNT;
  END IF;

  -- 26. CANDIDATES
  IF v_data ? 'candidates' AND jsonb_typeof(v_data->'candidates') = 'array' THEN
    INSERT INTO public.candidates (
      id, election_id, name, number, photo_url, is_active, created_by, created_at, updated_at
    )
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'election_id')::uuid,
      elem->>'name',
      elem->>'number',
      elem->>'photo_url',
      COALESCE((elem->>'is_active')::boolean, true),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS(SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'candidates') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      election_id = EXCLUDED.election_id,
      name = EXCLUDED.name,
      number = EXCLUDED.number,
      photo_url = EXCLUDED.photo_url,
      is_active = EXCLUDED.is_active;

    GET DIAGNOSTICS v_count_candidates = ROW_COUNT;
  END IF;

  -- 27. BALLOT BOXES
  IF v_data ? 'ballot_boxes' AND jsonb_typeof(v_data->'ballot_boxes') = 'array' THEN
    INSERT INTO public.ballot_boxes (
      id, election_id, name, device_info, is_active, created_by, created_at, updated_at, deleted_at
    )
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'election_id')::uuid,
      elem->>'name',
      elem->>'device_info',
      COALESCE((elem->>'is_active')::boolean, false),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS(SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now()),
      (elem->>'deleted_at')::timestamptz
    FROM jsonb_array_elements(v_data->'ballot_boxes') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      election_id = EXCLUDED.election_id,
      name = EXCLUDED.name,
      device_info = EXCLUDED.device_info,
      is_active = EXCLUDED.is_active,
      deleted_at = EXCLUDED.deleted_at;

    GET DIAGNOSTICS v_count_ballot_boxes = ROW_COUNT;
  END IF;

  -- 28. ELECTION COMMITTEE MEMBERS
  IF v_data ? 'election_committee_members' AND jsonb_typeof(v_data->'election_committee_members') = 'array' THEN
    INSERT INTO public.election_committee_members (
      id, election_id, name, role, email, phone, document_number, is_active, created_by, created_at, updated_at
    )
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'election_id')::uuid,
      elem->>'name',
      COALESCE((elem->>'role')::public.election_committee_role, 'member'::public.election_committee_role),
      elem->>'email',
      elem->>'phone',
      elem->>'document_number',
      COALESCE((elem->>'is_active')::boolean, true),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS(SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'election_committee_members') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      election_id = EXCLUDED.election_id,
      name = EXCLUDED.name,
      role = EXCLUDED.role,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      document_number = EXCLUDED.document_number,
      is_active = EXCLUDED.is_active;

    GET DIAGNOSTICS v_count_committee_members = ROW_COUNT;
  END IF;

  -- 29. ELECTION VOTERS
  IF v_data ? 'election_voters' AND jsonb_typeof(v_data->'election_voters') = 'array' THEN
    INSERT INTO public.election_voters (
      id, election_id, voter_name, voter_registration, document_number, email, phone,
      voter_type, attendance_type, status, validation_code, created_by, created_at, updated_at
    )
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'election_id')::uuid,
      elem->>'voter_name',
      elem->>'voter_registration',
      elem->>'document_number',
      elem->>'email',
      elem->>'phone',
      COALESCE((elem->>'voter_type')::public.election_voter_type, 'titular'::public.election_voter_type),
      COALESCE((elem->>'attendance_type')::public.election_voter_attendance_type, 'in_person'::public.election_voter_attendance_type),
      COALESCE((elem->>'status')::public.election_voter_status, 'pending'::public.election_voter_status),
      elem->>'validation_code',
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS(SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'election_voters') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      election_id = EXCLUDED.election_id,
      voter_name = EXCLUDED.voter_name,
      voter_registration = EXCLUDED.voter_registration,
      document_number = EXCLUDED.document_number,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      voter_type = EXCLUDED.voter_type,
      attendance_type = EXCLUDED.attendance_type,
      status = EXCLUDED.status,
      validation_code = EXCLUDED.validation_code;

    GET DIAGNOSTICS v_count_voters = ROW_COUNT;
  END IF;

  -- 30. ELECTION VOTER ATTENDANCE
  IF v_data ? 'election_voter_attendance' AND jsonb_typeof(v_data->'election_voter_attendance') = 'array' THEN
    INSERT INTO public.election_voter_attendance (
      id, election_id, voter_id, attendance_date, attendance_type, verified_by, validation_code, created_at
    )
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'election_id')::uuid,
      (elem->>'voter_id')::uuid,
      COALESCE((elem->>'attendance_date')::timestamptz, now()),
      COALESCE((elem->>'attendance_type')::public.election_voter_attendance_type, 'in_person'::public.election_voter_attendance_type),
      CASE WHEN (elem->>'verified_by') IS NOT NULL AND EXISTS(SELECT 1 FROM public.profiles WHERE id = (elem->>'verified_by')::uuid)
           THEN (elem->>'verified_by')::uuid
           ELSE auth.uid()
      END,
      elem->>'validation_code',
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'election_voter_attendance') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      election_id = EXCLUDED.election_id,
      voter_id = EXCLUDED.voter_id,
      attendance_date = EXCLUDED.attendance_date,
      attendance_type = EXCLUDED.attendance_type,
      verified_by = EXCLUDED.verified_by,
      validation_code = EXCLUDED.validation_code;

    GET DIAGNOSTICS v_count_voter_attendance = ROW_COUNT;
  END IF;

  -- 31. ELECTION VOTES
  IF v_data ? 'election_votes' AND jsonb_typeof(v_data->'election_votes') = 'array' THEN
    INSERT INTO public.election_votes (
      id, election_id, ballot_box_id, candidate_id, vote_type, voted_at, created_at
    )
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'election_id')::uuid,
      (elem->>'ballot_box_id')::uuid,
      (elem->>'candidate_id')::uuid,
      COALESCE((elem->>'vote_type')::public.election_vote_type, 'nominal'::public.election_vote_type),
      COALESCE((elem->>'voted_at')::timestamptz, now()),
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'election_votes') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      election_id = EXCLUDED.election_id,
      ballot_box_id = EXCLUDED.ballot_box_id,
      candidate_id = EXCLUDED.candidate_id,
      vote_type = EXCLUDED.vote_type,
      voted_at = EXCLUDED.voted_at;

    GET DIAGNOSTICS v_count_election_votes = ROW_COUNT;
  END IF;

  -- 32. LOGS
  IF v_data ? 'logs' AND jsonb_typeof(v_data->'logs') = 'array' THEN
    INSERT INTO public.logs (id, user_id, action, description, created_at)
    SELECT 
      (elem->>'id')::uuid,
      CASE WHEN (elem->>'user_id') IS NOT NULL AND EXISTS(SELECT 1 FROM public.profiles WHERE id = (elem->>'user_id')::uuid)
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
  ALTER TABLE public.demand_products ENABLE TRIGGER trg_sync_demand_product_commitment_status;

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
  ALTER TABLE public.demand_products ENABLE TRIGGER trg_sync_demand_product_commitment_status;
  RAISE;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.restore_system_backup(jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
