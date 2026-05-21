# External Integrations

**Analysis Date:** 2026-05-21

## APIs & External Services

**Database (BaaS):**
- Supabase — PostgreSQL-backed database as a service
  - SDK/Client: `@supabase/supabase-js` ^2.106.1
  - Auth env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Initialization: `lib/supabase.ts`

**Fonts:**
- Google Fonts (via Next.js font optimization) — `Geist` and `Geist_Mono`
  - No API key required; loaded via `next/font/google` at build time
  - Configured in `app/layout.tsx`

## Data Storage

**Databases:**
- Supabase (PostgreSQL)
  - Connection: `NEXT_PUBLIC_SUPABASE_URL` (env var)
  - Auth token: `NEXT_PUBLIC_SUPABASE_ANON_KEY` (env var)
  - Client: `@supabase/supabase-js` with typed `Database` generic from `lib/database.types.ts`
  - Schema file: `supabase/schema.sql`
  - Single table: `participants` (UUID PK, full participant record)

**Schema details (`supabase/schema.sql`):**
- Table `participants` — primary data store
  - Fields: `id` (UUID), `created_at`, `name`, `email` (unique), `phone`, `company`, `company_type`, `job_title`, `ticket_type`, `status`, `is_checked_in`, `checked_in_at`, `form_submitted_at`, `notes`
  - Enums: `ticket_type` (LP, GP, APOIADOR, PATROCINADOR, IMPRENSA, CORTESIA, STAFF), `company_type` (GP, LP, GESTORA, FUNDO, CORPORATIVO, GOVERNO, ACADEMIA, OUTRO), `participant_status` (CONFIRMADO, PENDENTE, CANCELADO, LISTA_ESPERA)
  - Indexes on: `ticket_type`, `status`, `company_type`, `is_checked_in`
  - RLS enabled; policy `service_role_all` grants full access to `service_role`

**File Storage:**
- Not used — local filesystem only for static assets

**Caching:**
- Next.js built-in ISR (Incremental Static Regeneration)
  - `app/dashboard/page.tsx`: `export const revalidate = 60` (1 minute)
  - `app/dashboard/inscricoes/page.tsx`: `export const revalidate = 30` (30 seconds)
  - `app/dashboard/ingressos/page.tsx`: `export const revalidate = 30` (30 seconds)
  - `app/dashboard/publico/page.tsx`: `export const revalidate = 60` (1 minute)

## Authentication & Identity

**Auth Provider:**
- None — no user authentication is implemented
- Supabase client uses the anon key directly (read-only access pattern)
- RLS policy in `supabase/schema.sql` is set for `service_role` only; anon key access depends on whether additional RLS policies are added

**Implementation note:**
- The Supabase client in `lib/supabase.ts` is initialized as a singleton (module-level `_client` variable) using the public anon key
- No `supabase.auth.*` calls exist anywhere in the codebase

## Monitoring & Observability

**Error Tracking:**
- None configured — no Sentry, LogRocket, or equivalent

**Logs:**
- Silent error handling: all Supabase query errors in page components are caught with empty `catch {}` blocks, falling back to empty/null data
- No structured logging library used

## CI/CD & Deployment

**Hosting:**
- Not explicitly configured — `next.config.ts` has no platform-specific settings
- Compatible with Vercel (default Next.js deployment target)

**CI Pipeline:**
- None detected — no GitHub Actions, CircleCI, or equivalent config files

## Environment Configuration

**Required env vars (`.env.local`):**
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (e.g., `https://<project-ref>.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public API key

**Validation:**
- `lib/supabase.ts` throws a descriptive Portuguese error if either var is missing or still contains placeholder values starting with `your_`

**Secrets location:**
- `.env.local` (not committed; must be created manually per environment)
- Both vars are prefixed `NEXT_PUBLIC_` so they are exposed to the browser bundle — appropriate only for anon/public keys

## Webhooks & Callbacks

**Incoming:**
- None — no API route handlers (`app/api/`) exist in the project

**Outgoing:**
- None

---

*Integration audit: 2026-05-21*
