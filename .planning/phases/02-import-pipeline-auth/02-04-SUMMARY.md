---
phase: "02"
plan: "04"
subsystem: import-pipeline
tags: [import, commit, audit-log, form-responses, result-ui]
dependency_graph:
  requires: [02-01, 02-02, 02-03]
  provides: [full-import-pipeline]
  affects: [import_jobs, participants, form_responses]
tech_stack:
  added: []
  patterns: [chunked-rpc-upsert, shared-in-memory-store, state-machine-ui]
key_files:
  created:
    - abvcap-congress/lib/import/preview-store.ts
    - abvcap-congress/app/api/import/commit/route.ts
  modified:
    - abvcap-congress/app/api/import/preview/route.ts
    - abvcap-congress/app/dashboard/import/import-client.tsx
decisions:
  - "Cast ParticipantRow[] to Json via unknown for RPC args — Supabase types require Json; safer than ts-ignore"
  - "import() type reference for Json in route.ts — avoids a top-level import just for a cast"
  - "Shared preview-store module — preview and commit routes are in different files; globalThis Map kept on shared module avoids duplication and race conditions"
metrics:
  duration: "~25 min"
  completed: "2026-05-25"
  tasks_completed: 3
  files_created: 2
  files_modified: 2
---

# Phase 2 Plan 04: Commit Route + Audit Log + Result UI Summary

**One-liner:** Full import commit pipeline — chunked upsert RPCs for participants and form_responses, import_jobs audit log with PROCESSING/COMPLETED/FAILED states, and result UI grids in the import client.

## Tasks Completed

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | Extract preview-store to shared module | Done | 0c07030 |
| 2 | Create POST /api/import/commit | Done | 0c07030 |
| 3 | Wire UI in import-client.tsx | Done | 0c07030 |

## What Was Built

### `lib/import/preview-store.ts` (new)
Shared in-memory store extracted from `preview/route.ts`. Exports:
- `storePreview(token, { rows, filename })` — stores validated rows with 15-min TTL
- `consumePreview(token)` — one-time read+delete; returns null if expired
- `peekPreview(token)` — non-destructive read for debugging

Uses `globalThis.__importPreviewStore` so the same Map survives Next.js hot reloads.

### `app/api/import/preview/route.ts` (modified)
Removed inline STORE declaration, `cleanupExpired()`, and `consumePreview()` export. Now imports `storePreview` from the shared module. The exported `consumePreview` that was previously used by Plan 04 is now gone — commit route imports directly from the shared store.

### `app/api/import/commit/route.ts` (new)
`POST /api/import/commit` — protected by `requireAdmin()`:
1. Zod body: `{ serverToken: string (min 32, max 64), editionYear?: number (default 2025) }`
2. `consumePreview(serverToken)` — 404 if null/expired
3. Resolves edition from `editions` table by year
4. INSERTs `import_jobs` row with `status: 'PROCESSING'`
5. Loops rows in chunks of 500:
   - `upsert_participants_batch` RPC (participants first)
   - `upsert_form_responses_batch` RPC (form responses after, same chunk)
6. On success: UPDATE `import_jobs` to `COMPLETED` with inserted/updated/error counts
7. On failure: UPDATE `import_jobs` to `FAILED` with error_log JSON
8. Returns `{ jobId, inserted, updated, errors, totalRows, formInserted, formUpdated, formErrors }`

### `app/dashboard/import/import-client.tsx` (modified)
- Stage union extended: `'idle' | 'uploading' | 'mapping' | 'preview' | 'committing' | 'done' | 'error'`
- `CommitResult` interface added with all 8 response fields
- `commit(serverToken)` function: POSTs to `/api/import/commit`, sets result state
- `reset()` function: clears all state for re-import
- `stage === 'committing'`: loading message panel
- `stage === 'done'`: two stat grids (Participantes 4-col, Respostas de formulário 3-col) + Job ID + "Importar outro arquivo" button
- Removed `alert('[Plan 04 pendente]...)` placeholder

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused `@ts-expect-error` directives**
- **Found during:** TypeScript check after Task 2
- **Issue:** The RPC functions `upsert_participants_batch` and `upsert_form_responses_batch` ARE typed in `database.types.ts` (accepting `Json`), so `@ts-expect-error` became an error itself (`TS2578: Unused '@ts-expect-error' directive`)
- **Fix:** Removed both directives; instead cast `chunk` and `formRows` to `unknown as Json` to satisfy the `Json` parameter type constraint
- **Files modified:** `app/api/import/commit/route.ts`
- **Commit:** 0c07030

## Build Verification

- `npx tsc --noEmit` — zero errors
- `npm run build` — passes, route `ƒ /api/import/commit` present in output

## Known Stubs

None. All data paths are wired to real Supabase RPCs.

## Threat Flags

None. The new `/api/import/commit` route:
- Is already in the protected namespace covered by `proxy.ts`
- Calls `requireAdmin()` for defense-in-depth
- Validates body with Zod before any DB access
- `consumePreview()` is a one-time-use token, preventing replay

## Self-Check: PASSED

- `abvcap-congress/lib/import/preview-store.ts` — exists
- `abvcap-congress/app/api/import/commit/route.ts` — exists
- Commit `0c07030` — pushed to origin main

---

## Human Checkpoint — End-to-End Testing (Plan 02-04 Task 4)

These are the verification steps to confirm the full import pipeline works in production (or local dev):

### 1. Upload and full import with real file
1. Log in at `/login` as admin
2. Navigate to `/dashboard/import`
3. Upload `Congresso v2.xlsx` (or any valid .xlsx)
4. Verify column mapping UI appears — confirm columns are correctly detected
5. Click "Confirmar mapeamento" — preview table should show valid rows + any errors
6. Click "Confirmar importacao" (the confirm button on PreviewTable)
7. UI should transition to "Importando participantes…" loading state
8. UI should transition to the result grids showing:
   - **Participantes:** Total / Inseridos / Atualizados / Erros
   - **Respostas de formulario:** Inseridas / Atualizadas / Erros
   - Job ID displayed at the bottom

### 2. Verify deduplication (reimport same file)
1. After step 8 above, click "Importar outro arquivo"
2. Upload the same file again
3. Complete the flow again
4. Expected result: `Inseridos = 0`, `Atualizados = N` (same N as first run's Inseridos)
5. Confirms `upsert_participants_batch` ON CONFLICT DO UPDATE is working

### 3. Verify form_responses populated
In Supabase dashboard (Table Editor):
- Check `form_responses` table — rows should exist with `participant_id` matching participants from the import
- Verify `topics_of_interest`, `interested_in_events`, `preferred_channels`, `content_interests` arrays are populated where data existed in the Excel

### 4. Verify audit log
In Supabase dashboard:
- Check `import_jobs` table — should have a row with `status = 'COMPLETED'`
- `inserted_rows`, `updated_rows`, `error_rows`, `total_rows` should match what the UI displayed
- `imported_by` should be the UUID of the admin user who ran the import
- `filename` should match the uploaded file name
