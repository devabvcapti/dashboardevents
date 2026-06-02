-- Migration 014: Tabela de orçamento por edição

CREATE TABLE IF NOT EXISTS budget_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id   uuid NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  category     text NOT NULL,
  subcategory  text,
  budgeted     numeric(14,2) NOT NULL DEFAULT 0,
  realized     numeric(14,2) NOT NULL DEFAULT 0,
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS budget_items_edition_idx ON budget_items(edition_id);

ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read budget_items"
  ON budget_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert budget_items"
  ON budget_items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete budget_items"
  ON budget_items FOR DELETE TO authenticated USING (true);
