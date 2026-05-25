# Architecture Patterns: ABVCAP Congress Dashboard

**Domain:** Event analytics dashboard — read-heavy, admin-only, Excel-ingested data
**Researched:** 2026-05-21
**Overall confidence:** HIGH (based on PostgreSQL official docs, Supabase official docs, verified benchmarks)

---

## 1. Form Responses: Separate Table (Flat Columns) vs EAV vs JSONB

### Verdict: Separate `form_responses` table with flat typed columns

**Reject EAV.** The cybertec-postgresql.com analysis (one of the most authoritative PostgreSQL consulting sources) explicitly labels EAV a design pathology in PostgreSQL. Each analytics query like `GROUP BY cargo` would require a self-join — `WHERE attribute_name = 'cargo'` — making every GROUP BY into a multi-join operation. There is no way to enforce data types. NULL handling becomes impossible. Query plans degrade to sequential scans.

**Reject JSONB-only.** JSONB performs well for semi-structured optional metadata, but the sqlpad.io/heap.io benchmarks confirm: when a field is used repeatedly in GROUP BY, WHERE, or COUNT, JSONB path extraction overhead adds up. More critically, Supabase PostgREST cannot filter or aggregate on JSONB sub-keys — you would need raw SQL for every analytics query, defeating the ergonomic value of the Supabase client.

**Use flat columns in a separate table.** All form response fields for ABVCAP are known, finite, and analytically critical. They belong as typed columns. The only exception is `temas_interesse` and `canais_preferidos` which are multi-select — use `TEXT[]` arrays for those.

**The `participants` / `form_responses` split is correct.** The PROJECT.md decision is sound:
- `participants` = registration record (stable, sourced from ticketing platform)
- `form_responses` = survey answers (richer, may vary by congress edition)

This separation means future editions can add new form fields without touching the participants table. It also isolates the two data domains for cleaner analytics queries.

**Trade-off to accept:** Queries that join both tables (e.g., "MEMBRO breakdown by cargo") require a JOIN. This is fine — a single JOIN on UUID foreign keys with proper indexing is fast. The alternative (one fat table) makes edition support harder and mixes concerns.

---

## 2. Edition Support Schema

### Verdict: `editions` lookup table + `edition_id` FK on `participants`

The clean approach is a lightweight `editions` table. Participants and form responses belong to an edition via foreign key. This requires zero structural changes when adding Congress 2026 — you insert one row into `editions` and start importing participants linked to that edition.

**Rejected alternative — year column directly on participants:** Using `congress_year INT` directly on `participants` works but is denormalized. It also makes it impossible to attach edition-level metadata (name, date, location) without duplicating it across thousands of participant rows.

**Rejected alternative — separate tables per year:** Partitioning into `participants_2025`, `participants_2026` etc. destroys cross-edition analytics and requires schema migrations every year. Never do this.

The `edition_id` approach means all existing dashboard queries work on the current edition by filtering `WHERE edition_id = [current]`, and future cross-edition analytics work by removing that filter.

---

## 3. Recommended Schema (Full SQL)

