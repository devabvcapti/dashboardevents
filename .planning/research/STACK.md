# Technology Stack: Excel Import Pipeline

**Project:** ABVCAP Congress Dashboard — Excel Import
**Researched:** 2026-05-21
**Overall confidence:** MEDIUM-HIGH

---

## Executive Summary

This document covers the full technology stack for parsing .xlsx uploads in a Next.js 16 App Router
application and bulk-loading the data into Supabase PostgreSQL. Every recommendation below is
backed by official documentation or multiple verified sources. Where a finding has meaningful
uncertainty, it is flagged with a confidence level.

The critical ecosystem surprise is that **both major Excel parsing libraries have maintenance
problems**: `xlsx` on npm is frozen at v0.18.5 (SheetJS stopped publishing to npm; latest
v0.20.3+ only ships via their own CDN), and `exceljs` v4.4.0 was released October 2023 with
no new npm releases since. The recommended path is `exceljs` for server-side parsing because its
API is stable, its streaming support is real, and it does not require pointing npm at an
unverified CDN.

---

## 1. Excel Parsing Library

### Recommendation: `exceljs` v4.4.0 (server-side only)

**Why exceljs over SheetJS/xlsx:**

| Criterion | xlsx (SheetJS) on npm | exceljs |
|---|---|---|
| npm version | 0.18.5 — frozen since 2022 | 4.4.0 — Oct 2023 |
| Security | High-severity vulnerability unfixable via `npm audit fix` | No open high-severity CVEs |
| npm install source | npm registry (outdated) or SheetJS private CDN (unverified checksums) | Standard npm registry |
| Streaming read | Community Edition: none. Pro only. | `workbook.xlsx.createReadStream()` — row-by-row, constant memory |
| Memory (100K rows) | ~280 MB peak heap | ~45 MB peak heap (streaming mode) |
| Bundle size | ~900 KB | ~600 KB |
| Browser support | Yes | Yes (ArrayBuffer via `workbook.xlsx.load()`) |
| Maintained | No (npm) | Stale but stable API — no breaking changes expected |

**Confidence:** MEDIUM. ExcelJS is also not actively releasing, but it has no unresolved security
vulnerabilities and its API has been stable for years. The risk of a breaking change in the
foreseeable future is low given the use case (reading, not writing).

**The SheetJS CDN workaround is not recommended** for a production admin tool: CDN packages have
no npm audit support, no integrity checksums, and can be modified by the publisher without
notice.

### Parsing Pattern (server-side, Next.js Route Handler)

```typescript
// app/api/import/route.ts
import ExcelJS from 'exceljs'

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file') as File

  if (!file || file.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    return Response.json({ error: 'Invalid file type' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const worksheet = workbook.worksheets[0]
  const headers: string[] = []
  const rows: Record<string, unknown>[] = []

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell) => headers.push(String(cell.value ?? '')))
      return
    }
    const record: Record<string, unknown> = {}
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      record[headers[colNumber - 1]] = cell.value
    })
    rows.push(record)
  })

  return Response.json({ headers, rowCount: rows.length, preview: rows.slice(0, 5) })
}
```

**Gotcha — `includeEmpty: true`:** Without this flag, `eachCell` skips blank cells, which shifts
column indices and corrupts your mapping. Always pass it when building row objects.

**Gotcha — date cells:** ExcelJS returns date cells as JavaScript `Date` objects, not strings.
Check `cell.type === ExcelJS.ValueType.Date` before stringifying if your schema expects ISO
strings.

---

## 2. Next.js App Router Upload Pattern

### Route Handler (not Server Action) for files

Use a **Route Handler** (`app/api/import/route.ts`) rather than a Server Action for file uploads
above 1 MB. Server Actions have a default `bodySizeLimit` of 1 MB and a separate
`proxyClientMaxBodySize` proxy layer introduced in Next.js 15.5 that also defaults to 1 MB and
silently truncates binary data before it reaches the action.

**Confidence:** HIGH — confirmed in official Next.js docs (v16.2.6, last updated 2026-05-19) and
multiple verified GitHub issues.

### Body Size Configuration

```javascript
// next.config.js  (or next.config.ts)
/** @type {import('next').NextConfig} */
module.exports = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',   // for Server Actions if used
    },
  },
  // Next.js 15.5+ proxy layer — must match or exceed serverActions.bodySizeLimit
  // to prevent silent truncation of binary data
  // experimental: { proxyClientMaxBodySize: '10mb' }
}
```

