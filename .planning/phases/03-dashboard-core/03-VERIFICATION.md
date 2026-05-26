---
phase: 03-dashboard-core
verified: 2026-05-26T00:00:00Z
status: human_needed
score: 16/16
overrides_applied: 0
human_verification:
  - test: "Seletor de edição troca dados no dashboard"
    expected: "Ao trocar para outra edição no EditionSelector do sidebar, o router.refresh() re-fetcha os Server Components e os KPIs/charts exibem os dados da nova edição"
    why_human: "Requer duas edições cadastradas com dados distintos; comportamento de router.refresh() não é verificável estáticamente"
  - test: "Paginação server-side dispara nova request"
    expected: "Navegar para página 2 em /dashboard/inscricoes causa uma nova requisição HTTP ao servidor (visível no Network tab do DevTools), não filtragem em memória"
    why_human: "Requer ambiente rodando; comportamento de server-side rendering não verificável estaticamente"
  - test: "Export .xlsx abre corretamente no Excel Windows"
    expected: "Arquivo baixado por 'Exportar (.xlsx)' abre no Excel com acentos pt-BR corretos (ex: 'Não Membro', 'Gestora de PE/VC') e coluna Valor formatada como moeda"
    why_human: "Requer download real do arquivo e abertura no Excel Windows para confirmar encoding e formatação"
  - test: "Gráfico de barras horizontais (OV-04) ordenado desc"
    expected: "Perfil por Tipo de Empresa em /dashboard exibe barras horizontais com tipos ordenados de maior para menor count, com labels 'count (pct%)' à direita"
    why_human: "Requer visualização da página renderizada; ordenação client-side depende de dados reais do banco"
  - test: "Histograma de receita exibe 6 faixas"
    expected: "Gráfico 'Distribuição de Valores de Ingresso' em /dashboard/receita exibe até 6 barras (Gratuito, R$1-500, R$501-1000, R$1001-2000, R$2001-3000, Acima de R$3000) com contagens reais"
    why_human: "Requer dados no banco; faixas só aparecem se houver participantes nessas faixas"
---

# Phase 3: Dashboard Core — Verification Report

**Phase Goal:** Dashboard core completo — seletor multi-evento, KPIs e gráficos corretos, lista paginada server-side, análise de membros, análise de receita.
**Verified:** 2026-05-26T00:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Constraint UNIQUE em editions.year removida | VERIFIED | `007_remove_editions_year_unique.sql` contém `DROP CONSTRAINT IF EXISTS editions_year_key` |
| 2 | RPC get_overview_stats aceita p_edition_id uuid e retorna unique_companies + states_represented | VERIFIED | `008_rpc_stats_by_edition_id.sql` define `get_overview_stats(p_edition_id uuid)` com campos `unique_companies` e `states_represented` |
| 3 | RPCs get_member_analysis e get_revenue_analysis deployadas | VERIFIED | `009_rpc_member_revenue_analysis.sql` contém ambas as RPCs com assinatura correta |
| 4 | Admin sem cookie vinculado à edição com maior year | VERIFIED | `edition-cookie.ts` chama `getEditions()` (ordenado DESC) e retorna `editions[0].id`; valida cookie contra banco antes de usar |
| 5 | Trocar edição persiste em cookie httpOnly e re-fetcha via router.refresh() | VERIFIED | `edition-selector.tsx` faz POST `/api/edition/select` + `router.refresh()`; route handler seta cookie httpOnly |
| 6 | /dashboard/eventos lista edições e permite criar nova | VERIFIED | `eventos/page.tsx` + `eventos-client.tsx` existem; `EventosClient` chama `/api/edition/create` com form de nome + ano |
| 7 | /dashboard/import bloqueia upload sem edições e linka para /dashboard/eventos | VERIFIED | `import/page.tsx` contém bloco `editions.length === 0` com Link para `/dashboard/eventos` |
| 8 | /api/import/commit aceita editionId uuid diretamente | VERIFIED | `commit/route.ts` tem `editionId: z.string().uuid()` no BodySchema e usa `.eq('id', body.editionId)` |
| 9 | lib/data.ts não tem editionYear hardcoded — todas as funções aceitam editionId | VERIFIED | Grep de `editionYear` em `lib/data.ts` retorna zero matches; todas as 11 funções usam `editionId: string` |
| 10 | /dashboard exibe 7 KPI cards com dados da edição ativa | VERIFIED | `overview-kpis.tsx` renderiza Total Inscritos, Membros, Não Membros, Receita Total, Ticket Médio, Empresas Únicas, Estados Representados |
| 11 | Donut chart Membros vs Não-Membros com label central de total | VERIFIED | `overview-charts.tsx` tem `innerRadius={70}` e `div absolute inset-0` com `{totalInscritos}` |
| 12 | Gráfico de barras horizontais por tipo de empresa sorted desc | VERIFIED | `overview-charts.tsx` usa `layout="vertical"` com `.sort((a, b) => b.count - a.count)` e LabelList |
| 13 | Lista paginada server-side com filtros combinados e export .xlsx | VERIFIED | `inscricoes/page.tsx` lê searchParams, chama `getParticipantsPaginated`; client usa `router.push` com debounce 400ms; export via ExcelJS |
| 14 | /dashboard/membros com análise breakdown + adesão % por segmento | VERIFIED | `membros/page.tsx` chama `getMemberAnalysis(editionId)`; `membros-charts.tsx` com stacked bars + ranking + tabela |
| 15 | /dashboard/receita com KPIs receita + comparativo por membership + histograma | VERIFIED | `receita/page.tsx` chama `getRevenueAnalysis(editionId)`; `receita-charts.tsx` com REV-01 StatCards + REV-02 bars + REV-03 histograma |
| 16 | Sem evento ativo, todas as páginas mostram CTA para /dashboard/eventos | VERIFIED | page.tsx de dashboard, inscricoes, membros e receita têm bloco `!editionId` com Link `/dashboard/eventos` |