```sql
-- ============================================================
-- ENUMS
-- ============================================================

-- Membership / ticket type — binary is correct for ABVCAP
CREATE TYPE ticket_membership AS ENUM ('MEMBRO', 'NAO_MEMBRO');

-- Company segment — based on Brazilian VC/PE ecosystem
CREATE TYPE company_segment AS ENUM (
  'GESTORA_PE_VC',   -- Private Equity / Venture Capital manager
  'LP_INSTITUCIONAL', -- Pension fund, insurance, endowment
  'LP_CORPORATIVO',   -- Corporate investor
  'BANCO_FINANCEIRO',
  'GOVERNO_FOMENTO',  -- BNDES, development agencies
  'ACADEMIA',
  'IMPRENSA',
  'OUTRO'
);

-- Company size by AUM / headcount
CREATE TYPE company_size AS ENUM (
  'MICRO',    -- < R$50M AUM or < 10 pessoas
  'PEQUENO',  -- R$50M–500M AUM
  'MEDIO',    -- R$500M–5B AUM
  'GRANDE',   -- > R$5B AUM
  'NAO_INFORMADO'
);

-- Brazilian states — use ISO 3166-2:BR codes (SP, RJ, MG, etc.)
-- Store as TEXT to avoid exhaustive enum maintenance

-- ============================================================
-- EDITIONS (one row per congress year)
-- ============================================================

CREATE TABLE editions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year        SMALLINT NOT NULL UNIQUE,   -- 2025, 2026, etc.
  name        TEXT NOT NULL,              -- 'Congresso ABVCAP 2025'
  event_date  DATE,
  location    TEXT,
  is_current  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Only one current edition at a time
CREATE UNIQUE INDEX idx_editions_current ON editions (is_current)
  WHERE is_current = true;

-- Seed the first edition
INSERT INTO editions (year, name, event_date, location, is_current)
VALUES (2025, 'Congresso ABVCAP 2025', '2025-11-01', 'São Paulo, SP', true);

-- ============================================================
-- PARTICIPANTS
-- ============================================================

CREATE TABLE participants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id      UUID NOT NULL REFERENCES editions(id) ON DELETE RESTRICT,

  -- Registration data (from ticketing platform Excel export)
  nome            TEXT NOT NULL,
  empresa         TEXT NOT NULL,
  tipo_empresa    company_segment NOT NULL DEFAULT 'OUTRO',
  tipo_ingresso   ticket_membership NOT NULL,  -- MEMBRO | NAO_MEMBRO
  valor_ingresso  NUMERIC(10, 2),              -- NULL for complimentary

  -- Basic contact (may be empty if not in Excel)
  email           TEXT,
  telefone        TEXT,

  -- Import tracking
  import_id       UUID REFERENCES import_jobs(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),

  -- Soft dedup: same email+edition = same person
  CONSTRAINT uq_participant_edition_email UNIQUE (edition_id, email)
);

-- Analytics indexes
CREATE INDEX idx_participants_edition     ON participants(edition_id);
CREATE INDEX idx_participants_tipo_ingresso ON participants(tipo_ingresso);
CREATE INDEX idx_participants_tipo_empresa  ON participants(tipo_empresa);
CREATE INDEX idx_participants_import        ON participants(import_id);

-- ============================================================
-- FORM RESPONSES
-- ============================================================

CREATE TABLE form_responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id  UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  edition_id      UUID NOT NULL REFERENCES editions(id) ON DELETE RESTRICT,

  -- Professional profile
  cargo                   TEXT,
  area_atuacao            TEXT,

  -- Company profile
  segmento_empresa        company_segment,  -- may refine participants.tipo_empresa
  porte_empresa           company_size DEFAULT 'NAO_INFORMADO',
  aum_range               TEXT,             -- free-form AUM range if not enumerable

  -- Geography
  estado                  CHAR(2),          -- ISO 3166-2:BR state code (SP, RJ, MG...)
  cidade                  TEXT,

  -- Communication preferences
  opt_in_comunicacao      BOOLEAN DEFAULT false,
  canais_preferidos       TEXT[],           -- e.g. {'EMAIL','WHATSAPP','LINKEDIN'}

  -- Event interests
  temas_interesse         TEXT[],           -- multi-select topics
  interesse_ecossistema   BOOLEAN DEFAULT false,

  -- Logistics
  restricao_alimentar     TEXT,             -- free-form (NULL = nenhuma)

  created_at              TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT uq_form_response_participant UNIQUE (participant_id)
);

-- Analytics indexes
CREATE INDEX idx_form_cargo          ON form_responses(cargo);
CREATE INDEX idx_form_area_atuacao   ON form_responses(area_atuacao);
CREATE INDEX idx_form_porte_empresa  ON form_responses(porte_empresa);
CREATE INDEX idx_form_estado         ON form_responses(estado);
CREATE INDEX idx_form_edition        ON form_responses(edition_id);
CREATE INDEX idx_form_opt_in         ON form_responses(opt_in_comunicacao);

-- GIN index for array containment queries:
-- e.g. WHERE 'ESG' = ANY(temas_interesse)
-- e.g. WHERE temas_interesse @> ARRAY['ESG','REGULACAO']
CREATE INDEX idx_form_temas_gin      ON form_responses USING GIN (temas_interesse);
CREATE INDEX idx_form_canais_gin     ON form_responses USING GIN (canais_preferidos);

-- ============================================================
-- IMPORT JOBS (audit / history table)
-- ============================================================

CREATE TYPE import_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE import_jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id        UUID NOT NULL REFERENCES editions(id) ON DELETE RESTRICT,

  -- File metadata
  filename          TEXT NOT NULL,
  file_size_bytes   INTEGER,
  file_hash         TEXT,             -- SHA-256 of file content — detects duplicate uploads

  -- Execution stats
  status            import_status NOT NULL DEFAULT 'PENDING',
  started_at        TIMESTAMPTZ DEFAULT now(),
  completed_at      TIMESTAMPTZ,
  duration_ms       INTEGER GENERATED ALWAYS AS (
                      EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000
                    )::integer STORED,

  -- Row counts
  rows_in_file      INTEGER,
  rows_inserted     INTEGER DEFAULT 0,
  rows_updated      INTEGER DEFAULT 0,
  rows_skipped      INTEGER DEFAULT 0,  -- duplicates detected by uq constraint
  rows_errored      INTEGER DEFAULT 0,

  -- Error detail (stored as JSONB for flexibility)
  -- Structure: [{"row": 42, "column": "email", "value": "bad@", "error": "invalid format"}]
  error_log         JSONB DEFAULT '[]'::jsonb,

  -- Who did it (Supabase auth user ID)
  imported_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_import_jobs_edition  ON import_jobs(edition_id);
CREATE INDEX idx_import_jobs_status   ON import_jobs(status);
CREATE INDEX idx_import_jobs_created  ON import_jobs(created_at DESC);
```