For Route Handlers, the relevant limits are:
- **Vercel Serverless Function payload:** 4.5 MB hard cap (request + response combined).
- **Vercel Pro/Enterprise:** up to 250 MB for background functions.
- **Self-hosted:** no Next.js-imposed Route Handler body limit beyond server memory.

**For this use case (hundreds to low thousands of rows):** a typical .xlsx with 2,000 rows of
form responses is well under 2 MB. The 4.5 MB Vercel cap is safe. Configure
`serverActions.bodySizeLimit: '5mb'` as a precaution if you ever switch to Server Actions.

### Client-side Upload Component Pattern

```typescript
// components/ExcelUploader.tsx
'use client'

async function uploadFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch('/api/import', {
    method: 'POST',
    body: formData,
    // Do NOT set Content-Type header — browser must set multipart boundary
  })

  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
```

**Gotcha — never set `Content-Type: multipart/form-data` manually.** The browser must set it
with the correct boundary string. Setting it manually will break FormData parsing on the server.

### Two-phase Upload (recommended for this use case)

Given the column-mapping requirement, split the flow into two round-trips:

1. **POST /api/import/preview** — parse Excel, return `{ headers, preview: row[] }`. No DB writes.
2. **POST /api/import/commit** — accept column mapping + validated rows, write to Supabase.

This prevents partial writes and keeps the UX snappy (preview is fast, commit can show a
progress indicator).

---

## 3. Supabase Bulk Insert / Upsert Patterns

### Use `.upsert()` with explicit `onConflict`

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function bulkUpsert(rows: ParticipantRow[]) {
  const BATCH_SIZE = 500  // verified optimal in Supabase community discussions

  const chunks: ParticipantRow[][] = []
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    chunks.push(rows.slice(i, i + BATCH_SIZE))
  }

  const results = []
  for (const chunk of chunks) {
    const { data, error } = await supabase
      .from('participants')
      .upsert(chunk, {
        onConflict: 'external_id',     // the unique column from the event platform
        ignoreDuplicates: false,        // false = UPDATE existing; true = skip
      })
      .select('id')

    if (error) throw error
    results.push(...(data ?? []))
  }

  return results
}
```

**Batch size rationale:** 500 rows per batch is the empirically validated sweet spot from
Supabase community data. The PostgREST layer enforces a default 1 MB request body limit —
500 rows of typical participant data stays well under this. Processing 23,000 rows at 500-row
batches has been reported at ~36 seconds total.

**Gotcha — `onConflict` must match a unique constraint or index**, not just any column. Create
the index in Supabase before the first import:

```sql
-- Run once in Supabase SQL editor
ALTER TABLE participants ADD CONSTRAINT participants_external_id_key UNIQUE (external_id);
```

### Transaction Atomicity

**The supabase-js client does not support multi-statement transactions** — this is a PostgREST
architectural limitation. Each `.upsert()` call is its own implicit transaction.

For atomic all-or-nothing imports, wrap the logic in a Postgres RPC function:

```sql
-- Supabase SQL editor
CREATE OR REPLACE FUNCTION bulk_import_participants(rows jsonb)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO participants
  SELECT * FROM jsonb_populate_recordset(null::participants, rows)
  ON CONFLICT (external_id) DO UPDATE
    SET name = EXCLUDED.name,
        email = EXCLUDED.email,
        -- ...other fields
        updated_at = now();
  -- If any statement raises, Postgres rolls back the entire function call
END;
$$;
```

Call via: `await supabase.rpc('bulk_import_participants', { rows: JSON.stringify(validatedRows) })`

**Confidence:** HIGH — confirmed in official Supabase docs and multiple GitHub discussions.

### Error Handling Pattern

```typescript
type ImportResult = {
  inserted: number
  updated: number
  errors: { rowIndex: number; message: string }[]
}
```

Collect per-chunk errors, continue processing remaining chunks, return a summary. Never silently
swallow Supabase errors — PostgREST error objects include `code`, `message`, and `details`.

---

## 4. Column Mapping UI

### Option A: `react-spreadsheet-import` v4.7.1 (recommended if Chakra UI is acceptable)

This is a purpose-built multi-step import component: file upload → column mapping → row
validation → confirmation. It handles the entire flow.

```bash
npm install react-spreadsheet-import
```

**Features:**
- Auto-maps uploaded column headers to your defined schema fields using fuzzy string matching
  (`autoMapDistance` prop controls strictness: 1 = strict, 2 = flexible default)
- Manual override dropdown per column
- Built-in validation: `required`, `unique`, `regex` rules, plus `rowHook` and `tableHook` for
  custom logic
- Inline row-level error display in the preview step
- TypeScript native

**Gotcha — Chakra UI hard dependency:** The library is built on Chakra UI v2. If your project
uses a different design system (Tailwind, shadcn/ui), you must still install and configure
Chakra UI as a peer dependency. This adds ~150 KB to the client bundle. For an internal admin
tool with infrequent use, this is acceptable; for a public-facing page it would not be.

**Next.js App Router compatibility:** Use `next/dynamic` with `ssr: false` because
`react-spreadsheet-import` relies on browser APIs (FileReader, DOM):

```typescript
// components/ImportModal.tsx
import dynamic from 'next/dynamic'

