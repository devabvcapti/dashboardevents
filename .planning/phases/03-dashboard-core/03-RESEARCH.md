# Phase 3: Dashboard Core - Research

**Pesquisado:** 2026-05-26
**Domínio:** Next.js 16 App Router — data layer, server-side pagination, cookies, Recharts, ExcelJS export
**Confiança:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Seletor de Evento Global**
- D-01: Persistência via cookie httpOnly — seletor no sidebar salva o `edition_id` em cookie; todas as páginas leem server-side via `cookies()` do next/headers. URLs limpas.
- D-02: Sem evento selecionado → auto-seleciona a edição com maior ano. Zero atrito.
- D-03: Posição no sidebar: abaixo do logo, acima do menu de navegação.

**Gestão de Edições**
- D-04: Página dedicada `/dashboard/eventos` com item no sidebar.
- D-05: Campos ao criar evento: nome + ano. Simples.
- D-06: Remover constraint `UNIQUE` em `editions.year` via migration.

**Import + Evento**
- D-07: Topo da página de import mostra o evento ativo com select que permite trocar antes do commit.
- D-08: Se nenhum evento cadastrado → bloqueia upload com mensagem + link para `/dashboard/eventos`.
- D-09: O `edition_id` (uuid) é passado diretamente no body do commit. Remover lookups por `editionYear`.

**Data Layer**
- D-10: Todas as funções em `lib/data.ts` trocam `editionYear: number` por `editionId: string` (uuid).
- D-11: RPC `get_overview_stats` atualizada para aceitar `p_edition_id uuid` — nova migration.
- D-12: Nova função `getEditions()` em `lib/data.ts` retorna todas as edições ordenadas por ano desc.
- D-13: Nova helper `lib/edition-cookie.ts` com `getActiveEditionId(editionId?: string)`.

**Lista de Participantes**
- D-14: Paginação via URL params server-side — `/dashboard/inscricoes?page=2&search=joao&membership=MEMBRO`.
- D-15: Tamanhos de página: 25 / 50 / 100 (default 50).

**Export**
- D-16: Export em Excel (.xlsx) usando ExcelJS (já instalado). UTF-8, abre direto no Windows. Um formato apenas.
- D-17: Export respeita os filtros ativos da visão atual.

### Claude's Discretion
- Implementação do Route Handler para setar o cookie de edição (POST `/api/edition/select`)
- Implementação visual do dropdown de edições no sidebar (componente `EditionSelector`)
- RPCs adicionais para análise de membros e receita — Claude decide a estrutura das queries
- Layout das páginas de análise de membros e receita — Claude decide baseado no padrão existente

### Deferred Ideas (OUT OF SCOPE)
- Comparação histórica entre edições (HIST-02)
- Editar/deletar edições
- Export com filtros geográficos e de formulário (Phase 4)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Descrição | Suporte da Pesquisa |
|----|-----------|---------------------|
| OV-01 | KPI cards: total inscritos, membros (count + %), não-membros (count + %), receita total, ticket médio | RPC `get_overview_stats` já retorna esses campos; precisa adicionar `unique_companies` e `states_represented` |
| OV-02 | KPI cards adicionais: empresas únicas, estados representados | Requer JOIN com `form_responses.origin_state` e COUNT DISTINCT em `participants.company` |
| OV-03 | Donut chart Membros vs Não-Membros com label central mostrando total | Recharts PieChart com innerRadius — padrão já existe em `publico-charts.tsx` |
| OV-04 | Gráfico de barras horizontais por tipo de empresa (sorted desc, count + %) | Recharts BarChart layout="vertical" — padrão já existe em `publico-charts.tsx` |
| LIST-01 | Tabela paginada server-side (25/50/100) com total de resultados visível | Supabase `.range()` + `{ count: 'exact' }` + URL params via `searchParams` |
| LIST-02 | Busca debounced por nome, email ou empresa | `useSearchParams` + `useRouter` no Client Component; debounce via `setTimeout` ou `use-debounce` |
| LIST-03 | Filtros: tipo de ingresso, tipo de empresa, estado, faixa de valor | URL params; query Supabase com `.eq()` / `.gte()` / `.lte()` / `.or()` |
| LIST-04 | Ordenação por coluna | URL params `sort` + `dir`; Supabase `.order()` |
| LIST-05 | Export da visão filtrada para Excel (.xlsx) | Route Handler GET `/api/export/participants` com ExcelJS; aceita os mesmos params de filtro |
| MBR-01 | Breakdown membros vs não-membros por tipo de empresa | Nova RPC ou query SQL com GROUP BY `company_segment_normalized`, `ticket_membership` |
| MBR-02 | Breakdown por segmento dentro de cada grupo | Mesma query — resultado agrupado por (segment, membership) |
| MBR-03 | Percentual de adesão por tipo de empresa | Calculado a partir dos dados de MBR-01: `membro_count / total_count` por segmento |
| REV-01 | Receita total e ticket médio geral | Já em `get_overview_stats`; reutilizar ou ampliar |
| REV-02 | Receita e ticket médio por tipo de ingresso (MEMBRO/NAO_MEMBRO) | Nova RPC ou query com GROUP BY `ticket_membership` + SUM/AVG de `ticket_value` |
| REV-03 | Histograma de distribuição de valores de ingresso | Query com COUNT por faixa de valor; Recharts BarChart |
</phase_requirements>

