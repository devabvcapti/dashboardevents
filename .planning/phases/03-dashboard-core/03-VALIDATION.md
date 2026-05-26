---
phase: 3
slug: dashboard-core
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-26
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | TypeScript type check + Next.js build |
| **Config file** | `abvcap-congress/tsconfig.json` |
| **Quick run command** | `cd abvcap-congress && npx tsc --noEmit` |
| **Full suite command** | `cd abvcap-congress && npm run build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd abvcap-congress && npx tsc --noEmit`
- **After every plan wave:** Run `cd abvcap-congress && npm run build`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 1 | OV-01 | — | N/A | build | `cd abvcap-congress && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 1 | OV-02 | — | N/A | build | `cd abvcap-congress && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 3-01-03 | 01 | 1 | OV-03 | — | N/A | build | `cd abvcap-congress && npm run build` | ❌ W0 | ⬜ pending |
| 3-01-04 | 01 | 1 | OV-04 | — | N/A | build | `cd abvcap-congress && npm run build` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 2 | LIST-01 | — | URL params, not client state | build | `cd abvcap-congress && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 3-02-02 | 02 | 2 | LIST-02 | — | N/A | build | `cd abvcap-congress && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 3-02-03 | 02 | 2 | LIST-03 | — | N/A | build | `cd abvcap-congress && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 3-02-04 | 02 | 2 | LIST-04 | — | N/A | build | `cd abvcap-congress && npm run build` | ❌ W0 | ⬜ pending |
| 3-03-01 | 03 | 2 | LIST-05 | — | Export respeita filtros ativos | build | `cd abvcap-congress && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 3-04-01 | 04 | 3 | MBR-01 | — | N/A | build | `cd abvcap-congress && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 3-04-02 | 04 | 3 | MBR-02 | — | N/A | build | `cd abvcap-congress && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 3-04-03 | 04 | 3 | MBR-03 | — | N/A | build | `cd abvcap-congress && npm run build` | ❌ W0 | ⬜ pending |
| 3-05-01 | 05 | 3 | REV-01 | — | N/A | build | `cd abvcap-congress && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 3-05-02 | 05 | 3 | REV-02 | — | N/A | build | `cd abvcap-congress && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 3-05-03 | 05 | 3 | REV-03 | — | N/A | build | `cd abvcap-congress && npm run build` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements (TypeScript + Next.js build já presentes no projeto).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| KPI cards exibem valores corretos do banco | OV-01 | Requer dados reais no Supabase | Acessar /dashboard com edição ativa; conferir total, membros%, receita, ticket médio, empresas, estados |
| Paginação server-side aciona nova query | LIST-01 | Requer inspeção de network | DevTools → Network → navegar página 2 → verificar nova request ao servidor |
| Export baixa arquivo com filtros aplicados | LIST-05 | Requer download e abertura do arquivo | Aplicar filtro, clicar exportar, abrir Excel e confirmar rows correspondem à visão filtrada |
| Histograma de receita é legível | REV-03 | Julgamento visual | Acessar /dashboard/receita, confirmar barras do histograma com faixas de valor |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
