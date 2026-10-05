-- Create iirgd_citizens table
CREATE TABLE iirgd_citizens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  rg TEXT,
  cpf TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT iirgd_citizens_rg_cpf_check CHECK (rg IS NOT NULL OR cpf IS NOT NULL)
);

CREATE UNIQUE INDEX iirgd_citizens_rg_idx ON iirgd_citizens (rg) WHERE rg IS NOT NULL;
CREATE UNIQUE INDEX iirgd_citizens_cpf_idx ON iirgd_citizens (cpf) WHERE cpf IS NOT NULL;

-- Enable RLS
ALTER TABLE iirgd_citizens ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "iirgd_citizens_read_policy" ON iirgd_citizens
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'iirgd'))
  );

CREATE POLICY "iirgd_citizens_insert_policy" ON iirgd_citizens
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'iirgd'))
  );

CREATE POLICY "iirgd_citizens_update_policy" ON iirgd_citizens
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'iirgd'))
  );

-- Add citizen_id to demands
ALTER TABLE iirgd_demands ADD COLUMN citizen_id UUID REFERENCES iirgd_citizens(id);

-- Migrate existing data
DO $$
DECLARE
  demand RECORD;
  cit_id UUID;
BEGIN
  FOR demand IN SELECT * FROM iirgd_demands LOOP
    cit_id := NULL;
    
    -- Try to find existing citizen by RG or CPF
    IF demand.rg IS NOT NULL OR demand.cpf IS NOT NULL THEN
      SELECT id INTO cit_id FROM iirgd_citizens 
      WHERE (rg IS NOT NULL AND rg = demand.rg) OR (cpf IS NOT NULL AND cpf = demand.cpf)
      LIMIT 1;
    END IF;
    
    IF cit_id IS NULL THEN
      -- Create new citizen
      INSERT INTO iirgd_citizens (name, rg, cpf) 
      VALUES (demand.name, demand.rg, demand.cpf)
      RETURNING id INTO cit_id;
    ELSE
      -- Update citizen if new info is available
      UPDATE iirgd_citizens 
      SET 
        rg = COALESCE(iirgd_citizens.rg, demand.rg),
        cpf = COALESCE(iirgd_citizens.cpf, demand.cpf)
      WHERE id = cit_id;
    END IF;
    
    -- Link demand
    UPDATE iirgd_demands SET citizen_id = cit_id WHERE id = demand.id;
  END LOOP;
END $$;

-- Drop old columns and enforce NOT NULL on citizen_id
ALTER TABLE iirgd_demands ALTER COLUMN citizen_id SET NOT NULL;
ALTER TABLE iirgd_demands DROP COLUMN name;
ALTER TABLE iirgd_demands DROP COLUMN rg;
ALTER TABLE iirgd_demands DROP COLUMN cpf;
