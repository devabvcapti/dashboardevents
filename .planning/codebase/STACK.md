# Technology Stack

**Analysis Date:** 2026-05-21

## Languages

**Primary:**
- TypeScript 5.x (`^5`) — all application code, components, lib, and config files

**Secondary:**
- SQL — Supabase schema definition (`supabase/schema.sql`)
- CSS — global styles (`app/globals.css`)

## Runtime

**Environment:**
- Node.js (version not pinned; no `.nvmrc` or `.node-version` present)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 16.2.6 — App Router, React Server Components, file-based routing
- React 19.2.4 — UI rendering
- React DOM 19.2.4 — DOM bindings

**Build/Dev:**
- Next.js dev server (`next dev`) — local development
- Next.js build (`next build`) / start (`next start`) — production

**Styling:**
- Tailwind CSS 4.x (`^4`) — utility-first CSS
- `@tailwindcss/postcss` (`^4`) — PostCSS integration (`postcss.config.mjs`)
- `tw-animate-css` 1.4.0 — CSS animation utilities
- `tailwind-merge` 3.6.0 — conditional class merging
- CSS variables for theming (`app/globals.css`, configured in `components.json`)

**Linting:**
- ESLint 9.x (`^9`) with `eslint-config-next` 16.2.6
- Config: `eslint.config.mjs` using `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`

## Key Dependencies

**Production:**

| Package | Version | Purpose |
|---|---|---|
| `next` | 16.2.6 | Full-stack React framework (App Router) |
| `react` | 19.2.4 | UI component library |
| `react-dom` | 19.2.4 | React DOM renderer |
| `@supabase/supabase-js` | ^2.106.1 | Supabase database client |
| `recharts` | ^3.8.1 | Chart components (Bar, Pie, Line) |
| `@base-ui/react` | ^1.5.0 | Headless UI primitives (used for Button component) |
| `class-variance-authority` | ^0.7.1 | Component variant management (`cva`) |
| `clsx` | ^2.1.1 | Conditional className utility |
| `tailwind-merge` | ^3.6.0 | Class conflict resolution |
| `date-fns` | ^4.2.1 | Date formatting, with `ptBR` locale |
| `lucide-react` | ^1.16.0 | Icon set (LayoutDashboard, Users, BarChart3, TicketIcon) |
| `shadcn` | ^4.8.0 | Component generator CLI |
| `tw-animate-css` | ^1.4.0 | CSS animation utilities |

**Development:**

| Package | Version | Purpose |
|---|---|---|
| `typescript` | ^5 | TypeScript compiler |
| `@types/node` | ^20 | Node.js type definitions |
| `@types/react` | ^19 | React type definitions |
| `@types/react-dom` | ^19 | React DOM type definitions |
| `eslint` | ^9 | Linter |
| `eslint-config-next` | 16.2.6 | Next.js ESLint rules |
| `tailwindcss` | ^4 | Tailwind CSS framework |
| `@tailwindcss/postcss` | ^4 | PostCSS plugin for Tailwind v4 |

## Configuration

**TypeScript:**
- `tsconfig.json` — target ES2017, strict mode enabled, `moduleResolution: bundler`
- Path alias: `@/*` maps to project root (`./`)
- JSX: `react-jsx`

**Next.js:**
- `next.config.ts` — minimal, no custom options currently set

**Tailwind / PostCSS:**
- `postcss.config.mjs` — single plugin: `@tailwindcss/postcss`
- CSS entry: `app/globals.css`
- Base color: `neutral`, CSS variables enabled
- Config file: none (Tailwind v4 uses CSS-first configuration)

**Shadcn UI:**
- `components.json` — style `base-nova`, RSC enabled, icon library `lucide`
- Aliases: `@/components`, `@/components/ui`, `@/lib`, `@/lib/utils`, `@/hooks`

**Environment:**
- Requires `.env.local` at project root (not committed)
- Required vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Validation occurs at client initialization in `lib/supabase.ts`

## Platform Requirements

**Development:**
- Node.js with npm
- `.env.local` file with Supabase credentials

**Production:**
- Any Node.js-compatible host supporting Next.js (Vercel recommended by default)
- Environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be set on the host

---

*Stack analysis: 2026-05-21*
