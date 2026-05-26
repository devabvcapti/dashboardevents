# Phase 3: Dashboard Core - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-26
**Phase:** 03-dashboard-core
**Areas discussed:** Seletor de evento, Gestão de edições, Import + evento, Lista e export

---

## Seletor de Evento

| Option | Description | Selected |
|--------|-------------|----------|
| Cookie (httpOnly) | Dropdown no sidebar salva o evento em cookie httpOnly. URLs limpas, persistência entre navegações. | ✓ |
| URL param ?edition=id | Bookmarkável mas requer propagar o param em todos os links do sidebar. | |

**User's choice:** Cookie

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-seleciona o mais recente | Cookie vazio → pega a edição com maior ano automaticamente. Zero atrito. | ✓ |
| Mostra aviso para selecionar | Exibe banner pedindo que o usuário escolha um evento. | |

**User's choice:** Auto-seleciona o mais recente

| Option | Description | Selected |
|--------|-------------|----------|
| Abaixo do logo, acima do menu | Dropdown com o nome do evento ativo logo abaixo do logo ABVCAP. | ✓ |
| No footer do sidebar | Seletor discreto no rodapé junto ao tema e logout. | |

**User's choice:** Abaixo do logo, acima do menu

---

## Gestão de Edições

| Option | Description | Selected |
|--------|-------------|----------|
| Página dedicada /dashboard/eventos | Lista eventos, botão para criar novo. Suporta futuro. | ✓ |
| Modal inline no seletor | Botão + Novo evento dentro do dropdown. Mais compacto. | |

**User's choice:** Página dedicada

| Option | Description | Selected |
|--------|-------------|----------|
| Nome + ano | Simples e suficiente. | ✓ |
| Nome + ano + data do evento | Para quando houver dois eventos no mesmo ano. | |

**User's choice:** Nome + ano

---

## Import + Evento

| Option | Description | Selected |
|--------|-------------|----------|
| Mostra o evento ativo, permite trocar | Select no topo permite trocar antes do commit. Evita import no evento errado. | ✓ |
| Só mostra o evento ativo (read-only) | Para trocar, admin precisa ir ao sidebar primeiro. | |

**User's choice:** Mostra o evento ativo, permite trocar

| Option | Description | Selected |
|--------|-------------|----------|
| Bloqueia upload com aviso + link | Import desabilitado. Mensagem com link para criar evento. | ✓ |
| Permite upload mas bloqueia no commit | Pior UX — admin só descobre o erro ao tentar confirmar. | |

**User's choice:** Bloqueia upload com aviso + link para criar evento

---

## Lista e Export

| Option | Description | Selected |
|--------|-------------|----------|
| URL params server-side | /dashboard/inscricoes?page=2&search=... Bookmarkável. | ✓ |
| Estado client (padrão atual) | Mais simples mas não bookmarkável. | |

**User's choice:** URL params server-side

| Option | Description | Selected |
|--------|-------------|----------|
| Excel (.xlsx) com UTF-8 BOM | ExcelJS já instalado. Abre direto no Windows. | ✓ |
| CSV + Excel (ambos) | Mais opções, mais esforço. | |
| CSV com UTF-8 BOM | Simples, zero dependência extra. | |

**User's choice:** Excel (.xlsx) com UTF-8 BOM

---

## Claude's Discretion

- Implementação visual do EditionSelector no sidebar
- Route Handler POST /api/edition/select para setar o cookie
- RPCs adicionais para análise de membros e receita
- Layout das páginas de membros e receita

## Deferred Ideas

- Comparação histórica entre edições — v2 HIST-02
- Editar/deletar edições — útil mas não crítico para v1
- Export com filtros geográficos — Phase 4
