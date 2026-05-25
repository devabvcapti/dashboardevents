# Architecture

**Analysis Date:** 2026-05-21

## Pattern Overview

**Overall:** Next.js 16 App Router — Server Components as default, Client Components opted in via `'use client'`

**Key Characteristics:**
- All pages are async React Server Components (RSC) that fetch data directly on the server before rendering
- Interactive/chart components are split into separate `*-client.tsx` or `*-charts.tsx` files marked `'use client'`
- No API routes — the app reads from Supabase directly from server-side code using the public anon key
- No global state management library; component-local state via `useState`/`useMemo` only
- Revalidation is time-based (`export const revalidate = N`) — no on-demand revalidation or mutations

## Rendering Strategy

**Default:** Server-Side Rendering (SSR) with ISR-style time-based revalidation

| Page | Strategy | Revalidate |
|---|---|---|
| `app/dashboard/page.tsx` | SSR + ISR | 60 seconds |
| `app/dashboard/inscricoes/page.tsx` | SSR + ISR | 30 seconds |
| `app/dashboard/ingressos/page.tsx` | SSR + ISR | 30 seconds |
| `app/dashboard/publico/page.tsx` | SSR + ISR | 60 seconds |

The root `app/page.tsx` is a simple redirect to `/dashboard` — no data fetching, no rendering.

**Client Components** (marked `'use client'`):
- `app/dashboard/overview-charts.tsx` — Recharts bar/pie/line charts
- `app/dashboard/publico/publico-charts.tsx` — Recharts pie/bar charts with progress bars
- `app/dashboard/inscricoes/inscricoes-client.tsx` — Filterable/searchable participant table
- `components/sidebar.tsx` — Uses `usePathname()` for active link highlight
- `components/ui/table.tsx`, `components/ui/select.tsx` — shadcn/base-ui primitives

## Data Flow

**Fetch Path (server):**

1. Page component (RSC) calls a function from `lib/data.ts`
2. `lib/data.ts` calls `getSupabase()` from `lib/supabase.ts` to get the singleton client
3. Supabase JS client queries the `participants` table directly via REST/PostgREST
4. Data is returned as typed `Participant[]` or aggregated objects
5. Page renders server-side HTML with the data
6. For interactive sections, page passes data as props to a `'use client'` child component

**Error Handling Pattern:**
Every page wraps its data call in a `try/catch`. On error, data falls back to an empty state (`null` or `[]`). Pages render gracefully with "Sem dados" empty states rather than throwing. No error boundaries.

```typescript
// Pattern in every page
let stats
try {
  stats = await getOverviewStats()
} catch {
  stats = null
}
```

**Client-side filtering (Inscricoes page):**
- All participants are fetched server-side on page load
- `InscricoesClient` receives `initialData: Participant[]` as prop
- Filtering by name/email/company (text search), ticket type, and status is done in-memory with `useMemo`
- No client-side re-fetching; no pagination

## Data Layer (`lib/`)

