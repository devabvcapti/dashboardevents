# Testing Patterns

**Analysis Date:** 2026-05-21

## Current State: No Tests Exist

There are zero test files in this codebase. No `.test.ts`, `.test.tsx`, `.spec.ts`, or `.spec.tsx` files exist anywhere outside of `node_modules`.

## Testing Infrastructure: Not Configured

**No testing framework is installed or configured:**
- No `jest`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, or similar packages in `package.json`
- No `jest.config.*` or `vitest.config.*` files present
- No `test` script in `package.json` — only `dev`, `build`, `start`, `lint`
- No test directories (`__tests__/`, `tests/`, `e2e/`) exist

## What Should Be Tested

Given the codebase structure, the following are the highest-value test targets. These are ordered by risk and impact.

### 1. Data Transformation Logic in `lib/data.ts` — HIGH PRIORITY

`getOverviewStats()` contains non-trivial in-memory aggregation that is completely untested. Bugs here would silently corrupt all dashboard numbers.

Functions to test:
- `getParticipants()` — filter composition (ticket type, status, search query via `.or()`)
- `getOverviewStats()` — counts per status, `byTicketType` grouping, `byCompanyType` grouping, `registrationsByDay` date bucketing
- `getTicketTypeSummary()` — per-type breakdown of confirmed/pending/cancelled/waitlist counts

Example test cases needed:
```typescript
// getOverviewStats with known participant array:
// - correctly counts confirmed/pending/cancelled/waitlist
// - handles participants with no created_at (excluded from registrationsByDay)
// - byCompanyType sorted descending by count
// - confirmationRate calculation: Math.round((confirmed / Math.max(total, 1)) * 100)

// getParticipants filters:
// - ticketFilter 'ALL' returns all rows
// - statusFilter 'PENDENTE' returns only PENDENTE rows
// - search matches name, email, company case-insensitively
// - combined filters are AND-ed
```

Recommended approach: mock the Supabase client (`getSupabase`) and test the transformation logic against fixture data arrays.

### 2. Client-Side Filter Logic in `InscricoesClient` — HIGH PRIORITY

The `useMemo` filter in `app/dashboard/inscricoes/inscricoes-client.tsx` implements multi-field AND filtering. This is pure logic that should be unit tested.

Test cases needed:
- Empty search string returns full `initialData`
- Search on `name`, `email`, `company` is case-insensitive
- `ticketFilter !== 'ALL'` excludes non-matching ticket types
- `statusFilter !== 'ALL'` excludes non-matching statuses
- Multiple filters applied simultaneously (AND logic)
- Zero results when no participant matches combined filters
- Portuguese characters in names are matched correctly

Recommended approach: `@testing-library/react` with `renderHook` or render the component with known `initialData` fixture.

### 3. `lib/supabase.ts` Configuration Guard — MEDIUM PRIORITY

`getSupabase()` has a guard that throws when env vars are missing or set to placeholder values. This is a critical startup path.

Test cases needed:
- Throws when `NEXT_PUBLIC_SUPABASE_URL` is undefined
- Throws when `NEXT_PUBLIC_SUPABASE_URL` starts with `'your_'`
- Throws when `NEXT_PUBLIC_SUPABASE_ANON_KEY` is undefined
- Returns a client instance when both vars are valid
- Returns the same cached instance on second call (singleton behavior)

### 4. `StatCard` Component — MEDIUM PRIORITY

`components/stat-card.tsx` has simple but testable rendering logic.

Test cases needed:
- Renders `value` as `'—'` when passed the string `'—'`
- Renders `subtitle` when provided; omits subtitle element when not provided
- Applies correct `accentStyles` class for each `accent` variant (`green`, `yellow`, `red`, `blue`, `default`)

### 5. `StatusBadge` and `TicketBadge` — MEDIUM PRIORITY

`components/status-badge.tsx` maps domain enums to display labels and CSS classes. These mappings must stay synchronized with `database.types.ts`.

Test cases needed:
- Each `ParticipantStatus` value renders with the correct Portuguese label
- Each `TicketType` value renders with the correct label and color class
- No missing entries if a new enum value is added (exhaustive check)

### 6. Date Formatting in `inscricoes-client.tsx` — LOW PRIORITY

`format(new Date(p.created_at), "dd/MM/yy HH:mm", { locale: ptBR })` renders dates in Brazilian format. The fallback `'—'` for null `created_at` should be tested.

### 7. Page-Level Error Fallback — LOW PRIORITY

Server Component pages catch all errors and fall back to empty data (`stats = null`, `participants = []`). Integration tests (or E2E) could verify that the amber warning banner renders when `stats` is null.

## Recommended Setup to Add Testing

### Install dependencies

```bash
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom
```

### `vitest.config.ts` (recommended)

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

### `vitest.setup.ts`

```typescript
import '@testing-library/jest-dom'
```

### `package.json` scripts to add

```json
"test": "vitest",
"test:ui": "vitest --ui",
"test:coverage": "vitest run --coverage"
```

## Recommended Test File Locations

Co-locate tests with the code they test (standard Next.js / Vitest convention):

```
lib/
  data.test.ts           # Unit tests for getOverviewStats, getParticipants, getTicketTypeSummary
  supabase.test.ts       # Unit tests for getSupabase singleton and config guard

app/dashboard/inscricoes/
  inscricoes-client.test.tsx   # Component tests for filter useMemo logic

components/
  stat-card.test.tsx           # Rendering tests for StatCard variants
  status-badge.test.tsx        # Rendering tests for StatusBadge and TicketBadge
```

## Mocking Strategy

**Supabase client:** Mock `lib/supabase.ts` at the module level so `lib/data.ts` tests use fixture data instead of real network calls.

```typescript
// lib/data.test.ts
import { vi } from 'vitest'

vi.mock('./supabase', () => ({
  getSupabase: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockResolvedValue({ data: FIXTURE_PARTICIPANTS, error: null }),
  })),
}))
```

**Environment variables for `supabase.test.ts`:** Use `vi.stubEnv` or set `process.env` in `beforeEach`/`afterEach` to test the configuration guard.

## Test Data / Fixtures

The schema in `supabase/schema.sql` includes 10 sample participants (lines 41–51) that should be extracted into a shared fixture file:

```
lib/
  __fixtures__/
    participants.ts    # Typed array of Participant matching supabase/schema.sql seed data
```

This keeps test data consistent with the known DB seed and the `Participant` interface in `lib/database.types.ts`.

---

*Testing analysis: 2026-05-21*