**Note on circular reference:** `participants` references `import_jobs` and `import_jobs` is defined after. In the migration, create `import_jobs` first, then `participants` with the FK. Or add the FK as a separate `ALTER TABLE` after both tables exist. The SQL above reflects logical intent — ordering in the actual migration file must be:
1. `editions`
2. `import_jobs`
3. `participants` (with `import_id` FK to `import_jobs`)
4. `form_responses`

---

## 4. Indexing Strategy for Analytics Queries

### Index types to use

**B-tree indexes (default)** — correct for all equality and range filters:
- `tipo_ingresso` (the most important: every query filters MEMBRO vs NAO_MEMBRO)
- `tipo_empresa`, `estado`, `porte_empresa`, `cargo`
- `edition_id` on both tables (always in WHERE clause)

**Partial indexes** — use when one value dominates and the other is always filtered:
```sql
-- If most analytics exclude NAO_INFORMADO porte
CREATE INDEX idx_form_porte_known ON form_responses(porte_empresa)
  WHERE porte_empresa != 'NAO_INFORMADO';
```

**GIN indexes** — mandatory for `TEXT[]` arrays:
```sql
-- Supports: WHERE temas_interesse @> ARRAY['ESG']
-- Supports: WHERE 'ESG' = ANY(temas_interesse)
CREATE INDEX idx_form_temas_gin ON form_responses USING GIN (temas_interesse);
```

**Composite indexes** — for the most common analytics join pattern:
```sql
-- Dashboard query: participant breakdown by tipo_empresa grouped by tipo_ingresso
CREATE INDEX idx_participants_ingresso_empresa
  ON participants(edition_id, tipo_ingresso, tipo_empresa);

-- Form analytics: geographic distribution for current edition
CREATE INDEX idx_form_edition_estado
  ON form_responses(edition_id, estado);
```

### The most important query — cover it explicitly

```sql
-- Membership vs company type breakdown (the core analytics query)
-- This query runs on every dashboard page load
SELECT
  p.tipo_ingresso,
  p.tipo_empresa,
  COUNT(*) AS total,
  SUM(p.valor_ingresso) AS receita
FROM participants p
WHERE p.edition_id = $1
GROUP BY p.tipo_ingresso, p.tipo_empresa;
```

The composite index `(edition_id, tipo_ingresso, tipo_empresa)` covers this query as an index-only scan (add `valor_ingresso` to make it fully covering):

```sql
CREATE INDEX idx_participants_analytics_cover
  ON participants(edition_id, tipo_ingresso, tipo_empresa)
  INCLUDE (valor_ingresso);
```

### Do not over-index

- `email` — only needed for dedup during import, not analytics. The UNIQUE constraint creates it automatically.
- `nome`, `empresa` — free text search uses `ILIKE` which ignores B-tree. If full-text search is needed later, use `pg_trgm` extension with a GIN index.
- `created_at` — not used in analytics. Skip unless you add time-series features.

---

## 5. Supabase RLS Strategy

### Verdict: Enable Supabase Auth + `is_admin` flag in `auth.users.raw_app_meta_data`

This is the simplest correct approach for an admin-only dashboard with a small fixed team.

**Why not anon key + no RLS:** The current schema has `ENABLE ROW LEVEL SECURITY` with only a `service_role` policy. This means the anon key (which is `NEXT_PUBLIC_` and therefore exposed to the browser) cannot read anything. The app currently works only because Next.js server components use the anon key server-side — but this is fragile. Any browser DevTools inspection exposes the key.

**The right model for this app:**

1. All users must authenticate with Supabase Auth (email + password, no self-service signup)
2. Admin status is stored in `raw_app_meta_data` (set via service_role key, not modifiable by users)
3. RLS policies check admin status via a cached security-definer function
4. Next.js uses `SUPABASE_SERVICE_ROLE_KEY` (no `NEXT_PUBLIC_` prefix) for all server-side data fetching

