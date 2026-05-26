-- Migration 007: Remove UNIQUE constraint em editions.year (D-06)
-- Permite múltiplos eventos no mesmo ano via /dashboard/eventos.
ALTER TABLE editions DROP CONSTRAINT IF EXISTS editions_year_key;