const ReactSpreadsheetImport = dynamic(
  () => import('react-spreadsheet-import').then(m => m.ReactSpreadsheetImport),
  { ssr: false }
)
```

**Confidence:** MEDIUM. v4.7.1 released August 2024. Next.js App Router compatibility is not
explicitly documented by the library — the `ssr: false` pattern is standard for browser-API
components and should work. Test before committing.

### Option B: Custom mapping UI (recommended if you want full control)

For an admin tool with a stable, known Excel format (fixed columns from the event platform),
a lightweight custom UI is often simpler and more maintainable than adding a Chakra UI
dependency.

Pattern: parse headers server-side in the preview endpoint, return `string[]`, then render a
`<select>` per detected column letting the admin assign it to a DB field:

```typescript
// Minimal column mapping state
type ColumnMapping = {
  excelColumn: string    // header from the uploaded file
  dbField: string | null // target DB column, null = skip
}
```

A mapping UI of 10–15 columns takes roughly 1–2 hours to build with shadcn/ui `<Select>`
components and is trivial to test.

**Use react-spreadsheet-import when:** The Excel format changes frequently between events, or
different admins have different files with inconsistent naming.

**Use a custom UI when:** The event platform always exports the same column structure and you
want zero extra dependencies.

---

## 5. Data Validation

### Recommendation: Zod on the server, error summary on the client

Validate rows **server-side** after mapping, before any Supabase writes. Never trust client-side
validation alone for data integrity.

```typescript
import { z } from 'zod'

const ParticipantSchema = z.object({
  external_id: z.string().min(1, 'ID is required'),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  registration_type: z.enum(['speaker', 'attendee', 'sponsor']).optional(),
  // ... other fields
})

type ValidatedRow = z.infer<typeof ParticipantSchema>

type ValidationResult = {
  valid: ValidatedRow[]
  errors: { row: number; field: string; message: string }[]
}

function validateRows(rawRows: Record<string, unknown>[]): ValidationResult {
  const valid: ValidatedRow[] = []
  const errors: { row: number; field: string; message: string }[] = []

  rawRows.forEach((row, index) => {
    const result = ParticipantSchema.safeParse(row)
    if (result.success) {
      valid.push(result.data)
    } else {
      result.error.issues.forEach(issue => {
        errors.push({
          row: index + 2,            // +2 for 1-indexed rows + header row
          field: issue.path.join('.'),
          message: issue.message,
        })
      })
    }
  })

  return { valid, errors }
}
```

**Why `safeParse` over `parse`:** `parse` throws on the first invalid row and halts processing.
`safeParse` collects all errors across all rows, letting you return a complete error report.

### Error Display Pattern

Return the full `ValidationResult` from the preview endpoint. On the client, render:

- "X rows ready to import, Y rows have errors" summary banner
- A collapsible error table: Row | Column | Error Message
- "Import valid rows only" and "Cancel" actions

This lets admins fix the source file and re-upload, or import the clean rows and handle
outliers manually.

### What to Validate

| Check | How | Why |
|---|---|---|
| Required fields | `z.string().min(1)` | Prevent null constraint violations |
| Email format | `z.string().email()` | Catch malformed addresses before insert |
| Enum values | `z.enum([...])` | Prevent FK / check constraint failures |
| Duplicate `external_id` within file | Pre-validation dedup pass | Catch intra-file duplicates before upsert |
| Date fields | `z.coerce.date()` | ExcelJS returns Dates; coerce handles both |
| String length | `z.string().max(255)` | Match column VARCHAR limits |

**Gotcha — empty rows:** Excel files often have trailing empty rows. Filter them out before
validation:

```typescript
const nonEmptyRows = rawRows.filter(row =>
  Object.values(row).some(v => v !== null && v !== undefined && v !== '')
)
```

---

## Installation

```bash
# Excel parsing (server-side)
npm install exceljs

