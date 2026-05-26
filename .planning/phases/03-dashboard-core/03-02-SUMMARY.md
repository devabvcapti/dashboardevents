---
plan: 03-02
phase: 03-dashboard-core
status: complete
completed: 2026-05-26
subsystem: dashboard/overview
tags: [kpis, charts, recharts, donut, horizontal-bars, overview]
dependency_graph:
  requires: [03-01]
  provides: [OV-01, OV-02, OV-03, OV-04]
  affects: [app/dashboard/page.tsx, app/dashboard/overview-kpis.tsx, app/dashboard/overview-charts.tsx]
tech_stack:
  added: []
  patterns: [Server Component + Client Chart separation, donut-with-central-label, horizontal-bar-sorted-desc]
key_files:
  created:
    - abvcap-congress/app/dashboard/overview-kpis.tsx
  modified:
    - abvcap-congress/app/dashboard/overview-charts.tsx
    - abvcap-congress/app/dashboard/page.tsx
decisions:
  - "Formatter do Recharts Tooltip tipado com ValueType implícito (sem cast para number) para evitar erro TS2322"
  - "CTA de sem evento usa Link para /dashboard/eventos ao invés de erro 500"
  - "mock-data.ts já continha unique_companies e states_represented — nenhuma alteração necessária"
metrics:
  duration: "14 min"
  completed_date: "2026-05-26"
  tasks_completed: 3
  files_changed: 3
requirements: [OV-01, OV-02, OV-03, OV-04]
---

# Phase 03 Plan 02: Overview KPIs + Charts Summary

Dashboard de visão geral refatorado com 7 KPI cards corretos (OV-01/OV-02), donut chart Membros vs Não-Membros com label central de total (OV-03), e gráfico de barras horizontais por tipo de empresa ordenado decrescente com count + % (OV-04).

## What Was Built

### Task 1 — OverviewKpis com 7 KPI cards (OV-01 + OV-02)

Novo componente `app/dashboard/overview-kpis.tsx` (Server-agnostic, sem `'use client'`):

- **7 cards em grid 2-col mobile / 4-col desktop:**
  - Row 1: Total Inscritos, Membros (count + % do total), Não Membros (count + % do total), Receita Total
  - Row 2: Ticket Médio, Empresas Únicas, Estados Representados, placeholder invisível (equilíbrio desktop)
- Cálculo de `memberPct` e `naoMembroPct` inline (sem lógica no page.tsx)
- `formatBRL` (sem decimais) para Receita Total; `formatBRLDecimal` (2 casas) para Ticket Médio
- Recebe `stats: OverviewStats` — os campos `unique_companies` e `states_represented` já existiam em `mock-data.ts` e `database.types.ts` desde Plan 01

### Task 2 — overview-charts.tsx: donut central + barras horizontais

Arquivo reescrito completamente:

**OV-03 — Donut Membros vs Não-Membros com label central:**
- `PieChart > Pie` com `innerRadius={70}` (donut)
- Label central renderizado via wrapper `<div className="relative">` + `<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">` sobreposto ao ResponsiveContainer
- Exibe `{totalInscritos}` (nova prop obrigatória) como número grande + texto "total" menor abaixo

**OV-04 — Barras horizontais por tipo de empresa:**
- `BarChart layout="vertical"` → barras horizontais no Recharts
- `YAxis dataKey="type" type="category"` nos eixos invertidos
- `companyData` pré-ordenado `.sort((a, b) => b.count - a.count)` antes do Recharts
- `LabelList dataKey="label" position="right"` exibe `${count} (${pct}%)` à direita de cada barra
- `pct` calculado como `Math.round((count / sumCompany) * 1000) / 10` (1 casa decimal)

**Correção de tipo (Rule 1 — Bug):** Os `formatter` do Recharts `Tooltip` aceitam `ValueType` (não `number`) — removidos os casts explícitos que causavam `TS2322`.

### Task 3 — page.tsx refatorada

- `requireAdmin()` no início (T-03-08 mitigado)
- `getActiveEditionId()` em try/catch — `editionId = null` se nenhuma edição cadastrada
- Quando `!editionId`: renderiza CTA com `<p>Nenhum evento cadastrado.</p>` + `<Link href="/dashboard/eventos">` ao invés de continuar e lançar erro
- `Promise.all` com todos os 5 fetches usando `editionId` (string), não `editionYear`/`2025`
- `<OverviewKpis stats={display} />` substitui os 4 `StatCard` inline
- `<OverviewCharts ... totalInscritos={display.total} />` passa o total para o label central do donut
- `npm run build` passa sem erros

