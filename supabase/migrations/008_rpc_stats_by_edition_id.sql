-- Migration 008: get_overview_stats aceita p_edition_id uuid (D-11)
-- + adiciona unique_companies e states_represented (OV-02)
DROP FUNCTION IF EXISTS get_overview_stats(int);
DROP FUNCTION IF EXISTS get_overview_stats(p_edition_year int);

CREATE OR REPLACE FUNCTION get_overview_stats(p_edition_id uuid)
RETURNS json AS $$
DECLARE v_result json;
BEGIN
  SELECT json_build_object(
    'total',                COUNT(*),
    'membro',               COUNT(*) FILTER (WHERE p.ticket_membership = 'MEMBRO'),
    'nao_membro',           COUNT(*) FILTER (WHERE p.ticket_membership = 'NAO_MEMBRO'),
    'total_revenue',        COALESCE(SUM(p.ticket_value), 0),
    'avg_ticket',           COALESCE(AVG(p.ticket_value) FILTER (WHERE p.ticket_value > 0), 0),
    'unique_companies',     COUNT(DISTINCT p.company) FILTER (WHERE p.company IS NOT NULL),
    'states_represented',   COUNT(DISTINCT fr.origin_state) FILTER (WHERE fr.origin_state IS NOT NULL)
  ) INTO v_result
  FROM participants p
  LEFT JOIN form_responses fr ON fr.participant_id = p.id
  WHERE p.edition_id = p_edition_id;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;
