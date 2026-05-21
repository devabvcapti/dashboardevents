# Coding Conventions

**Analysis Date:** 2026-05-21

## Naming Patterns

**Files:**
- Page files use Next.js App Router convention: `page.tsx` — one per route directory
- Client components co-located with their server page are named `[route]-client.tsx` — e.g., `inscricoes-client.tsx` alongside `app/dashboard/inscricoes/page.tsx`
- Chart components co-located with their page are named `[route]-charts.tsx` — e.g., `overview-charts.tsx`, `publico-charts.tsx`
- Shared reusable components use kebab-case: `stat-card.tsx`, `status-badge.tsx`, `sidebar.tsx`
- shadcn/ui primitive wrappers live in `components/ui/` using kebab-case: `badge.tsx`, `dropdown-menu.tsx`
- Library modules use kebab-case: `database.types.ts`, `data.ts`, `supabase.ts`, `utils.ts`

**Functions / Components:**
- React components use PascalCase: `StatCard`, `StatusBadge`, `TicketBadge`, `InscricoesClient`, `OverviewCharts`
- Non-component functions use camelCase: `getParticipants`, `getOverviewStats`, `getTicketTypeSummary`, `getSupabase`, `cn`
- Helper/utility components defined in the same file as their parent are also PascalCase: `EmptyChart` (defined locally inside `overview-charts.tsx` and `publico-charts.tsx`)

**Variables / Constants:**
- Module-level constant arrays/objects use UPPER_SNAKE_CASE: `COLORS`, `TICKET_TYPES`, `STATUS_TYPES`, `TICKET_ORDER`, `COMPANY_LABELS`
- TypeScript `interface` names use PascalCase: `Participant`, `StatCardProps`, `Props`
- Local state variables use camelCase: `search`, `ticketFilter`, `statusFilter`, `filtered`

**Types:**
- Union type aliases use PascalCase: `TicketType`, `CompanyType`, `ParticipantStatus`, `Json`
- Inline `interface Props` is used for component prop types within the same file; named interfaces (e.g., `StatCardProps`) are used when the interface needs to be read alongside the component declaration

## TypeScript Patterns

**Strict mode is enabled** (`"strict": true` in `tsconfig.json`). All code must satisfy strict TypeScript.

**Type imports use `import type`:**
```typescript
import type { Participant, TicketType, ParticipantStatus } from '@/lib/database.types'
```

**Enums are TypeScript union types, not `enum` keyword:**
```typescript
export type TicketType = 'LP' | 'GP' | 'APOIADOR' | 'PATROCINADOR' | 'IMPRENSA' | 'CORTESIA' | 'STAFF'
export type ParticipantStatus = 'CONFIRMADO' | 'PENDENTE' | 'CANCELADO' | 'LISTA_ESPERA'
```

**Nullability uses `| null` and optional chaining (`?.`), not `undefined` unless required:**
```typescript
phone: string | null
job_title: string | null
stats?.total ?? '—'
p.job_title ?? '—'
```

**Awaited return types are inferred from function signatures:**
```typescript
let participants: Awaited<ReturnType<typeof getParticipants>> = []
```

**`Record<K, V>` is used for accumulator objects in data transforms:**
```typescript
participants.reduce<Record<string, number>>((acc, p) => { ... }, {})
```

**Type assertions use `as`, applied at the boundary between Supabase data and domain types:**
```typescript
return data as Participant[]
return Object.entries(summary).map(([type, counts]) => ({ type, ...counts }))
```

**`data-slot` attributes on UI primitives** — all shadcn/base-ui wrappers set `data-slot="..."` for internal CSS targeting (e.g., `data-slot="card"`, `data-slot="button"`).

## Component Structure: Server vs Client

**Server Components (default — no directive):**
- All page files (`page.tsx`) are async Server Components that fetch data directly
- Layouts (`layout.tsx`) are also Server Components
- Server components call `lib/data.ts` functions directly using `await`
- They pass fetched data down as props to Client Components for interactivity

Example — `app/dashboard/inscricoes/page.tsx`:
```typescript
// No 'use client' — Server Component
export const revalidate = 30

export default async function InscricoesPage() {
  let participants: Awaited<ReturnType<typeof getParticipants>> = []
  try {
    participants = await getParticipants()
  } catch {
    participants = []
  }
  return <InscricoesClient initialData={participants} />
}
```

**Client Components (`'use client'` directive at top of file):**
- Any component using React hooks (`useState`, `useMemo`, `usePathname`) must declare `'use client'`
- Any component using browser-only APIs (event handlers, Recharts) must declare `'use client'`
- Client components receive all data as props from the Server Component parent — they do NOT fetch data themselves
- Co-located in the same route directory as their page file

Client components in this codebase:
- `app/dashboard/inscricoes/inscricoes-client.tsx` — table with search/filter state
- `app/dashboard/overview-charts.tsx` — Recharts charts
- `app/dashboard/publico/publico-charts.tsx` — Recharts charts
- `components/sidebar.tsx` — uses `usePathname` for active link highlighting
- `components/ui/select.tsx`, `components/ui/table.tsx`, `components/ui/dropdown-menu.tsx` — base-ui primitives

**`revalidate` export for ISR:**
- Pages set `export const revalidate = N` (in seconds) to control Next.js ISR cache — `60` for overview, `30` for detail pages

## Import Organization

**Order (observed pattern):**
1. Next.js / React built-ins: `import type { Metadata } from "next"`, `import { useState, useMemo } from 'react'`
2. Third-party packages: `import { format } from 'date-fns'`, Recharts imports, lucide-react icons
3. Internal aliases (`@/`): `import { cn } from '@/lib/utils'`, `import { Card } from '@/components/ui/card'`
4. Relative imports (same directory): `import { OverviewCharts } from './overview-charts'`

