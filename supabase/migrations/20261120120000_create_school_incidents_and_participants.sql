-- Migration: 20261120120000_create_school_incidents_and_participants.sql
-- Description: Create school_incidents and school_incident_participants tables, RLS policies, and sync backup/restore RPCs.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'school_incident_status') THEN
    CREATE TYPE public.school_incident_status AS ENUM (
      'new',
      'under_review',
      'in_progress',
      'resolved',
      'archived'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.school_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  status public.school_incident_status NOT NULL DEFAULT 'new'::public.school_incident_status,
  terms_accepted boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.school_incident_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.school_incidents(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('offender', 'victim')),
  name text NOT NULL,
  classroom text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_school_incidents_created_by ON public.school_incidents(created_by);
CREATE INDEX IF NOT EXISTS idx_school_incidents_status ON public.school_incidents(status);
CREATE INDEX IF NOT EXISTS idx_school_incident_participants_incident_id ON public.school_incident_participants(incident_id);
CREATE INDEX IF NOT EXISTS idx_school_incident_participants_role ON public.school_incident_participants(role);

DROP TRIGGER IF EXISTS trigger_school_incidents_updated_at ON public.school_incidents;
CREATE TRIGGER trigger_school_incidents_updated_at
  BEFORE UPDATE ON public.school_incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_school_incident_participants_updated_at ON public.school_incident_participants;
CREATE TRIGGER trigger_school_incident_participants_updated_at
  BEFORE UPDATE ON public.school_incident_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.school_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_incident_participants ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------
-- RLS POLICIES FOR school_incidents
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "school_incidents_select_policy" ON public.school_incidents;
CREATE POLICY "school_incidents_select_policy"
ON public.school_incidents
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'school-manager'
  )
  OR (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'school-user'
    )
  )
);

DROP POLICY IF EXISTS "school_incidents_insert_policy" ON public.school_incidents;
CREATE POLICY "school_incidents_insert_policy"
ON public.school_incidents
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  OR (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('school-manager', 'school-user')
    )
  )
);

DROP POLICY IF EXISTS "school_incidents_update_policy" ON public.school_incidents;
CREATE POLICY "school_incidents_update_policy"
ON public.school_incidents
FOR UPDATE
TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'school-manager'
  )
  OR (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'school-user'
    )
  )
);

DROP POLICY IF EXISTS "school_incidents_delete_policy" ON public.school_incidents;
CREATE POLICY "school_incidents_delete_policy"
ON public.school_incidents
FOR DELETE
TO authenticated
USING (
  public.is_admin()
);

-- -------------------------------------------------------------
-- RLS POLICIES FOR school_incident_participants
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "school_incident_participants_select_policy" ON public.school_incident_participants;
CREATE POLICY "school_incident_participants_select_policy"
ON public.school_incident_participants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.school_incidents si
    WHERE si.id = school_incident_participants.incident_id
  )
);

DROP POLICY IF EXISTS "school_incident_participants_insert_policy" ON public.school_incident_participants;
CREATE POLICY "school_incident_participants_insert_policy"
ON public.school_incident_participants
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.school_incidents si
    WHERE si.id = school_incident_participants.incident_id
  )
);

DROP POLICY IF EXISTS "school_incident_participants_update_policy" ON public.school_incident_participants;
CREATE POLICY "school_incident_participants_update_policy"
ON public.school_incident_participants
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.school_incidents si
    WHERE si.id = school_incident_participants.incident_id
  )
);

DROP POLICY IF EXISTS "school_incident_participants_delete_policy" ON public.school_incident_participants;
CREATE POLICY "school_incident_participants_delete_policy"
ON public.school_incident_participants
FOR DELETE
TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.school_incidents si
    WHERE si.id = school_incident_participants.incident_id
    AND (
      si.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'school-manager'
      )
    )
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_incidents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_incident_participants TO authenticated;

