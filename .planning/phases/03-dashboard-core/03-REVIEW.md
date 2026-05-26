---
phase: 03-dashboard-core
reviewed: 2026-05-26T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - abvcap-congress/app/api/export/participants/route.ts
  - abvcap-congress/app/dashboard/inscricoes/inscricoes-client.tsx
  - abvcap-congress/app/dashboard/inscricoes/page.tsx
  - abvcap-congress/app/dashboard/membros/membros-charts.tsx
  - abvcap-congress/app/dashboard/membros/page.tsx
  - abvcap-congress/app/dashboard/overview-charts.tsx
  - abvcap-congress/app/dashboard/overview-kpis.tsx
  - abvcap-congress/app/dashboard/page.tsx
  - abvcap-congress/app/dashboard/receita/page.tsx
  - abvcap-congress/app/dashboard/receita/receita-charts.tsx
  - abvcap-congress/app/api/edition/select/route.ts
  - abvcap-congress/app/api/edition/create/route.ts
  - abvcap-congress/lib/edition-cookie.ts
  - abvcap-congress/lib/data.ts
  - abvcap-congress/components/edition-selector.tsx
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-05-26T00:00:00Z
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

The phase-03 dashboard-core implementation is well-structured overall. Authentication guards are consistently applied, input validation uses Zod across all API routes, and error handling is present on every server page. The edition-cookie anti-poisoning check in `select/route.ts` is a good defensive pattern.

Three areas warrant attention:

1. **Content-Disposition header injection** in the export route is a real security issue — the filename is built partly from raw database data and placed inside a quoted header value without RFC 5987 encoding.
2. **`getCompanySegmentSummary` and `getRegistrationsByDay`** fetch all rows of the `participants` table without a `LIMIT`, which will cause unbounded memory growth and potential OOM on large datasets.
3. **`getTicketMembershipSummary`** issues two sequential Supabase queries inside a `for` loop instead of running them in parallel, causing unnecessary latency on every dashboard page load.

---

## Critical Issues

### CR-01: Content-Disposition Header Injection via Unsanitized Filename

**File:** `abvcap-congress/app/api/export/participants/route.ts:119-127`

**Issue:** The `filename` variable is placed directly inside a double-quoted `Content-Disposition` header value. Although `editionName` is sanitized with a regex that strips most special characters (line 55), the `editionYear` value is only cast via `String(data.year)` (line 56) and is not further sanitized before being appended. More importantly, the regex on `editionName` only strips characters outside `[a-zA-Z0-9_-]`, but the resulting string is placed inside `"..."` in the HTTP header — if a database value ever contains a double-quote or CRLF (e.g., from a migration or direct DB write), the header value breaks. The `Content-Disposition` header does not support plain quoted-string filenames with non-ASCII or special characters per RFC 6266; the safe approach is `filename*=UTF-8''<percent-encoded>`.

**Fix:**
```typescript
// Replace lines 119-127 with RFC 5987 safe filename encoding
function rfc5987Encode(str: string): string {
  return encodeURIComponent(str).replace(/['()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
}

const rawFilename = `participantes-${editionName}${editionYear ? '-' + editionYear : ''}.xlsx`
const safeFilename = rfc5987Encode(rawFilename)

return new NextResponse(buffer as ArrayBuffer, {
  status: 200,
  headers: {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // Use filename* for full RFC 5987 safety; keep ASCII fallback for old clients
    'Content-Disposition': `attachment; filename="export.xlsx"; filename*=UTF-8''${safeFilename}`,
    'Cache-Control': 'no-store',
  },
})
```

---

## Warnings

### WR-01: Unbounded Full-Table Scan in `getCompanySegmentSummary`

**File:** `abvcap-congress/lib/data.ts:44-56`

