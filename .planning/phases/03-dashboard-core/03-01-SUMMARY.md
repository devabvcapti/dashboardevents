---
plan: 03-01
phase: 03-dashboard-core
status: complete
completed: 2026-05-26
---

## Summary

Infraestrutura multi-evento completa. Todas as 7 tasks executadas; checkpoint humano aprovado em produção (dashboardevents.vercel.app).

## What Was Built

- **4 migrations aplicadas no Supabase remoto** (007–010):
  - 007: Remove `UNIQUE(year)` em `editions` — múltiplos eventos por ano agora permitidos
  - 008: Reescreve `get_overview_stats(p_edition_id uuid)` — adiciona `unique_companies` e `states_represented`
  - 009: Cria `get_member_analysis(p_edition_id uuid)` e `get_revenue_analysis(p_edition_id uuid)`
  - 010: 4 índices de suporte para filtros da lista (`edition_id + membership`, `ticket_value`, `company`, `origin_state`)

- **`lib/data.ts`** — 11 funções, todas em `editionId: string` (zero `editionYear`/`2025`):
  - Refatoradas: `getOverviewStats`, `getCompanySegmentSummary`, `getRegistrationsByDay`, `getTicketMembershipSummary`, `getFreeTicketStats`
  - Novas: `getEditions`, `getParticipantsPaginated` (sort whitelist + filtros combináveis), `getParticipantsForExport`, `getMemberAnalysis`, `getRevenueAnalysis`

- **`lib/edition-cookie.ts`** — `getActiveEditionId()`: lê cookie `active_edition_id` httpOnly; fallback automático para edição mais recente

- **`components/edition-selector.tsx`** — dropdown `'use client'` que chama `POST /api/edition/select` + `router.refresh()`; exibe nome do evento (fix necessário: Base UI não infere `ItemText` automaticamente — nome passado explicitamente como filho de `SelectValue`)

- **`/api/edition/select`** — Zod `uuid` + verifica existência no banco antes de setar cookie (anti cookie-poisoning)

- **`/api/edition/create`** — Zod `name(1-200) + year(2000-2100)` + `requireAdmin()`

- **Sidebar** — recebe `editions[]` + `activeEditionId` como props; renderiza EditionSelector abaixo do logo; 3 novos links: Análise de Membros, Análise de Receita, Eventos

- **`app/dashboard/layout.tsx`** — Server Component que fetcha `getEditions()` + `getActiveEditionId()` via `Promise.all` e passa para Sidebar

- **`/dashboard/eventos`** — lista edições + form inline de criação (EventosClient)

- **Import flow** — `page.tsx` bloqueia upload com link para /dashboard/eventos se `editions.length === 0`; `ImportClient` recebe `editions + initialEditionId`; commit route agora aceita `editionId: z.string().uuid()` (substitui `editionYear`)

- **`exceljs`** movido de `devDependencies` → `dependencies`

## Pattern for Wave 2 Plans

Plans 03-02, 03-03, 03-04, 03-05 devem:

```typescript
// Em Server Components:
import { getActiveEditionId } from '@/lib/edition-cookie'
import { getOverviewStats, getMemberAnalysis, getRevenueAnalysis, getParticipantsPaginated } from '@/lib/data'

const editionId = await getActiveEditionId()
const stats = await getOverviewStats(editionId)
```

## Deviations

- Fix adicional pós-checkpoint: `SelectValue` do Base UI não mapeia `ItemText` para o trigger automaticamente — corrigido passando o nome via `.find()` como filho do `SelectValue` (aplicado em `edition-selector.tsx` e `import-client.tsx`)

## Key Files Created

- `abvcap-congress/supabase/migrations/007_remove_editions_year_unique.sql`
- `abvcap-congress/supabase/migrations/008_rpc_stats_by_edition_id.sql`
- `abvcap-congress/supabase/migrations/009_rpc_member_revenue_analysis.sql`
- `abvcap-congress/supabase/migrations/010_participant_filter_indexes.sql`
- `abvcap-congress/lib/edition-cookie.ts`
- `abvcap-congress/components/edition-selector.tsx`
- `abvcap-congress/app/api/edition/select/route.ts`
- `abvcap-congress/app/api/edition/create/route.ts`
- `abvcap-congress/app/dashboard/eventos/page.tsx`
- `abvcap-congress/app/dashboard/eventos/eventos-client.tsx`
