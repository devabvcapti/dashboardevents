# Project State

## Current Status

**Phase:** Pre-execution — ready to start Phase 1
**Last action:** GSD initialization complete (PROJECT.md + REQUIREMENTS.md + ROADMAP.md + research + codebase map)
**Next step:** `/gsd-plan-phase 1` — Foundation (schema replacement + security fix)

## Roadmap Progress

| Phase | Title | Status |
|-------|-------|--------|
| 1 | Foundation (schema, segurança, tipos, queries SQL) | ⏳ Not started |
| 2 | Import Pipeline + Autenticação | ⏳ Not started |
| 3 | Dashboard Core (KPIs, membros, receita, lista) | ⏳ Not started |
| 4 | Analytics Depth (formulário, mapa, export) | ⏳ Not started |

## Key Artifacts

- `.planning/PROJECT.md` — Contexto e requirements do projeto
- `.planning/REQUIREMENTS.md` — 40 requirements v1 rastreáveis
- `.planning/ROADMAP.md` — 4 fases com planos e critérios de sucesso
- `.planning/research/SUMMARY.md` — Síntese da pesquisa de domínio
- `.planning/codebase/` — 7 documentos de mapeamento do codebase existente
- `abvcap-congress/` — App Next.js scaffoldado (schema precisa ser substituído na Fase 1)

## Critical Pre-Phase-1 Context

O codebase existente (`abvcap-congress/`) tem:
- Schema errado: `ticket_type` com LP/GP/APOIADOR em vez de MEMBRO/NAO_MEMBRO
- Chave Supabase com `NEXT_PUBLIC_` potencialmente expondo service role
- Agregações in-memory em `lib/data.ts` (load full table + JS reduce)
- Sem tabela de edições, sem `form_responses`, sem `import_jobs`

A Fase 1 resolve tudo isso antes de construir funcionalidades.

---
*Initialized: 2026-05-21*