---

## Summary

A Phase 3 constrói em cima de um stack completamente verificado e funcional. O app usa Next.js 16.2.6 com App Router, React 19, Supabase (via `@supabase/ssr`), Recharts 3, shadcn/ui (com Base UI), e ExcelJS 4 — todos já instalados. Os padrões de componentes (Server Component fetcha → passa props para Client Component), o padrão de charts (Recharts com `CHART_COLORS` e `TOOLTIP_STYLE` globais), e o padrão de páginas (`force-dynamic`, try/catch silencioso com fallback) estão bem estabelecidos e devem ser rigorosamente seguidos.

O bloqueio mais importante desta fase é a infra de multi-evento, que deve vir primeiro em tudo: a migration que remove `UNIQUE` em `editions.year`, a migration que muda `get_overview_stats` para aceitar `p_edition_id`, `lib/edition-cookie.ts`, `getEditions()`, e o `EditionSelector` no sidebar. Todas as páginas e o commit route dependem do `edition_id` — sem essa base, nada mais funciona corretamente.

A paginação server-side via URL params é a mudança de paradigma mais complexa desta fase. O padrão atual em `inscricoes-client.tsx` usa `useState` + `useMemo` (client-state) com dados carregados uma vez. A nova arquitetura usa `searchParams` no Server Component para construir a query Supabase com `.range()` + `{ count: 'exact' }`, e um Client Component fino para controles de busca/filtro que manipulam a URL (sem setState para dados).

**Recomendação primária:** Implementar na ordem exata dos planos — (1) infra multi-evento + migrations + data layer → (2) overview KPIs + charts → (3) lista paginada + filtros → (4) export → (5) páginas de análise.

---

## Standard Stack

### Core (todos já instalados — VERIFIED: package.json)

| Biblioteca | Versão | Propósito | Por que usar |
|------------|--------|-----------|--------------|
| next | 16.2.6 | App Router, Server Components, Route Handlers | Stack do projeto; `searchParams` em Server Components para URL-driven pagination |
| @supabase/ssr | ^0.10.3 | Cliente Supabase com cookies server-side | Já em uso; `createSupabaseServerClient()` disponível em `lib/supabase-server.ts` |
| @supabase/supabase-js | ^2.106.1 | Cliente Supabase service role | `getSupabase()` em `lib/supabase.ts` para queries de dados |
| recharts | ^3.8.1 | Charts (donut, barras, histograma) | Já em uso no projeto; `PieChart`, `BarChart` horizontal e vertical já têm padrões estabelecidos |
| exceljs | ^4.4.0 | Export .xlsx | Já instalado (devDependency); usado no import |
| zod | ^4.4.3 | Validação de body em Route Handlers | Já em uso |
| date-fns | ^4.2.1 | Formatação de datas (pt-BR) | Já em uso em `inscricoes-client.tsx` |

### Supporting

| Biblioteca | Versão | Propósito | Quando usar |
|------------|--------|-----------|-------------|
| lucide-react | ^1.16.0 | Ícones no sidebar e botões | Novo item no sidebar (Eventos), ícone de export |
| next-themes | ^0.4.6 | Dark/light mode | Já em uso em `overview-charts.tsx` via `useTheme()` |

### Não instalar — tudo que é necessário já está presente

A única dependência potencialmente ausente seria `use-debounce` para o campo de busca da lista. No entanto, o debounce pode ser implementado com `useRef` + `setTimeout` sem dependência adicional — veja padrão na seção de código abaixo.

---

## Architecture Patterns

### Estrutura de pastas após Phase 3

```
abvcap-congress/
├── app/
│   ├── api/
│   │   ├── edition/
│   │   │   └── select/route.ts          # POST — seta cookie active_edition_id
│   │   ├── export/
│   │   │   └── participants/route.ts    # GET — export .xlsx com filtros
│   │   └── import/commit/route.ts       # EXISTENTE — migrar editionYear → editionId
│   └── dashboard/
│       ├── eventos/page.tsx             # NOVO — lista + criação de edições
│       ├── membros/page.tsx             # NOVO — análise de membros
│       ├── receita/page.tsx             # NOVO — análise de receita
│       ├── inscricoes/
│       │   ├── page.tsx                 # REFATORAR — Server Component com searchParams
│       │   └── inscricoes-client.tsx    # REFATORAR — Client Component de controles
│       └── page.tsx                     # REFATORAR — KPIs corretos + charts corretos
├── components/
│   └── edition-selector.tsx             # NOVO — dropdown 'use client' para sidebar
├── lib/
│   ├── edition-cookie.ts                # NOVO — getActiveEditionId()
│   └── data.ts                          # REFATORAR — todas as funções com editionId
└── supabase/migrations/
    ├── 007_remove_editions_year_unique.sql   # NOVO
    └── 008_rpc_stats_by_edition_id.sql       # NOVO
```

### Padrão 1: Server Component com searchParams (paginação server-side)

**O quê:** Server Component lê `searchParams`, constrói query Supabase com `.range()` e `count: 'exact'`, passa dados + totalCount para Client Component de controles.

**Quando usar:** Qualquer página que precise de paginação bookmarkável, filtros persistentes, SSR correto.

