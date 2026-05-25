-- Migration 002: RPC para estatísticas do overview
-- Evita SELECT * + reduce em JS; calcula tudo no banco.

CREATE OR REPLACE FUNCTION get_overview_stats(p_edition_year int DEFAULT 2025)
RETURNS json AS $$
DECLARE
  v_edition_id uuid;
  v_result     json;
BEGIN
  SELECT id INTO v_edition_id
  FROM editions
  WHERE year = p_edition_year;

  SELECT json_build_object(
    'total',         COUNT(*),
    'membro',        COUNT(*) FILTER (WHERE ticket_membership = 'MEMBRO'),
    'nao_membro',    COUNT(*) FILTER (WHERE ticket_membership = 'NAO_MEMBRO'),
    'total_revenue', COALESCE(SUM(ticket_value), 0),
    'avg_ticket',    COALESCE(AVG(ticket_value), 0)
  ) INTO v_result
  FROM participants
  WHERE edition_id = v_edition_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;
