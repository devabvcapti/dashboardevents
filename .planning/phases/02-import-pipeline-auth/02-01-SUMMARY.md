---
phase: 02-import-pipeline-auth
plan: "01"
subsystem: database-schema
tags: [migrations, supabase, rpc, typescript-types, schema-extension]
dependency_graph:
  requires: [01-foundation]
  provides: [upsert_participants_batch, upsert_form_responses_batch, Phase2Schema]
  affects: [02-02, 02-03, 02-04]
tech_stack:
  added: [upsert_participants_batch RPC, upsert_form_responses_batch RPC]
  patterns: [atomic-batch-upsert, per-row-error-capture, jsonb-array-cast]
key_files:
  created:
    - abvcap-congress/supabase/migrations/003_phase2_participants_extensions.sql
    - abvcap-congress/supabase/migrations/004_phase2_form_responses_extensions.sql
    - abvcap-congress/supabase/migrations/005_upsert_participants_rpc.sql
    - abvcap-congress/supabase/migrations/006_upsert_form_responses_rpc.sql
  modified:
    - abvcap-congress/lib/database.types.ts
    - abvcap-congress/lib/mock-data.ts
    - abvcap-congress/.gitignore
decisions:
  - "interested_in_events changed from boolean to TEXT[] (multi-select from Excel, not a yes/no flag)"
  - "upsert_form_responses_batch resolves participant_id via (email, edition_id) JOIN — must be called after upsert_participants_batch in same import job"
  - "company_segment_normalized cast failure falls back to OUTRO enum value rather than aborting the row"
  - "database.types.ts updated manually (not via gen types) — Supabase CLI credentials not available in this CLI env"
metrics:
  duration: "17 minutes"
  completed_date: "2026-05-25"
  tasks_completed: 5
  files_modified: 7
---

# Phase 2 Plan 01: Schema Extension + Batch Upsert RPCs Summary

Schema extended from Phase 1 minimalist model to full Phase 2 shape with 7 new participant fields, 3 corrected/new form_response fields, and two atomic batch-upsert RPCs ready for Plan 04's commit route.

## What Was Built

### Migrations Created (003–006)

| Migration | Purpose | Key Change |
|-----------|---------|------------|
| 003 | Extend `participants` | +7 columns: job_title, cpf, phone, payment_status, is_company_member, company_segment_raw, company_segment_normalized |
| 004 | Fix/extend `form_responses` | interested_in_events: boolean→TEXT[]; +content_interests TEXT[]; +dietary_details TEXT; 2 GIN indexes |
| 005 | RPC `upsert_participants_batch` | Atomic upsert by (email, edition_id), per-row error capture, returns {inserted, updated, errors, error_log} |
| 006 | RPC `upsert_form_responses_batch` | Resolves participant_id via (email, edition_id), upserts all 6 form fields, same return shape |

### RPC Signatures

```sql
upsert_participants_batch(
  p_rows         jsonb,           -- array of participant objects (up to 500)
  p_edition_id   uuid,
  p_import_job_id uuid
) RETURNS json  -- {inserted, updated, errors, error_log}

upsert_form_responses_batch(
  p_rows       jsonb,             -- array with participant_email + form fields
  p_edition_id uuid               -- used to resolve participant_id
) RETURNS json  -- {inserted, updated, errors, error_log}
```

### Schema Changes vs Phase 1

| Table | Column | Before | After |
|-------|--------|--------|-------|
| participants | job_title | — | TEXT \| null |
| participants | cpf | — | TEXT \| null |
| participants | phone | — | TEXT \| null |
| participants | payment_status | — | TEXT \| null |
| participants | is_company_member | — | BOOLEAN \| null |
| participants | company_segment_raw | — | TEXT \| null |
| participants | company_segment_normalized | — | company_segment enum \| null |
| form_responses | interested_in_events | boolean \| null | TEXT[] \| null |
| form_responses | content_interests | — | TEXT[] \| null |
| form_responses | dietary_details | — | TEXT \| null |

### TypeScript Types Updated

