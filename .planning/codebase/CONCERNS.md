# Codebase Concerns

**Analysis Date:** 2026-05-21

---

## Security Considerations

**Anon key exposed in browser — RLS policy blocks nothing:**
- Risk: `NEXT_PUBLIC_SUPABASE_ANON_KEY` is a client-side env var, meaning the key is bundled and visible to anyone who opens DevTools. The only RLS policy in the schema is `FOR ALL USING (auth.role() = 'service_role')`, which means the anon role gets no access via that policy. However, if RLS is ever misconfigured or a permissive policy is added, the key is already public. More importantly, the current setup means there is **zero protection** if someone accidentally adds a permissive anon policy.
- Files: `lib/supabase.ts`, `supabase/schema.sql`
- Current mitigation: The `service_role_all` policy implicitly denies anon. The app works only because data is read server-side within Next.js server components, so the anon key is never actually used to query in this configuration. But this is fragile — any client component that imports `getSupabase()` would fire anon-authenticated requests.
- Recommendations: Use a server-only Supabase client with the service role key stored in a non-`NEXT_PUBLIC_` env var. Reserve the anon key only for genuinely public client-side operations. Add an explicit anon read-only policy or deny policy to be intentional.

**No authentication layer on the dashboard:**
- Risk: The dashboard is entirely public. Anyone who knows the URL can view all participant data including names, emails, phone numbers, companies, and job titles — PII regulated under LGPD.
- Files: `app/dashboard/layout.tsx`, `app/page.tsx`
- Current mitigation: None. The root redirect goes straight to `/dashboard`.
- Recommendations: Add Next.js middleware to protect the `/dashboard` route. Implement Supabase Auth (magic link or SSO) before any production deployment.

**PII exposed with no access control:**
- Risk: The participants table stores `name`, `email`, `phone`, `company`, `job_title` — all personal data. Without auth, this data is openly accessible to anyone reaching the deployment URL.
- Files: `app/dashboard/inscricoes/inscricoes-client.tsx`, `lib/database.types.ts`
- LGPD implication: ABVCAP as organizer is the data controller. Unauthorized access to participant PII without consent or security measures creates regulatory exposure.

---

## Silent Error Swallowing

**All pages discard errors with empty catch blocks:**
- Issue: Every server component page wraps its data fetch in `try { } catch { }` and falls through to render empty/zero state. The error is never logged, surfaced to an operator, or differentiated from "genuinely no data."
- Files:
  - `app/dashboard/page.tsx` lines 11-14
  - `app/dashboard/inscricoes/page.tsx` lines 8-11
  - `app/dashboard/ingressos/page.tsx` lines 13-16
  - `app/dashboard/publico/page.tsx` lines 8-11
- Impact: A broken Supabase connection, a misconfigured env var, a schema mismatch, or a runtime error all produce the same silent empty-state UI. Operators cannot distinguish "no registrations yet" from "database is down."
- Fix approach: At minimum, log errors to `console.error` and render a distinct error state component (not the same empty-chart placeholder). For production, surface an explicit "failed to load" banner with a retry option.

---

## Performance Bottlenecks

**Full table scans for every stat computation:**
- Problem: `getOverviewStats()` fetches every column of every row (`select('*')`) and performs all aggregation in JavaScript — counting by status, grouping by ticket type, grouping by company type, and building a time series. For 100 participants this is fine. At 1,000+ it becomes wasteful.
- Files: `lib/data.ts` lines 32-81
- Cause: No server-side aggregation, no `COUNT()` queries, no Supabase RPC functions.
- Improvement path: Replace with targeted `select('ticket_type, status, company_type, created_at')` to reduce payload. For stats, use Supabase RPC functions or Postgres views. The `byDay` time series in particular transfers all `created_at` timestamps to the server just to slice them into dates.

