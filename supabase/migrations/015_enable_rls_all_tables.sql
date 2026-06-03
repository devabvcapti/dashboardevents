-- Migration 015: Habilitar RLS em todas as tabelas públicas
-- O app usa service_role key no servidor (bypassa RLS),
-- então habilitar RLS não quebra nenhuma funcionalidade existente.
-- Políticas permitem leitura apenas a usuários autenticados (anon bloqueado).

-- ── editions ──────────────────────────────────────────────────────────────────
ALTER TABLE editions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read editions"
  ON editions FOR SELECT
  TO authenticated
  USING (true);

-- ── participants ──────────────────────────────────────────────────────────────
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read participants"
  ON participants FOR SELECT
  TO authenticated
  USING (true);

-- ── form_responses ────────────────────────────────────────────────────────────
ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read form_responses"
  ON form_responses FOR SELECT
  TO authenticated
  USING (true);

-- ── import_jobs ───────────────────────────────────────────────────────────────
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read import_jobs"
  ON import_jobs FOR SELECT
  TO authenticated
  USING (true);
