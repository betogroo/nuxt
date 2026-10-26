-- Add the column
ALTER TABLE demands ADD COLUMN internal_process_number VARCHAR(20) UNIQUE;

-- Create the sequence generator function
CREATE OR REPLACE FUNCTION generate_demand_internal_process_number()
RETURNS TRIGGER AS $$
DECLARE
    current_year TEXT;
    next_sequence INTEGER;
BEGIN
    -- Get year from the demand's created_at (or current date for new ones)
    current_year := to_char(COALESCE(NEW.created_at, CURRENT_TIMESTAMP), 'YYYY');
    
    -- Get the next sequence number for that year
    SELECT COALESCE(MAX(SUBSTRING(internal_process_number FROM 6)::INTEGER), 0) + 1
    INTO next_sequence
    FROM demands
    WHERE internal_process_number LIKE current_year || '-%';
    
    -- Format: YYYY-XXXX
    NEW.internal_process_number := current_year || '-' || LPAD(next_sequence::TEXT, 4, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER set_demand_internal_process_number_trigger
BEFORE INSERT ON demands
FOR EACH ROW
EXECUTE FUNCTION generate_demand_internal_process_number();

-- Backfill existing demands
DO $$
DECLARE
    demand_rec RECORD;
    current_year TEXT;
    next_seq INTEGER;
BEGIN
    FOR demand_rec IN SELECT id, created_at FROM demands WHERE internal_process_number IS NULL ORDER BY created_at ASC
    LOOP
        current_year := to_char(demand_rec.created_at, 'YYYY');
        
        SELECT COALESCE(MAX(SUBSTRING(internal_process_number FROM 6)::INTEGER), 0) + 1
        INTO next_seq
        FROM demands
        WHERE internal_process_number LIKE current_year || '-%';
        
        UPDATE demands 
        SET internal_process_number = current_year || '-' || LPAD(next_seq::TEXT, 4, '0')
        WHERE id = demand_rec.id;
    END LOOP;
END;
$$;