**`lib/supabase.ts`:**
- Exports `getSupabase(): SupabaseClient<Database>` — a lazy singleton
- Throws if `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing or placeholder values
- Used only in `lib/data.ts`; never imported directly in components

**`lib/data.ts`:**
- Three exported async functions, all server-side:
  - `getParticipants(filters?)` — fetches all participants with optional server-side filters (ticket type, status, search via Supabase `.or()`)
  - `getOverviewStats()` — fetches all participants and aggregates in JavaScript (count by status, ticket type, company type, registrations by day)
  - `getTicketTypeSummary()` — fetches `ticket_type, status` columns and aggregates per ticket type
- Note: `getOverviewStats()` and `getTicketTypeSummary()` load the full `participants` table and aggregate in-memory (no SQL aggregation)

**`lib/database.types.ts`:**
- Hand-authored TypeScript types matching the Supabase schema
- Exports: `Participant`, `TicketType`, `CompanyType`, `ParticipantStatus`, `Database`
- `TicketType`: `'LP' | 'GP' | 'APOIADOR' | 'PATROCINADOR' | 'IMPRENSA' | 'CORTESIA' | 'STAFF'`
- `ParticipantStatus`: `'CONFIRMADO' | 'PENDENTE' | 'CANCELADO' | 'LISTA_ESPERA'`

**`lib/utils.ts`:**
- Exports `cn(...inputs)` — `clsx` + `tailwind-merge` utility

## Routing Structure

Uses Next.js App Router file-based routing. No dynamic segments, no parallel routes.

```
/                    → redirect to /dashboard  (app/page.tsx)
/dashboard           → Overview page           (app/dashboard/page.tsx)
/dashboard/inscricoes → Participants table     (app/dashboard/inscricoes/page.tsx)
/dashboard/ingressos  → Ticket type breakdown  (app/dashboard/ingressos/page.tsx)
/dashboard/publico    → Audience analysis      (app/dashboard/publico/page.tsx)
```

**Layouts:**
- `app/layout.tsx` — Root layout: sets HTML lang, applies Geist fonts, renders `<body>`
- `app/dashboard/layout.tsx` — Dashboard layout: renders `<Sidebar>` + `<main>` flex container wrapping all `/dashboard/*` pages

## Component Hierarchy

```
RootLayout (app/layout.tsx)
└── DashboardLayout (app/dashboard/layout.tsx)
    ├── Sidebar (components/sidebar.tsx) [client]
    └── <main>
        ├── DashboardPage (app/dashboard/page.tsx) [server]
        │   ├── StatCard × 4 (components/stat-card.tsx) [server]
        │   └── OverviewCharts (app/dashboard/overview-charts.tsx) [client]
        │       └── Recharts: BarChart, PieChart, LineChart
        ├── InscricoesPage (app/dashboard/inscricoes/page.tsx) [server]
        │   └── InscricoesClient (app/dashboard/inscricoes/inscricoes-client.tsx) [client]
        │       ├── Input (components/ui/input.tsx)
        │       ├── Select × 2 (components/ui/select.tsx)
        │       └── Table + StatusBadge + TicketBadge
        ├── IngressosPage (app/dashboard/ingressos/page.tsx) [server]
        │   ├── Card × N (components/ui/card.tsx)
        │   ├── TicketBadge (components/status-badge.tsx)
        │   └── Table (components/ui/table.tsx)
        └── PublicoPage (app/dashboard/publico/page.tsx) [server]
            └── PublicoCharts (app/dashboard/publico/publico-charts.tsx) [client]
                └── Recharts: PieChart, BarChart (horizontal)
```

## State Management

No global state. State is strictly local to client components:

- `InscricoesClient`: `useState` for `search`, `ticketFilter`, `statusFilter` — used in `useMemo` for derived filtered list
- `Sidebar`: no state — reads `usePathname()` from Next.js router for active link styling
- All chart components are stateless — receive data as props, render immediately

## API Patterns

**No Next.js API routes exist.** Data access is direct from server components via `lib/data.ts`.

**Supabase query patterns used:**
```typescript
// Full table scan (used for stats)
getSupabase().from('participants').select('*')

// Partial select (used for ticket summary)
getSupabase().from('participants').select('ticket_type, status')

// With filters (getParticipants)
query.eq('ticket_type', value)
query.eq('status', value)
query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`)
query.order('created_at', { ascending: false })
```

## Database Schema

Single table: `participants` in Supabase (schema in `supabase/schema.sql`)

**Key columns:** `id` (UUID), `name`, `email` (unique), `phone`, `company`, `company_type`, `job_title`, `ticket_type`, `status`, `is_checked_in`, `checked_in_at`, `form_submitted_at`, `notes`, `created_at`

**RLS:** Enabled. Only `service_role` has a permissive policy. The app uses the anon key — reads will fail unless RLS is adjusted or a read policy is added for anon.

---

*Architecture analysis: 2026-05-21*
