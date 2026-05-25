-- Migration 003: Extensões da tabela participants para Phase 2
-- Baseado em análise do arquivo Excel real ABVCAP (60 colunas).
-- Adiciona campos identificados na análise do CONTEXT.md.

ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS cpf TEXT,                          -- 11 dígitos com zero-padding
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT,
  ADD COLUMN IF NOT EXISTS is_company_member BOOLEAN,
  ADD COLUMN IF NOT EXISTS company_segment_raw TEXT,
  ADD COLUMN IF NOT EXISTS company_segment_normalized company_segment;

-- Índice para busca por CPF (uso futuro de deduplicação fallback)
CREATE INDEX IF NOT EXISTS idx_participants_cpf
  ON participants (cpf) WHERE cpf IS NOT NULL;

-- Índice para filtros por segmento normalizado
CREATE INDEX IF NOT EXISTS idx_participants_segment_normalized
  ON participants (company_segment_normalized)
  WHERE company_segment_normalized IS NOT NULL;