**`getParticipants()` loads all rows then filters in memory:**
- Problem: The Inscricoes page fetches all participants server-side with no pagination, then passes the full array to the client component which filters it client-side with `useMemo`.
- Files: `lib/data.ts` lines 6-29`, `app/dashboard/inscricoes/inscricoes-client.tsx`
- Cause: Supabase filters are built in the query but there is no `LIMIT`/`OFFSET`. The client component re-filters the already-fetched full dataset rather than re-querying.
- Improvement path: Add server-side pagination (`range()` in Supabase). Move filter state to URL params so the server component can pass them to the query. Add a `count: 'exact'` header for total count display.

**No pagination on participant table:**
- Problem: The Inscricoes table renders all matched participants in a single DOM table with no virtualization or pagination. A congress of 500+ people will render 500+ table rows simultaneously.
- Files: `app/dashboard/inscricoes/inscricoes-client.tsx`
- Impact: Memory pressure, slow initial paint, laggy filter interactions as the DOM is large.
- Fix approach: Add page-based or infinite-scroll pagination. shadcn/ui's table does not include built-in pagination; implement with state or URL params.

---

## Stale Data / Cache Risk

**Aggressive ISR revalidation windows on operational data:**
- Problem: Pages use `export const revalidate = 30` or `60` seconds. For an active congress event where check-ins and registrations happen in real time, a 30–60 second lag could mislead operators (e.g., showing wrong check-in count during door operations).
- Files:
  - `app/dashboard/page.tsx` line 6: `revalidate = 60`
  - `app/dashboard/inscricoes/page.tsx` line 4: `revalidate = 30`
  - `app/dashboard/ingressos/page.tsx` line 7: `revalidate = 30`
  - `app/dashboard/publico/page.tsx` line 5: `revalidate = 60`
- Fix approach: Reduce to `revalidate = 0` (always fresh) for operational pages during event day, or switch to client-side polling with `setInterval` + Supabase real-time subscriptions for live data.

---

## Missing Features (Functional Gaps)

**No check-in functionality:**
- Problem: The `Participant` type has `is_checked_in: boolean` and `checked_in_at: string | null` fields, and the schema has an index on `is_checked_in`, but there is no UI to perform check-in, view who is checked in, or see the check-in count in any meaningful operational view.
- Files: `lib/database.types.ts`, `supabase/schema.sql`
- Impact: The core operational feature for event day — scanning/confirming arrivals — is entirely absent. The overview stat card for `checkedIn` exists in `getOverviewStats()` but is not rendered in any `StatCard` on the dashboard.
- Note: `stats.checkedIn` is computed in `lib/data.ts` line 41 but never passed to or displayed in `app/dashboard/page.tsx`.

**No participant detail view or edit capability:**
- Problem: Rows in the Inscricoes table are read-only. There is no way to click a participant, view their full record, edit their status, change their ticket type, add notes, or update any field.
- Files: `app/dashboard/inscricoes/inscricoes-client.tsx`
- Impact: Operators cannot perform basic event management tasks (confirming a pending registration, correcting a typo, adding a note about dietary requirements, etc.).

**No export / data download:**
- Problem: There is no CSV, Excel, or PDF export for participant lists. For an event organizer this is a critical operational need (printing lists, sharing with venue staff, reporting to sponsors).
- Files: None — feature does not exist.

**No capacity / quota tracking per ticket type:**
- Problem: The Ingressos page shows counts but has no notion of maximum capacity per ticket type. There is no column in the schema for capacity limits, no warning when a type is near full, and no visual progress indicator.
- Files: `app/dashboard/ingressos/page.tsx`, `supabase/schema.sql`
- Impact: Operators cannot tell at a glance if LP seats are sold out or if the PATROCINADOR allocation is about to be exceeded.

**No manual participant creation from the dashboard:**
- Problem: There is no form or flow to add a new participant from within the dashboard. The only way to add data is via the Supabase table editor directly or an external form.
- Files: None — feature does not exist.

**Check-in stat is computed but never displayed:**
- Problem: `getOverviewStats()` computes `checkedIn` (line 41 in `lib/data.ts`) and includes it in the return value, but `app/dashboard/page.tsx` never reads `stats.checkedIn` and no `StatCard` is rendered for it.
- Files: `lib/data.ts` line 41, `app/dashboard/page.tsx`
- Fix: Add a `StatCard` for check-in count with `accent="blue"` alongside the existing stat cards.

---

## Tech Debt

**Supabase singleton is module-level mutable state:**
- Issue: `lib/supabase.ts` uses a module-level `let _client` variable. In Next.js App Router, server components run in a Node.js environment where module state can persist across requests in the same process. This is currently harmless because the client has no per-request state, but it creates a subtle coupling that could cause issues if multi-tenancy or per-request configuration is ever needed.
- Files: `lib/supabase.ts`
- Fix approach: Use Next.js `cache()` from React to memoize the client per-request, or create the client inline in each server component using a factory function.

**`app/layout.tsx` has `lang="en"` but content is Portuguese:**
- Issue: The HTML root element declares `lang="en"` while all UI text is in Portuguese. This affects screen readers and browser translation prompts.
- Files: `app/layout.tsx` line 23`
- Fix: Change to `lang="pt-BR"`.

