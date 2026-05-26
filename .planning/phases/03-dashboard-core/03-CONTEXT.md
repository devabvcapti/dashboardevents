# Phase 3: Dashboard Core - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 entrega: suporte a múltiplos eventos com seletor global, gestão de edições, KPI cards corretos, análise de membros vs não-membros, análise de receita, e lista de participantes com paginação/busca/filtro/export.

O suporte multi-evento é infraestrutura que precisa estar pronta antes dos demais itens, pois todas as queries, o import e o sidebar dependem dela.

</domain>

<decisions>
## Implementation Decisions

### Seletor de Evento Global
- **D-01:** Persistência via **cookie httpOnly** — seletor no sidebar salva o `edition_id` em cookie; todas as páginas leem server-side via `cookies()` do next/headers. URLs limpas, zero configuração de params em links.
- **D-02:** Sem evento selecionado (primeiro acesso ou cookie expirado) → **auto-seleciona a edição com maior ano**. Zero atrito.
- **D-03:** Posição no sidebar: **abaixo do logo, acima do menu de navegação** — dropdown com o nome do evento ativo contextualiza todo o dashboard antes da navegação.

### Gestão de Edições
- **D-04:** Página dedicada `/dashboard/eventos` com item no sidebar — lista eventos, botão para criar novo. Suporta futuro (editar, ver imports por evento).
- **D-05:** Campos ao criar evento: **nome + ano** (ex: "Congresso ABVCAP 2026", 2026). Simples e suficiente.
- **D-06:** Remover constraint `UNIQUE` em `editions.year` — permite múltiplos eventos no mesmo ano.

### Import + Evento
- **D-07:** Na página de import, o topo mostra o evento ativo com **select que permite trocar** antes do commit — evita import no evento errado.
- **D-08:** Se nenhum evento cadastrado → **bloqueia upload** com mensagem "Nenhum evento cadastrado. Crie um evento primeiro." + link para `/dashboard/eventos`.
- **D-09:** O `edition_id` (uuid) é passado diretamente no body do commit. Remover lookups por `editionYear` no commit route.

### Data Layer
- **D-10:** Todas as funções em `lib/data.ts` trocam `editionYear: number` por `editionId: string` (uuid). Sem mais lookups `WHERE year = ?` — queries usam `WHERE edition_id = ?` diretamente.
- **D-11:** RPC `get_overview_stats` atualizada para aceitar `p_edition_id uuid` em vez de `p_edition_year int` — nova migration.
- **D-12:** Nova função `getEditions()` em `lib/data.ts` retorna todas as edições ordenadas por ano desc.
- **D-13:** Nova helper `lib/edition-cookie.ts` com `getActiveEditionId(editionId?: string)` — lê cookie server-side, fallback para edição mais recente.

### Lista de Participantes
- **D-14:** Paginação via **URL params server-side** — `/dashboard/inscricoes?page=2&search=joao&membership=MEMBRO`. Bookmarkável, funciona com back/forward do browser. Refatora o padrão atual de client state.
- **D-15:** Tamanhos de página: 25 / 50 / 100 (default 50).

### Export
- **D-16:** Export em **Excel (.xlsx)** usando ExcelJS (já instalado no projeto). UTF-8, abre direto no Windows sem problema de encoding. Um formato apenas.
- **D-17:** Export respeita os filtros ativos da visão atual — exporta exatamente o que está visível com os filtros aplicados.

### Claude's Discretion
- Implementação do Route Handler para setar o cookie de edição (POST `/api/edition/select`)
- Implementação visual do dropdown de edições no sidebar (componente `EditionSelector`)
- RPCs adicionais para análise de membros e receita — Claude decide a estrutura das queries
- Layout das páginas de análise de membros e receita — Claude decide baseado no padrão existente

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema e migrations
- `abvcap-congress/supabase/migrations/001_foundation.sql` — DDL base: tabela `editions` (id, name, year, created_at), constraint UNIQUE em year (a remover)
- `abvcap-congress/supabase/migrations/002_rpc_stats.sql` — RPC `get_overview_stats(p_edition_year int)` — a migrar para `p_edition_id uuid`
- `abvcap-congress/supabase/migrations/005_upsert_participants_rpc.sql` — RPC de upsert de participantes