**Issue:** `getCompanySegmentSummary` selects `company_segment_raw` for every participant in the edition with no `LIMIT`. Aggregation is then done in JavaScript. For an edition with tens of thousands of participants this will transfer all rows to the Node.js process, consuming significant memory and adding latency. The same pattern exists in `getRegistrationsByDay` (lines 61-75), which fetches all `created_at` values and groups them in JS.

Both aggregations should be pushed to the database. The RPC pattern already used elsewhere (`get_overview_stats`, `get_member_analysis`) is the correct approach, or at minimum a `GROUP BY` query via a raw SQL call or view.

**Fix:**
```typescript
// Option A — use an RPC (preferred, consistent with rest of codebase):
// CREATE OR REPLACE FUNCTION get_company_segment_summary(p_edition_id uuid)
// RETURNS TABLE(type text, count bigint) AS $$
//   SELECT company_segment_raw AS type, count(*) AS count
//   FROM participants
//   WHERE edition_id = p_edition_id AND company_segment_raw IS NOT NULL
//   GROUP BY company_segment_raw ORDER BY count DESC;
// $$ LANGUAGE sql STABLE;

export async function getCompanySegmentSummary(editionId: string): Promise<CompanySegmentSummary[]> {
  const { data, error } = await getSupabase()
    .rpc('get_company_segment_summary', { p_edition_id: editionId })
  if (error) throw error
  return (data ?? []) as CompanySegmentSummary[]
}

// Apply same approach to getRegistrationsByDay
```

### WR-02: Sequential Supabase Queries in `getTicketMembershipSummary`

**File:** `abvcap-congress/lib/data.ts:81-93`

**Issue:** The function issues two `COUNT` queries sequentially (one per `TicketMembership`) inside a `for...of` loop. Because each iteration `await`s independently, total latency is the sum of both queries instead of the maximum. Since this function is called inside `Promise.all` in the overview page, the two queries inside it are still sequential while other top-level queries run in parallel.

**Fix:**
```typescript
export async function getTicketMembershipSummary(editionId: string): Promise<TicketMembershipSummary[]> {
  const membershipTypes: TicketMembership[] = ['MEMBRO', 'NAO_MEMBRO']
  const settled = await Promise.all(
    membershipTypes.map(tm =>
      getSupabase()
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('edition_id', editionId)
        .eq('ticket_membership', tm)
    )
  )
  return settled
    .map((res, i) => {
      if (res.error) throw res.error
      return { ticket_membership: membershipTypes[i], count: res.count ?? 0 }
    })
    .sort((a, b) => b.count - a.count)
}
```

### WR-03: `getActiveEditionId` Cookie Value Never Validated Against Database

**File:** `abvcap-congress/lib/edition-cookie.ts:12-22`

**Issue:** When the cookie `active_edition_id` is present, its value is returned immediately without verifying it exists in the `editions` table. The cookie is `httpOnly` which limits browser-side tampering, but a UUID from a deleted edition (or one belonging to a different context) will be silently used as `editionId` for all subsequent queries. All dashboard pages pass this value directly to Supabase queries. Row-level data will be empty (correct behavior — no crash) but the user will see a blank dashboard with no indication of why, and they will have no way to recover without manually clearing cookies.

The select route (`/api/edition/select`) does validate against the DB before setting the cookie, which is good. The gap is only on the read path.

**Fix:**
```typescript
export async function getActiveEditionId(): Promise<string> {
  const cookieStore = await cookies()
  const stored = cookieStore.get(ACTIVE_EDITION_COOKIE)?.value

  const editions = await getEditions()
  if (editions.length === 0) throw new Error('Nenhuma edição cadastrada')

  if (stored && editions.some(e => e.id === stored)) return stored

  // Fallback to most recent edition (also clears stale cookie implicitly on next select)
  return editions[0].id
}
```

Note: `getEditions()` is already called in the fallback path, so this change adds one extra DB call only when a cookie is present. If performance is a concern, the validation can be done with a direct `.maybeSingle()` query on the editions table instead of fetching all editions.

