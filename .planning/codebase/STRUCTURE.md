# Codebase Structure

**Analysis Date:** 2026-05-21

## Directory Layout

```
abvcap-congress/
├── app/                          # Next.js App Router root
│   ├── layout.tsx                # Root HTML layout (fonts, metadata)
│   ├── page.tsx                  # Root route → redirects to /dashboard
│   ├── globals.css               # Tailwind v4 imports + ABVCAP CSS variables
│   ├── favicon.ico
│   └── dashboard/                # /dashboard route group
│       ├── layout.tsx            # Dashboard shell: Sidebar + <main>
│       ├── page.tsx              # /dashboard — Overview (stats + charts)
│       ├── overview-charts.tsx   # Client chart component for overview page
│       ├── inscricoes/           # /dashboard/inscricoes — Participant list
│       │   ├── page.tsx          # Server component: fetches, renders shell
│       │   └── inscricoes-client.tsx  # Client component: filter/search UI
│       ├── ingressos/            # /dashboard/ingressos — Ticket breakdown
│       │   └── page.tsx          # Server component: full page render
│       └── publico/              # /dashboard/publico — Audience analysis
│           ├── page.tsx          # Server component: fetches stats
│           └── publico-charts.tsx # Client chart component
├── components/                   # Shared React components
│   ├── sidebar.tsx               # Navigation sidebar (client, uses usePathname)
│   ├── stat-card.tsx             # KPI card with colored left border
│   ├── status-badge.tsx          # StatusBadge + TicketBadge (color-coded)
│   └── ui/                       # shadcn/base-ui primitives
│       ├── avatar.tsx
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── dropdown-menu.tsx
│       ├── input.tsx
│       ├── select.tsx            # Built on @base-ui/react/select
│       ├── separator.tsx
│       └── table.tsx
├── lib/                          # Shared non-UI logic
│   ├── supabase.ts               # Supabase client singleton factory
│   ├── database.types.ts         # TypeScript types for DB schema
│   ├── data.ts                   # All data-fetching functions
│   └── utils.ts                  # cn() helper (clsx + tailwind-merge)
├── supabase/
│   └── schema.sql                # DB schema: CREATE TABLE, enums, indexes, RLS
├── public/                       # Static assets (empty except Next.js defaults)
├── next.config.ts                # Next.js config (minimal, no custom options)
├── tsconfig.json                 # TypeScript config — path alias @/* → ./*
├── eslint.config.mjs             # ESLint with next config
├── postcss.config.mjs            # PostCSS for Tailwind v4
├── components.json               # shadcn/ui registry config
├── package.json
├── AGENTS.md                     # Agent instructions (references Next.js docs)
└── CLAUDE.md                     # Points to AGENTS.md
```

## Directory Purposes

**`app/`:**
- Purpose: All Next.js routes, layouts, and their co-located client components
- Contains: Page files (`page.tsx`), layout files (`layout.tsx`), and page-specific client components (`*-client.tsx`, `*-charts.tsx`)
- Key convention: Each route segment is a directory. Client components used only on one page live in that page's directory, not in `components/`

**`app/dashboard/`:**
- Purpose: The entire dashboard section; all current UI lives here
- Key files: `layout.tsx` (shared sidebar shell), `page.tsx` (overview), `overview-charts.tsx` (overview charts, client)

**`components/`:**
- Purpose: Shared components used across multiple pages
- Two tiers: top-level files are domain components (`sidebar.tsx`, `stat-card.tsx`, `status-badge.tsx`); `ui/` subdirectory holds generic UI primitives

**`components/ui/`:**
- Purpose: shadcn-style UI primitives, generated/managed via shadcn CLI
- Do not edit these by hand unless necessary — they are framework-level components
- Built on `@base-ui/react` for select and other interactive primitives

**`lib/`:**
- Purpose: All non-component shared logic
- `data.ts` is the single data-access layer — all Supabase queries go here
- `supabase.ts` is the only place the Supabase client is instantiated
- `database.types.ts` is the source of truth for TypeScript DB types

**`supabase/`:**
- Purpose: Database schema definition
- `schema.sql` contains the full DDL: enums, table, indexes, RLS, seed data
- Not auto-generated — maintained by hand

