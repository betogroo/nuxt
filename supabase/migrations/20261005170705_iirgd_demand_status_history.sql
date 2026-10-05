-- Create table for tracking IIRGD demand status history
CREATE TABLE iirgd_demand_status_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  demand_id uuid NOT NULL REFERENCES iirgd_demands(id) ON DELETE CASCADE,
  status iirgd_demand_status NOT NULL,
  observation text,
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE iirgd_demand_status_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users"
  ON iirgd_demand_status_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON iirgd_demand_status_history FOR INSERT
  TO authenticated
  WITH CHECK (true);