`lib/database.types.ts` manually updated to reflect all schema changes:
- `participants.Row` has all 7 new columns typed
- `form_responses.Row`: `interested_in_events: string[] | null` (was `boolean | null`)
- `Database["public"]["Functions"]` includes both new RPCs with typed Args/Returns
- `mock-data.ts`: `PHASE2_NULLS` spread added to satisfy updated `Participant` type

`npx tsc --noEmit` — zero errors.

## Commits

| Hash | Files | Description |
|------|-------|-------------|
| 2c13b68 | 003-006.sql, .gitignore | Migration files + ignore supabase/.temp/ |
| 2dd4dc2 | database.types.ts, mock-data.ts | Updated types + mock data null fields |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] mock-data.ts broke TypeScript after Participant type expansion**
- **Found during:** Task 5
- **Issue:** MOCK_PARTICIPANTS array used object literals missing the 7 new nullable columns added to `Participant` type, causing 25 TS2740 errors
- **Fix:** Added `PHASE2_NULLS` const with all 7 fields set to `null`, spread into every mock participant entry
- **Files modified:** `abvcap-congress/lib/mock-data.ts`
- **Commit:** 2dd4dc2

### Auth Gate — Migrations Not Applied to Remote DB

**Found during:** Task 1 (first migration application attempt)

**Situation:** The plan's primary application path (`mcp__claude_ai_Supabase__apply_migration`) is only available in the claude.ai Cowork environment, not in Claude Code CLI. The Supabase CLI is authenticated with a different account that does not have access to project `kcgwyzvwxmmygfdsetgd`. The `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` is still a placeholder.

**What was attempted:**
- MCP tool call → "No such tool available"
- `npx supabase db push --project-ref kcgwyzvwxmmygfdsetgd` → unrecognized flag (CLI v2.101.0 syntax change)
- `npx supabase link --project-ref kcgwyzvwxmmygfdsetgd` → wrong account (CLI has access to nexus-* projects, not kcgwyzvwxmmygfdsetgd)
- `npx supabase db push --db-url postgresql://...` → DNS resolution failure for `db.kcgwyzvwxmmygfdsetgd.supabase.co`
- Management REST API → "Your account does not have the necessary privileges"

**Resolution:** Migration SQL files created and committed. TypeScript types manually updated to match the target schema. Migrations can be applied via:

**Option A — Supabase Dashboard SQL Editor (easiest):**
1. Go to https://supabase.com/dashboard/project/kcgwyzvwxmmygfdsetgd/sql/new
2. Run each file in order: 003 → 004 → 005 → 006
3. Files are at `abvcap-congress/supabase/migrations/`

**Option B — Fix .env.local then run via CLI:**
1. Get service role key from Supabase Dashboard → Project Settings → API
2. Set `SUPABASE_SERVICE_ROLE_KEY` in `abvcap-congress/.env.local`
3. Then run from `abvcap-congress/`: `npx supabase db push --linked` (after `supabase link`)

**Option C — Run via claude.ai Cowork** (same env where Phase 1 applied its migrations):
The Cowork environment has the Supabase MCP configured. A message asking it to apply migrations 003-006 will work.

**Impact:** Plans 02-03 and 02-04 can proceed with TypeScript type safety. The actual import pipeline (Plan 04 commit route) will fail at runtime until the migrations are applied. Plan 02-02 (auth) is independent and unaffected.

## Known Stubs

None — this plan creates database infrastructure (migrations + types), not UI components.

## Threat Flags

No new threat surface beyond what is documented in the plan's threat model.

## Self-Check

Files created:
- `abvcap-congress/supabase/migrations/003_phase2_participants_extensions.sql` — FOUND
- `abvcap-congress/supabase/migrations/004_phase2_form_responses_extensions.sql` — FOUND
- `abvcap-congress/supabase/migrations/005_upsert_participants_rpc.sql` — FOUND
- `abvcap-congress/supabase/migrations/006_upsert_form_responses_rpc.sql` — FOUND
- `abvcap-congress/lib/database.types.ts` — MODIFIED
- `abvcap-congress/lib/mock-data.ts` — MODIFIED

Commits:
- 2c13b68 — FOUND
- 2dd4dc2 — FOUND

TypeScript: `npx tsc --noEmit` — zero errors — PASSED

## Self-Check: PASSED
