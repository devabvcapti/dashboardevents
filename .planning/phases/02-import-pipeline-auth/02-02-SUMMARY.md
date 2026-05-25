---
phase: 02-import-pipeline-auth
plan: 02
subsystem: auth
status: complete
tags: [auth, supabase-ssr, middleware, login, admin-gating]
requires: [01-foundation]
provides: [auth-layer, protected-routes, login-page, auth-helpers]
affects: [all-dashboard-routes, api-import-pipeline]
tech-stack-added: ["@supabase/ssr@0.10.3", "zod@4.4.3"]
tech-stack-patterns: ["proxy.ts (Next.js 16 middleware rename)", "createServerClient with httpOnly cookies", "app_metadata.role admin gating"]
key-files-created:
  - lib/supabase-server.ts
  - lib/supabase-browser.ts
  - proxy.ts
  - lib/auth.ts
  - app/api/auth/login/route.ts
  - app/api/auth/logout/route.ts
  - app/login/page.tsx
  - app/login/login-form.tsx
  - .env.local.example
key-files-modified:
  - package.json (added @supabase/ssr, zod)
  - components/theme-toggle.tsx (pre-existing lint fix)
key-decisions:
  - "@supabase/ssr used instead of deprecated @supabase/auth-helpers-nextjs"
  - "proxy.ts instead of middleware.ts — Next.js 16 renamed the file convention"
  - "anon key for auth client, service role key kept in lib/supabase.ts for data queries"
  - "app_metadata.role === 'admin' as the admin gate — checked in both proxy and route handler (defense-in-depth)"
  - "Zod v4 for route handler input validation"
metrics:
  duration: ~30min
  completed_date: "2026-05-25"
  tasks_completed: 4
  tasks_total: 4
  files_created: 9
  files_modified: 2
requirements-satisfied: [AUTH-01, AUTH-02, AUTH-03]
---

# Phase 02 Plan 02: Supabase Auth + Admin Gating Summary

**One-liner:** Supabase Auth via @supabase/ssr with httpOnly cookies, app_metadata.role=admin gating, and /login page in PT-BR — protected via proxy.ts (Next.js 16), verified in production at dashboardevents.vercel.app.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install @supabase/ssr, create server + browser clients | 363f0af | lib/supabase-server.ts, lib/supabase-browser.ts, .env.local.example |
| 2 | Middleware + auth helpers + login/logout route handlers | 15b9553 | proxy.ts (see deviation), lib/auth.ts, app/api/auth/login/route.ts, app/api/auth/logout/route.ts |
| 3 | Login page /login with form | 100e533 | app/login/page.tsx, app/login/login-form.tsx |
| 4 | Checkpoint — auth flow verified in production | 39370a6 | — (approval commit) |

## Architecture

### Auth Flow

```
Browser → POST /api/auth/login (email+password)
  → createSupabaseServerClient() [anon key + cookies]
  → supabase.auth.signInWithPassword()
  → check app_metadata.role === 'admin'
  → 401 if wrong credentials / 403 if not admin
  → 200 { ok: true, redirect: '/dashboard' } if admin
  → browser does router.push('/dashboard')

proxy.ts intercepts every request:
  → supabase.auth.getUser() [validates JWT against Supabase, not blind cookie trust]
  → if /dashboard/* or /api/* (not /api/auth/*) and no user → redirect /login
  → if user but role !== 'admin' → signOut + redirect /login?error=forbidden
```

### Client/Server Split

- `lib/supabase-server.ts` — `createSupabaseServerClient()`: async, uses `await cookies()` from next/headers, anon key
- `lib/supabase-browser.ts` — `createSupabaseBrowserClient()`: sync, `'use client'`, anon key
- `lib/supabase.ts` — `getSupabase()`: service role key, unchanged from Phase 1, used for data queries only
- `lib/auth.ts` — `getCurrentUser()` and `requireAdmin()`: for Server Components and Route Handlers

## Human Verification Results

Verified in production at **dashboardevents.vercel.app** (2026-05-25).

| Test | Expected | Result |
|------|----------|--------|
| 1. /dashboard without auth | Redirect to /login?redirect=%2Fdashboard | PASS |
| 2. Login with invalid credentials | "Email ou senha inválidos." in red | PASS |
| 3. Login with non-admin user | "Acesso restrito a administradores." | PASS |
| 4. Login with admin credentials | Redirect to /dashboard | PASS |
| 5. Session persistence after F5 | Stays authenticated | PASS |
| 6. Logout + F5 on /dashboard | Redirect to /login | PASS |