```typescript
// Source: padrão Next.js App Router — [VERIFIED: codebase grep de force-dynamic]
// app/dashboard/inscricoes/page.tsx (APÓS refatoração)
export const dynamic = 'force-dynamic'

interface SearchParams {
  page?: string
  search?: string
  membership?: string
  segment?: string
  state?: string
  min_value?: string
  max_value?: string
  sort?: string
  dir?: string
  page_size?: string
}

export default async function InscricoesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  await requireAdmin()
  const params = await searchParams
  const editionId = await getActiveEditionId()

  const page = Math.max(1, Number(params.page ?? 1))
  const pageSize = [25, 50, 100].includes(Number(params.page_size))
    ? Number(params.page_size)
    : 50
  const offset = (page - 1) * pageSize

  const { data, count } = await getParticipantsPaginated({
    editionId,
    search: params.search,
    membership: params.membership as TicketMembership | undefined,
    segment: params.segment as CompanySegment | undefined,
    state: params.state,
    minValue: params.min_value ? Number(params.min_value) : undefined,
    maxValue: params.max_value ? Number(params.max_value) : undefined,
    sort: params.sort ?? 'created_at',
    dir: (params.dir ?? 'desc') as 'asc' | 'desc',
    limit: pageSize,
    offset,
  })

  return <InscricoesClient
    participants={data ?? []}
    totalCount={count ?? 0}
    currentPage={page}
    pageSize={pageSize}
    searchParams={params}
  />
}
```

### Padrão 2: Client Component de controles com router.push (sem useState para dados)

**O quê:** Client Component gerencia apenas os controles de UI (busca, filtros, paginação). Ao mudar qualquer filtro, chama `router.push(url)` com os novos params. O Server Component re-executa e passa os novos dados via props.

**Quando usar:** Filtros, busca, paginação em qualquer página com server-side data.

```typescript
// Source: padrão Next.js App Router — [VERIFIED: codebase, Next.js docs]
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useRef, useCallback } from 'react'

export function InscricoesClient({ participants, totalCount, currentPage, pageSize, searchParams }) {
  const router = useRouter()

  // Debounce sem dependência externa
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateParam = useCallback((key: string, value: string | null) => {
    const url = new URL(window.location.href)
    if (value) url.searchParams.set(key, value)
    else url.searchParams.delete(key)
    url.searchParams.set('page', '1') // reset page on filter change
    router.push(url.pathname + url.search)
  }, [router])

  const handleSearch = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateParam('search', value || null)
    }, 400)
  }, [updateParam])

  // ...resto dos controles
}
```

### Padrão 3: Cookie de edição ativa (server-side)

**O quê:** Helper que lê o cookie `active_edition_id` server-side e faz fallback para a edição mais recente se não encontrar.

```typescript
// lib/edition-cookie.ts — [ASSUMED: baseado em padrão cookies() do next/headers]
import { cookies } from 'next/headers'
import { getEditions } from './data'

const COOKIE_NAME = 'active_edition_id'

export async function getActiveEditionId(): Promise<string> {
  const cookieStore = await cookies()
  const stored = cookieStore.get(COOKIE_NAME)?.value

  if (stored) return stored

  // Fallback: edição mais recente
  const editions = await getEditions()
  if (editions.length === 0) throw new Error('Nenhuma edição cadastrada')
  return editions[0].id // já ordenado por year DESC
}
```

### Padrão 4: Route Handler para setar cookie (EditionSelector)

**O quê:** POST `/api/edition/select` recebe `{ editionId: string }` e seta o cookie httpOnly.

```typescript
// app/api/edition/select/route.ts — [ASSUMED: padrão cookies().set()]
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'

const Body = z.object({ editionId: z.string().uuid() })

export async function POST(req: Request) {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  const raw = await req.json()
  const parsed = Body.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const cookieStore = await cookies()
  cookieStore.set('active_edition_id', parsed.data.editionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 ano
  })
  return NextResponse.json({ ok: true })
}
```

### Padrão 5: EditionSelector no Sidebar

**O quê:** Client component `'use client'` que chama o Route Handler ao trocar edição, depois `router.refresh()` para re-fetch dos Server Components.

```typescript
// components/edition-selector.tsx — [ASSUMED: padrão do projeto]
'use client'

import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function EditionSelector({ editions, activeEditionId }: {
  editions: { id: string; name: string; year: number }[]
  activeEditionId: string
}) {
  const router = useRouter()

  async function handleChange(editionId: string) {
    await fetch('/api/edition/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ editionId }),
    })
    router.refresh() // re-fetch Server Components sem reload completo
  }

  return (
    <Select value={activeEditionId} onValueChange={handleChange}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {editions.map(e => (
          <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
```

### Padrão 6: Donut chart com label central (OV-03)

Recharts não suporta label central nativamente no Pie — usa-se um elemento `<text>` posicionado com CSS absoluto.

```typescript
// Source: padrão Recharts — [VERIFIED: codebase usa PieChart em publico-charts.tsx]
// Para OV-03: donut com total central
<div className="relative">
  <ResponsiveContainer width="100%" height={260}>
    <PieChart>
      <Pie data={donutData} dataKey="count" cx="50%" cy="50%"
           outerRadius={100} innerRadius={60} paddingAngle={2}>
        {donutData.map((_, i) => (
          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="transparent" />
        ))}
      </Pie>
      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, name) => [`${v} inscritos`, name]} />
    </PieChart>
  </ResponsiveContainer>
  {/* Label central */}
  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
    <p className="font-display tabular-nums text-3xl text-foreground leading-none">{total}</p>
    <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mt-1">total</p>
  </div>
</div>
```