**Score:** 16/16 truths verified (programmatically)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/007_remove_editions_year_unique.sql` | Remove UNIQUE constraint editions.year | VERIFIED | `DROP CONSTRAINT IF EXISTS editions_year_key` presente |
| `supabase/migrations/008_rpc_stats_by_edition_id.sql` | RPC get_overview_stats(p_edition_id uuid) | VERIFIED | RPC criada com unique_companies + states_represented |
| `supabase/migrations/009_rpc_member_revenue_analysis.sql` | RPCs get_member_analysis + get_revenue_analysis | VERIFIED | Ambas presentes com assinatura correta |
| `supabase/migrations/010_participant_filter_indexes.sql` | Índices de suporte para filtros | VERIFIED | idx_participants_edition_membership + 3 outros |
| `lib/edition-cookie.ts` | getActiveEditionId() com fallback | VERIFIED | Lê cookie, valida contra banco, fallback para editions[0].id |
| `lib/data.ts` | 11 funções editionId-only | VERIFIED | getEditions, getParticipantsPaginated, getParticipantsForExport, getMemberAnalysis, getRevenueAnalysis + 6 existentes refatoradas |
| `components/edition-selector.tsx` | Dropdown com router.refresh() | VERIFIED | 'use client', fetch POST /api/edition/select, router.refresh() |
| `components/sidebar.tsx` | Renderiza EditionSelector + novos links | VERIFIED | Import + `<EditionSelector editions={editions} activeEditionId={activeEditionId} />`; links /dashboard/membros, /dashboard/receita, /dashboard/eventos |
| `app/dashboard/layout.tsx` | Server Component fetcha editions + activeEditionId | VERIFIED | await getEditions() + getActiveEditionId(), sem 'use client' |
| `app/api/edition/select/route.ts` | POST com Zod uuid + cookie httpOnly | VERIFIED | z.string().uuid(), maybeSingle() check, cookieStore.set httpOnly |
| `app/dashboard/eventos/page.tsx` | Página gestão de edições | VERIFIED | requireAdmin() + getEditions() + EventosClient |
| `app/api/edition/create/route.ts` | POST criar edição (name + year) | VERIFIED | insert em editions, Zod validation |
| `app/api/import/commit/route.ts` | editionId uuid no body | VERIFIED | editionId: z.string().uuid(), .eq('id', body.editionId), sem editionYear |
| `app/dashboard/page.tsx` | Server Component com getActiveEditionId | VERIFIED | getOverviewStats(editionId), OverviewKpis + OverviewCharts |
| `app/dashboard/overview-kpis.tsx` | 7 KPI cards (OV-01 + OV-02) | VERIFIED | Todos os 7 cards: Total Inscritos, Membros, Não Membros, Receita Total, Ticket Médio, Empresas Únicas, Estados Representados |
| `app/dashboard/overview-charts.tsx` | Donut central + barras horizontais | VERIFIED | innerRadius={70}, layout="vertical", sort desc, LabelList |
| `app/dashboard/inscricoes/page.tsx` | Server Component com searchParams | VERIFIED | searchParams: Promise<SearchParams>, getParticipantsPaginated, whitelists |
| `app/dashboard/inscricoes/inscricoes-client.tsx` | Controles via router.push + debounce | VERIFIED | router.push, debounce 400ms, /api/export/participants link |
| `app/api/export/participants/route.ts` | GET handler ExcelJS .xlsx | VERIFIED | ExcelJS, requireAdmin, getParticipantsForExport, Content-Disposition |
| `app/dashboard/membros/page.tsx` | Server Component getMemberAnalysis | VERIFIED | getMemberAnalysis(editionId), MembrosCharts, KPIs agregados |
| `app/dashboard/membros/membros-charts.tsx` | Stacked bars + ranking + tabela | VERIFIED | stackId="a", b.membership_pct sort, MemberAnalysisRow |
| `app/dashboard/receita/page.tsx` | Server Component getRevenueAnalysis | VERIFIED | getRevenueAnalysis(editionId), StatCards REV-01, ReceitaCharts |
| `app/dashboard/receita/receita-charts.tsx` | Cards REV-02 + histograma REV-03 | VERIFIED | dataKey="total_revenue" + dataKey="avg_ticket", histograma 6 faixas, interval={0} |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `sidebar.tsx` | `edition-selector.tsx` | import + render | VERIFIED | `import { EditionSelector }` + `<EditionSelector editions={editions} activeEditionId={activeEditionId} />` |
| `edition-selector.tsx` | `/api/edition/select` | fetch POST | VERIFIED | `fetch('/api/edition/select', { method: 'POST' })` + `router.refresh()` |
| `dashboard/layout.tsx` | `lib/data.ts` + `lib/edition-cookie.ts` | await calls | VERIFIED | `await getEditions()` + `await getActiveEditionId()` |
| `app/api/import/commit/route.ts` | editions table | `.eq('id', body.editionId)` | VERIFIED | `.eq('id', body.editionId).single()`, sem lookup por year |
| `dashboard/page.tsx` | `lib/data.ts` (getOverviewStats) | Promise.all com editionId | VERIFIED | `getOverviewStats(editionId)` + `getCompanySegmentSummary(editionId)` etc. |
| `inscricoes/page.tsx` | `lib/data.ts` (getParticipantsPaginated) | await com searchParams | VERIFIED | `await getParticipantsPaginated(filters)` com editionId |
| `inscricoes-client.tsx` | `/api/export/participants` | buildExportUrl() | VERIFIED | `/api/export/participants?${next.toString()}` |
| `export/participants/route.ts` | `lib/data.ts` (getParticipantsForExport) | await | VERIFIED | `await getParticipantsForExport({...})` |
| `membros/page.tsx` | `lib/data.ts` (getMemberAnalysis) | await com editionId | VERIFIED | `await getMemberAnalysis(editionId)` |
| `receita/page.tsx` | `lib/data.ts` (getRevenueAnalysis) | await com editionId | VERIFIED | `await getRevenueAnalysis(editionId)` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `overview-kpis.tsx` | `stats` | `getOverviewStats` → RPC `get_overview_stats` no banco | RPC faz COUNT/SUM/AVG reais na tabela participants | FLOWING |
| `overview-charts.tsx` | `byTicketType`, `byCompanyType` | `getTicketMembershipSummary` + `getCompanySegmentSummary` → queries Supabase | Queries reais com `.eq('edition_id', editionId)` | FLOWING |
| `inscricoes/page.tsx` | `data`, `count` | `getParticipantsPaginated` → query com count:exact | Query real com filtros + paginação server-side | FLOWING |
| `membros-charts.tsx` | `rows` | `getMemberAnalysis` → RPC `get_member_analysis` | RPC faz GROUP BY com JOIN form_responses | FLOWING |
| `receita-charts.tsx` | `analysis` | `getRevenueAnalysis` → RPC `get_revenue_analysis` | RPC produz by_membership + histogram com dados reais | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED — verificação de comportamento visual e paginação requer servidor em execução. Itens críticos movidos para Human Verification.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| OV-01 | Plans 01, 02 | KPI cards: total, membros %, não-membros %, receita, ticket médio | SATISFIED | overview-kpis.tsx renderiza todos os 5 cards de OV-01 |
| OV-02 | Plans 01, 02 | KPI cards: empresas únicas, estados representados | SATISFIED | RPC retorna unique_companies + states_represented; overview-kpis.tsx os exibe |
| OV-03 | Plan 02 | Donut chart Membros vs Não-Membros com label central | SATISFIED | overview-charts.tsx: innerRadius=70, div absolute inset-0 com totalInscritos |
| OV-04 | Plan 02 | Barras horizontais por tipo de empresa sorted desc | SATISFIED | overview-charts.tsx: layout="vertical", .sort((a,b)=>b.count-a.count), LabelList |
| LIST-01 | Plan 03 | Paginação server-side 25/50/100, total visível | SATISFIED | inscricoes/page.tsx: ALLOWED_PAGE_SIZES, count exibido no header |
| LIST-02 | Plan 03 | Busca debounced (nome/email/empresa) | SATISFIED | inscricoes-client.tsx: setTimeout 400ms + router.push |
| LIST-03 | Plan 03 | Filtros: membership, segment, estado, faixa de valor | SATISFIED | whitelist parsers no server + controles no client |
| LIST-04 | Plan 03 | Ordenação por coluna whitelisted | SATISFIED | ALLOWED_SORT_COLUMNS whitelist; toggleSort no client |
| LIST-05 | Plan 03 | Export .xlsx com filtros | SATISFIED | /api/export/participants + ExcelJS; buildExportUrl() remove page/page_size mas mantém filtros |
| MBR-01 | Plan 04 | Breakdown membros vs não-membros por tipo de empresa | SATISFIED | membros-charts.tsx: stacked bars com Membro + Não Membro por segmento |
| MBR-02 | Plan 04 | Breakdown por segmento dentro de cada grupo | SATISFIED | membros-charts.tsx: stackId="a" + tabela detalhada |
| MBR-03 | Plan 04 | Percentual de adesão por tipo de empresa | SATISFIED | membros-charts.tsx: ranking sorted by membership_pct DESC, filtro total >= 3 |
| REV-01 | Plan 05 | Receita total e ticket médio geral | SATISFIED | receita/page.tsx: StatCard Receita Total + Ticket Médio Geral (média ponderada) |
| REV-02 | Plan 05 | Receita e ticket médio por MEMBRO vs NAO_MEMBRO | SATISFIED | receita-charts.tsx: 2 BarCharts (total_revenue + avg_ticket) + tabela |
| REV-03 | Plan 05 | Histograma distribuição de valores (6 faixas) | SATISFIED | receita-charts.tsx: BarChart com dataKey="count" + 6 faixas na RPC + interval={0} |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/dashboard/overview-kpis.tsx` | 64 | `<div className="hidden lg:block" />` | Info | Placeholder visual para equilíbrio de grid — não afeta dados |
| `app/dashboard/page.tsx` | 77 | `const display = stats ?? EMPTY_STATS` | Info | Fallback gracioso para erro de DB; não é dado hardcoded — EMPTY_STATS é zeros, não mock |

