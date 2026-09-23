-- Migration 025: Subcategorias de LP (classificação por empresa, não por participante/edição)
-- Empresas LP se repetem entre eventos, então a classificação vale globalmente.
-- Nome da empresa é normalizado no app (lib/data.ts normalizeCompanyKey — remove
-- acentos, colapsa espaços, minúsculo) antes de gravar/consultar company_key, para
-- tolerar pequenas variações de grafia entre importações.

CREATE TYPE lp_category AS ENUM (
  'AGENCIA_FOMENTO_DFI',
  'FAMILY_OFFICE',
  'FUNDO_PENSAO',
  'FUNDO_DE_FUNDOS',
  'RPPS',
  'WEALTH_MANAGEMENT',
  'ASSET_MANAGER',
  'HNI'
);

CREATE TABLE lp_company_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  category lp_category NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lp_company_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read lp_company_categories"
  ON lp_company_categories FOR SELECT
  TO authenticated
  USING (true);
