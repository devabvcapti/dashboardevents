# ROADMAP — ABVCAP Congress Dashboard

**Projeto:** ABVCAP Congress Dashboard  
**Granularidade:** Standard (5-8 fases, 3-5 planos cada)  
**Paralelização:** Habilitada  
**Cobertura:** 43/43 requisitos v1 mapeados  
**Criado em:** 2026-05-21

---

## Phases

- [x] **Phase 1: Foundation** — Substituir schema, corrigir segurança, regenerar tipos, queries SQL
- [ ] **Phase 2: Import Pipeline + Auth** — Upload de Excel end-to-end com parse, validação, mapeamento e upsert; autenticação básica
- [ ] **Phase 3: Dashboard Core** — KPI cards, análise de membros/receita, lista de participantes com paginação/busca/filtro/export
- [ ] **Phase 4: Analytics Depth** — Análise de formulário, mapa geográfico, export operacional, histórico de imports

---

## Phase Details

### Phase 1: Foundation

**Goal**: O banco de dados e a camada de dados existem na forma correta — schema substituído, chave de serviço isolada no servidor, tipos TypeScript gerados automaticamente, e todas as queries usando agregação SQL.

**Depends on**: Nada (primeira fase)

**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05

**Plans**:
1. **Schema migration** — Dropar schema existente; criar enums (`ticket_membership`, `company_segment`, `import_status`); criar tabelas na ordem correta: `editions` → `import_jobs` → `participants` → `form_responses`; adicionar índices GIN nos campos `TEXT[]`; seeder da edição 2025 (`FOUND-01`, `FOUND-05`)
2. **Security hardening** — Mover `SUPABASE_SERVICE_ROLE_KEY` para env var sem prefixo `NEXT_PUBLIC_`; refatorar `lib/supabase.ts` para criar cliente server-only com service role; remover anon key de todas as queries de dados; corrigir RLS policies (`FOUND-02`)
3. **Type generation + data layer** — Rodar `supabase gen types typescript` para gerar `lib/database.types.ts` do novo schema; refatorar `lib/data.ts` para usar queries `GROUP BY` no banco (Supabase RPC ou views) em vez de agregação in-memory (`FOUND-03`, `FOUND-04`)

**Success Criteria** (what must be TRUE):

1. O banco Supabase contém as tabelas `editions`, `import_jobs`, `participants`, `form_responses` com os enums corretos (`MEMBRO`/`NAO_MEMBRO`) e a edição 2025 aparece como registro na tabela `editions`
2. `SUPABASE_SERVICE_ROLE_KEY` não aparece em nenhum bundle client-side; abrindo DevTools no browser não é possível ver a chave
3. `lib/database.types.ts` é gerado automaticamente a partir do schema (não hand-authored) e inclui os novos tipos de enum
4. As queries de estatísticas (overview, contagem por tipo) executam `GROUP BY` no banco — o log do Supabase não mostra `SELECT *` com carga total da tabela
5. O dashboard existente ainda renderiza sem erros 500 após as mudanças de schema e security

**Research needed before phase**: Sim — confirmar os cabeçalhos exatos do Excel ABVCAP (afeta definição de `KNOWN_HEADERS` e schema Zod) e verificar se o flag de membro no Excel é um campo booleano ou derivado de uma lista de associados separada.

**UI hint**: no

---

### Phase 2: Import Pipeline + Auth

**Goal**: Um admin autenticado pode fazer upload de um arquivo `.xlsx` exportado da plataforma ABVCAP, confirmar o mapeamento de colunas, revisar erros por linha e persistir os dados no banco com registro de auditoria.

**Depends on**: Phase 1

**Requirements**: IMPORT-01, IMPORT-02, IMPORT-03, IMPORT-04, IMPORT-05, IMPORT-06, IMPORT-07, IMPORT-08, IMPORT-09, IMPORT-10, IMPORT-11, AUTH-01, AUTH-02, AUTH-03

**Plans:** 4 plans (Wave 1: 02-01 + 02-02 em paralelo; Wave 2: 02-03; Wave 3: 02-04)