**Nota:** O arquivo `page.tsx` foi implementado com `EMPTY_STATS` (zeros) ao invés de `MOCK_STATS` como no plan original. Esta é uma mudança positiva: zeros são mais honestos que dados demo. Não é stub.

### Human Verification Required

#### 1. Seletor de edição troca dados no dashboard

**Test:** Com duas edições cadastradas (ex: 2025 e 2026, com dados apenas em 2025), trocar para 2026 no EditionSelector do sidebar e observar os KPIs.
**Expected:** KPIs vão para zero (sem dados em 2026); trocar de volta para 2025 restaura os valores.
**Why human:** Requer duas edições cadastradas com dados distintos e observação visual do re-fetch via router.refresh().

#### 2. Paginação server-side dispara nova request HTTP

**Test:** Acessar `/dashboard/inscricoes` com dados, navegar para página 2, observar o Network tab no DevTools.
**Expected:** Uma requisição GET para `/dashboard/inscricoes?page=2` é disparada; não há processamento in-memory visível.
**Why human:** Comportamento de Server Component (nova request HTTP) requer ambiente dev/prod rodando.

#### 3. Export .xlsx abre corretamente no Excel Windows

**Test:** Aplicar filtro `membership=MEMBRO`, clicar "Exportar (.xlsx)", abrir o arquivo baixado no Excel Windows.
**Expected:** Acentos corretos (Não Membro, Gestora de PE/VC), coluna Valor formatada como moeda BRL, apenas membros no arquivo.
**Why human:** Requer execução real e abertura no Excel Windows para confirmar encoding UTF-8 nativo do OOXML.

#### 4. Gráfico de barras horizontais (OV-04) ordenado desc com labels

**Test:** Acessar `/dashboard` com dados e verificar o gráfico "Perfil por Tipo de Empresa".
**Expected:** Barras horizontais, tipo com maior count no topo, labels "N (X%)" à direita de cada barra.
**Why human:** Ordenação e labels dependem de dados reais do banco e renderização visual.

#### 5. Histograma de receita exibe faixas corretas

**Test:** Acessar `/dashboard/receita` com dados de participantes com valores variados.
**Expected:** Até 6 barras visíveis (Gratuito, R$1–500, R$501–1000, R$1001–2000, R$2001–3000, Acima de R$3000), com counts corretos em cada faixa.
**Why human:** Faixas só aparecem se houver dados nessas faixas; requer banco com dados reais.

### Gaps Summary

Nenhum gap técnico identificado. Todos os 16 must-haves foram verificados como VERIFIED no código. As 5 pendências são de verificação humana (comportamento visual, I/O de arquivo, rede), não de implementação ausente.

---

_Verified: 2026-05-26T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
