# Requirements: ABVCAP Congress Dashboard

**Definido:** 2026-05-21
**Core Value:** Transformar o Excel de inscrições em inteligência acionável sobre quem é o público do Congresso ABVCAP — perfil, membros vs não membros, e receita por categoria.

---

## v1 Requirements

### Foundation (Infraestrutura)

- [ ] **FOUND-01**: Schema do banco substituído — tabelas `editions`, `import_jobs`, `participants`, `form_responses` com tipos corretos (MEMBRO/NAO_MEMBRO, segmentos de empresa PE/VC-aware, campos `TEXT[]` para multi-selects)
- [ ] **FOUND-02**: Variável de ambiente `SUPABASE_SERVICE_ROLE_KEY` sem prefixo `NEXT_PUBLIC_`; todas as queries server-side usam service role
- [ ] **FOUND-03**: Tipos TypeScript regenerados a partir do novo schema (`lib/database.types.ts`)
- [ ] **FOUND-04**: Queries SQL com `GROUP BY` no banco — sem agregação in-memory em `lib/data.ts`
- [ ] **FOUND-05**: Edição 2025 seedada na tabela `editions` como edição atual

### Import de Excel

- [ ] **IMPORT-01**: Admin faz upload de arquivo `.xlsx` pela interface; arquivo é enviado para Route Handler (`/api/import/preview`)
- [ ] **IMPORT-02**: Sistema detecta automaticamente linha de cabeçalho (scoring das 5 primeiras linhas vs `KNOWN_HEADERS`)
- [ ] **IMPORT-03**: Células mescladas são achatadas antes do parse
- [ ] **IMPORT-04**: UI de mapeamento de colunas — admin confirma ou corrige mapeamento Excel → schema
- [ ] **IMPORT-05**: Validação server-side com Zod `safeParse` — coleta todos os erros por linha antes de escrever
- [ ] **IMPORT-06**: Preview dos dados validados com resumo (N linhas válidas, N erros) antes de confirmar
- [ ] **IMPORT-07**: Importação confirmada executa upsert em batches de 500 linhas via Postgres RPC (atomicidade)
- [ ] **IMPORT-08**: Normalização de dados no parse: datas sem fuso (`cellDates:false`), moeda BRL (`parseBRLCurrency()`), CPF com zero inicial (`padStart(11,'0')`), sanitização de formula injection
- [ ] **IMPORT-09**: Deduplicação por `(email, edition_id)` — reimportação do mesmo arquivo atualiza registros existentes
- [ ] **IMPORT-10**: Registro de auditoria criado em `import_jobs` com status, contagens (inseridos/atualizados/ignorados/erros) e log de erros por linha
- [ ] **IMPORT-11**: Erros de validação exibidos em português com número da linha Excel para fácil correção

### Visão Geral (Overview)

- [x] **OV-01**: KPI cards: total inscritos, membros (count + %), não-membros (count + %), receita total, ticket médio
- [x] **OV-02**: KPI cards adicionais: empresas únicas, estados representados
- [x] **OV-03**: Donut chart Membros vs Não-Membros com label central mostrando total
- [x] **OV-04**: Gráfico de barras horizontais por tipo de empresa (sorted desc, count + %)

### Lista de Participantes

- [x] **LIST-01**: Tabela paginada server-side (25/50/100 por página) com total de resultados visível
- [x] **LIST-02**: Busca por nome, e-mail ou empresa (debounced, atualiza contagem)
- [x] **LIST-03**: Filtros: tipo de ingresso (MEMBRO/NAO_MEMBRO), tipo de empresa, estado, faixa de valor
- [x] **LIST-04**: Ordenação por qualquer coluna
- [x] **LIST-05**: Export da visão filtrada atual para CSV/Excel (UTF-8 BOM para compatibilidade Windows)

### Análise de Membros

- [ ] **MBR-01**: Breakdown detalhado: membros vs não-membros por tipo de empresa
- [ ] **MBR-02**: Breakdown por segmento de empresa dentro de cada grupo (membro/não-membro)
- [ ] **MBR-03**: Percentual de adesão por tipo de empresa (quais segmentos têm maior taxa de associação)

### Análise de Receita

- [ ] **REV-01**: Receita total e ticket médio geral
- [ ] **REV-02**: Receita e ticket médio por tipo de ingresso (MEMBRO/NAO_MEMBRO)
- [ ] **REV-03**: Distribuição de valores de ingresso (histograma)

### Análise de Formulário

- [ ] **FORM-01**: Charts de temas de interesse (multi-select aware — denominador ≠ total inscritos)
- [ ] **FORM-02**: Charts de canais de comunicação preferidos
- [ ] **FORM-03**: Breakdown de opt-in de comunicação ABVCAP
- [ ] **FORM-04**: Summary de interesse em eventos do ecossistema
- [ ] **FORM-05**: Contagem de restrições alimentares por categoria + export operacional para catering

### Análise Geográfica

- [ ] **GEO-01**: Ranking de estados por número de inscritos
- [ ] **GEO-02**: Mapa coroplético do Brasil com contagem por estado (escala log, GeoJSON IBGE)

### Histórico de Imports

- [ ] **AUDIT-01**: Lista de imports realizados (arquivo, data, operador, linhas importadas, erros)
- [ ] **AUDIT-02**: Detail de cada import com erros por linha para debugging

### Autenticação

- [ ] **AUTH-01**: Acesso ao dashboard protegido por login (Supabase Auth)
- [ ] **AUTH-02**: Apenas usuários com `app_metadata.role = "admin"` acessam o sistema
- [ ] **AUTH-03**: Sessão persiste entre refreshes do browser

---

## v2 Requirements

### Comparação Histórica

- **HIST-01**: Importação de edições anteriores (Congresso 2023, 2024) com seletor de edição
- **HIST-02**: Gráficos comparando indicadores entre edições (crescimento de inscritos, mix de membros, receita)
- **HIST-03**: Tracking de participantes recorrentes (mesma empresa/e-mail em múltiplas edições)

### Relatórios

- **RPT-01**: Export PDF de relatório analítico com KPIs + gráficos (header/footer ABVCAP)
- **RPT-02**: Presets de filtros salvos (combinações de filtros reutilizáveis)

### Engagement

- **ENG-01**: Scoring de engajamento por empresa (frequência de participação, diversidade de cargos)

---

## Out of Scope

| Feature | Motivo |
|---------|--------|
| Gestão de inscrições (criar/editar/cancelar) | Operação feita na plataforma de origem ABVCAP |
| Check-in / QR code | Plataforma de origem gerencia presença |
| Portal de participantes | Dashboard é exclusivamente admin |
| Integração em tempo real com plataforma de origem | Import manual por Excel é o modelo adotado |
| Self-service de usuários (cadastro público) | Acesso restrito à equipe ABVCAP |
| Notificações / e-mail para participantes | Fora do escopo analítico |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01–05 | Phase 1 | Pending |
| IMPORT-01–11 | Phase 2 | Pending |
| AUTH-01–03 | Phase 2 | Pending |
| OV-01–04 | Phase 3 | Pending |
| LIST-01–05 | Phase 3 | Pending |
| MBR-01–03 | Phase 3 | Pending |
| REV-01–03 | Phase 3 | Pending |
| FORM-01–05 | Phase 4 | Pending |
| GEO-01–02 | Phase 4 | Pending |
| AUDIT-01–02 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 40 total
- Mapeados para fases: 40
- Não mapeados: 0 ✓

---
*Requirements definidos: 2026-05-21*
*Última atualização: 2026-05-21 após inicialização*
