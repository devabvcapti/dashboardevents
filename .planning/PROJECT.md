# ABVCAP Congress Dashboard

## What This Is

Dashboard de inteligência de dados para o Congresso ABVCAP. Recebe dados exportados em Excel da plataforma própria da ABVCAP (inscrições + respostas de formulário) e transforma em visualizações e análises estruturadas para estudo do perfil do público, comportamento dos associados e desempenho do evento.

Ferramenta admin-only usada pela equipe organizadora da ABVCAP.

## Core Value

Transformar o Excel de inscrições em inteligência acionável sobre quem é o público do Congresso ABVCAP — perfil, membros vs não membros, e receita por categoria.

## Requirements

### Validated

- ✓ Scaffold Next.js 16 + Supabase + shadcn/ui — existing
- ✓ Layout com sidebar de navegação (4 seções) — existing
- ✓ Página de Visão Geral com KPIs (total inscritos, confirmados, pendentes) — existing
- ✓ Página de Inscrições com tabela filtrável — existing
- ✓ Página de Ingressos com breakdown por categoria — existing
- ✓ Página de Análise de Público com gráficos de tipo de empresa — existing

### Active

- [ ] **Importação de Excel** — Upload de arquivo .xlsx exportado da plataforma ABVCAP, mapeamento de colunas, validação e carga no Supabase
- [ ] **Modelo de dados revisado** — Tabela `participants` com campos: nome, empresa, tipo de ingresso (MEMBRO / NÃO MEMBRO), valor do ingresso; tabela `form_responses` com campos ricos do formulário
- [ ] **Campos do formulário** — Cargo, área de atuação, tipo/porte da empresa (segmento, AUM), origem geográfica (estado/cidade), opt-in de comunicação, canais preferidos, temas de interesse, interesse em eventos do ecossistema, restrição alimentar
- [ ] **Dashboard Membros vs Não Membros** — Breakdown, taxa de associação, perfil comparativo entre os dois grupos
- [ ] **Dashboard de Receita** — Valores arrecadados por categoria de ingresso, ticket médio, total
- [ ] **Dashboard de Perfil do Público** — Cargo, tipo de empresa, porte, origem geográfica (mapas/gráficos)
- [ ] **Dashboard de Formulário** — Análise das respostas: temas de interesse, canais de comunicação, opt-ins, restrições alimentares
- [ ] **Autenticação básica** — Acesso protegido por login simples (sem self-service, apenas equipe ABVCAP)

### Out of Scope

- Check-in no evento / QR code — a plataforma de origem já gerencia presença
- Gestão de inscrições (criar, editar, cancelar) — operação na plataforma de origem
- Portal de participantes — dashboard é exclusivamente admin
- Comparação histórica entre edições — foco no congresso atual (2025); histórico é fase futura
- Integração em tempo real — importação manual por Excel é o modelo adotado

## Context

- A plataforma de origem (própria ABVCAP) gerencia o ciclo completo de inscrições e coleta de formulários; o dashboard é downstream — consome e analisa os dados.
- O Excel exportado contém dados de inscrição + respostas de formulário em colunas. O mapeamento exato das colunas será definido no momento da primeira importação.
- O formulário captura dados ricos: perfil profissional, tipo/porte da empresa, interesse nos temas do congresso, origem geográfica, opt-in de comunicação, canais preferidos, temas de interesse, interesse em eventos do ecossistema e restrições alimentares.
- Tipo de ingresso é binário: **MEMBRO** (associado ABVCAP) vs **NÃO MEMBRO**.
- O foco analítico é o Congresso ABVCAP 2025. Comparação histórica com edições anteriores é objetivo futuro.
- Codebase já scaffoldado em `abvcap-congress/` com modelo de dados inicial que precisará ser revisado para refletir o modelo correto.

## Constraints

- **Stack**: Next.js 16 App Router + Supabase PostgreSQL + shadcn/ui + Tailwind v4 + Recharts — já instalado e buildando
- **Dados**: Entrada exclusivamente via importação de Excel; sem formulários de cadastro no dashboard
- **Acesso**: Admin-only; a equipe ABVCAP acessa diretamente (sem self-service de participantes)
- **Idioma**: Português (pt-BR) em toda a interface

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Excel import como entrada de dados | Plataforma de origem já gerencia inscrições; importar é mais simples que integrar via API | — Pending |
| MEMBRO / NÃO MEMBRO como tipo de ingresso | Binário simples reflete a realidade da ABVCAP (associados vs não associados) | — Pending |
| Modelo separado: participants + form_responses | Separa dados de inscrição (estruturados) dos dados de formulário (variáveis por edição) | — Pending |
| Sem comparação histórica no v1 | Foco no evento atual; histórico requer normalização de dados entre edições | — Pending |

## Evolution

Este documento evolui a cada transição de fase.

**Após cada fase:**
1. Requirements implementados → mover para Validated
2. Novos requirements descobertos → adicionar em Active
3. Decisões tomadas → registrar em Key Decisions

---
*Last updated: 2026-05-21 após inicialização do projeto*
