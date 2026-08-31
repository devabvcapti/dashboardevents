CREATE TYPE coupon_category AS ENUM (
  'PATROCINADOR',
  'APOIADOR',
  'ESTRATEGICO',
  'PALESTRANTES',
  'CONVIDADOS_PALESTRANTES',
  'IMPRENSA',
  'VIPS',
  'CONSELHO_ABVCAP',
  'PARCEIRO'
);

CREATE TABLE IF NOT EXISTS coupon_categories (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id   uuid NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  coupon_code  text NOT NULL,
  category     coupon_category NOT NULL,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (edition_id, coupon_code)
);

CREATE INDEX IF NOT EXISTS coupon_categories_edition_idx ON coupon_categories(edition_id);

ALTER TABLE coupon_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read coupon_categories" ON coupon_categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert coupon_categories" ON coupon_categories
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update coupon_categories" ON coupon_categories
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete coupon_categories" ON coupon_categories
  FOR DELETE TO authenticated USING (true);
