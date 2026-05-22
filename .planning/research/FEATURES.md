# Feature Landscape: ABVCAP Congress Analytics Dashboard

**Domain:** Event/conference analytics dashboard — association (B2B, private equity & venture capital)
**Researched:** 2026-05-21
**Analyst Persona:** ABVCAP staff analyst reviewing annual congress participant data post-event, preparing reports for leadership and board.

---

## Table Stakes

Features the analyst expects. Missing = dashboard feels incomplete or unprofessional.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Total participant count (headline KPI) | First question leadership asks | Low | Prominent, above the fold |
| Member vs. non-member split | Core to ABVCAP's mission tracking | Low | Donut chart + absolute numbers |
| Registration-to-attendance rate | Reveals operational effectiveness | Low | Requires check-in data or attendance flag in Excel |
| Ticket revenue total | Financial accountability | Low | Sum + breakdown by ticket type |
| Company type distribution | Who attended: GP, LP, advisor, etc. | Low-Med | Horizontal bar chart |
| Geographic origin breakdown | SP-centric vs. national reach | Med | Brazil state map + ranked list |
| Excel import with validation feedback | Primary data entry mechanism | Med | Multi-stage flow with error reporting |
| Participant list with search and filter | Day-to-day lookup tool | Med | Server-side pagination |
| CSV/Excel export of filtered data | For sharing with board, sponsors, caterers | Low | Scoped to current filters |
| Empty states with actionable guidance | Before first import | Low | "Import your Excel file to get started" |

## Differentiators

Features that make the dashboard genuinely useful for ABVCAP's specific context — not just generically "nice to have."

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Member recurrence tracking | "How many attendees came back from last year?" | High | Requires matching by CPF or email across years |
| Member conversion funnel | Non-members who later became members after congress | High | Requires CRM/membership data join |
| Topic interest ranking (from form) | Informs next year's agenda | Low-Med | Ranked bar chart from multi-select field |
| Communication channel preferences | Guides marketing investment | Low | Bar or grouped bar by channel |
| Company segment heatmap | Maps PE/VC segment concentration | Med | Segment x company size matrix |
| Import history / audit log | "Which file was loaded, when, by whom?" | Med | Table with filename, timestamp, row count, uploader |
| Dietary restriction summary | Operational export for catering | Low | Counts by category + exportable list |
| Year-over-year comparison | Growth/decline across congress editions | High | Only once multi-year data exists |
| Engagement score by company type | Are LPs or GPs more active participants? | High | Composite metric, needs definition |
| Saved filter presets | "Show me SP-based LPs who are members" | Med | Named filter sets per user session |

## Anti-Features

Features to explicitly NOT build in this phase — they add complexity without proportional value at current scale.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Real-time live check-in tracking | ABVCAP data is imported post-event from Excel, not live-captured | Keep it batch-import focused |
| Heatmap of physical movement in venue | Requires hardware (beacons/RFID) | Out of scope |
| NPS / post-event survey builder | Separate product category; data already collected externally | Import responses only, visualize them |
| Multi-event concurrent dashboard | Single congress edition per import cycle | Year filter suffices when multi-year data matures |
| Public attendee-facing views | Admin-only per spec | No public sharing, no attendee portals |
| Social media sentiment tracking | Unrelated to participant data | Out of scope |
| Predictive attendance modeling | Insufficient training data at early stage | Defer to after 3+ congress editions |

---

## KPIs: What the Analyst Actually Needs Day-to-Day

### Headline KPIs (always visible, top of dashboard)

1. **Total Registrants** — raw count from imported file
2. **Member Attendance Rate** — members / total, shown as % with absolute
3. **Non-Member Count** — absolute number (new audience opportunity)
4. **Total Ticket Revenue** — sum of all ticket values
5. **Average Ticket Value** — revenue / registrants, broken down by ticket type
6. **Unique Companies Represented** — deduplicated company count
7. **States Represented** — geographic spread count

### Operational KPIs (secondary, analyst-level detail)

- Dietary restriction headcount by category (logistics output for catering)
- Response completeness rate (% of forms fully filled)
- Top 3 topic interests (from form checkbox responses)
- Preferred communication channel distribution

---

## Chart Type Recommendations by Data Type

### Member vs. Non-Member Breakdown

**Use: Donut chart with center label**

- Two categories only — donut is optimal for part-to-whole with two segments
- Center label shows total (e.g. "847 participants")
- Segment labels show both absolute count AND percentage (e.g. "Membros: 612 / 72%")
- Color: ABVCAP brand primary for members, neutral gray for non-members
- Avoid pie chart — donut allows center-label context at no extra complexity cost

