-- Migration 004: Correções e extensões em form_responses para Phase 2
-- Análise do Excel real mostrou que interested_in_events é multi-select (TEXT[]),
-- não boolean. Adiciona campos faltando: content_interests, dietary_details.

-- 1. Drop coluna boolean errada e recriar como TEXT[]
ALTER TABLE form_responses DROP COLUMN IF EXISTS interested_in_events;
ALTER TABLE form_responses ADD COLUMN interested_in_events TEXT[];

-- 2. Adicionar novos campos identificados na análise
ALTER TABLE form_responses
  ADD COLUMN IF NOT EXISTS content_interests TEXT[],
  ADD COLUMN IF NOT EXISTS dietary_details TEXT;

-- 3. Índices GIN para os novos arrays (para filtros futuros)
CREATE INDEX IF NOT EXISTS idx_form_responses_interested_in_events
  ON form_responses USING GIN (interested_in_events);

CREATE INDEX IF NOT EXISTS idx_form_responses_content_interests
  ON form_responses USING GIN (content_interests);