### Padrão 7: Export .xlsx com ExcelJS (LIST-05)

**O quê:** Route Handler GET `/api/export/participants` lê os mesmos params de filtro da lista, busca TODOS os registros (sem paginação), gera workbook com ExcelJS, retorna como response binária.

```typescript
// Source: ExcelJS já em uso no projeto (import) — [VERIFIED: package.json devDependencies]
// app/api/export/participants/route.ts
import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  await requireAdmin()
  const { searchParams } = new URL(req.url)
  // ...parse filtros, buscar dados sem limite de paginação

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Participantes')
  ws.columns = [
    { header: 'Nome', key: 'full_name', width: 30 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Empresa', key: 'company', width: 25 },
    { header: 'Tipo', key: 'ticket_membership', width: 15 },
    { header: 'Valor (R$)', key: 'ticket_value', width: 12 },
    { header: 'Segmento', key: 'company_segment_normalized', width: 15 },
    { header: 'Estado', key: 'origin_state', width: 8 },
    { header: 'Cargo', key: 'job_title', width: 25 },
    { header: 'Inscrição', key: 'created_at', width: 18 },
  ]
  ws.addRows(rows)

  // UTF-8 BOM para Excel Windows
  const buffer = await wb.xlsx.writeBuffer()
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="participantes-${editionYear}.xlsx"`,
    },
  })
}
```

### Anti-patterns a evitar

- **Filtrar arrays em memória:** O padrão atual em `inscricoes-client.tsx` usa `useMemo` para filtrar `initialData`. Nunca fazer isso na nova implementação — toda filtragem ocorre na query Supabase.
- **SELECT * sem limit em participants:** Com potencialmente milhares de registros, um SELECT * sem range quebra a performance. Sempre usar `.range(offset, offset + limit - 1)`.
- **editionYear hardcoded:** O `lib/data.ts` atual tem `editionYear = 2025` em todas as funções. Após a migração, nenhuma função deve ter fallback por year — fallback é via cookie → edição mais recente.
- **Lookup por year no commit route:** O `commit/route.ts` atual faz `.eq('year', body.editionYear)`. Após D-09, o `edition_id` uuid vem direto no body.
- **Não chamar `router.refresh()` após trocar edição:** Sem o refresh, os Server Components continuam mostrando dados da edição anterior.

---

## Don't Hand-Roll

| Problema | Não construir | Usar | Por quê |
|----------|--------------|------|---------|
| Donut chart com label central | SVG customizado | Recharts PieChart + div absoluta sobreposicionada | Recharts já gerencia responsividade e tooltips |
| Debounce de busca | Implementação complexa de debounce | `useRef + setTimeout` (padrão simples, sem dependência) | Padrão de 4 linhas suficiente; sem instalar `use-debounce` |
| Export de Excel | Parsing manual de OOXML | ExcelJS (já instalado) | Edge cases de encoding Windows (UTF-8 BOM), formatação de células |
| Paginação de URL | Gerenciamento manual de query string | `URL` nativa + `router.push()` | API Web padrão, sem biblioteca extra |
| Leitura de cookie server-side | Parsing manual de header Cookie | `cookies()` do `next/headers` | API oficial Next.js para Server Components e Route Handlers |
| Histograma de valores | D3 manual | Recharts BarChart com dados pré-agrupados em faixas no servidor | Dados de agrupamento calculados no banco (PostgreSQL `width_bucket` ou CASE) |

---

## Migrations necessárias nesta fase

### Migration 007 — Remover UNIQUE em editions.year (D-06)

```sql
-- 007_remove_editions_year_unique.sql
ALTER TABLE editions DROP CONSTRAINT IF EXISTS editions_year_key;
```

Necessário antes de criar eventos com mesmo ano via `/dashboard/eventos`.

### Migration 008 — Atualizar get_overview_stats para p_edition_id (D-11)

```sql
-- 008_rpc_stats_by_edition_id.sql
CREATE OR REPLACE FUNCTION get_overview_stats(p_edition_id uuid)
RETURNS json AS $$
DECLARE v_result json;
BEGIN
  SELECT json_build_object(
    'total',                COUNT(*),
    'membro',               COUNT(*) FILTER (WHERE ticket_membership = 'MEMBRO'),
    'nao_membro',           COUNT(*) FILTER (WHERE ticket_membership = 'NAO_MEMBRO'),
    'total_revenue',        COALESCE(SUM(ticket_value), 0),
    'avg_ticket',           COALESCE(AVG(ticket_value) FILTER (WHERE ticket_value > 0), 0),
    'unique_companies',     COUNT(DISTINCT company) FILTER (WHERE company IS NOT NULL),
    'states_represented',   COUNT(DISTINCT fr.origin_state) FILTER (WHERE fr.origin_state IS NOT NULL)
  ) INTO v_result
  FROM participants p
  LEFT JOIN form_responses fr ON fr.participant_id = p.id
  WHERE p.edition_id = p_edition_id;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;