Plans:
- [ ] 02-01-PLAN.md — Schema migration: ALTER participants (+7 colunas), drop+recreate form_responses.interested_in_events como TEXT[], add content_interests/dietary_details, criar RPC `upsert_participants_batch`, regerar types (`IMPORT-07`, `IMPORT-08`, `IMPORT-09`)
- [x] 02-02-PLAN.md — Auth middleware: @supabase/ssr (clientes server/browser), proxy.ts protegendo /dashboard e /api/* (exceto /api/auth/*), /login page com form, /api/auth/login+logout, gating por app_metadata.role==="admin" (`AUTH-01`, `AUTH-02`, `AUTH-03`) ✅ 2026-05-25
- [ ] 02-03-PLAN.md — Upload + parse + mapping UI: lib/import/* (known-headers, sanitize, segment-mapper, types, excel-parser, zod-schemas), POST /api/import/preview, /dashboard/import page com 3 stages (upload/mapping/preview), erros PT-BR (`IMPORT-01`, `IMPORT-02`, `IMPORT-03`, `IMPORT-04`, `IMPORT-05`, `IMPORT-06`, `IMPORT-08`, `IMPORT-11`)
- [ ] 02-04-PLAN.md — Commit route + audit: extrair preview-store compartilhado, POST /api/import/commit com chunking de 500 + RPC + import_jobs PROCESSING→COMPLETED/FAILED, wire UI para mostrar resultado (`IMPORT-07`, `IMPORT-09`, `IMPORT-10`)

**Success Criteria** (what must be TRUE):

1. Acessar `/dashboard` sem estar autenticado redireciona para `/login`; após login com credenciais válidas o admin acessa o dashboard normalmente e a sessão sobrevive a um reload de página
2. Um arquivo `.xlsx` real exportado da plataforma ABVCAP pode ser uploadado pela interface e o sistema detecta os cabeçalhos sem configuração manual
3. A UI de mapeamento de colunas aparece e permite ao admin corrigir discrepâncias antes de prosseguir
4. Linhas com dados inválidos aparecem listadas em português com o número da linha Excel correspondente; linhas válidas aparecem no preview antes de confirmar
5. Após confirmar o import, os participantes aparecem na tabela `participants` do Supabase e um registro de auditoria é criado em `import_jobs` com contagens corretas de inseridos/atualizados/erros
6. Reimportar o mesmo arquivo não duplica registros — registros existentes são atualizados

**Research needed before phase**: ✅ Concluído — arquivo Excel real (`Congresso v2.xlsx`) analisado em CONTEXT.md (60 colunas, 2 linhas de cabeçalho, multi-selects como colunas booleanas com "x", ticket_value já é float, CPF como number precisa padStart).

**UI hint**: yes

---

### Phase 3: Dashboard Core

**Goal**: Um admin pode navegar pelo dashboard e ver KPIs do evento, análises de membros vs não-membros, análise de receita, e uma lista completa e filtrável de participantes com opção de export.

**Depends on**: Phase 2

**Requirements**: OV-01, OV-02, OV-03, OV-04, LIST-01, LIST-02, LIST-03, LIST-04, LIST-05, MBR-01, MBR-02, MBR-03, REV-01, REV-02, REV-03

**Plans:** 5 plans (Wave 1: 03-01 multi-event infra; Wave 2: 03-02 + 03-03 + 03-04 + 03-05 em paralelo)

Plans:
- [x] 03-01-PLAN.md — Multi-event infrastructure: migrations 007 (remove UNIQUE editions.year), 008 (RPC get_overview_stats com p_edition_id + unique_companies + states_represented), 009 (RPCs get_member_analysis + get_revenue_analysis), 010 (índices); lib/data.ts refatorado em editionId-only + 6 funções novas (getEditions, getParticipantsPaginated, getParticipantsForExport, getMemberAnalysis, getRevenueAnalysis); lib/edition-cookie.ts; /api/edition/select + /api/edition/create; EditionSelector no sidebar; /dashboard/eventos; import flow migrado para editionId; exceljs movido para dependencies (`OV-01`, `OV-02` parcial via RPC)
- [x] 03-02-PLAN.md — Overview KPIs + charts: 7 StatCards (total, membros %, não-membros %, receita, ticket médio, empresas únicas, estados); donut Membros vs Não-Membros com label central de total; barras horizontais por tipo de empresa ordenadas desc com count + % (`OV-01`, `OV-02`, `OV-03`, `OV-04`)
- [x] 03-03-PLAN.md — Lista de participantes server-side + export: page.tsx async searchParams + getParticipantsPaginated com whitelists; inscricoes-client.tsx com router.push, debounce 400ms, sort por 5 colunas, paginação 25/50/100; /api/export/participants gera .xlsx via ExcelJS com 11 colunas e respeita filtros (`LIST-01`, `LIST-02`, `LIST-03`, `LIST-04`, `LIST-05`)
- [ ] 03-04-PLAN.md — Análise de membros: page.tsx + membros-charts.tsx com stacked bars Membros vs Não-Membros por segmento, ranking de adesão % (filtro ruído ≥3 inscritos), tabela detalhada com 5 colunas (`MBR-01`, `MBR-02`, `MBR-03`)
- [ ] 03-05-PLAN.md — Análise de receita: page.tsx + receita-charts.tsx com KPIs (receita total + ticket médio geral via média ponderada), comparativo MEMBRO vs NAO_MEMBRO (2 bars + tabela), histograma de 6 faixas (Gratuito → Acima de R$3000) (`REV-01`, `REV-02`, `REV-03`)

**Success Criteria** (what must be TRUE):

1. A página de visão geral exibe KPIs com valores corretos (total, membros/%, receita, ticket médio, empresas, estados) e os charts de donut e barras horizontais renderizam com dados reais do banco
2. A lista de participantes pagina server-side — navegar para página 2 aciona uma nova query no banco, não filtra um array em memória; o total de resultados é visível
3. Busca por nome/email/empresa funciona com debounce; aplicar filtros de tipo de ingresso, estado e faixa de valor combina corretamente e atualiza a contagem exibida
4. Clicar em "Exportar" baixa um arquivo `.csv` ou `.xlsx` contendo exatamente os registros da visão filtrada atual, incluindo todas as colunas visíveis, com encoding correto para Excel no Windows
5. A página de análise de membros mostra percentual de adesão por tipo de empresa (ex: "75% dos gestores de PE são membros")
6. A página de receita mostra receita por categoria de ingresso e o histograma de distribuição de valores é legível e correto

**Research needed before phase**: Não — schema e dados já estarão disponíveis após Phase 2.

**UI hint**: yes

---

### Phase 4: Analytics Depth

**Goal**: Um admin pode explorar análises profundas de respostas de formulário, ver a distribuição geográfica dos participantes num mapa do Brasil, exportar restrições alimentares para catering, e consultar o histórico de imports com detalhamento de erros.

**Depends on**: Phase 3

**Requirements**: FORM-01, FORM-02, FORM-03, FORM-04, FORM-05, GEO-01, GEO-02, AUDIT-01, AUDIT-02

**Plans**:
1. **Form response analytics** — Criar página de análise de formulário: charts de temas de interesse (multi-select aware — denominador = total com resposta, não total inscritos); charts de canais de comunicação preferidos; breakdown de opt-in de comunicação ABVCAP; summary de interesse em eventos do ecossistema (`FORM-01`, `FORM-02`, `FORM-03`, `FORM-04`)
2. **Dietary export** — Adicionar seção de restrições alimentares: contagem por categoria; botão de export operacional para catering (CSV com nome + empresa + restrição) (`FORM-05`)
3. **Brazil choropleth map** — Implementar ranking de estados por inscritos; integrar mapa coroplético do Brasil com GeoJSON IBGE; usar escala logarítmica para evitar dominância de SP; biblioteca: `react-simple-maps` ou `d3` (spike de 2h antes de decidir) (`GEO-01`, `GEO-02`)
4. **Import audit log UI** — Criar página de histórico de imports: lista de imports (arquivo, data, operador, linhas importadas, erros); view de detalhe por import com log de erros por linha para debugging (`AUDIT-01`, `AUDIT-02`)

**Success Criteria** (what must be TRUE):

1. Na página de formulário, o chart de temas de interesse mostra percentuais calculados sobre o número de respondentes (não sobre total de inscritos) — seleções múltiplas estão corretas
2. Clicar em "Exportar para Catering" baixa um CSV com nome, empresa e restrição alimentar de cada participante que declarou restrição
3. O mapa do Brasil aparece colorido por intensidade de inscritos por estado; estados com 0 inscritos aparecem em cor neutra; o estado com mais inscritos (provavelmente SP) não oculta a variação dos demais devido à escala logarítmica
4. A página de histórico de imports lista todos os imports realizados com data, arquivo e contagens; clicar num import mostra os erros por linha daquele import

**Research needed before phase**: Sim — spike de escolha da biblioteca de mapa (react-simple-maps vs d3-geo vs Nivo) antes de iniciar o plano do mapa; confirmar restrições LGPD para export de dados sensíveis (restrições alimentares) antes de construir o export de catering.

**UI hint**: yes

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | ✅ Complete | 2026-05-21 |
| 2. Import Pipeline + Auth | 2/4 | 🔄 In Progress | - |
| 3. Dashboard Core | 0/5 | Planned | - |
| 4. Analytics Depth | 0/4 | Not started | - |

---

## Coverage Map

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | ✅ Done |
| FOUND-02 | Phase 1 | ✅ Done |
| FOUND-03 | Phase 1 | ✅ Done |
| FOUND-04 | Phase 1 | ✅ Done |
| FOUND-05 | Phase 1 | ✅ Done |
| IMPORT-01 | Phase 2 (02-03) | Planned |
| IMPORT-02 | Phase 2 (02-03) | Planned |
| IMPORT-03 | Phase 2 (02-03) | Planned |
| IMPORT-04 | Phase 2 (02-03) | Planned |
| IMPORT-05 | Phase 2 (02-03) | Planned |
| IMPORT-06 | Phase 2 (02-03) | Planned |
| IMPORT-07 | Phase 2 (02-01, 02-04) | Planned |
| IMPORT-08 | Phase 2 (02-01, 02-03) | Planned |
| IMPORT-09 | Phase 2 (02-01, 02-04) | Planned |
| IMPORT-10 | Phase 2 (02-04) | Planned |
| IMPORT-11 | Phase 2 (02-03) | Planned |
| AUTH-01 | Phase 2 (02-02) | ✅ Done |
| AUTH-02 | Phase 2 (02-02) | ✅ Done |
| AUTH-03 | Phase 2 (02-02) | ✅ Done |
| OV-01 | Phase 3 | Pending |
| OV-02 | Phase 3 | Pending |
| OV-03 | Phase 3 | Pending |
| OV-04 | Phase 3 | Pending |
| LIST-01 | Phase 3 | Pending |
| LIST-02 | Phase 3 | Pending |
| LIST-03 | Phase 3 | Pending |
| LIST-04 | Phase 3 | Pending |
| LIST-05 | Phase 3 | Pending |
| MBR-01 | Phase 3 | Pending |
| MBR-02 | Phase 3 | Pending |
| MBR-03 | Phase 3 | Pending |
| REV-01 | Phase 3 | Pending |
| REV-02 | Phase 3 | Pending |
| REV-03 | Phase 3 | Pending |
| FORM-01 | Phase 4 | Pending |
| FORM-02 | Phase 4 | Pending |
| FORM-03 | Phase 4 | Pending |
| FORM-04 | Phase 4 | Pending |
| FORM-05 | Phase 4 | Pending |
| GEO-01 | Phase 4 | Pending |
| GEO-02 | Phase 4 | Pending |
| AUDIT-01 | Phase 4 | Pending |
| AUDIT-02 | Phase 4 | Pending |

**Total: 43/43 v1 requirements mapped. No orphans.**

---

## Open Questions (Responder antes de cada fase)

### Antes da Phase 1 e 2
1. Cabeçalhos exatos do Excel ABVCAP — ✅ Resolvido em CONTEXT.md da Phase 2 (KNOWN_HEADERS finalizado, 14 headers).
2. Formato do flag de membro no Excel — ✅ Resolvido: col 44 "Membro ativo" Sim/Não.
3. Taxonomia de tipos de empresa — ✅ Resolvido: mapeamento livre→enum em segment-mapper (Plan 02-03).
4. Formato dos campos multi-select — ✅ Resolvido: colunas booleanas separadas com marcador "x".
5. Dados de formulário estão na mesma worksheet ou aba separada? — ✅ Resolvido: mesma worksheet `Evento_Lista de participantes`.

### Antes da Phase 4
6. Biblioteca de mapa do Brasil — spike de 2h: `react-simple-maps` vs `d3-geo` vs Nivo antes de decidir.
7. LGPD para export de restrições alimentares — confirmar se export operacional de dados sensíveis requer consentimento adicional.

---

*Roadmap criado: 2026-05-21*
*Phase 2 planejada: 2026-05-25*
