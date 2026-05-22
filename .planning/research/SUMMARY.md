# Research Summary — ABVCAP Congress Dashboard

## Executive Summary

Dashboard de analytics admin-only. Fluxo unidirecional: Excel upload → Supabase PostgreSQL → gráficos e tabelas server-rendered. O desafio central **não é complexidade arquitetural** — é qualidade de dados. Arquivos Excel brasileiros carregam peculiaridades suficientes (moeda BRL, zeros iniciais em CPF, células mescladas, datas com fuso) que um pipeline ingênuo vai corromper dados silenciosamente.

**O schema existente precisa de substituição completa** antes de construir qualquer coisa significativa.

---

## Decisões Confirmadas pela Pesquisa

| Decisão | Racional | Confiança |
|---------|---------|-----------|
| `exceljs` em vez de `xlsx`/SheetJS | SheetJS npm frozen com CVE; CDN sem checksum | MEDIUM |
| Route Handler em vez de Server Action para upload | Server Actions têm limite de 1 MB + proxy layer que trunca binários | HIGH |
| Import em 2 fases: `/preview` depois `/commit` | Separa parse+validação da escrita; evita writes parciais | HIGH |
| Zod `safeParse` para validação | Coleta todos os erros por linha (não para no primeiro) | HIGH |
| `.upsert()` em batches de 500 linhas | PostgREST 1 MB request limit; validado com ~23k linhas | MEDIUM |
| Postgres RPC para atomicidade | `supabase-js` não suporta transações multi-statement | HIGH |
| UI de mapeamento de colunas customizada | Formato ABVCAP é estável; não justifica dependência Chakra UI | MEDIUM |
| Colunas flat em vez de EAV | EAV transforma cada GROUP BY num self-join | HIGH |
| Colunas flat em vez de JSONB puro | PostgREST não agrega/filtra sub-keys JSONB | HIGH |
| Tabela `editions` + FK `edition_id` | Adiciona Congresso 2026 com um INSERT; sem migração de schema | HIGH |
| Split `participants` / `form_responses` | Ciclos de atualização diferentes; permite schema de formulário evoluir por edição | HIGH |
| `SUPABASE_SERVICE_ROLE_KEY` sem `NEXT_PUBLIC_` | Chave pública = qualquer DevTools tem acesso total ao banco | HIGH |
| Queries SQL `GROUP BY` em vez de agregação in-memory | `lib/data.ts` atual degrada em 500+ linhas | HIGH |

---

## Schema Correto (substituição total do existente)

**Ordem de migração:**
1. `editions` (sem FKs)
2. `import_jobs` (FK → editions)
3. `participants` (FK → editions + import_jobs)
4. `form_responses` (FK → participants + editions)

Enums novos: `ticket_membership` (`MEMBRO`, `NAO_MEMBRO`), `company_segment` (PE/VC aware), `import_status`

Campos TEXT[] com índices GIN para: `temas_interesse`, `canais_preferidos`

---

## Features por Prioridade MVP

### Fase 1 — Obrigatório
- Import Excel 5 etapas (Upload → Mapeamento → Validação → Preview → Confirmar) com erros por linha em PT-BR
- KPI cards: total inscritos, membros vs não-membros (% e absoluto), receita total, ticket médio, empresas únicas, estados representados
- Lista de participantes: busca, multi-filtro, sort, paginação server-side (25/50/100), export CSV/Excel

### Fase 2 — Alto valor
- Donut chart membros vs não-membros (label central)
- Barras horizontais por tipo de empresa (sorted desc)
- Mapa coroplético do Brasil (GeoJSON IBGE, escala log para evitar dominância SP)
- Charts de temas de interesse e canais de comunicação (multi-select aware)
- Resumo de restrições alimentares + export para catering
- Histórico de imports (auditoria)

### Defer v2+
- Comparação histórica entre edições
- Funnel de conversão de membros
- Export PDF de relatório analítico

---

## Top Armadilhas de Implementação

| # | Armadilha | Impacto | Mitigação |
|---|-----------|---------|-----------|
| 1 | **Data serial Excel → dia errado** | Datas de inscrição erradas sem erro | `cellDates: false` + UTC manual |
| 2 | **Moeda BRL silenciosamente trunca** | `R$ 2.500,00` → `2.5` | `parseBRLCurrency()` dedicada |
| 3 | **Chave service_role com `NEXT_PUBLIC_`** | Qualquer usuário tem acesso total ao banco | Auditar env vars antes do primeiro import real |
| 4 | **Células mescladas deslocam colunas** | Dados no campo errado silenciosamente | Flatten merge ranges antes de parsear |
| 5 | **CPF perde zero inicial** | Deduplicação falha para ~10% dos CPFs | `padStart(11, '0')` |
| 6 | **Formula injection** | `=HYPERLINK(...)` executa no Excel do admin | Prefixar strings começando com `= + - @ ` |
| 7 | **XXE / XLSX malicioso** | CVE-2024-45293 | Magic bytes validation + size cap |
| 8 | **Linhas fantasmas com formatação** | Rows extras de erro ao parsear | Filter rows onde todos os campos são null/undefined |

---

## Perguntas Abertas (responder antes/durante o desenvolvimento)

1. **Cabeçalhos exatos do Excel ABVCAP** — schema Zod depende disso. Obter arquivo real antes de construir a Fase 1.
2. **Formato do flag de membro** — booleano (Sim/Não) ou join com lista de associados separada?
3. **Taxonomia de tipos de empresa** — confirmar que os enums propostos batem com o formulário real.
4. **Formato dos campos multi-select** — vírgula-separados numa célula, colunas separadas, ou linhas separadas?
5. **Tabs separadas para dados do formulário?** — ou tudo na mesma worksheet?
6. **LGPD para export de restrições alimentares** — confirmar antes de construir.
7. **Biblioteca de mapa do Brasil** — Recharts (sem suporte), Nivo (maior bundle) ou d3/Visx (mais trabalho). Spike antes da Fase 3.

---
*Sintetizado em 2026-05-21*