```

Esta migration adiciona `unique_companies` (OV-02) e `states_represented` (OV-02) diretamente na RPC existente, via LEFT JOIN com `form_responses`. Mais eficiente do que uma query separada.

### Migration 009 — RPCs de análise de membros e receita (MBR-01/02/03, REV-01/02/03)

```sql
-- 009_rpc_member_revenue_analysis.sql

-- Membros vs não-membros por segmento de empresa
CREATE OR REPLACE FUNCTION get_member_analysis(p_edition_id uuid)
RETURNS json AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT
        COALESCE(fr.company_segment::text, 'SEM_SEGMENTO') AS segment,
        COUNT(*) FILTER (WHERE p.ticket_membership = 'MEMBRO')     AS membro_count,
        COUNT(*) FILTER (WHERE p.ticket_membership = 'NAO_MEMBRO') AS nao_membro_count,
        COUNT(*)                                                    AS total,
        ROUND(
          COUNT(*) FILTER (WHERE p.ticket_membership = 'MEMBRO')::numeric
          / NULLIF(COUNT(*), 0) * 100, 1
        ) AS membership_pct
      FROM participants p
      LEFT JOIN form_responses fr ON fr.participant_id = p.id
      WHERE p.edition_id = p_edition_id
      GROUP BY COALESCE(fr.company_segment::text, 'SEM_SEGMENTO')
      ORDER BY total DESC
    ) t
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Análise de receita
CREATE OR REPLACE FUNCTION get_revenue_analysis(p_edition_id uuid)
RETURNS json AS $$
BEGIN
  RETURN json_build_object(
    'by_membership', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT
          ticket_membership,
          COUNT(*) AS count,
          COALESCE(SUM(ticket_value), 0) AS total_revenue,
          COALESCE(AVG(ticket_value) FILTER (WHERE ticket_value > 0), 0) AS avg_ticket
        FROM participants
        WHERE edition_id = p_edition_id
        GROUP BY ticket_membership
      ) t
    ),
    'histogram', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT
          CASE
            WHEN ticket_value = 0     THEN 'Gratuito'
            WHEN ticket_value <= 500  THEN 'R$1–500'
            WHEN ticket_value <= 1000 THEN 'R$501–1000'
            WHEN ticket_value <= 2000 THEN 'R$1001–2000'
            WHEN ticket_value <= 3000 THEN 'R$2001–3000'
            ELSE 'Acima de R$3000'
          END AS faixa,
          COUNT(*) AS count,
          MIN(ticket_value) AS min_val,
          MAX(ticket_value) AS max_val
        FROM participants
        WHERE edition_id = p_edition_id
          AND ticket_value IS NOT NULL
        GROUP BY faixa
        ORDER BY min_val NULLS FIRST
      ) t
    )
  );
END;
$$ LANGUAGE plpgsql STABLE;
```

**Nota:** As faixas do histograma (REV-03) são [ASSUMED] — baseadas em faixas razoáveis para ingressos de congresso B2B. Se o ticket médio real do evento for muito diferente, os buckets precisam ajuste. O planner deve deixar isso como discretion ou adicionar uma nota de ajuste pós-import.

### Migration 010 — Índices de suporte para filtros da lista (LIST-03)

```sql
-- 010_participant_filter_indexes.sql
-- Índice para busca por origin_state (filtro LIST-03)
CREATE INDEX IF NOT EXISTS idx_form_responses_origin_state
  ON form_responses (origin_state) WHERE origin_state IS NOT NULL;

-- Índice composto para paginação filtrada (edition + membership)
CREATE INDEX IF NOT EXISTS idx_participants_edition_membership
  ON participants (edition_id, ticket_membership);

-- Índice para range de valor
CREATE INDEX IF NOT EXISTS idx_participants_ticket_value
  ON participants (edition_id, ticket_value) WHERE ticket_value IS NOT NULL;
```

---

## Funções novas em lib/data.ts

Todas as funções abaixo recebem `editionId: string` em vez de `editionYear: number`:

```typescript
// [ASSUMED: baseado no schema verificado + padrão existente em lib/data.ts]

// Substitui getOverviewStats(editionYear)
export async function getOverviewStats(editionId: string): Promise<OverviewStats>

// Nova — retorna todas as edições ordenadas por year DESC (D-12)
export async function getEditions(): Promise<Edition[]>

// Refatorada — paginação server-side com filtros completos (LIST-01/02/03/04)
export async function getParticipantsPaginated(filters: {
  editionId: string
  search?: string
  membership?: TicketMembership
  segment?: CompanySegment
  state?: string
  minValue?: number
  maxValue?: number
  sort?: string
  dir?: 'asc' | 'desc'
  limit: number
  offset: number
}): Promise<{ data: Participant[]; count: number }>

// Refatorada — busca TODOS (sem paginação) para export (LIST-05)
export async function getParticipantsForExport(filters: {
  editionId: string
  search?: string
  membership?: TicketMembership
  segment?: CompanySegment
  state?: string
  minValue?: number
  maxValue?: number
}): Promise<ParticipantWithState[]>  // inclui origin_state via JOIN

// Nova — análise de membros (MBR-01/02/03)
export async function getMemberAnalysis(editionId: string): Promise<MemberAnalysisRow[]>

// Nova — análise de receita (REV-01/02/03)
export async function getRevenueAnalysis(editionId: string): Promise<RevenueAnalysis>