### Company Type Distribution (GP, LP, Advisor, Corporate, Government, etc.)

**Use: Horizontal bar chart, sorted descending**

- More than 4–5 categories = bar chart beats donut/pie
- Horizontal orientation allows full label names without rotation
- Sort by frequency so most common type is always at top
- Show both count and percentage on each bar

### Company Size Distribution (by AUM, headcount, or tier)

**Use: Vertical bar chart (histogram-style)**

- Ordinal categories (Pequeno / Medio / Grande / Institucional) map well to vertical bars
- If using AUM ranges, a histogram communicates distribution shape
- Avoid stacked bars unless comparing two variables simultaneously

### Geographic Origin — Brazil States

**Use: Brazil choropleth map (SVG) + ranked list table below**

- Color intensity = participant count per state (light to ABVCAP brand color)
- Tooltip on hover: state name, count, % of total
- Ranked list underneath for precise reading (SP: 412, RJ: 98, MG: 61…)
- Data source for state boundaries: IBGE GeoJSON (br-atlas or similar)
- Important: SP will dominate — use a log scale or "others" grouping to avoid SP washing out all other states visually

### Topic Interest Rankings (multi-select checkbox field)

**Use: Horizontal bar chart sorted by frequency**

- Multi-select means one participant may contribute to multiple bars — note this in subtitle: "Multiple selections allowed"
- Sort descending so most popular topic is always at top
- Show response count, not just % (since denominator is not total registrants)
- If more than 8 topics: show top 8 with "Ver todos" expand

### Communication Preferences

**Use: Horizontal bar chart (same treatment as topic interests)**

- Categories likely: Email, WhatsApp, LinkedIn, Telefone, etc.
- Mutually exclusive OR multi-select — confirm from form logic before choosing denominator

### Dietary Restrictions

**Use: Simple count table or small horizontal bar chart**

- Primary output is operational (catering list), not analytical — table is often more useful than chart here
- Categories: Vegetariano, Vegano, Sem gluten, Sem lactose, Nenhuma/Sem restricao, Outra
- "Outra" requires drill-down to free-text list — exportable

---

## Data Import: UX Pattern Specification

### Architecture: Five-Stage Flow

All five stages should be visible as a step indicator (breadcrumb-style progress) at the top of the import modal/page.

**Stage 1 — Pre-Import Expectations**
- Show accepted formats: `.xlsx`, `.xls`, `.csv`
- Show maximum file size (recommend: 10MB)
- Show required columns with exact expected header names
- Provide a downloadable template Excel file matching exact column spec
- Show what happens to existing data (replace vs. append — clarify policy)

**Stage 2 — File Upload**
- Drag-and-drop zone + click-to-browse button
- Show file name and size immediately after selection
- Progress bar with row-count feedback during processing: "Processando linha 423 de 847..."
- Never show a bare spinner for uploads over 2 seconds — users assume it crashed
- On upload completion: brief success animation before advancing

**Stage 3 — Column Mapping**
- Auto-match uploaded column headers to system fields
- Show confidence indicator per column: matched / unmatched / manual
- Show 3–5 sample values from each uploaded column so analyst can verify
- Allow manual remapping via dropdown
- Required fields marked with asterisk; warn if required fields are unmapped

**Stage 4 — Validation**
- Row-level error reporting: "Linha 37: Email invalido — 'joao@' nao e um endereco de email valido"
- Color coding: green (valid), yellow (warning/empty optional field), red (error/blocking)
- Filter toggle: "Mostrar apenas linhas com erros"
- Allow inline correction of individual values directly in validation view
- Show summary before proceeding: "842 linhas validas, 5 com erros — como deseja prosseguir?"
- Offer: Import valid rows only / Fix errors and re-import / Cancel

**Stage 5 — Confirmation and Result**
- Show import summary: rows imported, rows skipped, new records, updated records
- Timestamp and operator name recorded in import log
- "Desfazer importacao" option (soft-delete / restore previous state) within a time window (e.g., 30 minutes)
- Navigate to dashboard after confirmation

### Error States
- Generic "Importacao falhou" messages are forbidden — always specify what failed and where
- If Excel file has merged cells or irregular formatting, show a human-readable explanation, not a stack trace
- If file exceeds size limit: show limit AND suggest "use CSV for files over 5MB"

---

## Participant List Table: Design Specification

### Column Set (default visible)