### WR-04: Silent `isMock` Fallback on Real Data Fetch Failure in Dashboard Overview

**File:** `abvcap-congress/app/dashboard/page.tsx:67-70`

**Issue:** When `Promise.all` throws (any of the five data-fetching calls fails), the page falls back to `MOCK_STATS` and displays a "dados demo" badge. This means a transient database error, a misconfigured RPC, or a network timeout is silently masked with fake data. A user could mistake mock data for real event data, leading to incorrect business decisions. The other dashboard pages (`inscricoes`, `membros`, `receita`) correctly show an error banner and render nothing — this page should follow the same pattern.

**Fix:**
```typescript
// Replace isMock pattern with explicit error state
let loadError = false

try {
  const [s, ticket, segment, regByDay, free] = await Promise.all([...])
  stats = s
  // ... assign other vars
} catch {
  loadError = true
}

// In JSX, replace the isMock badge with:
{loadError && (
  <div className="border border-red-500/20 bg-red-500/5 rounded-lg p-6 text-sm text-red-600">
    Falha ao carregar dados. Tente recarregar a página.
  </div>
)}

// Remove: const display = stats ?? MOCK_STATS
// Use: const display = stats  (and guard rendering on !loadError && stats !== null)
```

---

## Info

### IN-01: `SEGMENT_LABELS` Constant Duplicated Across Three Files

**File:** `abvcap-congress/app/api/export/participants/route.ts:20-28`, `abvcap-congress/app/dashboard/inscricoes/inscricoes-client.tsx:34-42`, `abvcap-congress/app/dashboard/membros/membros-charts.tsx:14-23`

**Issue:** The `SEGMENT_LABELS` record is defined identically in three separate files (with `membros-charts.tsx` adding one extra key `SEM_SEGMENTO`). Any change to segment labels (e.g., renaming "Outro") must be applied in three places. Extract to a shared constants file.

**Fix:**
```typescript
// lib/constants.ts (new file)
export const SEGMENT_LABELS: Record<string, string> = {
  GP: 'Gestora de PE/VC',
  LP: 'Investidor (LP)',
  FUNDO: 'Fundo de Pensão',
  CORPORATIVO: 'Corporativo',
  GOVERNO: 'Governo',
  ACADEMIA: 'Academia',
  OUTRO: 'Outro',
  SEM_SEGMENTO: 'Sem segmento',
}
// Import and use in all three files
```

### IN-02: `getRevenueAnalysis` and `getOverviewStats` Cast With Double `as unknown as`

**File:** `abvcap-congress/lib/data.ts:25`, `abvcap-congress/lib/data.ts:202-204`, `abvcap-congress/lib/data.ts:210-212`

**Issue:** RPC return types are cast using `as unknown as TargetType`, bypassing TypeScript's type checking entirely. If the RPC schema changes or returns an unexpected shape, the error will be a runtime crash or silent wrong value rather than a compile-time error. This is a symptom of Supabase's generated types not covering custom RPCs.

**Fix:** Define the expected RPC return shape as a Zod schema or use Supabase's typed RPC overloads so the cast is at least validated at the boundary. At minimum, document why the double-cast is necessary (e.g., `// Supabase does not generate types for custom RPCs; shape validated in migration`).

### IN-03: Export Hard-Coded 10 000 Row Limit Without User Feedback

**File:** `abvcap-congress/lib/data.ts:175`

**Issue:** `getParticipantsForExport` applies `.limit(10000)` silently. If an edition has more than 10 000 participants, the exported file will be silently truncated. There is no warning in the response or in the UI.

**Fix:** After fetching, check `data.length === 10000` and either: (a) return a header or metadata flag that the export route can translate into a warning sheet in the Excel file, or (b) implement cursor-based pagination for the export. At minimum, log a warning on the server side.

---

_Reviewed: 2026-05-26T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