// Refatoradas (já existem, só mudam assinatura):
// getCompanySegmentSummary(editionId)
// getRegistrationsByDay(editionId)
// getTicketMembershipSummary(editionId)
// getFreeTicketStats(editionId)
```

**Ponto crítico:** `getParticipantsForExport` precisa fazer JOIN com `form_responses` para trazer `origin_state` na exportação. Este campo está em `form_responses`, não em `participants`.

---

## Ponto crítico: sidebar precisa de dados server-side

O `Sidebar` atual é `'use client'` puro — ele não pode chamar `cookies()` ou queries ao banco. A solução (compatível com o padrão do projeto) é:

1. `DashboardLayout` (`app/dashboard/layout.tsx`) é um **Server Component** — ele chama `getEditions()` e `getActiveEditionId()` e passa como props para o `Sidebar`.
2. `Sidebar` recebe `editions` e `activeEditionId` como props (sem fetch próprio).
3. O `EditionSelector` é um sub-componente `'use client'` dentro do Sidebar.

```typescript
// app/dashboard/layout.tsx — [VERIFIED: layout.tsx é Server Component sem 'use client']
import { getEditions } from '@/lib/data'
import { getActiveEditionId } from '@/lib/edition-cookie'
import { Sidebar } from '@/components/sidebar'

export default async function DashboardLayout({ children }) {
  // Pode falhar se não autenticado — proxy.ts garante auth antes
  let editions: Edition[] = []
  let activeEditionId = ''
  try {
    ;[editions, activeEditionId] = await Promise.all([
      getEditions(),
      getActiveEditionId(),
    ])
  } catch { /* sem edições ainda — passa props vazias */ }

  return (
    <div className="flex min-h-screen">
      <Sidebar editions={editions} activeEditionId={activeEditionId} />
      <main className="flex-1 overflow-auto bg-background">{children}</main>
    </div>
  )
}
```

Esta mudança altera a assinatura do `Sidebar` — o componente precisará aceitar as novas props.

---

## Integração com import-client: event picker (D-07, D-08)

O `ImportClient` (`app/dashboard/import/import-client.tsx`) precisa mostrar o evento ativo no topo e permitir troca antes do commit. Como `ImportClient` é um Client Component, ele não pode chamar `cookies()` diretamente.

**Solução:** O Server Component `app/dashboard/import/page.tsx` passa `editions` e `activeEditionId` como props para `ImportClient`. O Client Component gerencia o `selectedEditionId` como state local (inicializado com `activeEditionId`), e ao commitar passa `editionId` no body (substituindo `editionYear`).

O bloqueio de upload quando não há edições (D-08) é feito no Server Component: se `editions.length === 0`, renderiza uma mensagem estática em vez do `ImportClient`.

---

## Mudanças no commit route (D-09)

O `app/api/import/commit/route.ts` atual aceita `editionYear: number` e faz lookup `WHERE year = ?`. Após a migração:

```typescript
// Schema Zod atualizado
const BodySchema = z.object({
  serverToken: z.string().min(32).max(64),
  editionId: z.string().uuid(),   // substitui editionYear
})

// Lookup removido — edition_id usado diretamente
const { data: edition } = await supabase
  .from('editions')
  .select('id, year, name')
  .eq('id', body.editionId)
  .single()
```

---

## Common Pitfalls

### Pitfall 1: searchParams em Next.js 16 são async (Promise)

**O que vai errado:** Em Next.js 15+, `searchParams` no Server Component é uma Promise, não um objeto síncrono. Código que faz `searchParams.page` sem `await` recebe undefined.

**Por que acontece:** Breaking change do Next.js 15 que continua no 16 — `searchParams` passou a ser assíncrono para suportar streaming.

**Como evitar:** Sempre `const params = await searchParams` antes de acessar qualquer propriedade. Já visto no codebase com `cookies()` sendo awaited em `createSupabaseServerClient()` e `lib/auth.ts`.

**Sinal de alerta:** TypeScript reclama de `Type 'Promise<SearchParams>' has no property 'page'`.

### Pitfall 2: Supabase count: 'exact' requer select com count

**O que vai errado:** Fazer `.select('*')` com `{ count: 'exact' }` retorna os dados E a contagem. Fazer `.select('*', { count: 'exact', head: true })` retorna apenas a contagem (sem dados) — não misturar com a query paginada.

**Como evitar:**
```typescript
// CORRETO — uma query que retorna dados + count
const { data, count, error } = await supabase
  .from('participants')
  .select('*', { count: 'exact' })
  .eq('edition_id', editionId)
  .range(offset, offset + limit - 1)
