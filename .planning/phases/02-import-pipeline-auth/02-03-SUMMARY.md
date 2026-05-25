---
phase: 02-import-pipeline-auth
plan: "03"
subsystem: import-pipeline
tags: [excel, parsing, upload, zod, preview, ui]
dependency_graph:
  requires: [02-01, 02-02]
  provides: [import-preview-api, import-ui, serverToken-store]
  affects: [02-04]
tech_stack:
  added: [exceljs@4.4.0]
  patterns: [in-memory-preview-store, scoring-header-detection, multi-select-column-groups, formula-injection-sanitization]
key_files:
  created:
    - abvcap-congress/lib/import/known-headers.ts
    - abvcap-congress/lib/import/sanitize.ts
    - abvcap-congress/lib/import/segment-mapper.ts
    - abvcap-congress/lib/import/types.ts
    - abvcap-congress/lib/import/excel-parser.ts
    - abvcap-congress/lib/import/zod-schemas.ts
    - abvcap-congress/app/api/import/preview/route.ts
    - abvcap-congress/app/dashboard/import/page.tsx
    - abvcap-congress/app/dashboard/import/import-client.tsx
    - abvcap-congress/app/dashboard/import/column-mapping.tsx
    - abvcap-congress/app/dashboard/import/preview-table.tsx
  modified:
    - abvcap-congress/components/sidebar.tsx
decisions:
  - "In-memory store (globalThis.__importPreviewStore) for serverToken: acceptable because Plan 04 commit runs in the same Node process within minutes; TTL=15min prevents unbounded growth"
  - "ALWAYS show mapping UI even when auto-detect succeeds: supports multi-event reuse where column layout may vary"
  - "ColumnMappingUI component name (not ColumnMapping) to avoid clash with ColumnMapping type import in the same file"
  - "LogOut icon kept alongside Upload in sidebar import — plan spec would have dropped it, which would break the logout button"
metrics:
  duration: "~25 minutes"
  completed: "2026-05-25"
  tasks_completed: 3
  files_created: 11
  files_modified: 1
---

# Phase 2 Plan 03: Import Pipeline — Upload, Parse, Mapping UI, Preview Summary

**One-liner:** End-to-end import pipeline (without DB commit): ExcelJS parse with 14-col header scoring, admin-confirmable column mapping UI, Zod safeParse collecting all errors, PT-BR preview with valid row count and per-line error details.

---

## Files Created

### `abvcap-congress/lib/import/`

| File | Purpose |
|------|---------|
| `known-headers.ts` | `KNOWN_HEADERS` array (14 cols), `scoreHeader()` (case-insensitive Set match), `MIN_HEADER_SCORE=10` |
| `sanitize.ts` | `sanitizeFormulaInjection`, `decodeHtmlEntities`, `parseBRLCurrency`, `normalizeCpf` (padStart 11 digits) |
| `segment-mapper.ts` | `normalizeCompanySegment(raw)` → `CompanySegment` enum via regex rules (GP/LP/FUNDO/CORPORATIVO/GOVERNO/ACADEMIA/OUTRO) |
| `types.ts` | `ColumnMapping`, `TargetField`, `ParticipantRow`, `ParseResult`, `ValidationResult`, `PreviewResponse` |
| `excel-parser.ts` | `parseExcelMetadata(buffer)` → `ParseResult`; `parseExcelRows(buffer, mapping, headerRowIndex)` → `ValidationResult`; `buildDefaultMapping()` |
| `zod-schemas.ts` | `ParticipantRowSchema` (strict Zod object, 22 fields), `ParticipantRowValidated` type |

### `abvcap-congress/app/api/import/preview/`

| File | Purpose |
|------|---------|
| `route.ts` | `POST /api/import/preview`: auth gate, magic-bytes check, 20MB limit, ExcelJS parse, Zod safeParse (all errors collected), serverToken store, `consumePreview()` export for Plan 04 |

### `abvcap-congress/app/dashboard/import/`

| File | Purpose |
|------|---------|
| `page.tsx` | Server component, `requireAdmin()` gate, renders `<ImportClient />` |
| `import-client.tsx` | 5-stage machine (`idle → uploading → mapping → preview → error`), `fetch('/api/import/preview')` with FormData |
| `column-mapping.tsx` | Table of all Excel cols with destination dropdowns (19 TargetField options + ignore), shows row1 header + row2 sub-label |
| `preview-table.tsx` | Valid rows count (emerald), error count (red), expandable `<details>` error list, first 100 rows table with BRL currency |

### Modified

| File | Change |
|------|--------|
| `components/sidebar.tsx` | Added `Upload` to lucide-react import (kept `LogOut`); added `/dashboard/import` nav entry |

---

## Default Column Mapping (snapshot — for debugging if Excel format changes)

| 0-based idx | 1-based col | Field |
|-------------|-------------|-------|
| 0 | 1 | `ticket_id` |
| 1 | 2 | `ignore` (ID do contato) |
| 2 | 3 | `full_name` (Primeiro nome — concat with col 3) |
| 3 | 4 | `ignore` (Último nome — consumed by full_name logic) |
| 4 | 5 | `company` |
| 5 | 6 | `job_title` |
| 6 | 7 | `email` |
| 7 | 8 | `ignore` (Foto de perfil) |
| 8 | 9 | `cpf` |
| 9 | 10 | `phone` |
| 10 | 11 | `company_segment_raw` |
| 11 | 12 | `ignore` (LinkedIn) |
| 12–22 | 13–23 | `topics_of_interest` (multi-select group) |
| 23–25 | 24–26 | `interested_in_events` (multi-select group) |
| 26–29 | 27–30 | `preferred_channels` (multi-select group) |
| 30–34 | 31–35 | `content_interests` (multi-select group) |
| 35 | 36 | `ignore` (networking_interest) |
| 36 | 37 | `dietary_restrictions` |
| 37 | 38 | `dietary_details` |
| 38–42 | 39–43 | `ignore` |
| 43 | 44 | `ticket_membership` |
| 44 | 45 | `is_company_member` |
| 45–50 | 46–51 | `ignore` |
| 51 | 52 | `ticket_value` |
| 52 | 53 | `payment_status` |
| 53–59 | 54–60 | `ignore` |

