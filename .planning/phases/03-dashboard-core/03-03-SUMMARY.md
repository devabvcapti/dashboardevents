---
plan: 03-03
phase: 03-dashboard-core
status: complete
completed: 2026-05-26
subsystem: inscricoes-list
tags: [server-side-pagination, url-params, export, exceljs, debounce]
dependency_graph:
  requires: ["03-01"]
  provides: ["LIST-01", "LIST-02", "LIST-03", "LIST-04", "LIST-05"]
  affects: ["abvcap-congress/app/dashboard/inscricoes", "abvcap-congress/app/api/export/participants"]
tech_stack:
  added: []
  patterns:
    - "Server Component lê searchParams async (Next.js 16 — Promise<SearchParams>)"
    - "Client Component minimalista: 1 useState para search local, router.push para tudo"
    - "Debounce 400ms via useRef<ReturnType<typeof setTimeout>>"
    - "ExcelJS writeBuffer → NextResponse com Content-Disposition"
    - "Zod z.enum whitelist para membership/segment, z.string().regex UF para state"
key_files:
  created:
    - abvcap-congress/app/api/export/participants/route.ts
  modified:
    - abvcap-congress/app/dashboard/inscricoes/page.tsx
    - abvcap-congress/app/dashboard/inscricoes/inscricoes-client.tsx
decisions:
  - "searchParams como Promise<SearchParams> (Next.js 16 async searchParams pitfall)"
  - "1 useState apenas para searchLocal — todos os outros controles leem de props"
  - "buildExportUrl() remove page e page_size mas mantém todos os filtros ativos"
  - "ALLOWED_MEMBERSHIPS/ALLOWED_SEGMENTS arrays removidos do route handler — Zod z.enum cobre a whitelist sem duplicação"
  - "runtime nodejs obrigatório para ExcelJS (não funciona em Edge)"
metrics:
  duration_seconds: 334
  tasks_completed: 3
  files_changed: 3
  commits: 2
---

# Phase 03 Plan 03: Lista de Inscrições Paginada — SUMMARY

**One-liner:** Paginação server-side com URL params canônicos, filtros combináveis debounced, sort por 5 colunas e export .xlsx ExcelJS com 11 colunas respeitando filtros ativos.

## What Was Built

### Task 1 + 2 — Server Component + Client Component (commit `8467961`)

`app/dashboard/inscricoes/page.tsx` reescrito como Server Component puro:
- `searchParams: Promise<SearchParams>` + `await searchParams` — padrão Next.js 16 obrigatório
- Whitelists para todos os parâmetros sensíveis: `ALLOWED_PAGE_SIZES = [25, 50, 100]`, `ALLOWED_SORT_COLUMNS`, `parseMembership`, `parseSegment`, `parseDir`
- Regex `/^[A-Z]{2}$/` valida UF antes de passar para a query
- CTA com Link para `/dashboard/eventos` quando `getActiveEditionId()` lança (nenhuma edição)
- Passa `participants`, `totalCount`, `currentPage`, `pageSize`, `filters` como props para `InscricoesClient`

`app/dashboard/inscricoes/inscricoes-client.tsx` reescrito como Client Component minimalista:
- `'use client'` — único useState é `searchLocal` para feedback imediato do input antes do debounce
- `pushParams(updates, resetPage=true)` — helper que constrói novo URLSearchParams e chama `router.push`; reseta `page` em qualquer mudança de filtro
- `onSearchChange` — debounce 400ms via `useRef<ReturnType<typeof setTimeout>>`
- `toggleSort(col)` — alterna asc/desc na mesma coluna; `resetPage=false` (usuário não perde o lugar)
- `goToPage(n)` — navegação prev/next, não reseta filtros
- `buildExportUrl()` — reutiliza URLSearchParams atual removendo `page` e `page_size` (export = todos os filtros, sem paginação)
- Seletor de `page_size`: 25/50/100 via Select
- Filtros: membership, segment (7 opções SEGMENT_LABELS), state (UF 2 chars), min/max value

### Task 3 — Route Handler /api/export/participants (commit `29ef8be`)

