-- Migration 031: adiciona event_series às edições, pra agrupar edições do
-- mesmo evento (ex.: 'congresso', 'vcday') independente do nome/ano — usado
-- na análise de Novos vs. Recorrentes entre edições (Comparativo). Backfill
-- das 4 edições existentes por nome; novas edições passam a informar isso
-- na criação (ver /dashboard/eventos).

ALTER TABLE editions ADD COLUMN IF NOT EXISTS event_series text;

UPDATE editions SET event_series = 'congresso' WHERE name ILIKE '%congresso%' AND event_series IS NULL;
UPDATE editions SET event_series = 'vcday' WHERE name ILIKE '%vc day%' AND event_series IS NULL;