# Validation
npm install zod

# Column mapping UI (Option A — only if Chakra UI is acceptable)
npm install react-spreadsheet-import @chakra-ui/react @emotion/react @emotion/styled framer-motion

# Supabase client (likely already installed)
npm install @supabase/supabase-js
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|---|---|---|---|
| Excel parsing | exceljs 4.4.0 | SheetJS xlsx (npm) | Frozen at 0.18.5 with unresolvable high-severity vulnerability |
| Excel parsing | exceljs 4.4.0 | SheetJS via CDN | No integrity checksums, not `npm audit`-safe |
| Excel parsing | exceljs 4.4.0 | node-xlsx | Thin SheetJS wrapper, inherits same vulnerability |
| Upload mechanism | Route Handler | Server Action | SA has 1 MB default limit + 15.5 proxy truncation bug |
| Validation | Zod server-side | react-spreadsheet-import built-in | RSI validation runs client-side; Zod validates before DB write |
| Bulk write | `.upsert()` batched | Single `.insert()` call | Single call with 1000+ rows hits PostgREST 1 MB request limit |
| Atomicity | Postgres RPC function | Multi-step JS loop | JS loop: partial writes on failure; RPC: all-or-nothing |

---

## Open Questions / Flags for Phase Research

1. **ExcelJS browser loading path:** `workbook.xlsx.load(arrayBuffer)` is confirmed to work in
   Node.js via Buffer. Browser ArrayBuffer path works per multiple community reports but is not
   explicitly covered in ExcelJS's own docs. If parsing moves client-side, test this explicitly.

2. **Vercel cold start + ExcelJS:** ExcelJS is ~600 KB. On a Vercel Hobby plan, a cold Lambda
   start parsing a file is fine for an admin tool. If this route becomes high-traffic, pre-warm
   with a scheduled ping.

3. **react-spreadsheet-import + App Router:** The `ssr: false` pattern should work but the
   library's README does not have an explicit Next.js App Router example. Verify during
   implementation spike.

4. **Supabase PostgREST default `max_rows`:** PostgREST caps SELECT results at 1,000 rows by
   default. This does not affect INSERT/UPSERT, but if you add a "preview existing records"
   feature, you need to handle pagination or increase `max_rows` in Supabase project settings.

---

## Sources

- [SheetJS vs ExcelJS vs node-xlsx 2026 — PkgPulse](https://www.pkgpulse.com/guides/sheetjs-vs-exceljs-vs-node-xlsx-excel-files-node-2026) (MEDIUM confidence — single source)
- [xlsx npm package page](https://www.npmjs.com/package/xlsx) — version 0.18.5 confirmed
- [SheetJS npm freeze discussion](https://github.com/SheetJS/sheetjs/issues/2667)
- [SheetJS CDN vulnerability issue](https://git.sheetjs.com/sheetjs/sheetjs/issues/3098)
- [ExcelJS v4.4.0 release](https://github.com/exceljs/exceljs/releases/tag/v4.4.0) — October 2023
- [Next.js Route Handlers — official docs v16.2.6](https://nextjs.org/docs/app/getting-started/route-handlers) (HIGH confidence)
- [Next.js serverActions config — official docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions) (HIGH confidence)
- [Next.js 15.5 proxyClientMaxBodySize truncation issue](https://github.com/vercel/next.js/discussions/86985)
- [Supabase upsert — official JS docs](https://supabase.com/docs/reference/javascript/upsert) (HIGH confidence)
- [Supabase bulk insert best practices discussion](https://github.com/orgs/supabase/discussions/11349) — 500-row batch size (MEDIUM confidence)
- [Supabase RPC transactions discussion](https://github.com/orgs/supabase/discussions/3732) (HIGH confidence)
- [react-spreadsheet-import npm — v4.7.1](https://www.npmjs.com/package/react-spreadsheet-import)
- [react-spreadsheet-import GitHub](https://github.com/UgnisSoftware/react-spreadsheet-import)
- [SheetJS HTTP server docs](https://docs.sheetjs.com/docs/demos/net/server/)
- [zod-xlsx — Zod + Excel validation pattern](https://github.com/sidwebworks/zod-xlsx)
