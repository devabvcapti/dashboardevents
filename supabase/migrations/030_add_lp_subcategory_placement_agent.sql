-- Migration 030: adiciona a subcategoria PLACEMENT_AGENT (Placement Agent /
-- Capital Advisory) à taxonomia de LPs, dentro da categoria Advisors
-- (Consultores/Assessores) — a mesma categoria de Discretionary Advisor,
-- Investment Advisor, Money Management Firm e Wealth Management Firm.

ALTER TYPE lp_subcategory ADD VALUE 'PLACEMENT_AGENT';