All 6 tests passed. Admin gating confirmed working in production.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] proxy.ts replaces middleware.ts (Next.js 16 file convention)**
- **Found during:** Task 3 verification (npm run build)
- **Issue:** Next.js 16 deprecated `middleware.ts` and renamed the file convention to `proxy.ts`; the exported function must also be renamed from `middleware` to `proxy`. Build errored: "Both middleware file and proxy file detected. Please use proxy.ts only."
- **Fix:** Created `proxy.ts` with `export async function proxy(req: NextRequest)` and removed `middleware.ts`. The `config.matcher` export remains the same.
- **Files modified:** middleware.ts (deleted), proxy.ts (created)
- **Commit:** 100e533
- **Impact on plan acceptance criteria:** Plan checks for `middleware.ts` — actual file is `proxy.ts`. Functionally equivalent; proxy.ts is the Next.js 16 canonical name.

**2. [Rule 1 - Bug] Fixed pre-existing lint error in theme-toggle.tsx**
- **Found during:** Task 2 verification (npm run lint)
- **Issue:** `useEffect(() => { setMounted(true) }, [])` triggered `react-hooks/set-state-in-effect` ESLint rule. Pre-existing from Phase 1 commit 925b9d6.
- **Fix:** Added `// eslint-disable-next-line react-hooks/set-state-in-effect` with comment explaining the intentional mount detection pattern.
- **Files modified:** components/theme-toggle.tsx
- **Commit:** 15b9553

## Admin Provisioning Instructions

For future reference / AGENTS.md:

1. **Get anon key:** Supabase Dashboard → Project Settings → API → "anon public key"
2. **Add to .env.local:** `NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>`
3. **Create admin user:** Supabase Dashboard → Authentication → Users → "Add user" (email + password)
4. **Grant admin role via SQL:**
   ```sql
   UPDATE auth.users
   SET raw_app_meta_data = COALESCE(raw_app_meta_data,'{}'::jsonb) || '{"role":"admin"}'::jsonb
   WHERE email='<admin_email>';
   ```
5. **(Optional)** Create a second user WITHOUT the admin role to test the rejection path.

## Known Stubs

None — all wired to real Supabase Auth. The login form calls a real route handler; the proxy validates against the live Supabase JWT.

The `/dashboard` routes render with mock data until Phase 3 wires real data queries. That is outside the scope of this plan.

## Threat Surface Scan

No new network endpoints beyond those in the plan's threat model. All threats T-02.02-01 through T-02.02-09 addressed:
- httpOnly+sameSite=lax cookies via @supabase/ssr
- auth.getUser() validates JWT on every proxy intercept (not blind cookie trust)
- admin gating in both proxy.ts AND /api/auth/login (defense-in-depth)
- Generic error messages (no email enumeration)
- Zod validates login payload

## Self-Check

### Files exist check

| File | Status |
|------|--------|
| abvcap-congress/lib/supabase-server.ts | FOUND |
| abvcap-congress/lib/supabase-browser.ts | FOUND |
| abvcap-congress/proxy.ts | FOUND |
| abvcap-congress/lib/auth.ts | FOUND |
| abvcap-congress/app/api/auth/login/route.ts | FOUND |
| abvcap-congress/app/api/auth/logout/route.ts | FOUND |
| abvcap-congress/app/login/page.tsx | FOUND |
| abvcap-congress/app/login/login-form.tsx | FOUND |

### Commits exist check

| Commit | Message |
|--------|---------|
| 363f0af | feat(02-02): Task 1 — install @supabase/ssr, create server + browser clients |
| 15b9553 | feat(02-02): Task 2 — middleware, auth helpers, login/logout route handlers |
| 100e533 | feat(02-02): Task 3 — /login page + migrate middleware to proxy.ts (Next.js 16) |
| 39370a6 | feat(02-02): Task 4 — auth checkpoint approved, plan complete |

## Self-Check: PASSED

All files present. All commits verified. Production auth flow confirmed by user.

---

*Plan 02-02 complete: 2026-05-25*
