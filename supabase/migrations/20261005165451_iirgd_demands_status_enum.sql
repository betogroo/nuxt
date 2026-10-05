-- Create Enum Type
CREATE TYPE iirgd_demand_status AS ENUM (
  'new',
  'confronted',
  'released',
  'issued',
  'mailbag',
  'cegaf',
  'no_data',
  'other_pending',
  'protocol_cancelled',
  'awaiting_collection',
  'confrontation_failed'
);

-- Update existing records to match enum values
UPDATE iirgd_demands
SET status = CASE
  WHEN status = 'Novo' THEN 'new'
  WHEN status = 'Confrontado' THEN 'confronted'
  WHEN status = 'Liberado' THEN 'released'
  WHEN status = 'Emitido' OR status = 'Concluído' THEN 'issued'
  WHEN status = 'Em Andamento' THEN 'new'
  WHEN status = 'Malote' THEN 'mailbag'
  WHEN status = 'Cegaf' THEN 'cegaf'
  WHEN status = 'Sem dados para Confronto' THEN 'no_data'
  WHEN status = 'Pendente' OR status = 'Outra Pendência (constar)' THEN 'other_pending'
  WHEN status = 'Protocolo Cancelado' OR status = 'Cancelado' THEN 'protocol_cancelled'
  WHEN status = 'Aguardando Nova Coleta' THEN 'awaiting_collection'
  WHEN status = 'Confronto Fracassado' THEN 'confrontation_failed'
  ELSE 'other_pending'
END;

-- Alter column to use the enum type
ALTER TABLE iirgd_demands
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE iirgd_demand_status USING status::iirgd_demand_status,
  ALTER COLUMN status SET DEFAULT 'new'::iirgd_demand_status;