**Path aliases:**
- `@/` maps to the project root (`./`) — defined in `tsconfig.json` paths
- Used for all cross-directory imports: `@/components/...`, `@/lib/...`, `@/components/ui/...`
- Relative imports (`./`) are only used for files in the same route directory

## Styling Approach

**Framework:** Tailwind CSS v4 with CSS custom properties (variables)

**Color system uses `oklch()` values defined as CSS variables in `app/globals.css`:**
```css
:root {
  --primary: oklch(0.35 0.12 255);
  --sidebar: oklch(0.17 0.04 255);
  --chart-1: oklch(0.45 0.15 255);
}
```

**Tailwind classes reference these CSS variables via semantic names:**
- Use `text-foreground`, `bg-background`, `text-muted-foreground`, `bg-card`, `border-border` — not raw color values
- Use `text-sidebar-foreground`, `bg-sidebar`, `border-sidebar-border` for sidebar-specific tokens

**Chart colors are hardcoded hex arrays** (not CSS variables) because Recharts does not consume CSS variables:
```typescript
const COLORS = ['#3b5bdb', '#1c7ed6', '#0ca678', '#f59f00', '#f03e3e', '#7950f2', '#1098ad']
```

**Status/ticket badge colors use Tailwind color palette classes directly** (not CSS variables) for explicit semantic color-coding:
```typescript
CONFIRMADO: { className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
PENDENTE:   { className: 'bg-amber-100 text-amber-800 border-amber-200' },
CANCELADO:  { className: 'bg-red-100 text-red-800 border-red-200' },
```

**`cn()` utility for conditional class merging:**
```typescript
import { cn } from '@/lib/utils'
// Usage:
className={cn('base-classes', condition && 'conditional-class', className)}
```
`cn` is `clsx` + `twMerge` — always use it when merging Tailwind classes conditionally.

**shadcn `cva` (class-variance-authority) for component variants:**
```typescript
const buttonVariants = cva('base-classes', {
  variants: { variant: { default: '...', outline: '...' } },
  defaultVariants: { variant: 'default' }
})
```
Used in `components/ui/button.tsx` and `components/ui/badge.tsx`.

**Layout classes pattern:**
- Page wrappers: `className="p-8 space-y-8"` (padding + vertical gap stack)
- Grid layouts: `className="grid grid-cols-2 lg:grid-cols-4 gap-4"`
- Flex layouts: `className="flex flex-wrap gap-3"`

## Data Fetching Pattern

**All data fetching happens in Server Component `page.tsx` files**, never in Client Components.

**Supabase client is a lazy singleton** in `lib/supabase.ts`:
```typescript
let _client: SupabaseClient<Database> | null = null
export function getSupabase(): SupabaseClient<Database> { ... }
```

**All data access goes through `lib/data.ts`** — pages never call `getSupabase()` directly.

**Error handling at the page level wraps calls in `try/catch` and falls back to empty/null:**
```typescript
let stats
try {
  stats = await getOverviewStats()
} catch {
  stats = null
}
// Then render with null-coalescing: stats?.total ?? '—'
```

**Data functions throw on Supabase error:**
```typescript
const { data, error } = await query
if (error) throw error
return data as Participant[]
```

**Client-side filtering uses `useMemo` over the server-fetched `initialData` prop** — the full dataset is fetched once on the server and filtered in-browser without additional requests:
```typescript
const filtered = useMemo(() => {
  return initialData.filter(p => { ... })
}, [initialData, search, ticketFilter, statusFilter])
```

## Error Handling

**Data layer:** Functions in `lib/data.ts` throw the Supabase error object directly. No wrapping, no custom error types.

**Page layer:** `try/catch` silently swallows errors and falls back to empty state (`null` or `[]`). Pages then render inline error guidance (amber warning banners) if `stats === null`.

**No toast notifications, no error boundaries, no global error handler** — graceful degradation to empty state is the only mechanism.

**Null display values:** Absent data renders as `'—'` (em dash) for numeric fields and uses `??` null coalescing throughout.

**Supabase configuration guard** — `getSupabase()` throws a descriptive error if env vars are missing or unpopulated (prefixed with `your_`):
```typescript
if (!url || url.startsWith('your_') || !key || key.startsWith('your_')) {
  throw new Error('Supabase não configurado...')
}
```

## Code Style

**Formatting:** No Prettier config present. ESLint is configured via `eslint.config.mjs` using `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`. No explicit formatting rules beyond what Next.js ESLint ships.

**Quotes:** Single quotes for JS/TS string literals; double quotes in JSX attribute values.

**Semicolons:** Present — all statements end with semicolons.

**Trailing commas:** Present in multi-line arrays/objects.

**No comments** — no JSDoc, no inline comments anywhere in the codebase. Code is self-describing via clear naming.

**Empty catch blocks** — `catch` clauses have no argument and no body (`catch { ... }`), intentionally silencing all errors at the page level.

## Module Design

**Exports:** Named exports throughout. No default exports except for Next.js-required patterns (`export default function Page`, `export default function Layout`).

**Re-exports from `lib/data.ts`:** Types from `database.types.ts` are re-exported via `lib/data.ts` so consumers can import both data functions and types from a single location:
```typescript
// lib/data.ts
export type { Participant, TicketType, CompanyType, ParticipantStatus }
```

**No barrel files** (`index.ts`) — each module is imported directly by path.

**UI component exports:** Named function declarations (not arrow functions) exported at the bottom of each file using explicit named exports. shadcn convention.

---

*Convention analysis: 2026-05-21*