```sql
-- Step 1: Create admin-check function in private schema
-- (private schema is not exposed via PostgREST)
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  )
$$;

-- Step 2: Apply to all tables
-- participants
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_select" ON participants
  FOR SELECT TO authenticated
  USING ((SELECT private.is_admin()));

CREATE POLICY "admins_insert" ON participants
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "admins_update" ON participants
  FOR UPDATE TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

-- form_responses (same pattern)
ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_select" ON form_responses
  FOR SELECT TO authenticated
  USING ((SELECT private.is_admin()));

CREATE POLICY "admins_insert" ON form_responses
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.is_admin()));

-- import_jobs
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_all" ON import_jobs
  FOR ALL TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

-- editions (read-only for admins; write via service_role only)
ALTER TABLE editions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_select" ON editions
  FOR SELECT TO authenticated
  USING ((SELECT private.is_admin()));

-- Step 3: Grant admin role to a user via service_role key
-- Run this from server-side code or Supabase dashboard:
-- UPDATE auth.users
--   SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'
--   WHERE email = 'ti@abvcap.com.br';
```

**Why `(SELECT private.is_admin())` with SELECT wrapping:** This is the Supabase-documented optimization. The subselect causes PostgreSQL to run the function once per query (initPlan), not once per row. Without it, the function runs for every row scanned — catastrophic on a 1000-row participants table.

**Next.js integration pattern:**

```typescript
// lib/supabase-server.ts
import { createClient } from '@supabase/supabase-js'

// Service role client — bypasses RLS entirely
// ONLY use in Next.js server components, server actions, route handlers
// NEVER expose SUPABASE_SERVICE_ROLE_KEY to the browser
export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!  // no NEXT_PUBLIC_ prefix
  )
}
```

For this dashboard (no participant-facing pages, fixed admin team), using the service role key server-side is acceptable. The RLS policies are a defense-in-depth measure for PostgREST direct access, not the primary auth layer.

---

## 6. Import Jobs: Tracking Pattern

### Schema rationale

The `import_jobs` table records one row per file upload attempt. Row-level error details go in `error_log JSONB` (not a separate table) because:
- The number of errors per import is bounded (max = rows in file)
- Querying individual errors is ad-hoc ("show me errors for this import"), not analytical
- A separate `import_errors` table would require a JOIN for every import status display

The JSONB structure for errors:
```json
[
  {"row": 5, "column": "email", "value": "not-an-email", "error": "formato inválido"},
  {"row": 12, "column": "tipo_ingresso", "value": "VIP", "error": "valor não reconhecido, use MEMBRO ou NAO_MEMBRO"},
  {"row": 23, "column": "valor_ingresso", "value": "R$ 1.500,00", "error": "parse falhou — remova símbolo de moeda"}
]
```

### Import flow (application logic, not DB)

```
1. User uploads .xlsx file
2. Server parses file with a library (xlsx / exceljs)
3. Create import_jobs row with status='PROCESSING', filename, file_hash
4. For each row in file:
   a. Map Excel columns to participants schema
   b. Validate (email format, tipo_ingresso in enum, valor_ingresso numeric)
   c. Try INSERT into participants (ON CONFLICT DO UPDATE for re-imports)
   d. On success: increment rows_inserted or rows_updated
   e. On error: append to error_log, increment rows_errored
5. Insert form_responses rows for rows that have form data
6. Update import_jobs: status='COMPLETED', completed_at=now(), final counts
7. On uncaught exception: status='FAILED'
```

**Dedup strategy during import:** The UNIQUE constraint `(edition_id, email)` on participants is the guard. Use `INSERT ... ON CONFLICT (edition_id, email) DO UPDATE SET ...` — this is an "upsert" that updates existing participants if re-imported, and counts as `rows_updated`.

**File hash dedup:** Before processing, check if `file_hash` already exists in `import_jobs` for this edition. If so, warn the user "este arquivo já foi importado" and offer to proceed or cancel. This prevents double-counting from accidental re-uploads.

```sql
-- Check for duplicate file before processing
SELECT id, completed_at, rows_inserted
FROM import_jobs
WHERE edition_id = $1
  AND file_hash = $2
  AND status = 'COMPLETED';
```

---

## 7. Analytics Query Patterns (with schema)

These are the queries the dashboard will run. They are fast with the indexes above.