| Column | Type | Notes |
|--------|------|-------|
| Nome completo | Text | Primary identifier |
| Empresa | Text | Company name |
| Tipo de empresa | Badge/tag | GP, LP, Advisor, etc. |
| Membro ABVCAP | Boolean badge | "Membro" / "Nao membro" |
| Estado (UF) | Text | SP, RJ, MG... |
| Tipo de ingresso | Text | VIP, Regular, Cortesia... |
| Valor pago | Currency | R$ formatted |
| Data de cadastro | Date | dd/mm/yyyy |
| Acoes | Actions | View, Export row |

### Interaction Patterns

**Search:**
- Global text search across: name, company, email
- Debounced (300ms) — no submit button required
- Highlight matched text in results
- Show result count: "Mostrando 47 de 847 participantes"

**Filtering:**
- Filter panel (collapsible sidebar or inline filter row)
- Filter types by column:
  - Membro ABVCAP: checkbox (Membro / Nao membro)
  - Tipo de empresa: multi-select dropdown
  - Estado: multi-select dropdown
  - Tipo de ingresso: multi-select dropdown
  - Valor pago: range slider (min/max)
  - Data de cadastro: date range picker
- Active filter chips above table — click chip to remove individual filter
- "Limpar todos os filtros" button when any filter is active
- Filter state persists within session (survive page navigation)

**Sorting:**
- Click column header to sort
- Second click reverses direction
- Chevron indicator (up/down) in header
- Default sort: data de cadastro descending (most recent first)
- Multi-column sort: shift+click (power-user feature)

**Pagination:**
- Default: 25 rows per page
- Options: 10 / 25 / 50 / 100
- Show: "Linhas 26–50 de 847" (updates when filtered)
- Server-side pagination for datasets over 500 rows
- Jump-to-page input for large datasets

**Row Actions:**
- Row click: expand inline detail panel (all fields) OR navigate to participant detail page
- Hover: reveal action icons (view, copy email)
- Bulk select: checkbox column, "Selecionar todos na pagina" and "Selecionar todos 847"
- Bulk actions available: Export selected, (future: bulk tag, bulk email)

**Column Management:**
- "Configurar colunas" button: show/hide columns
- Column freeze: Nome completo always sticky left
- Density toggle: Compacto / Padrao / Espacoso (40px / 48px / 56px row height)
- State persists in localStorage per user

**Empty States:**
- No data yet: "Nenhum participante importado. Importe sua planilha para comecar." + import CTA button
- No search results: "Nenhum resultado para '[query]'. Tente outros termos ou limpe os filtros." + clear filters button
- Filtered to zero: same as above but emphasize filter clearing

---

## Export Patterns

### Export Formats and When to Use Each

| Format | Use Case | Recommendation |
|--------|----------|---------------|
| CSV | Data processing, CRM imports, developer use | Always available; UTF-8 BOM for Excel compat on Windows |
| XLSX | Board reports, sharing with non-technical staff | Preferred format for Brazilian enterprise context |
| PDF | Printed reports, formal deliverables to sponsors | Charts + summary only (not raw data table) |

### What Should Be Exportable

**Full Participant List Export:**
- Exports exactly the currently filtered/searched view
- All columns including hidden ones OR user-selected columns
- Respects current sort order
- Filename: `ABVCAP_Congress_2025_Participantes_[timestamp].xlsx`

**Analytics Summary Export (PDF):**
- Headline KPIs block
- All charts as static images
- Generated date and import timestamp as footer
- ABVCAP logo and congress edition in header
- Intended for: board presentations, sponsor decks

**Dietary Restrictions Export (operational):**
- Filtered list of all participants WITH dietary restrictions
- Columns: Nome, Empresa, Restricao(oes), Observacoes livres
- Sorted alphabetically
- Filename: `ABVCAP_Congress_2025_Restricoes_Alimentares.xlsx`
- Primary consumer: event catering team

**Topic Interests Export:**
- Aggregated counts by topic (chart data)
- Raw rows: participant + their selected topics (unpivoted)
- Used for: programming team, speaker selection next year

### Export UX Patterns

- Export button placement: top-right of each section (table, chart, full dashboard)
- Show format options in a small dropdown menu (not a modal): CSV / Excel / PDF
- For large exports (>500 rows): trigger background job, show "Preparando exportacao..." toast, then "Download pronto" with link
- Never block UI during export generation
- Include export in import log/audit trail: "Exportado por [user] em [timestamp]"

---

## Feature Dependencies

```
Excel Import (Stage 1-5) --> All charts render
Excel Import --> Participant list populates
Member flag in data --> Member vs. Non-member chart
Company type field --> Company type chart + filtering
Estado (UF) field --> Geographic map
Form responses (interests, preferences, dietary) --> Form analysis section
Ticket value field --> Revenue KPIs

Import history --> Audit log view
Multi-year imports --> YoY comparison (deferred)
```

