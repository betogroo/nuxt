-- Migration: Add school incidents and participants to supabase_realtime publication
-- Enables Postgres change subscriptions via WebSocket for school modules

ALTER PUBLICATION supabase_realtime ADD TABLE school_incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE school_incident_participants;