`app/api/export/participants/route.ts` criado:
- `runtime = 'nodejs'` — obrigatório para ExcelJS
- `requireAdmin()` como primeira ação (EoP mitigation T-03-15)
- `getActiveEditionId()` via cookie httpOnly — editionId nunca vem da query string (T-03-13)
- Zod `QuerySchema`: `z.enum` para membership/segment, `z.string().regex(/^[A-Z]{2}$/)` para state, `z.coerce.number()` para min/max (T-03-11)
- `getParticipantsForExport` com hard cap 10k rows (T-03-14)
- ExcelJS Workbook: 11 colunas (`full_name`, `email`, `company`, `job_title`, `ticket_membership`, `ticket_value`, `company_segment`, `origin_state`, `cpf`, `phone`, `created_at`)
- Header bold, `numFmt = '#,##0.00'` na coluna Valor — formatação monetária nativa OOXML
- Filename sanitizado: regex remove chars fora `[a-zA-Z0-9_-]`, slice 60 chars, `attachment; filename="participantes-{nome}-{ano}.xlsx"`
- `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

## URL Params Canônicos Suportados

| Param | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `page` | number | 1 | Página atual |
| `page_size` | 25 \| 50 \| 100 | 50 | Registros por página |
| `search` | string | — | Busca em nome/email/empresa (debounce 400ms) |
| `membership` | `MEMBRO` \| `NAO_MEMBRO` | — | Filtro tipo ingresso |
| `segment` | CompanySegment enum | — | Filtro tipo empresa |
| `state` | UF (2 chars) | — | Filtro estado (via form_responses) |
| `min_value` | number | — | Valor mínimo do ingresso |
| `max_value` | number | — | Valor máximo do ingresso |
| `sort` | coluna whitelisted | `created_at` | Coluna de ordenação |
| `dir` | `asc` \| `desc` | `desc` | Direção da ordenação |

## Colunas Exportadas (.xlsx)

1. Nome
2. Email
3. Empresa
4. Cargo
5. Tipo de Ingresso (Membro / Não Membro — label PT-BR)
6. Valor (R$) — numFmt `#,##0.00`
7. Segmento da Empresa (label expandido via SEGMENT_LABELS)
8. Estado (origin_state via form_responses LEFT JOIN)
9. CPF
10. Telefone
11. Data de Inscrição (toLocaleString pt-BR)

## Debounce + router.push

`onSearchChange` atualiza `searchLocal` imediatamente (feedback visual), depois agenda `pushParams` com delay de 400ms. Se o usuário digitar novamente antes do timeout, o timeout anterior é cancelado via `clearTimeout(debounceRef.current)`. Quando o timeout dispara, `pushParams({ search: value })` constrói novo URLSearchParams, chama `router.push`, o Server Component re-executa no servidor com o novo `search` param e retorna resultados frescos — sem state de dados no cliente.

## Limites Conhecidos

- **10k rows cap no export** — `getParticipantsForExport` tem `.limit(10000)` hard cap (T-03-14 DoS mitigation). Eventos com mais de 10k participantes precisarão de export paginado ou streaming em fase futura.
- **Filtro de state no export em memória** — `getParticipantsForExport` faz LEFT JOIN e filtra `origin_state` em memória após o fetch (aceitável até 10k rows). Para paginação com filtro de state, `getParticipantsPaginated` usa INNER JOIN.

## Deviations from Plan

### Auto-fix aplicado

**[Rule 1 - Cleanup] Remoção de arrays redundantes no route handler**
- **Found during:** Task 3
- **Issue:** `ALLOWED_MEMBERSHIPS` e `ALLOWED_SEGMENTS` foram definidos como arrays no route handler mas duplicavam exatamente o que `z.enum([...])` no Zod já cobre — TypeScript geraria warning de variáveis não usadas
- **Fix:** Removidos os arrays; Zod `z.enum` é a única fonte de whitelist no route handler
- **Files modified:** `app/api/export/participants/route.ts`
- **Commit:** `29ef8be`

## Self-Check: PASSED
