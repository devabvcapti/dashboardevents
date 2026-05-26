---
plan: 03-04
phase: 03-dashboard-core
status: complete
completed: 2026-05-26
subsystem: dashboard/membros
tags: [recharts, member-analysis, stacked-bars, server-component]
dependency_graph:
  requires: ["03-01"]
  provides: ["/dashboard/membros page", "MembrosCharts component"]
  affects: ["sidebar nav", "MBR-01", "MBR-02", "MBR-03"]
tech_stack:
  added: []
  patterns:
    - "Server Component calcula KPIs agregados antes de delegar charts ao Client Component"
    - "Tooltip/LabelList formatters sem anotação de tipo explícita — TypeScript infere (padrão estabelecido em 03-02)"
    - "Filtro de ruído total>=3 no ranking de adesão para evitar segmentos estatisticamente insignificantes"
key_files:
  created:
    - abvcap-congress/app/dashboard/membros/page.tsx
    - abvcap-congress/app/dashboard/membros/membros-charts.tsx
  modified: []
decisions:
  - "MBR-02 representado via stacked bars + tabela numérica — stacked bars mostram proporção visual; tabela fornece valores exatos"
  - "Filtro total>=3 no ranking de adesão — evita que segmentos com 1-2 inscritos distorçam o ranking com 0% ou 100%"
  - "KPIs (totalMembros, totalNaoMembros, adesaoGlobal) calculados no Server Component — dados já disponíveis em rows, evita re-hidratação"
metrics:
  duration_minutes: 23
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 0
---

# Phase 03 Plan 04: Análise de Membros Summary

**One-liner:** Página /dashboard/membros com stacked bars membros/não-membros por segmento, ranking de adesão % filtrado (total>=3), tabela numérica detalhada e 3 KPI cards agregados via RPC get_member_analysis.

## What Was Built

### Task 1 — Server Component `/dashboard/membros/page.tsx`

- `requireAdmin()` no topo — protege a rota contra acesso não-autorizado (mitiga T-03-17)
- `getActiveEditionId()` com try/catch → se não há edição ativa, renderiza CTA com Link para `/dashboard/eventos` (mesmo padrão da Visão Geral)
- `getMemberAnalysis(editionId)` chamado via RPC criada no Plan 01 (migration 009)
- KPIs calculados no servidor a partir dos rows brutos:
  - `totalMembros` = soma de `membro_count` em todos os segmentos
  - `totalNaoMembros` = soma de `nao_membro_count`
  - `adesaoGlobal` = `(totalMembros / totalGeral) * 100`, 1 casa decimal
- `KpiCard` component local com accent bar primary no topo
- Passa `rows` brutos para `<MembrosCharts rows={rows} />`
- `export const dynamic = 'force-dynamic'` — sem cache estático

### Task 2 — Client Component `membros-charts.tsx`

**3 visões implementadas:**

1. **Stacked bars por segmento (MBR-01/MBR-02)** — `stackId="a"` em ambas as barras `Membro` e `Não Membro`; layout vertical (barras horizontais); LabelList mostra total à direita; legenda inline com swatches coloridos

2. **Ranking de adesão % (MBR-03)** — filtro `r.total >= 3` remove ruído estatístico; ordenado decrescente por `membership_pct`; LabelList mostra `${pct}%` à direita; cores teal uniformes indicando percentual de adesão

3. **Tabela detalhada** — 5 colunas: Segmento | Membros | Não-Membros | Total | Adesão; valores numéricos exatos com formatação `toLocaleString('pt-BR')` e `tabular-nums` para alinhamento

**`SEGMENT_LABELS`** — mapeia 8 chaves de enum (`GP`, `LP`, `FUNDO`, `CORPORATIVO`, `GOVERNO`, `ACADEMIA`, `OUTRO`, `SEM_SEGMENTO`) para texto PT-BR legível.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Tooltip/LabelList formatter type annotations incompatíveis com Recharts**
- **Found during:** Task 2 — primeiro `npm run build`
- **Issue:** `formatter={(v: number) => ...}` e `formatter={(_v: number, _name: string, ctx: {...}) => ...}` causam `TS2322` — Recharts espera `ValueType | undefined` nos parâmetros, tipo explícito `number` é incompatível
- **Fix:** Removidos os type annotations explícitos dos formatters; TypeScript infere corretamente. Cast `as string` mantido em `name` onde necessário para satisfazer o retorno `[string, string]`
- **Files modified:** `app/dashboard/membros/membros-charts.tsx`
- **Commit:** `9d295d7` (incluído no commit da task)
- **Padrão:** Mesmo comportamento já documentado na decisão de 03-02: "Recharts Tooltip formatter usa ValueType implícito"

## Known Stubs

Nenhum. Todos os dados vêm de `getMemberAnalysis(editionId)` via RPC real no banco.

## Threat Flags

Nenhuma nova superfície além do documentado no plan:

| Flag | File | Description |
|------|------|-------------|
| — | — | T-03-17 mitigado: `requireAdmin()` presente no Server Component |
| — | — | T-03-18 mitigado: `editionId` vem de cookie httpOnly validado; RPC filtra por `p_edition_id` |

## Self-Check: PASSED

- [x] `abvcap-congress/app/dashboard/membros/page.tsx` existe
- [x] `abvcap-congress/app/dashboard/membros/membros-charts.tsx` existe
- [x] Commit `44cdd0f` (Task 1 — page.tsx)
- [x] Commit `9d295d7` (Task 2 — membros-charts.tsx)
- [x] `npm run build` — zero erros TypeScript, `/dashboard/membros` listado como rota dinâmica
- [x] MBR-01, MBR-02, MBR-03 satisfeitos pelos critérios do plano