## Key File Locations

**Entry Points:**
- `app/layout.tsx` — Root HTML wrapper, font injection
- `app/page.tsx` — Root URL handler (redirects to `/dashboard`)
- `app/dashboard/layout.tsx` — Persistent dashboard frame (sidebar)

**Configuration:**
- `tsconfig.json` — Path alias `@/*` maps to project root (e.g., `@/lib/data`, `@/components/sidebar`)
- `app/globals.css` — Design tokens (CSS variables), Tailwind v4 theme, ABVCAP brand colors
- `next.config.ts` — Minimal; no rewrites, no image domains, no env exposure
- `components.json` — shadcn config; controls which registry and style variants are used

**Core Logic:**
- `lib/data.ts` — All data-fetching functions (`getParticipants`, `getOverviewStats`, `getTicketTypeSummary`)
- `lib/supabase.ts` — Supabase client factory
- `lib/database.types.ts` — `Participant`, `TicketType`, `CompanyType`, `ParticipantStatus` types

**Page Components:**
- `app/dashboard/page.tsx` — Overview (stats grid + charts)
- `app/dashboard/inscricoes/page.tsx` — Participant table (server shell)
- `app/dashboard/ingressos/page.tsx` — Ticket category breakdown
- `app/dashboard/publico/page.tsx` — Audience demographic analysis

**Database:**
- `supabase/schema.sql` — Full schema DDL with seed data

## Naming Conventions

**Files:**
- Route pages: `page.tsx` (required by Next.js App Router)
- Route layouts: `layout.tsx` (required by Next.js App Router)
- Page-scoped client components: `[page-name]-client.tsx` (e.g., `inscricoes-client.tsx`) or `[page-name]-charts.tsx` (e.g., `overview-charts.tsx`, `publico-charts.tsx`)
- Shared components: `kebab-case.tsx` (e.g., `stat-card.tsx`, `status-badge.tsx`)
- UI primitives: `kebab-case.tsx` under `components/ui/`
- Library files: `kebab-case.ts` under `lib/`

**Directories:**
- Route segments: `kebab-case` matching the URL path (`inscricoes/`, `ingressos/`, `publico/`)
- No feature folders or module grouping beyond route segments

**Exports:**
- Named exports for components (e.g., `export function Sidebar()`)
- Default exports for Next.js page/layout files (e.g., `export default async function DashboardPage()`)
- Named exports for lib functions

**TypeScript:**
- Types defined in `lib/database.types.ts` and imported as `type` where used
- Props interfaces defined inline above the component (e.g., `interface Props { ... }`)

## Where to Add New Code

**New dashboard page/route:**
1. Create directory: `app/dashboard/[route-name]/`
2. Create `app/dashboard/[route-name]/page.tsx` as an async Server Component
3. Add data function to `lib/data.ts`
4. If the page needs interactive UI: add `app/dashboard/[route-name]/[route-name]-client.tsx` with `'use client'`
5. Add nav link to `components/sidebar.tsx` in the `nav` array

**New data query:**
- Add to `lib/data.ts` only — import `getSupabase` from `./supabase` and return typed data
- Add the type to `lib/database.types.ts` if a new shape is needed

**New shared component:**
- Domain components (used across pages): `components/[name].tsx`
- Generic UI primitives: run shadcn CLI or add to `components/ui/[name].tsx`
- Page-specific components: keep co-located in the page's route directory

**New DB table:**
- Add DDL to `supabase/schema.sql`
- Add TypeScript interface to `lib/database.types.ts`
- Update `Database` type's `Tables` map in `lib/database.types.ts`

## Special Directories

**`.next/`:**
- Purpose: Next.js build cache and output
- Generated: Yes
- Committed: No

**`node_modules/`:**
- Purpose: Installed npm dependencies
- Generated: Yes
- Committed: No

**`supabase/`:**
- Purpose: Database migration/schema files
- Generated: No (hand-maintained)
- Committed: Yes

**`public/`:**
- Purpose: Statically served assets (images, icons)
- Generated: No
- Committed: Yes (currently only contains Next.js default SVGs)

---

*Structure analysis: 2026-05-21*
