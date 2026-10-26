-- Migration: Resilient internal process number trigger and allow manual assignment on insert
-- Timestamp: 20261022143000

CREATE OR REPLACE FUNCTION generate_demand_internal_process_number()
RETURNS TRIGGER AS $$
DECLARE
    current_year TEXT;
    next_sequence INTEGER;
BEGIN
    -- If internal_process_number is already provided and non-empty, keep it
    IF NEW.internal_process_number IS NOT NULL AND TRIM(NEW.internal_process_number) != '' THEN
        RETURN NEW;
    END IF;

    -- Get year from the demand's created_at (or current date for new ones)
    current_year := to_char(COALESCE(NEW.created_at, CURRENT_TIMESTAMP), 'YYYY');
    
    -- Get the next sequence number for that year safely using regex matching
    SELECT COALESCE(MAX(SUBSTRING(internal_process_number FROM 6)::INTEGER), 0) + 1
    INTO next_sequence
    FROM demands
    WHERE internal_process_number ~ ('^' || current_year || '-\d+$');
    
    -- Format: YYYY-XXXX
    NEW.internal_process_number := current_year || '-' || LPAD(next_sequence::TEXT, 4, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
