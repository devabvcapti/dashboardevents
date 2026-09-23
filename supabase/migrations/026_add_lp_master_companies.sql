-- Migration 026: Planilha mestre de LPs (universo conhecido, BR + internacional)
-- Cada upload substitui o conteúdo inteiro da tabela (é um snapshot do universo
-- conhecido, não um log incremental). Usada para calcular % de penetração/cobertura
-- por edição (quantos LPs do universo conhecido participaram do evento).

CREATE TABLE lp_master_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  category lp_category,
  country text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lp_master_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read lp_master_companies"
  ON lp_master_companies FOR SELECT
  TO authenticated
  USING (true);
