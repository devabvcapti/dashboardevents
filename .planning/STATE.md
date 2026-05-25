# Project State

## Current Status

**Phase:** Phase 2 in progress — Plan 02-02 complete
**Last action:** Phase 2 Plan 02 (Supabase Auth + Admin Gating) executed and verified in production — auth flow, admin gating, session persistence confirmed at dashboardevents.vercel.app
**Next step:** Execute Plan 02-03 — Upload + parse + mapping UI (Wave 2)
**Last session:** 2026-05-25

## Roadmap Progress

| Phase | Title | Status |
|-------|-------|--------|
| 1 | Foundation (schema, segurança, tipos, queries SQL) | ✅ Complete |
| 2 | Import Pipeline + Autenticação | 🔄 In Progress (2/4 plans done) |
| 3 | Dashboard Core (KPIs, membros, receita, lista) | ⏳ Not started |
| 4 | Analytics Depth (formulário, mapa, export) | ⏳ Not started |

## Phase 2 Progress

| Plan | Name | Status | Commit |
|------|------|--------|--------|
| 02-01 | Schema migration + batch RPCs | ✅ Complete | 8f736df |
| 02-02 | Auth middleware + login + admin gating | ✅ Complete | 39370a6 |
| 02-03 | Upload + parse + mapping UI | ⏳ Not started | — |
| 02-04 | Commit route + audit | ⏳ Not started | — |

## Key Artifacts

- `.planning/PROJECT.md` — Contexto e requirements do projeto
- `.planning/REQUIREMENTS.md` — 40 requirements v1 rastreáveis
- `.planning/ROADMAP.md` — 4 fases com planos e critérios de sucesso
- `.planning/phases/01-foundation/PLAN.md` — Plano executado da Fase 1
- `.planning/phases/02-import-pipeline-auth/02-01-SUMMARY.md` — Fase 2 Plan 01 completo
- `.planning/phases/02-import-pipeline-auth/02-02-SUMMARY.md` — Fase 2 Plan 02 completo
- `abvcap-congress/` — App Next.js com auth implementado e verificado

## Key Decisions

- **@supabase/ssr over @supabase/auth-helpers-nextjs** — Biblioteca oficial para Next.js App Router; a outra está deprecated
- **proxy.ts instead of middleware.ts** — Next.js 16 renamed the middleware file convention; build fails with middleware.ts
- **anon key for auth client, service role key for data queries** — Separation of concerns; service role stays server-only
- **app_metadata.role === 'admin' gate** — Checked in both proxy.ts AND /api/auth/login (defense-in-depth)
- **Zod v4 for route handler validation** — Input sanitization on all auth endpoints

## Phase 1 Deliverables (all verified ✓)

- Supabase project: `kcgwyzvwxmmygfdsetgd` (abvcap-congress-2025, sa-east-1)
- Tables: `editions`, `import_jobs`, `participants`, `form_responses`
- Enums: `ticket_membership` (MEMBRO/NAO_MEMBRO), `company_segment`, `import_status`
- RPC: `get_overview_stats(p_edition_year)` deployed
- Seed: Congresso ABVCAP 2025 row in `editions`
- `lib/supabase.ts` → uses `SUPABASE_SERVICE_ROLE_KEY` (no NEXT_PUBLIC_)
- `lib/database.types.ts` → generated from real schema
- `lib/data.ts` → all queries use SQL COUNT/RPC, no SELECT * + JS reduce
- `npx tsc --noEmit` → zero errors

## Phase 2 Deliverables So Far

- `proxy.ts` → protects /dashboard and /api/* (except /api/auth/*)
- `lib/supabase-server.ts` → createSupabaseServerClient() with httpOnly cookies
- `lib/supabase-browser.ts` → createSupabaseBrowserClient() for login form
- `lib/auth.ts` → requireAdmin() and getCurrentUser() for Route Handlers
- `app/api/auth/login/route.ts` → Zod-validated login with app_metadata.role check
- `app/api/auth/logout/route.ts` → session clear
- `app/login/page.tsx` + `app/login/login-form.tsx` → PT-BR login UI
- Auth verified in production at dashboardevents.vercel.app

## Requirements Satisfied

- AUTH-01: /dashboard protected — ✅ Done (02-02)
- AUTH-02: admin gating via app_metadata.role — ✅ Done (02-02)
- AUTH-03: session persists via httpOnly cookie — ✅ Done (02-02)

---
*Phase 1 completed: 2026-05-21*
*Phase 2 Plan 02 completed: 2026-05-25*