```

### Pitfall 3: JOIN via Supabase JS para origin_state (está em form_responses)

**O que vai errado:** `origin_state` não está em `participants` — está em `form_responses`. Filtrar por estado via `.eq('origin_state', state)` na tabela `participants` falha silenciosamente (campo não existe).

**Como evitar:** Para filtros que envolvem `form_responses`, usar subquery no Supabase ou query SQL via RPC. A abordagem mais simples é uma RPC `get_participants_paginated` que faz o JOIN internamente e aceita todos os parâmetros de filtro.

Alternativamente, Supabase JS suporta JOIN implícito via relacionamentos:
```typescript
.select('*, form_responses!inner(origin_state)')
.eq('form_responses.origin_state', state)
```
Mas isso muda o shape do resultado — é mais seguro usar uma RPC para queries com múltiplos filtros e JOIN.

### Pitfall 4: router.refresh() vs router.push() após trocar edição

**O que vai errado:** Após chamar `/api/edition/select` e trocar o cookie, a navegação atual ainda exibe dados da edição antiga. `router.push('/dashboard')` funciona mas perde o scroll e parece reload completo. `router.refresh()` refetch sem mudar URL — correto para este caso.

**Como evitar:** Usar `router.refresh()` no `EditionSelector` após o cookie ser setado com sucesso.

### Pitfall 5: ExcelJS é devDependency — pode não estar disponível em produção

**O que vai errado:** `exceljs` está em `devDependencies` no `package.json`. Em Node.js runtime do Vercel, `devDependencies` não são instaladas.

**Como evitar:** Mover `exceljs` de `devDependencies` para `dependencies` na migration do Plan 03 (export). Verificar antes de implementar.

[VERIFIED: package.json linha 37 — `"exceljs": "^4.4.0"` está em devDependencies]

### Pitfall 6: Sidebar recebe props novas — todas as páginas de teste devem passar

**O que vai errado:** Adicionar props obrigatórias (`editions`, `activeEditionId`) ao `Sidebar` sem atualizar o `DashboardLayout` quebra o TypeScript.

**Como evitar:** A mudança no `layout.tsx` e no `sidebar.tsx` deve ser feita como uma unidade atômica no mesmo plano/wave.

### Pitfall 7: getActiveEditionId() lança erro se não há edições

**O que vai errado:** Se `getEditions()` retorna array vazio (banco vazio), a função que busca a edição padrão lança exceção, derrubando todas as páginas do dashboard.

**Como evitar:** O layout deve capturar o erro com try/catch e renderizar uma página de "boas vindas / crie o primeiro evento" em vez de 500. Páginas individuais também devem ter try/catch (já é o padrão estabelecido).

---

## Inventário de Estado em Runtime

Esta fase não é de rename/refactor — não há runtime state inventory aplicável. Entretanto, há um item de estado crítico:

**Cookie `active_edition_id`:** Após a Phase 3 ser deployada, usuários existentes não terão o cookie. A função `getActiveEditionId()` deve fazer fallback silencioso para a edição mais recente (D-02). Nenhuma migração de dados necessária.

**`editions.year` UNIQUE constraint:** A migration 007 remove esta constraint. Se a migration falhar no Supabase (ex: constraint não existe com esse nome exato), o planner deve verificar o nome real da constraint antes de executar. O nome gerado pelo PostgreSQL para `UNIQUE` inline é tipicamente `{tabela}_{coluna}_key` → `editions_year_key`.

---

## Validation Architecture

### Framework de testes
| Propriedade | Valor |
|-------------|-------|
| Framework | Nenhum detectado no projeto |
| Config file | Não existe (jest.config.*, vitest.config.*, pytest.ini) |
| Quick run command | `npm run build` (TypeScript type check via build) |
| Full suite command | `npx tsc --noEmit` |

O projeto não tem suite de testes automatizados. O padrão de verificação estabelecido nas fases anteriores é: `npm run build` passa sem erros TypeScript → critério de "testes" desta fase.

### Phase Requirements → Test Map

| Req ID | Comportamento | Tipo de teste | Comando | Existe? |
|--------|---------------|---------------|---------|---------|
| OV-01/02 | KPI cards mostram valores corretos | Manual (inspeção visual + banco) | — | N/A |
| OV-03/04 | Charts renderizam com dados reais | Manual (browser) | — | N/A |
| LIST-01 | Navegar para página 2 executa nova query (não filtra array) | Manual (Network tab DevTools) | — | N/A |
| LIST-02/03/04 | Busca + filtros + ordenação funcionam corretamente | Manual (browser) | — | N/A |
| LIST-05 | Export baixa .xlsx com dados filtrados, sem erro de encoding | Manual (abrir no Excel Windows) | — | N/A |
| MBR-01/02/03 | Percentuais de adesão corretos | Manual (comparar com contagens do banco) | — | N/A |
| REV-01/02/03 | Receita e histograma corretos | Manual (comparar com SUM/AVG no Supabase SQL editor) | — | N/A |
| D-06 | Migration remove UNIQUE sem quebrar inserts | `npm run build` + manual | `npx tsc --noEmit` | Wave 0 |

### Wave 0 Gaps
- Não há framework de testes — padrão de verificação é build + inspeção manual.
- Antes de qualquer plano de Phase 3: `npx tsc --noEmit` deve passar (baseline limpo).

---

## Environment Availability

| Dependência | Requerida por | Disponível | Versão | Fallback |
|-------------|---------------|------------|--------|----------|
| Node.js | Next.js build/dev | ✓ | Verificado via `npm run build` OK | — |
| ExcelJS | Export .xlsx (LIST-05) | ✓ (devDep) | 4.4.0 | Mover para dependencies |
| Supabase project | Todas as queries | ✓ | `kcgwyzvwxmmygfdsetgd` verificado | — |
| Recharts | Charts (OV-03/04, MBR, REV) | ✓ | ^3.8.1 | — |
| Lucide React | Ícones novos no sidebar | ✓ | ^1.16.0 | — |

**Dependências ausentes sem fallback:** Nenhuma.

**Ação necessária:** Mover `exceljs` de `devDependencies` para `dependencies` em `package.json` antes do Plan de export.

---

## Security Domain

Esta fase não introduz novos vetores de segurança além do que já está implementado:

- Todas as pages usam `requireAdmin()` — mantido
- Route Handlers usam `requireAdmin()` + Zod validation — manter padrão
- O Route Handler de cookie (`/api/edition/select`) deve validar que o `editionId` passado pertence a uma edição real no banco (prevenção de cookie poisoning com uuid aleatório)
- Export route deve usar service role key (via `getSupabase()`) — não anon key

| Categoria ASVS | Aplica | Controle |
|----------------|--------|---------|
| V2 Authentication | sim | `requireAdmin()` em todas as routes |
| V4 Access Control | sim | admin gating via `app_metadata.role` |
| V5 Input Validation | sim | Zod em todos os Route Handlers |
| V6 Cryptography | não aplicável | sem criptografia nova nesta fase |

---

## Assumptions Log

| # | Claim | Seção | Risco se Errado |
|---|-------|-------|-----------------|
| A1 | `getActiveEditionId()` usa `await cookies()` que é disponível em Server Components e Route Handlers | Padrão 3 | Low — `createSupabaseServerClient()` já usa `await cookies()` no projeto |
| A2 | Faixas do histograma de receita (R$0, R$1–500, R$501–1000, etc.) são razoáveis para o evento | Migration 009 | Medium — se tickets reais tiverem distribuição muito diferente, buckets precisam ajuste |
| A3 | Nome da constraint UNIQUE em `editions.year` é `editions_year_key` | Migration 007 | Medium — pode ter nome diferente se criado com CONSTRAINT nomeado |
| A4 | `router.refresh()` dispara re-fetch de Server Components no layout (incluindo sidebar) | Padrão 5 | Low — comportamento documentado do Next.js App Router |
| A5 | ExcelJS funciona em Node.js runtime do Vercel como `dependency` (não devDependency) | Pitfall 5 | High — se não corrigido, export falha em produção com 500 |

---

## Open Questions

1. **Nome exato da constraint UNIQUE em `editions.year`**
   - O que sabemos: A constraint existe (definida como `year int NOT NULL UNIQUE` em migration 001)
   - O que é incerto: O nome PostgreSQL auto-gerado pode variar; `DROP CONSTRAINT IF EXISTS editions_year_key` é seguro (IF EXISTS previne erro)
   - Recomendação: Usar `IF EXISTS` na migration — se falhar silenciosamente, a constraint ainda existe; verificar com `SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'editions'` antes de deployar

2. **origin_state na query paginada de participantes**
   - O que sabemos: `origin_state` está em `form_responses`, não em `participants`; filtrar por estado requer JOIN
   - O que é incerto: Supabase JS suporta filtro em tabela relacionada (`.eq('form_responses.origin_state', state)`) mas o comportamento com `range()` e `count: 'exact'` pode ser imprevisível
   - Recomendação: Implementar `get_participants_paginated` como RPC SQL para queries com filtro de estado — maior controle, performance previsível

3. **Histograma de receita — faixas de valor**
   - O que sabemos: Ingressos ABVCAP 2025 foram importados mas os dados reais de distribuição não foram verificados nesta sessão de research
   - O que é incerto: Se o ticket médio é muito alto (ex: R$5.000+), as faixas propostas precisam de ajuste
   - Recomendação: O implementador deve verificar `SELECT MIN(ticket_value), MAX(ticket_value), AVG(ticket_value) FROM participants` no Supabase antes de fixar as faixas da migration 009

---

## Sources

### Primary (HIGH confidence)
- `abvcap-congress/package.json` — versões exatas de todas as dependências verificadas
- `abvcap-congress/lib/database.types.ts` — schema completo com todos os campos e tipos
- `abvcap-congress/supabase/migrations/001_foundation.sql` a `006_*` — DDL real do banco
- `abvcap-congress/app/dashboard/publico/publico-charts.tsx` — padrão Recharts estabelecido no projeto
- `abvcap-congress/app/dashboard/overview-charts.tsx` — padrão de charts com dark mode
- `abvcap-congress/components/sidebar.tsx` — estrutura atual do sidebar
- `abvcap-congress/app/dashboard/layout.tsx` — Server Component sem `'use client'`
- `abvcap-congress/app/api/import/commit/route.ts` — padrão atual de commit com editionYear (a migrar)
- `abvcap-congress/lib/supabase-server.ts` — padrão `await cookies()` já em uso
- `.planning/phases/03-dashboard-core/03-CONTEXT.md` — decisões locked da fase

### Secondary (MEDIUM confidence)
- Next.js 16 App Router — `searchParams` assíncrono verificado por inferência do padrão `await cookies()` já no codebase

### Tertiary (LOW confidence)
- Faixas do histograma de receita — estimativa baseada em conhecimento de eventos B2B

---

## Metadata

**Breakdown de confiança:**
- Standard stack: HIGH — todos os pacotes verificados em package.json
- Architecture patterns: HIGH — baseado no código real do projeto
- Pitfalls: HIGH (pitfall ExcelJS devDep verificado); MEDIUM (pitfalls de integração)
- SQL das migrations: MEDIUM — lógica verificada contra schema real, mas não executada nesta sessão

**Data da pesquisa:** 2026-05-26
**Válido até:** 2026-07-26 (stack estável)
