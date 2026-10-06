-- Migration 029: substitui a lista fixa de 8 categorias de LP por uma taxonomia
-- de 2 níveis (Categoria → Subcategoria), baseada na planilha de classificação
-- real entregue pelo usuário em 2026-10-06 (padrão de mercado para tipos de LP:
-- Pension, Family Offices, Investment Firms, Philanthropy & Agencies, Advisors,
-- Other Limited Partners — 26 subcategorias ao todo).
--
-- "category" (lp_category) deixa de ser a classificação em si e passa a ser só
-- o agrupamento de alto nível, derivado de "subcategory" — por isso o enum
-- lp_category é recriado do zero (6 valores novos) e as tabelas passam a
-- guardar apenas "subcategory"; "category" é derivado em código
-- (LP_SUBCATEGORY_CATEGORY em lib/data.ts), não fica duplicado no banco.

-- 1. Subcategoria (nova, 26 valores)
CREATE TYPE lp_subcategory AS ENUM (
  'CORPORATE_PENSION',
  'PUBLIC_PENSION_FUND',
  'UNION_PENSION_FUND',
  'FAMILY_OFFICE_SINGLE',
  'FAMILY_OFFICE_MULTI',
  'DIRECT_INVESTMENT',
  'FUND_OF_FUNDS',
  'INSURANCE_COMPANY',
  'MUTUAL_FUND_COMPANY',
  'PRIVATE_INVESTMENT_FUND',
  'REAL_ESTATE_INVESTMENT_COMPANY',
  'SECONDARY_LP',
  'ECONOMIC_DEVELOPMENT_AGENCY',
  'ENDOWMENT',
  'UNIVERSITY_NON_ENDOWMENT',
  'FOUNDATION',
  'GOVERNMENT_AGENCY',
  'SOVEREIGN_WEALTH_FUND',
  'DISCRETIONARY_ADVISOR',
  'INVESTMENT_ADVISOR',
  'MONEY_MANAGEMENT_FIRM',
  'WEALTH_MANAGEMENT_FIRM',
  'BANKING_INSTITUTION',
  'CORPORATION',
  'HIGH_NET_WORTH_INVESTOR',
  'OTHER_LIMITED_PARTNER'
);

-- 2. lp_company_categories: adiciona subcategory, faz backfill best-effort a
-- partir da categoria antiga (heurística — ver nota abaixo), depois descarta
-- a coluna/enum antigos. O backfill é só uma rede de segurança: as empresas
-- que já estavam classificadas E aparecem na planilha nova entregue pelo
-- usuário são sobrescritas com o valor preciso logo em seguida, via script
-- scripts/import-lp-classifications.mjs.
ALTER TABLE lp_company_categories ADD COLUMN subcategory lp_subcategory;

UPDATE lp_company_categories SET subcategory = CASE category
  WHEN 'AGENCIA_FOMENTO_DFI' THEN 'ECONOMIC_DEVELOPMENT_AGENCY'
  WHEN 'FUNDO_DE_FUNDOS'     THEN 'FUND_OF_FUNDS'
  WHEN 'RPPS'                THEN 'PUBLIC_PENSION_FUND'
  WHEN 'HNI'                 THEN 'HIGH_NET_WORTH_INVESTOR'
  WHEN 'FAMILY_OFFICE'       THEN 'FAMILY_OFFICE_SINGLE'   -- ambíguo (Single x Multi); revisar manualmente
  WHEN 'FUNDO_PENSAO'        THEN 'CORPORATE_PENSION'      -- ambíguo (Corporate x Public x Union); revisar manualmente
  WHEN 'WEALTH_MANAGEMENT'   THEN 'WEALTH_MANAGEMENT_FIRM'
  WHEN 'ASSET_MANAGER'       THEN 'MONEY_MANAGEMENT_FIRM'  -- ambíguo; revisar manualmente
END::lp_subcategory
WHERE subcategory IS NULL;

ALTER TABLE lp_company_categories ALTER COLUMN subcategory SET NOT NULL;
ALTER TABLE lp_company_categories DROP COLUMN category;

-- 3. lp_master_companies: mesma troca, mas subcategory continua opcional
-- (planilha mestre pode ter linha sem categoria informada).
ALTER TABLE lp_master_companies ADD COLUMN subcategory lp_subcategory;

UPDATE lp_master_companies SET subcategory = CASE category
  WHEN 'AGENCIA_FOMENTO_DFI' THEN 'ECONOMIC_DEVELOPMENT_AGENCY'
  WHEN 'FUNDO_DE_FUNDOS'     THEN 'FUND_OF_FUNDS'
  WHEN 'RPPS'                THEN 'PUBLIC_PENSION_FUND'
  WHEN 'HNI'                 THEN 'HIGH_NET_WORTH_INVESTOR'
  WHEN 'FAMILY_OFFICE'       THEN 'FAMILY_OFFICE_SINGLE'
  WHEN 'FUNDO_PENSAO'        THEN 'CORPORATE_PENSION'
  WHEN 'WEALTH_MANAGEMENT'   THEN 'WEALTH_MANAGEMENT_FIRM'
  WHEN 'ASSET_MANAGER'       THEN 'MONEY_MANAGEMENT_FIRM'
  ELSE NULL
END::lp_subcategory
WHERE category IS NOT NULL;

ALTER TABLE lp_master_companies DROP COLUMN category;

-- 4. Enum antigo (8 categorias) não é mais referenciado por nenhuma coluna —
-- recriado com os 6 valores de alto nível, só para documentação/referência
-- futura em código (não é usado como tipo de coluna; "category" é derivado
-- em TypeScript a partir de "subcategory").
DROP TYPE lp_category;
CREATE TYPE lp_category AS ENUM (
  'PENSION',
  'FAMILY_OFFICES',
  'INVESTMENT_FIRMS',
  'PHILANTHROPY_AGENCIES',
  'ADVISORS',
  'OTHER_LIMITED_PARTNERS'
);
