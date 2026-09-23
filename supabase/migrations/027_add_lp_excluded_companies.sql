-- Migration 027: Exclusão manual de empresas mal classificadas como LP
-- A classificação de company_segment_normalized é derivada por regex de texto
-- livre (lib/import/segment-mapper.ts) e pode errar. Esta tabela permite um
-- admin excluir uma empresa específica da contabilização de LPs sem alterar o
-- dado bruto do participante — reversível (basta remover a linha).

CREATE TABLE lp_excluded_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lp_excluded_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read lp_excluded_companies"
  ON lp_excluded_companies FOR SELECT
  TO authenticated
  USING (true);