---

## How Plan 04 Must Consume `consumePreview(serverToken)`

```typescript
// In Plan 04's commit route handler:
import { consumePreview } from '@/app/api/import/preview/route'

// After verifying the serverToken from request body:
const stored = consumePreview(serverToken)
if (!stored) {
  return NextResponse.json({ error: 'Preview expirado ou inválido.' }, { status: 410 })
}
// stored.rows: ParticipantRow[] — ready for upsert_participants_batch RPC
// stored.filename: string — for import_jobs record
```

Key points for Plan 04:
- `consumePreview` is a one-time consume (deletes from store after read)
- TTL is 15 minutes from preview generation
- The rows are already Zod-validated (`ParticipantRowValidated`)
- Plan 04 needs to: create `import_jobs` record (PENDING → PROCESSING → COMPLETED/FAILED), call `upsert_participants_batch` RPC, then `upsert_form_responses_batch` RPC

---

## Decisions Made

### In-Memory Store vs. Persistent Queue

Chose `globalThis.__importPreviewStore` (Map with 15-min TTL) over Redis/DB persistence because:
- Import is a single-admin, synchronous flow (upload → confirm → commit in one session)
- Plan 04 commit runs in the same Node process within minutes
- Zero infrastructure overhead
- TTL prevents memory leak on abandoned imports
- Tradeoff: won't survive process restart (Vercel cold start mid-import will lose the preview; admin just re-uploads)

### Always Show Mapping UI

Even when auto-detection achieves 14/14 score, the mapping UI always appears. Rationale: future events may have different column layouts; admin confirmation prevents silent mis-mapping. The UI defaults to the detected mapping so confirmation is one click.

### ColumnMappingUI vs ColumnMapping component name

The component was named `ColumnMappingUI` (not `ColumnMapping`) to avoid a name clash with the `ColumnMapping` type imported from `lib/import/types` in the same file. `import-client.tsx` imports both the component and the type.

### LogOut kept in sidebar import

The plan spec would have replaced `LogOut` with `Upload` in the lucide-react import, which would have broken the logout button in the sidebar footer. Both icons are kept.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Type Safety] `collectMulti` parameter type**
- **Found during:** Task 1 (excel-parser.ts)
- **Issue:** Plan spec typed first param as `ParticipantRow['topics_of_interest']` which is `string[]`; the parameter was unused (function only needs the field name string). TypeScript would infer unused param warning.
- **Fix:** Changed to `_target: string[]` (unused param with underscore prefix) for clarity, matching actual usage pattern.
- **Files modified:** `lib/import/excel-parser.ts`

**2. [Rule 2 - Type Safety] `json` object type assertion in import-client**
- **Found during:** Task 3 (import-client.tsx)
- **Issue:** `json.error` would not typecheck directly; `json` is typed as `unknown` from `res.json()`.
- **Fix:** Added explicit cast `(json as { error?: string }).error` before accessing `.error` field.
- **Files modified:** `app/dashboard/import/import-client.tsx`

---

## Known Stubs

| File | Line | Description |
|------|------|-------------|
| `app/dashboard/import/import-client.tsx` | ~73 | `onConfirm` calls `alert(...)` as placeholder — Plan 04 will replace with POST to `/api/import/commit` using `preview.serverToken` |

This stub is intentional and documented. It does not prevent the plan's goal (preview pipeline works end-to-end). Plan 04 resolves it.

---

## Commits

| Hash | Message |
|------|---------|
| `c6d722c` | `feat(02-03): parsing layer — known-headers, sanitize, segment-mapper, types, excel-parser, zod-schemas` |
| `bbe9750` | `feat(02-03): POST /api/import/preview — multipart upload, parse, Zod validate, serverToken store` |
| `7d6936c` | `feat(02-03): UI /dashboard/import — upload, column-mapping, preview-table + sidebar link` |

---

## Task 4: Human Checkpoint

**Status:** Awaiting human verification (see below).

Build status: `npm run build` passes. `npx tsc --noEmit` passes. `/dashboard/import` appears as a dynamic route in the build output.

---

## Self-Check: PASSED

- `abvcap-congress/lib/import/known-headers.ts` — FOUND
- `abvcap-congress/lib/import/sanitize.ts` — FOUND
- `abvcap-congress/lib/import/segment-mapper.ts` — FOUND
- `abvcap-congress/lib/import/types.ts` — FOUND
- `abvcap-congress/lib/import/excel-parser.ts` — FOUND
- `abvcap-congress/lib/import/zod-schemas.ts` — FOUND
- `abvcap-congress/app/api/import/preview/route.ts` — FOUND
- `abvcap-congress/app/dashboard/import/page.tsx` — FOUND
- `abvcap-congress/app/dashboard/import/import-client.tsx` — FOUND
- `abvcap-congress/app/dashboard/import/column-mapping.tsx` — FOUND
- `abvcap-congress/app/dashboard/import/preview-table.tsx` — FOUND
- Commits c6d722c, bbe9750, 7d6936c — FOUND in git log
- `npm run build` — PASSED (12 routes, /dashboard/import dynamic)
- `npx tsc --noEmit` — PASSED (0 errors)