-- -------------------------------------------------------------
-- SYNC BACKUP & RESTORE RPCS
-- -------------------------------------------------------------
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
    'system', 'Demandas, IIRGD, Eleições & Escola',
    'version', '2.0',
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
  v_count_school_incidents int := 0;
  v_count_school_incident_participants int := 0;
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
  ALTER TABLE public.demand_product_bids DISABLE TRIGGER trg_check_bid_reference_price;

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
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.demand_commitments dc WHERE dc.supplier_id = s.id
    );

    INSERT INTO public.suppliers (
      id, cnpj, company_name, responsible_name, email,
      cell_phone, landline, address, has_bb_account,
      is_simples_optant, simples_optant_verified_at,
      is_active, created_at, updated_at, created_by
    )
    SELECT 
      (elem->>'id')::uuid,
      elem->>'cnpj',
      elem->>'company_name',
      elem->>'responsible_name',
      elem->>'email',
      elem->>'cell_phone',
      elem->>'landline',
      elem->>'address',
      COALESCE((elem->>'has_bb_account')::boolean, false),
      COALESCE((elem->>'is_simples_optant')::boolean, false),
      (elem->>'simples_optant_verified_at')::timestamptz,
      COALESCE((elem->>'is_active')::boolean, true),
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now()),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END
    FROM jsonb_array_elements(v_data->'suppliers') elem
    WHERE (elem->>'id') IS NOT NULL
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
    INSERT INTO public.expense_natures (id, expense_nature, description, is_pending, is_active, created_at, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      elem->>'expense_nature',
      elem->>'description',
      COALESCE((elem->>'is_pending')::boolean, false),
      COALESCE((elem->>'is_active')::boolean, true),
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'expense_natures') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      expense_nature = EXCLUDED.expense_nature,
      description = EXCLUDED.description,
      is_pending = EXCLUDED.is_pending,
      is_active = EXCLUDED.is_active,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_expense_natures = ROW_COUNT;
  END IF;

  -- 4. PRODUCT_CLASSES
  IF v_data ? 'product_classes' AND jsonb_typeof(v_data->'product_classes') = 'array' THEN
    INSERT INTO public.product_classes (id, name, annual_ceiling, is_pending, is_active, created_at, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      elem->>'name',
      COALESCE((elem->>'annual_ceiling')::numeric, 0),
      COALESCE((elem->>'is_pending')::boolean, false),
      COALESCE((elem->>'is_active')::boolean, true),
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'product_classes') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      annual_ceiling = EXCLUDED.annual_ceiling,
      is_pending = EXCLUDED.is_pending,
      is_active = EXCLUDED.is_active,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_product_classes = ROW_COUNT;
  END IF;

  -- 5. MEASUREMENT_UNITS
  IF v_data ? 'measurement_units' AND jsonb_typeof(v_data->'measurement_units') = 'array' THEN
    INSERT INTO public.measurement_units (id, name, abbreviation, is_pending, is_active, created_at, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      elem->>'name',
      elem->>'abbreviation',
      COALESCE((elem->>'is_pending')::boolean, false),
      COALESCE((elem->>'is_active')::boolean, true),
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'measurement_units') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      abbreviation = EXCLUDED.abbreviation,
      is_pending = EXCLUDED.is_pending,
      is_active = EXCLUDED.is_active,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_measurement_units = ROW_COUNT;
  END IF;

  -- 6. MEASUREMENT_UNIT_ALIASES
  IF v_data ? 'measurement_unit_aliases' AND jsonb_typeof(v_data->'measurement_unit_aliases') = 'array' THEN
    INSERT INTO public.measurement_unit_aliases (id, alias_name, alias_code, is_active, created_at, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      elem->>'alias_name',
      elem->>'alias_code',
      COALESCE((elem->>'is_active')::boolean, true),
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'measurement_unit_aliases') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      alias_name = EXCLUDED.alias_name,
      alias_code = EXCLUDED.alias_code,
      is_active = EXCLUDED.is_active,
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
    ON CONFLICT (unit_id, alias_id) DO NOTHING;

    GET DIAGNOSTICS v_count_unit_alias_links = ROW_COUNT;
  END IF;

  -- 8. PRODUCT_CHARACTERISTIC_KEYS
  IF v_data ? 'product_characteristic_keys' AND jsonb_typeof(v_data->'product_characteristic_keys') = 'array' THEN
    INSERT INTO public.product_characteristic_keys (id, name, created_at, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      elem->>'name',
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'product_characteristic_keys') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_characteristic_keys = ROW_COUNT;
  END IF;

  -- 9. PRODUCTS
  IF v_data ? 'products' AND jsonb_typeof(v_data->'products') = 'array' THEN
    INSERT INTO public.products (
      id, name, description, cat_mat, cat_bec,
      default_measurement_unit_id, class_id,
      suggested_expense_nature_id, is_active,
      created_at, updated_at
    )
    SELECT 
      (elem->>'id')::uuid,
      elem->>'name',
      elem->>'description',
      elem->>'cat_mat',
      elem->>'cat_bec',
      (elem->>'default_measurement_unit_id')::uuid,
      (elem->>'class_id')::uuid,
      (elem->>'suggested_expense_nature_id')::uuid,
      COALESCE((elem->>'is_active')::boolean, true),
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'products') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      cat_mat = EXCLUDED.cat_mat,
      cat_bec = EXCLUDED.cat_bec,
      default_measurement_unit_id = EXCLUDED.default_measurement_unit_id,
      class_id = EXCLUDED.class_id,
      suggested_expense_nature_id = EXCLUDED.suggested_expense_nature_id,
      is_active = EXCLUDED.is_active,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_products = ROW_COUNT;
  END IF;

  -- 10. PRODUCT_UNITS
  IF v_data ? 'product_units' AND jsonb_typeof(v_data->'product_units') = 'array' THEN
    INSERT INTO public.product_units (id, product_id, unit_id, is_default, created_at, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'product_id')::uuid,
      (elem->>'unit_id')::uuid,
      COALESCE((elem->>'is_default')::boolean, false),
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'product_units') elem
    WHERE (elem->>'id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.products WHERE id = (elem->>'product_id')::uuid)
      AND EXISTS (SELECT 1 FROM public.measurement_units WHERE id = (elem->>'unit_id')::uuid)
    ON CONFLICT (product_id, unit_id) DO UPDATE SET
      is_default = EXCLUDED.is_default,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_product_units = ROW_COUNT;
  END IF;

  -- 11. PRODUCT_CHARACTERISTICS
  IF v_data ? 'product_characteristics' AND jsonb_typeof(v_data->'product_characteristics') = 'array' THEN
    INSERT INTO public.product_characteristics (id, product_id, key_id, value, created_at, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'product_id')::uuid,
      (elem->>'key_id')::uuid,
      elem->>'value',
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'product_characteristics') elem
    WHERE (elem->>'id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.products WHERE id = (elem->>'product_id')::uuid)
      AND EXISTS (SELECT 1 FROM public.product_characteristic_keys WHERE id = (elem->>'key_id')::uuid)
    ON CONFLICT (product_id, key_id) DO UPDATE SET
      value = EXCLUDED.value,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_product_characteristics = ROW_COUNT;
  END IF;

  -- 12. IIRGD_DOCUMENT_TYPES
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
      is_pending = EXCLUDED.is_pending,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_doc_types = ROW_COUNT;
  END IF;

  -- 12a. IIRGD_SETTINGS
  IF v_data ? 'iirgd_settings' AND jsonb_typeof(v_data->'iirgd_settings') = 'array' THEN
    INSERT INTO public.iirgd_settings (id, sla_yellow_days, sla_red_days, updated_at, updated_by)
    SELECT 
      (elem->>'id')::uuid,
      COALESCE((elem->>'sla_yellow_days')::integer, 3),
      COALESCE((elem->>'sla_red_days')::integer, 7),
      COALESCE((elem->>'updated_at')::timestamptz, now()),
      CASE WHEN (elem->>'updated_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'updated_by')::uuid)
           THEN (elem->>'updated_by')::uuid
           ELSE auth.uid()
      END
    FROM jsonb_array_elements(v_data->'iirgd_settings') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      sla_yellow_days = EXCLUDED.sla_yellow_days,
      sla_red_days = EXCLUDED.sla_red_days,
      updated_at = EXCLUDED.updated_at,
      updated_by = EXCLUDED.updated_by;

    GET DIAGNOSTICS v_count_iirgd_settings = ROW_COUNT;
  END IF;

  -- 12b. SYSTEM_SETTINGS
  IF v_data ? 'system_settings' AND jsonb_typeof(v_data->'system_settings') = 'array' THEN
    INSERT INTO public.system_settings (id, description_max_length, updated_at, updated_by)
    SELECT 
      (elem->>'id')::uuid,
      COALESCE((elem->>'description_max_length')::integer, 200),
      COALESCE((elem->>'updated_at')::timestamptz, now()),
      CASE WHEN (elem->>'updated_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'updated_by')::uuid)
           THEN (elem->>'updated_by')::uuid
           ELSE auth.uid()
      END
    FROM jsonb_array_elements(v_data->'system_settings') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      description_max_length = EXCLUDED.description_max_length,
      updated_at = EXCLUDED.updated_at,
      updated_by = EXCLUDED.updated_by;

    GET DIAGNOSTICS v_count_system_settings = ROW_COUNT;
  END IF;

  -- 12c. IIRGD_CITIZENS
  IF v_data ? 'iirgd_citizens' AND jsonb_typeof(v_data->'iirgd_citizens') = 'array' THEN
    INSERT INTO public.iirgd_citizens (id, name, rg, cpf, created_at, updated_at, other_document)
    SELECT 
      (elem->>'id')::uuid,
      elem->>'name',
      elem->>'rg',
      elem->>'cpf',
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now()),
      elem->>'other_document'
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

  -- 13. DEMANDS
  IF v_data ? 'demands' AND jsonb_typeof(v_data->'demands') = 'array' THEN
    INSERT INTO public.demands (
      id, name, description, user_id, status, offer_opening_date, dispute_date,
      bidding_notice_url, internal_process_number, official_process_number,
      id_pca, siafem_number, is_deleted, deleted_at, deleted_by, created_at, updated_at
    )
    SELECT 
      (elem->>'id')::uuid,
      elem->>'name',
      elem->>'description',
      CASE WHEN (elem->>'user_id') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'user_id')::uuid)
           THEN (elem->>'user_id')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'status')::public.demand_status, 'created'::public.demand_status),
      (elem->>'offer_opening_date')::timestamptz,
      (elem->>'dispute_date')::timestamptz,
      elem->>'bidding_notice_url',
      elem->>'internal_process_number',
      elem->>'official_process_number',
      elem->>'id_pca',
      elem->>'siafem_number',
      COALESCE((elem->>'is_deleted')::boolean, false),
      (elem->>'deleted_at')::timestamptz,
      (elem->>'deleted_by')::uuid,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'demands') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      user_id = EXCLUDED.user_id,
      status = EXCLUDED.status,
      offer_opening_date = EXCLUDED.offer_opening_date,
      dispute_date = EXCLUDED.dispute_date,
      bidding_notice_url = EXCLUDED.bidding_notice_url,
      internal_process_number = EXCLUDED.internal_process_number,
      official_process_number = EXCLUDED.official_process_number,
      id_pca = EXCLUDED.id_pca,
      siafem_number = EXCLUDED.siafem_number,
      is_deleted = EXCLUDED.is_deleted,
      deleted_at = EXCLUDED.deleted_at,
      deleted_by = EXCLUDED.deleted_by,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_demands = ROW_COUNT;
  END IF;

  -- 14. DEMAND_COMMITMENTS
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
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.demand_commitment_liquidations dcl WHERE dcl.commitment_id = dc.id
    );

    INSERT INTO public.demand_commitments (
      id, commitment_number, demand_id, supplier_id, expense_nature_id, status,
      issue_date, observation, error_details, disbursement_program_number,
      disbursement_program_issued_at, disbursement_program_paid_at, disbursement_program_observation,
      bank_order_number, bank_order_issued_at, bank_order_paid_at, bank_order_observation,
      cancellation_commitment_number, cancels_commitment_number, created_by, created_at, updated_at
    )
    SELECT
      (elem->>'id')::uuid,
      UPPER(TRIM(elem->>'commitment_number')),
      (elem->>'demand_id')::uuid,
      (elem->>'supplier_id')::uuid,
      (elem->>'expense_nature_id')::uuid,
      COALESCE((elem->>'status')::public.demand_commitment_status, 'issued'::public.demand_commitment_status),
      COALESCE((elem->>'issue_date')::date, CURRENT_DATE),
      NULLIF(TRIM(elem->>'observation'), ''),
      NULLIF(TRIM(elem->>'error_details'), ''),
      NULLIF(UPPER(TRIM(elem->>'disbursement_program_number')), ''),
      (elem->>'disbursement_program_issued_at')::date,
      (elem->>'disbursement_program_paid_at')::date,
      NULLIF(TRIM(elem->>'disbursement_program_observation'), ''),
      NULLIF(UPPER(TRIM(elem->>'bank_order_number')), ''),
      (elem->>'bank_order_issued_at')::date,
      (elem->>'bank_order_paid_at')::date,
      NULLIF(TRIM(elem->>'bank_order_observation'), ''),
      NULLIF(UPPER(TRIM(elem->>'cancellation_commitment_number')), ''),
      NULLIF(UPPER(TRIM(elem->>'cancels_commitment_number')), ''),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'demand_commitments') elem
    WHERE (elem->>'commitment_number') IS NOT NULL
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
      disbursement_program_paid_at = EXCLUDED.disbursement_program_paid_at,
      disbursement_program_observation = EXCLUDED.disbursement_program_observation,
      bank_order_number = EXCLUDED.bank_order_number,
      bank_order_issued_at = EXCLUDED.bank_order_issued_at,
      bank_order_paid_at = EXCLUDED.bank_order_paid_at,
      bank_order_observation = EXCLUDED.bank_order_observation,
      cancellation_commitment_number = EXCLUDED.cancellation_commitment_number,
      cancels_commitment_number = EXCLUDED.cancels_commitment_number,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_demand_commitments = ROW_COUNT;
  END IF;

  -- 15. DEMAND_COMMITMENT_LIQUIDATIONS
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
      id, commitment_id, liquidation_number, issue_date, observation,
      created_by, created_at, is_cancellation, is_ir_retention, ir_retention_amount
    )
    SELECT
      COALESCE((elem->>'id')::uuid, gen_random_uuid()),
      (elem->>'commitment_id')::uuid,
      UPPER(TRIM(elem->>'liquidation_number')),
      COALESCE((elem->>'issue_date')::date, CURRENT_DATE),
      NULLIF(TRIM(elem->>'observation'), ''),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'is_cancellation')::boolean, false),
      CASE WHEN COALESCE((elem->>'is_ir_retention')::boolean, false) = true
                AND (elem->>'ir_retention_amount') IS NOT NULL
                AND (elem->>'ir_retention_amount')::numeric > 0
           THEN true
           ELSE false
      END,
      CASE WHEN COALESCE((elem->>'is_ir_retention')::boolean, false) = true
                AND (elem->>'ir_retention_amount') IS NOT NULL
                AND (elem->>'ir_retention_amount')::numeric > 0
           THEN ROUND((elem->>'ir_retention_amount')::numeric, 2)
           ELSE NULL
      END
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
      is_cancellation = EXCLUDED.is_cancellation,
      is_ir_retention = EXCLUDED.is_ir_retention,
      ir_retention_amount = EXCLUDED.ir_retention_amount;

    GET DIAGNOSTICS v_count_demand_commitment_liquidations = ROW_COUNT;
  END IF;

  -- 16. ELECTIONS
  IF v_data ? 'elections' AND jsonb_typeof(v_data->'elections') = 'array' THEN
    INSERT INTO public.elections (
      id, name, election_date, digits_count, is_uppercase, status, voting_mode, is_anonymous,
      created_by, created_at, updated_at
    )
    SELECT 
      (elem->>'id')::uuid,
      elem->>'name',
      (elem->>'election_date')::date,
      COALESCE((elem->>'digits_count')::integer, 2),
      COALESCE((elem->>'is_uppercase')::boolean, true),
      COALESCE((elem->>'status')::public.election_status, 'draft'::public.election_status),
      COALESCE((elem->>'voting_mode')::public.election_voting_mode, 'open'::public.election_voting_mode),
      COALESCE((elem->>'is_anonymous')::boolean, true),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
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
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_elections = ROW_COUNT;
  END IF;

  -- 17. DEMAND_PRODUCTS
  IF v_data ? 'demand_products' AND jsonb_typeof(v_data->'demand_products') = 'array' THEN
    INSERT INTO public.demand_products (
      id, demand_id, product_id, quantity, unit_id, alias_id,
      alias_name_snapshot, alias_code_snapshot, product_name_snapshot,
      unit_name_snapshot, reference_price, bid_interval, bid_interval_type,
      expense_nature_name_snapshot, sort_order, execution_status,
      execution_error_details, execution_status_updated_at, commitment_number,
      created_at, updated_at
    )
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'demand_id')::uuid,
      (elem->>'product_id')::uuid,
      COALESCE((elem->>'quantity')::numeric, 1),
      (elem->>'unit_id')::uuid,
      (elem->>'alias_id')::uuid,
      elem->>'alias_name_snapshot',
      elem->>'alias_code_snapshot',
      elem->>'product_name_snapshot',
      elem->>'unit_name_snapshot',
      (elem->>'reference_price')::numeric,
      (elem->>'bid_interval')::numeric,
      COALESCE((elem->>'bid_interval_type')::public.bid_interval_type, 'fixed'::public.bid_interval_type),
      elem->>'expense_nature_name_snapshot',
      COALESCE((elem->>'sort_order')::integer, 0),
      COALESCE((elem->>'execution_status')::public.demand_item_execution_status, 'registered'::public.demand_item_execution_status),
      elem->>'execution_error_details',
      (elem->>'execution_status_updated_at')::timestamptz,
      UPPER(TRIM(elem->>'commitment_number')),
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
    INSERT INTO public.candidates (id, election_id, name, candidate_number, photo_url, created_at, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'election_id')::uuid,
      elem->>'name',
      elem->>'candidate_number',
      elem->>'photo_url',
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'candidates') elem
    WHERE (elem->>'id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.elections WHERE id = (elem->>'election_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      candidate_number = EXCLUDED.candidate_number,
      photo_url = EXCLUDED.photo_url,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_candidates = ROW_COUNT;
  END IF;

  -- 20. BALLOT_BOXES
  IF v_data ? 'ballot_boxes' AND jsonb_typeof(v_data->'ballot_boxes') = 'array' THEN
    INSERT INTO public.ballot_boxes (id, election_id, box_number, description, location, status, created_at, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'election_id')::uuid,
      elem->>'box_number',
      elem->>'description',
      elem->>'location',
      COALESCE((elem->>'status')::public.ballot_box_status, 'closed'::public.ballot_box_status),
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'ballot_boxes') elem
    WHERE (elem->>'id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.elections WHERE id = (elem->>'election_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      box_number = EXCLUDED.box_number,
      description = EXCLUDED.description,
      location = EXCLUDED.location,
      status = EXCLUDED.status,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_ballot_boxes = ROW_COUNT;
  END IF;

  -- 21. ELECTION_COMMITTEE_MEMBERS
  IF v_data ? 'election_committee_members' AND jsonb_typeof(v_data->'election_committee_members') = 'array' THEN
    INSERT INTO public.election_committee_members (id, election_id, user_id, assigned_by, created_at)
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'election_id')::uuid,
      (elem->>'user_id')::uuid,
      CASE WHEN (elem->>'assigned_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'assigned_by')::uuid)
           THEN (elem->>'assigned_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'election_committee_members') elem
    WHERE (elem->>'id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.elections WHERE id = (elem->>'election_id')::uuid)
      AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'user_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      assigned_by = EXCLUDED.assigned_by;

    GET DIAGNOSTICS v_count_committee_members = ROW_COUNT;
  END IF;

  -- 22. ELECTION_VOTERS
  IF v_data ? 'election_voters' AND jsonb_typeof(v_data->'election_voters') = 'array' THEN
    INSERT INTO public.election_voters (
      id, election_id, full_name, registry_number, cpf, email,
      created_by, created_at, updated_at
    )
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'election_id')::uuid,
      elem->>'full_name',
      elem->>'registry_number',
      elem->>'cpf',
      elem->>'email',
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
      full_name = EXCLUDED.full_name,
      registry_number = EXCLUDED.registry_number,
      cpf = EXCLUDED.cpf,
      email = EXCLUDED.email,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_voters = ROW_COUNT;
  END IF;

  -- 23. ELECTION_VOTER_ATTENDANCE
  IF v_data ? 'election_voter_attendance' AND jsonb_typeof(v_data->'election_voter_attendance') = 'array' THEN
    INSERT INTO public.election_voter_attendance (id, voter_id, election_id, ballot_box_id, marked_by, created_at)
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'voter_id')::uuid,
      (elem->>'election_id')::uuid,
      (elem->>'ballot_box_id')::uuid,
      CASE WHEN (elem->>'marked_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'marked_by')::uuid)
           THEN (elem->>'marked_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'election_voter_attendance') elem
    WHERE (elem->>'id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.election_voters WHERE id = (elem->>'voter_id')::uuid)
      AND EXISTS (SELECT 1 FROM public.elections WHERE id = (elem->>'election_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      marked_by = EXCLUDED.marked_by;

    GET DIAGNOSTICS v_count_voter_attendance = ROW_COUNT;
  END IF;

  -- 24. ELECTION_VOTES
  IF v_data ? 'election_votes' AND jsonb_typeof(v_data->'election_votes') = 'array' THEN
    INSERT INTO public.election_votes (id, election_id, ballot_box_id, candidate_id, is_blank, is_null, created_at)
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'election_id')::uuid,
      (elem->>'ballot_box_id')::uuid,
      (elem->>'candidate_id')::uuid,
      COALESCE((elem->>'is_blank')::boolean, false),
      COALESCE((elem->>'is_null')::boolean, false),
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'election_votes') elem
    WHERE (elem->>'id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.elections WHERE id = (elem->>'election_id')::uuid)
    ON CONFLICT (id) DO NOTHING;

    GET DIAGNOSTICS v_count_election_votes = ROW_COUNT;
  END IF;

  -- 25. DEMAND_RESPONSIBLES
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
      AND EXISTS (SELECT 1 FROM public.demands WHERE id = (elem->>'demand_id')::uuid)
      AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'user_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      assigned_by = EXCLUDED.assigned_by;

    GET DIAGNOSTICS v_count_demand_responsibles = ROW_COUNT;
  END IF;

  -- 26. DEMAND_PRODUCT_BIDS
  IF v_data ? 'demand_product_bids' AND jsonb_typeof(v_data->'demand_product_bids') = 'array' THEN
    INSERT INTO public.demand_product_bids (
      id, demand_product_id, supplier_id, amount, status,
      disqualification_reason, created_by, created_at
    )
    SELECT
      id, demand_product_id, supplier_id, amount, status,
      disqualification_reason, created_by,
      base_created_at + ((row_number() OVER (PARTITION BY demand_product_id, base_created_at ORDER BY ord ASC) - 1) * INTERVAL '1 millisecond') AS created_at
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

  -- 27. DEMAND_ITEM_STATUS_HISTORY
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

  -- 28. IIRGD_DEMAND_STATUS_HISTORY
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

  -- 29. SCHOOL_INCIDENTS
  IF v_data ? 'school_incidents' AND jsonb_typeof(v_data->'school_incidents') = 'array' THEN
    INSERT INTO public.school_incidents (
      id, title, description, status, terms_accepted, created_by, created_at, updated_at
    )
    SELECT
      (elem->>'id')::uuid,
      elem->>'title',
      elem->>'description',
      COALESCE((elem->>'status')::public.school_incident_status, 'new'::public.school_incident_status),
      COALESCE((elem->>'terms_accepted')::boolean, false),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'school_incidents') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      status = EXCLUDED.status,
      terms_accepted = EXCLUDED.terms_accepted,
      created_by = EXCLUDED.created_by,
      created_at = EXCLUDED.created_at,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_school_incidents = ROW_COUNT;
  END IF;

  -- 30. SCHOOL_INCIDENT_PARTICIPANTS
  IF v_data ? 'school_incident_participants' AND jsonb_typeof(v_data->'school_incident_participants') = 'array' THEN
    INSERT INTO public.school_incident_participants (
      id, incident_id, role, name, classroom, created_at, updated_at
    )
    SELECT
      (elem->>'id')::uuid,
      (elem->>'incident_id')::uuid,
      elem->>'role',
      elem->>'name',
      NULLIF(TRIM(elem->>'classroom'), ''),
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'school_incident_participants') elem
    WHERE (elem->>'id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.school_incidents WHERE id = (elem->>'incident_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      incident_id = EXCLUDED.incident_id,
      role = EXCLUDED.role,
      name = EXCLUDED.name,
      classroom = EXCLUDED.classroom,
      created_at = EXCLUDED.created_at,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_school_incident_participants = ROW_COUNT;
  END IF;

  -- 31. LOGS
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