**Public assets are Next.js default placeholders:**
- Issue: `public/` contains only default Next.js SVG files (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`) — none of which are used by the application. There is no ABVCAP logo, congress branding, or favicon beyond the default Next.js favicon.
- Files: `public/`, `app/favicon.ico`

**`database.types.ts` defines `TicketTypeSummary` and `CompanyTypeSummary` interfaces that are never used:**
- Issue: Two interfaces are exported but never imported anywhere. The actual summary shapes are inlined as anonymous types in `lib/data.ts`.
- Files: `lib/database.types.ts` lines 24-35`

**`@base-ui/react` is listed as a dependency but not used:**
- Issue: `package.json` includes `@base-ui/react: ^1.5.0` but no imports of this package appear in any source file. The project uses shadcn/ui components instead.
- Files: `package.json`
- Impact: Adds unnecessary install weight (~unreferenced bundle risk if tree-shaking misses it).

---

## Fragile Areas

**`StatusBadge` and `TicketBadge` will throw if given an unknown enum value:**
- Problem: Both badge components use record lookups (`statusConfig[status]`, `ticketConfig[type]`) with no fallback. If the database ever contains a value not in the TypeScript enum (e.g., from a schema migration, a direct DB insert, or a new status added in Supabase before the frontend is updated), the lookup returns `undefined` and the component throws.
- Files: `components/status-badge.tsx` lines 21-28, 30-36`
- Fix approach: Add a nullish fallback: `const cfg = statusConfig[status] ?? { label: status, className: 'bg-gray-100 text-gray-700 border-gray-200' }`.

**`inscricoes-client.tsx` filtering is entirely client-side on a snapshot:**
- Problem: The client component receives `initialData` once at page load. Filters applied by the user operate on that snapshot. If a new registration arrives or a status changes while the user has the page open, they will not see it until a full page reload.
- Files: `app/dashboard/inscricoes/inscricoes-client.tsx`
- Fix approach: Add a refresh button, or use Supabase Realtime subscriptions to push updates.

---

## Scaling Limits

**Single-table flat schema with no multi-event support:**
- Current capacity: The `participants` table has no `event_id` or `year` column. All data is for one congress.
- Limit: When ABVCAP runs the 2026 congress, there is no way to separate data from 2025. The options would be to truncate the table (destroying history), use a new project, or do a schema migration to add event scoping.
- Scaling path: Add an `events` table and `event_id` FK to `participants` before any data from a second event is inserted.

---

## Test Coverage Gaps

**No tests exist:**
- What's not tested: Everything. There are no test files anywhere in the project. No unit tests for data transformation logic in `lib/data.ts`, no integration tests for Supabase queries, no component tests, no E2E tests.
- Files: Entire `lib/` and `app/` directories
- Risk: Changes to aggregation logic in `getOverviewStats()` (e.g., the `byDay` grouping, confirmation rate calculation, or status counting) will silently produce wrong numbers. The `getParticipants` filter logic could break without detection.
- Priority: High for `lib/data.ts` logic (pure functions, easy to unit test). Medium for page-level rendering.

---

*Concerns audit: 2026-05-21*
