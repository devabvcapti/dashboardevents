-- Migration 020: log de comunicados de marketing por edição
-- Registro manual (data + canal + descrição opcional) usado para sobrepor
-- marcadores no gráfico de Ritmo de Inscrições e permitir correlacionar
-- picos de inscrição com disparos de marketing — sem depender de nenhum
-- dado vindo da plataforma de inscrição (que não suporta UTM/rastreio).

CREATE TABLE IF NOT EXISTS marketing_communications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id   uuid NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  sent_at      date NOT NULL,
  channel      text NOT NULL,
  description  text,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketing_communications_edition_idx
  ON marketing_communications(edition_id);

ALTER TABLE marketing_communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read marketing_communications"
  ON marketing_communications FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert marketing_communications"
  ON marketing_communications FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete marketing_communications"
  ON marketing_communications FOR DELETE TO authenticated USING (true);