```sql
-- KPI: Total by membership type
SELECT tipo_ingresso, COUNT(*) as total, SUM(valor_ingresso) as receita
FROM participants
WHERE edition_id = (SELECT id FROM editions WHERE is_current = true)
GROUP BY tipo_ingresso;

-- Audience profile: company type breakdown
SELECT p.tipo_empresa, p.tipo_ingresso, COUNT(*) as total
FROM participants p
WHERE p.edition_id = (SELECT id FROM editions WHERE is_current = true)
GROUP BY p.tipo_empresa, p.tipo_ingresso
ORDER BY total DESC;

-- Form: geographic distribution (members vs non-members)
SELECT fr.estado, p.tipo_ingresso, COUNT(*) as total
FROM form_responses fr
JOIN participants p ON fr.participant_id = p.id
WHERE fr.edition_id = (SELECT id FROM editions WHERE is_current = true)
  AND fr.estado IS NOT NULL
GROUP BY fr.estado, p.tipo_ingresso
ORDER BY total DESC;

-- Form: top interest topics
SELECT tema, COUNT(*) as total
FROM form_responses, UNNEST(temas_interesse) AS tema
WHERE edition_id = (SELECT id FROM editions WHERE is_current = true)
GROUP BY tema
ORDER BY total DESC;

-- Form: communication opt-in rate
SELECT
  p.tipo_ingresso,
  COUNT(*) FILTER (WHERE fr.opt_in_comunicacao = true) AS opted_in,
  COUNT(*) AS total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE fr.opt_in_comunicacao = true) / COUNT(*), 1) AS pct
FROM form_responses fr
JOIN participants p ON fr.participant_id = p.id
WHERE fr.edition_id = (SELECT id FROM editions WHERE is_current = true)
GROUP BY p.tipo_ingresso;
```

---

## 8. What to Change in the Existing Codebase

The current `schema.sql` uses `ticket_type` and `company_type` enums from the OLD model (LP, GP, APOIADOR etc. as ticket types). These must be replaced:

| Current | Replace With | Reason |
|---------|-------------|--------|
| `ticket_type` ENUM with LP/GP/etc | `ticket_membership` ENUM (MEMBRO/NAO_MEMBRO) | Matches actual ABVCAP data |
| `company_type` ENUM | `company_segment` ENUM | More accurate taxonomy |
| `participant_status` ENUM | Remove from v1 | Status comes from ticketing platform, not needed if data is already confirmed |
| Single `participants` table | `editions` + `participants` + `form_responses` | Enables edition support and analytics separation |
| `lib/database.types.ts` | Regenerate from new schema | Hand-authored types will be stale |

The `lib/data.ts` aggregation functions that load full table in-memory (`getOverviewStats`) should be replaced with SQL aggregation queries once the new schema is live. The current pattern works for ~100 rows but will feel slow at 500+.

---

## Component Boundaries

```
Excel File
    │
    ▼
Next.js Route Handler (POST /api/import)
    │  - parse xlsx
    │  - validate rows
    │  - upsert participants + form_responses
    │  - write import_jobs row
    ▼
Supabase PostgreSQL
    ├── editions
    ├── import_jobs
    ├── participants ──────── analytics queries
    └── form_responses ──────── (JOIN on participant_id)
    │
    ▼
Next.js Server Components (lib/data.ts)
    │  - SQL aggregation queries (not in-memory)
    │  - Returns typed aggregated objects
    ▼
Client Components (Recharts charts, tables)
```

---

## Sources

- Supabase RLS Official Docs: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Custom Claims & RBAC: https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac
- PostgreSQL GROUP BY Optimization: https://oneuptime.com/blog/post/2026-01-25-postgresql-group-by-performance/view
- PostgreSQL Partial Indexes Official Docs: https://www.postgresql.org/docs/16/indexes-partial.html
- JSONB vs Flat Columns — Heap.io: https://www.heap.io/blog/when-to-avoid-jsonb-in-a-postgresql-schema
- JSONB vs Flat Columns — SQLPad: https://sqlpad.io/tutorial/postgresql-jsonb-vs-columns-performance-guide/
- Replacing EAV with JSONB: https://coussej.github.io/2016/01/14/Replacing-EAV-with-JSONB-in-PostgreSQL/
- Storing Dynamic Attributes — EAV/JSONB comparison: https://leapcell.io/blog/storing-dynamic-attributes-sparse-columns-eav-and-jsonb-explained
- Supabase RLS Best Practices (MakerKit): https://makerkit.dev/blog/tutorials/supabase-rls-best-practices
- Supabase Securing Your API: https://supabase.com/docs/guides/api/securing-your-api
- Supabase RLS Troubleshooting (performance): https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv
