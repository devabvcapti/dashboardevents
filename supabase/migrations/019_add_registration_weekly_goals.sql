-- Migration 019: metas semanais (progressivas) de inscrição por edição
-- Cada linha é um checkpoint manual: "até o início da semana de week_start,
-- deveríamos ter target_count inscritos acumulados". A meta final que já
-- existia em editions.registration_goal continua representando o total do
-- evento; as metas semanais são a curva de ritmo até lá.

CREATE TABLE IF NOT EXISTS registration_weekly_goals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id    uuid NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  week_start    date NOT NULL,
  target_count  integer NOT NULL CHECK (target_count > 0),
  created_at    timestamptz DEFAULT now(),
  UNIQUE (edition_id, week_start)
);

CREATE INDEX IF NOT EXISTS registration_weekly_goals_edition_idx
  ON registration_weekly_goals(edition_id);

ALTER TABLE registration_weekly_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read registration_weekly_goals"
  ON registration_weekly_goals FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert registration_weekly_goals"
  ON registration_weekly_goals FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update registration_weekly_goals"
  ON registration_weekly_goals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete registration_weekly_goals"
  ON registration_weekly_goals FOR DELETE TO authenticated USING (true);