## How It Works

```
DashboardPage (Server Component)
├── getActiveEditionId()          ← cookie active_edition_id ou fallback para mais recente
│   └── null → CTA para /dashboard/eventos
├── Promise.all([getOverviewStats, getTicketMembershipSummary, getCompanySegmentSummary, ...])
│   └── catch → isMock=true, display = MOCK_STATS
├── <OverviewKpis stats={display} />    ← 7 cards, markup puro, sem 'use client'
└── <OverviewCharts
      byTicketType={...}               ← [{type:'Membros'|'Não Membros', count}]
      byCompanyType={...}              ← [{type: string, count}] (segmentos)
      registrationsByDay={...}
      freeTickets={...}
      totalInscritos={display.total}   ← label central do donut
    />
```

**Donut central (OV-03):**
```tsx
<div className="relative">
  <ResponsiveContainer height={260}>
    <PieChart>
      <Pie innerRadius={70} outerRadius={105} ...>...</Pie>
    </PieChart>
  </ResponsiveContainer>
  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
    <p className="text-3xl">{totalInscritos}</p>
    <p className="text-[9px]">total</p>
  </div>
</div>
```

**Barras horizontais ordenadas (OV-04):**
```tsx
const companyData = [...byCompanyType]
  .sort((a, b) => b.count - a.count)
  .map(r => ({ ...r, label: `${r.count} (${pct}%)` }))

<BarChart layout="vertical">
  <YAxis dataKey="type" type="category" />
  <XAxis type="number" />
  <Bar dataKey="count">
    <LabelList dataKey="label" position="right" />
  </Bar>
</BarChart>
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Formatter do Recharts Tooltip tipado incorretamente**
- **Found during:** Task 2 verification (`npx tsc --noEmit`)
- **Issue:** O plan fornecia formatter com `(v: number, name: string)` mas o Recharts tipifica o primeiro argumento como `ValueType | undefined` — TypeScript recusava a atribuição explícita de `number`
- **Fix:** Removidos os tipos explícitos dos parâmetros dos formatters, deixando TypeScript inferir `ValueType`; cast `as string` onde necessário para o `name`
- **Files modified:** `abvcap-congress/app/dashboard/overview-charts.tsx`
- **Commit:** 9aae5ce

**2. [Non-deviation] mock-data.ts já alinhado**
- O plan previa atualizar `MOCK_STATS` para adicionar `unique_companies` e `states_represented`, mas ambos os campos já existiam desde Plan 01 (Task 5 do 03-01 adicionou os campos ao shape). Nenhuma alteração necessária.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| Task 1 | cdedd70 | feat(03-02): criar componente OverviewKpis com 7 KPI cards (OV-01 + OV-02) |
| Task 2 | 9aae5ce | feat(03-02): refatorar overview-charts com donut central (OV-03) e barras horizontais (OV-04) |
| Task 3 | 6e1a8e1 | feat(03-02): refatorar dashboard/page.tsx para editionId ativo e novos componentes |

## Known Stubs

Nenhum stub identificado. Os dados reais vêm do Supabase RPC `get_overview_stats(p_edition_id)` quando há edição ativa. Fallback para `MOCK_STATS` exibe badge "dados demo" — comportamento intencional e documentado.

## Threat Flags

Nenhuma nova superfície de ataque introduzida. Todas as ameaças do threat model cobertas:
- T-03-08: `requireAdmin()` no início do Server Component — implementado
- T-03-09: `editionId` vem de cookie httpOnly validado em `/api/edition/select` — fluxo mantido
- T-03-10: RPC `get_overview_stats` com LEFT JOIN — sem amplificação com edition_id inválido

## Self-Check: PASSED

- `abvcap-congress/app/dashboard/overview-kpis.tsx` — EXISTS
- `abvcap-congress/app/dashboard/overview-charts.tsx` — EXISTS (modified)
- `abvcap-congress/app/dashboard/page.tsx` — EXISTS (modified)
- Commits cdedd70, 9aae5ce, 6e1a8e1 — PRESENT
- `npm run build` — PASSED (Compiled successfully in 9.0s, TypeScript OK)
