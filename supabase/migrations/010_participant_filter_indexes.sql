-- Migration 010: Índices de suporte para filtros da lista (LIST-03)
CREATE INDEX IF NOT EXISTS idx_form_responses_origin_state
  ON form_responses (origin_state) WHERE origin_state IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_participants_edition_membership
  ON participants (edition_id, ticket_membership);

CREATE INDEX IF NOT EXISTS idx_participants_ticket_value
  ON participants (edition_id, ticket_value) WHERE ticket_value IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_participants_edition_company
  ON participants (edition_id, company);
