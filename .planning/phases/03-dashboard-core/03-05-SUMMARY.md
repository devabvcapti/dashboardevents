---
plan: 03-05
phase: 03-dashboard-core
status: complete
completed: 2026-05-26
subsystem: dashboard/receita
tags: [receita, revenue, recharts, server-component, rpc]
dependency_graph:
  requires: [03-01]
  provides: [REV-01, REV-02, REV-03]
  affects: [sidebar link /dashboard/receita]
tech_stack:
  added: []
  patterns:
    - Server Component com getActiveEditionId() + getRevenueAnalysis(editionId)
    - LabelList formatter tipado como (v: unknown) => string para evitar TS2322
    - Média ponderada de ticket médio calculada no Server Component
key_files:
  created:
    - abvcap-congress/app/dashboard/receita/page.tsx
    - abvcap-congress/app/dashboard/receita/receita-charts.tsx
  modified: []
decisions:
  - "Média ponderada de ticket médio global: sum(avg_ticket * count) / sum(count) onde avg_ticket > 0 — porque a RPC já exclui zeros via FILTER WHERE, ponderar pela count é matematicamente correto"
  - "LabelList formatter usa (v: unknown) => formatBRL(Number(v)) — padrão estabelecido nos planos 03-02/03-04 para evitar TS2322 com RenderableText"
  - "Histograma usa interval={0} no XAxis para forçar exibição de todas as 6 labels mesmo em telas menores"
  - "Faixas do histograma vêm sort_order ASC da RPC — não reordenadas no cliente"
metrics:
  duration_minutes: 15
  completed_date: 2026-05-26
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 0
requirements_satisfied: [REV-01, REV-02, REV-03]
---

# Phase 03 Plan 05: Análise de Receita Summary

Página `/dashboard/receita` completa com 3 visões analíticas: KPI cards de receita total e ticket médio global (REV-01), comparativo de receita e ticket médio por tipo de ingresso MEMBRO vs NAO_MEMBRO com 2 BarCharts + tabela numérica (REV-02), e histograma de distribuição de valores em 6 faixas pré-ordenadas pelo servidor (REV-03).

## What Was Built

**`app/dashboard/receita/page.tsx`** — Server Component:
- `requireAdmin()` + `getActiveEditionId()` + `getRevenueAnalysis(editionId)` via RPC criada em Plan 01
- CTA para `/dashboard/eventos` quando sem edição ativa (padrão da wave 2)
- REV-01: `totalRevenue` = soma de `total_revenue` por membership row; `avgTicketGlobal` = média ponderada onde `sum(avg_ticket * count) / sum(count)` apenas para rows com `avg_ticket > 0` (ignora gratuitos consistentemente com a RPC que usa `FILTER WHERE ticket_value > 0`)
- 2 StatCards: "Receita Total" (accent teal) e "Ticket Médio Geral" com subtitle explicando exclusão de gratuitos (accent green)
- Passa `analysis` completo para `<ReceitaCharts>`

**`app/dashboard/receita/receita-charts.tsx`** — Client Component (`'use client'`):
- REV-02: 2 BarCharts lado a lado — "Receita por Tipo de Ingresso" (Y-axis em R$Xk) e "Ticket Médio por Tipo de Ingresso" (Y-axis em R$X); barras com cores diferenciadas: teal (#00a99d) para MEMBRO, navy adaptativo (light/dark) para NAO_MEMBRO; LabelList no topo de cada barra com valor BRL exato
- REV-02: tabela complementar "Resumo por Tipo de Ingresso" com colunas Tipo / Inscritos / Receita / Ticket Médio
- REV-03: BarChart vertical "Distribuição de Valores de Ingresso" com 6 faixas no eixo X; `interval={0}` garante todas as labels visíveis; footer lista explicitamente todas as 6 faixas para clareza
- Estados vazios: `EmptyChart` reutilizável para quando não há dados

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Média ponderada para avgTicketGlobal | A RPC retorna avg_ticket por grupo (já excluindo zeros). Somar e dividir pela contagem gera a média global correta sem double-counting gratuitos |
| Faixas do histograma não reordenadas no cliente | A RPC retorna por sort_order ASC (Gratuito → Acima de R$3000); reordenar no cliente seria redundante e frágil |
| interval={0} no histograma | 6 labels no eixo X; sem isso o Recharts oculta labels intermediárias em viewports menores |
| LabelList formatter (v: unknown) | Padrão estabelecido — Recharts tipifica v como RenderableText (não number); cast via Number(v) evita TS2322 sem comprometer runtime |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] LabelList formatter type mismatch (TS2322)**
- **Found during:** Task 2 — verificação TypeScript
- **Issue:** `formatter={(v: number) => formatBRL(v)}` falha porque Recharts tipifica `v` como `RenderableText` (pode ser `undefined`), incompatível com `number`
- **Fix:** Alterado para `(v: unknown) => formatBRL(Number(v))` — mesmo padrão aplicado em 03-02 e 03-04
- **Files modified:** `app/dashboard/receita/receita-charts.tsx` (2 ocorrências)
- **Commit:** de94cac

## Known Stubs

Nenhum. Todos os dados vêm da RPC `get_revenue_analysis(p_edition_id)` aplicada via `getRevenueAnalysis(editionId)`. Sem valores hardcoded, sem mock data, sem placeholders.

## Threat Surface

Nenhuma superfície nova introduzida além do previsto no threat_model do plano:
- `requireAdmin()` presente no Server Component (mitiga T-03-20)
- `editionId` vem de cookie httpOnly validado (mitiga T-03-21)
- Página admin-only via proxy.ts + requireAdmin() (mitiga T-03-23)

## Commits

| Task | File | Commit |
|------|------|--------|
| Task 1 — Server Component | app/dashboard/receita/page.tsx | 2f5caa2 |
| Task 2 — Client Component | app/dashboard/receita/receita-charts.tsx | de94cac |

## Self-Check: PASSED

- FOUND: abvcap-congress/app/dashboard/receita/page.tsx
- FOUND: abvcap-congress/app/dashboard/receita/receita-charts.tsx
- FOUND commit: 2f5caa2 (page.tsx)
- FOUND commit: de94cac (receita-charts.tsx)
