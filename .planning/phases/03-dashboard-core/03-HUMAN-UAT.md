---
status: partial
phase: 03-dashboard-core
source: [03-VERIFICATION.md]
started: 2026-05-26T00:00:00Z
updated: 2026-05-26T00:00:00Z
---

## Current Test

[aguardando verificação humana]

## Tests

### 1. Troca de edição re-fetcha dados
expected: Selecionar outra edição no EditionSelector do sidebar chama router.refresh() e os KPIs/gráficos atualizam para refletir os dados da nova edição selecionada
result: [pending]

### 2. Paginação server-side real
expected: Navegar entre páginas na lista de inscrições dispara uma nova requisição HTTP ao servidor (visível em Network tab), não filtra dados em memória no cliente
result: [pending]

### 3. Export Excel funciona corretamente
expected: Botão de exportar gera um .xlsx válido com os filtros ativos aplicados, formatação BRL na coluna Valor, e codificação UTF-8 correta (acentos preservados)
result: [pending]

### 4. Gráfico de barras horizontais ordenado desc
expected: Gráfico "Tipo de Empresa" na Visão Geral renderiza barras horizontais ordenadas do maior para o menor count, com label "count (pct%)" à direita de cada barra
result: [pending]

### 5. Histograma de receita com 6 faixas
expected: Página Análise de Receita mostra histograma com as 6 faixas (Gratuito, R$1–500, R$501–1000, R$1001–2000, R$2001–3000, Acima de R$3000) com dados reais do evento ativo
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