### Data layer atual
- `abvcap-congress/lib/data.ts` — todas as funções com `editionYear = 2025` hardcoded — a refatorar para `editionId`
- `abvcap-congress/app/api/import/commit/route.ts` — usa `editionYear` para resolver edition — a migrar para `editionId` direto

### Padrões de componentes existentes
- `abvcap-congress/components/sidebar.tsx` — Client component, ponto de integração do EditionSelector
- `abvcap-congress/app/dashboard/layout.tsx` — Dashboard shell — Sidebar + main
- `abvcap-congress/app/dashboard/import/import-client.tsx` — Import UI (5 stages) — a adicionar event picker no topo

### Páginas a refatorar
- `abvcap-congress/app/dashboard/page.tsx` — Overview, lê editionYear hardcoded
- `abvcap-congress/app/dashboard/inscricoes/page.tsx` — Lista, paginação client state → URL params
- `abvcap-congress/app/dashboard/ingressos/page.tsx` — Ingressos
- `abvcap-congress/app/dashboard/publico/page.tsx` — Público

### Auth pattern
- `abvcap-congress/lib/auth.ts` — `requireAdmin()` usado em todas as pages protegidas — manter

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/ui/select.tsx` — Select shadcn/base-ui — reutilizável no EditionSelector e no import event picker
- `components/ui/dropdown-menu.tsx` — DropdownMenu shadcn — alternativa para o seletor se precisar de ações (criar evento)
- `components/stat-card.tsx` — StatCard com accent colorido — reutilizável para KPI cards Phase 3
- ExcelJS — já instalado (usado no import), disponível para o export .xlsx
- `lib/supabase-server.ts` — `createSupabaseServerClient()` — disponível para leitura de cookies em server components

### Established Patterns
- Server component fetches data → passa como props para Client component
- `export const dynamic = 'force-dynamic'` em todas as pages do dashboard (sem ISR)
- `try/catch` silencioso nas pages com fallback para dados vazios/null
- `lib/data.ts` é o único ponto de acesso ao banco — todas as queries passam por aqui
- Named exports em components, default exports em pages/layouts

### Integration Points
- `cookies()` from `next/headers` — disponível em Server Components para ler o cookie de edição ativa
- Route Handler `POST /api/edition/select` → seta o cookie `active_edition_id` com `cookies().set()`
- `components/sidebar.tsx` já é `'use client'` → pode chamar o route handler via `fetch` ao selecionar edição
- `router.refresh()` após trocar edição força re-fetch dos Server Components sem reload completo

</code_context>

<specifics>
## Specific Ideas

- Dropdown de edição no sidebar deve mostrar o nome completo (ex: "Congresso ABVCAP 2025") com seta indicando que é clicável
- Se só houver 1 edição cadastrada, ainda mostrar o dropdown (sem bloquear a UI) para consistência
- Página `/dashboard/eventos` pode ser simples: lista de cards por evento com data/participantes + formulário de criação inline no topo ou botão que abre form
- A constraint UNIQUE em `editions.year` precisa ser removida via migration antes de criar eventos com mesmo ano

</specifics>

<deferred>
## Deferred Ideas

- Comparação histórica entre edições (gráficos comparando 2024 vs 2025) — v2 HIST-02
- Editar/deletar edições — útil mas não crítico para v1; criar é suficiente por ora
- Export com filtros geográficos e de formulário — Phase 4 (quando esses dados existirem)

</deferred>

---

*Phase: 03-dashboard-core*
*Context gathered: 2026-05-26*