---

## MVP Recommendation

**Build first (Phase 1):**
1. Excel import with 5-stage flow and row-level validation
2. Headline KPI cards (count, member split, revenue)
3. Participant list with search, filter, sort, pagination
4. Member vs. non-member donut chart
5. Company type horizontal bar chart
6. CSV/Excel export of filtered participant list

**Build second (Phase 2):**
7. Geographic origin choropleth map (Brazil states)
8. Topic interest and communication preference bar charts
9. Dietary restriction summary + operational export
10. Import history / audit log
11. PDF export of analytics summary

**Defer:**
- Year-over-year comparison: requires 2+ congress datasets
- Member conversion funnel: requires CRM join
- Engagement scoring: requires definition and composite data
- Saved filter presets: useful but not day-1 critical

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| KPI selection | HIGH | Verified against multiple event analytics and association analytics sources |
| Chart type recommendations | HIGH | Backed by data visualization best practices literature (NN/G, luzmo, fusioncharts) |
| Import UX patterns | HIGH | Direct source verification from importcsv.com and logrocket UI patterns guide |
| Table UX patterns | HIGH | NN/G data tables research + Pencil & Paper enterprise tables guide verified |
| Export formats | MEDIUM | Standard industry practice; PDF layout specifics depend on chosen chart library |
| Brazil map implementation | MEDIUM | GeoJSON data from IBGE/br-atlas confirmed; specific React library (Recharts vs. Nivo vs. d3) not yet chosen |
| ABVCAP-specific segment taxonomy | LOW | GP/LP/Advisor structure inferred from PE/VC industry norms; actual ABVCAP form fields need confirmation |

---

## Gaps to Address in Phase-Specific Research

- Confirm actual column names and data structure from ABVCAP's existing Excel template
- Confirm whether "membro" flag is a boolean in the spreadsheet or a lookup against a separate membership list
- Define the exact company type taxonomy ABVCAP uses (may differ from GP/LP convention)
- Clarify whether dietary restriction and topic interest data are in the same sheet or separate tabs
- Choose React charting library: Recharts (simpler) vs. Nivo (richer) vs. Visx/d3 (most flexible) — tradeoffs differ significantly for the Brazil choropleth map requirement
- Confirm catering export recipient and whether LGPD (Lei Geral de Protecao de Dados) constraints apply to sharing dietary data with third-party vendors

---

## Sources

- [In-Person Event KPIs You Need to Track in 2025 - vFairs](https://www.vfairs.com/blog/event-kpis/)
- [Event Management Dashboard: KPIs, Templates & Best Practices - UsedataBrain](https://www.usedatabrain.com/blog/event-management-dashboard)
- [Data import UX: designing spreadsheet imports users don't hate - ImportCSV](https://www.importcsv.com/blog/data-import-ux)
- [UI patterns for async workflows, background jobs, and data pipelines - LogRocket](https://blog.logrocket.com/ux-design/ui-patterns-for-async-workflows-background-jobs-and-data-pipelines/)
- [Data Table Design UX Patterns & Best Practices - Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables)
- [Data Tables: Four Major User Tasks - Nielsen Norman Group](https://www.nngroup.com/articles/data-tables/)
- [Pagination, Filtering, and Sorting: Best Practices for Large Datasets - Lead With Skills](https://www.leadwithskills.com/blogs/pagination-filtering-sorting-large-datasets)
- [Best Way to Show Percentage Breakdown: Pie vs Donut vs Stacked Bar - ChartGen](https://chartgen.ai/resources/blog/best-way-to-show-percentage-breakdown-charts)
- [Bar Graph vs Pie Chart: Which is Better - FusionCharts](https://www.fusioncharts.com/blog/bar-graph-vs-pie-chart-select-the-proper-type-for-your-data/)
- [Building an Association Dashboard: The KPIs That Actually Predict Growth - Member Lounge](https://memberlounge.app/building-an-association-dashboard-the-kpis-that-actually-predict-growth/)
- [29 KPIs for Membership Organizations - MemberClicks](https://memberclicks.com/blog/kpis-for-membership-organizations/)
- [Designing for Enterprise — Better UX for Bulk Upload - Medium](https://manitesharma.medium.com/designing-for-enterprise-better-ux-for-bulk-upload-961e9fd1b80d)
- [Brazilian States Choropleth Map with Python - Medium](https://rodrigodutcosky.medium.com/mapas-coropl%C3%A9ticos-com-os-estados-do-brasil-em-python-b9b48c6db585)
