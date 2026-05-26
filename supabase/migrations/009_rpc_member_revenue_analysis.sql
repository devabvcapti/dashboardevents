-- Migration 009: RPCs de análise de membros e receita (MBR-01..03, REV-01..03)

CREATE OR REPLACE FUNCTION get_member_analysis(p_edition_id uuid)
RETURNS json AS $$
BEGIN
  RETURN COALESCE((
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT
        COALESCE(fr.company_segment::text, 'SEM_SEGMENTO') AS segment,
        COUNT(*) FILTER (WHERE p.ticket_membership = 'MEMBRO')     AS membro_count,
        COUNT(*) FILTER (WHERE p.ticket_membership = 'NAO_MEMBRO') AS nao_membro_count,
        COUNT(*)                                                    AS total,
        ROUND(
          COUNT(*) FILTER (WHERE p.ticket_membership = 'MEMBRO')::numeric
          / NULLIF(COUNT(*), 0) * 100, 1
        ) AS membership_pct
      FROM participants p
      LEFT JOIN form_responses fr ON fr.participant_id = p.id
      WHERE p.edition_id = p_edition_id
      GROUP BY COALESCE(fr.company_segment::text, 'SEM_SEGMENTO')
      ORDER BY total DESC
    ) t
  ), '[]'::json);
END;
$$ LANGUAGE plpgsql STABLE;

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
          COALESCE(SUM(ticket_value), 0) AS total_revenue,
          COALESCE(AVG(ticket_value) FILTER (WHERE ticket_value > 0), 0) AS avg_ticket
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
            WHEN ticket_value = 0     THEN 'Gratuito'
            WHEN ticket_value <= 500  THEN 'R$1–500'
            WHEN ticket_value <= 1000 THEN 'R$501–1000'
            WHEN ticket_value <= 2000 THEN 'R$1001–2000'
            WHEN ticket_value <= 3000 THEN 'R$2001–3000'
            ELSE 'Acima de R$3000'
          END AS faixa,
          COUNT(*) AS count,
          MIN(ticket_value) AS min_val,
          MAX(ticket_value) AS max_val,
          MIN(
            CASE
              WHEN ticket_value = 0     THEN 0
              WHEN ticket_value <= 500  THEN 1
              WHEN ticket_value <= 1000 THEN 2
              WHEN ticket_value <= 2000 THEN 3
              WHEN ticket_value <= 3000 THEN 4
              ELSE 5
            END
          ) AS sort_order
        FROM participants
        WHERE edition_id = p_edition_id
          AND ticket_value IS NOT NULL
        GROUP BY 1
        ORDER BY sort_order
      ) t
    ), '[]'::json)
  );
END;
$$ LANGUAGE plpgsql STABLE;
