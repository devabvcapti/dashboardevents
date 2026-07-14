-- Migration 017: trata pagamentos offline (cupons "PAGAMENTO OFFLINE X")
-- Adiciona valor_pago_manual (preenchido manualmente pela equipe, nunca pela importação)
-- e uma coluna computada valor_efetivo = COALESCE(valor_pago_manual, ticket_value),
-- usada em todo lugar que hoje soma/calcula receita a partir de ticket_value.

ALTER TABLE participants ADD COLUMN IF NOT EXISTS valor_pago_manual numeric(10,2);

ALTER TABLE participants ADD COLUMN IF NOT EXISTS valor_efetivo numeric(10,2)
  GENERATED ALWAYS AS (COALESCE(valor_pago_manual, ticket_value)) STORED;

-- get_overview_stats (Visão Geral): Receita Total e Ticket Médio passam a usar valor_efetivo
CREATE OR REPLACE FUNCTION get_overview_stats(p_edition_id uuid)
RETURNS json AS $$
DECLARE v_result json;
BEGIN
  SELECT json_build_object(
    'total',                COUNT(*),
    'membro',               COUNT(*) FILTER (WHERE p.ticket_membership = 'MEMBRO'),
    'nao_membro',           COUNT(*) FILTER (WHERE p.ticket_membership = 'NAO_MEMBRO'),
    'total_revenue',        COALESCE(SUM(p.valor_efetivo), 0),
    'avg_ticket',           COALESCE(AVG(p.valor_efetivo) FILTER (WHERE p.valor_efetivo > 0), 0),
    'unique_companies',     COUNT(DISTINCT p.company) FILTER (WHERE p.company IS NOT NULL),
    'states_represented',   COUNT(DISTINCT fr.origin_state) FILTER (WHERE fr.origin_state IS NOT NULL)
  ) INTO v_result
  FROM participants p
  LEFT JOIN form_responses fr ON fr.participant_id = p.id
  WHERE p.edition_id = p_edition_id;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

-- get_revenue_analysis (Análise de Receita): mesma troca de ticket_value -> valor_efetivo
CREATE OR REPLACE FUNCTION get_revenue_analysis(p_edition_id uuid)
RETURNS json AS $$
BEGIN
  RETURN json_build_object(
    'by_membership', COALESCE((
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT
          ticket_membership::text AS ticket_membership,
          COUNT(*) AS count,
          COALESCE(SUM(valor_efetivo), 0) AS total_revenue,
          COALESCE(AVG(valor_efetivo) FILTER (WHERE valor_efetivo > 0), 0) AS avg_ticket
        FROM participants
        WHERE edition_id = p_edition_id
        GROUP BY ticket_membership
      ) t
    ), '[]'::json),
    'histogram', COALESCE((
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT
          CASE
            WHEN valor_efetivo = 0     THEN 'Gratuito'
            WHEN valor_efetivo <= 500  THEN 'R$1–500'
            WHEN valor_efetivo <= 1000 THEN 'R$501–1000'
            WHEN valor_efetivo <= 2000 THEN 'R$1001–2000'
            WHEN valor_efetivo <= 3000 THEN 'R$2001–3000'
            ELSE 'Acima de R$3000'
          END AS faixa,
          COUNT(*) AS count,
          MIN(valor_efetivo) AS min_val,
          MAX(valor_efetivo) AS max_val,
          MIN(
            CASE
              WHEN valor_efetivo = 0     THEN 0
              WHEN valor_efetivo <= 500  THEN 1
              WHEN valor_efetivo <= 1000 THEN 2
              WHEN valor_efetivo <= 2000 THEN 3
              WHEN valor_efetivo <= 3000 THEN 4
              ELSE 5
            END
          ) AS sort_order
        FROM participants
        WHERE edition_id = p_edition_id
          AND valor_efetivo IS NOT NULL
        GROUP BY 1
        ORDER BY sort_order
      ) t
    ), '[]'::json)
  );
END;
$$ LANGUAGE plpgsql STABLE;
