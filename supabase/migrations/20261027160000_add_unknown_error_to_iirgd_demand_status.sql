-- Migration: Add 'unknown_error' to iirgd_demand_status enum
-- Description: Adds 'unknown_error' enum value for IIRGD demands to represent unknown error statuses.

ALTER TYPE public.iirgd_demand_status ADD VALUE IF NOT EXISTS 'unknown_error';
