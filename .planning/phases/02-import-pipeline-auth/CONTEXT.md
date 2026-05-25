# Phase 2 Context — Import Pipeline + Auth

**Fase:** 2 — Import Pipeline + Autenticação  
**Data:** 2026-05-25  
**Status:** Decisões finalizadas — pronto para planejar

---

## Excel Structure (Arquivo Real Analisado)

**Arquivo:** `Congresso v2.xlsx`  
**Aba:** `Evento_Lista de participantes`  
**Linhas de cabeçalho:** 2 (row 1 = nomes das perguntas, row 2 = opções/sub-labels)  
**Dados começam em:** linha 3  
**Total de colunas:** 60  

### Mapeamento de Colunas Críticas

| Col | Header (row 1) | Header (row 2) | Campo destino |
|-----|---------------|----------------|---------------|
| 1 | ID do ingresso | ID do ingresso | `ticket_id` (participants) |
| 2 | ID do contato | ID do contato | descartado |
| 3 | Primeiro nome | Primeiro nome | `full_name` (participants) |
| 4 | Último nome | Último nome | concat com col 3 → `full_name` |
| 5 | Empresa | Empresa | `company` (participants) |
| 6 | Cargo / Posição | Cargo / Posição | `job_title` (participants) |
| 7 | Email | Email | `email` (participants) |
| 8 | Foto de perfil | Foto de perfil | descartado |
| 9 | CPF / CNPJ | CPF / CNPJ | `cpf` (participants) — normalizar para string 11 dígitos |
| 10 | Telefone / WhatsApp | Telefone / WhatsApp | `phone` (participants) |
| 11 | Segmento de atuação | Segmento de atuação | `company_segment_raw` (participants) + `company_segment_normalized` enum |
| 12 | LinkedIn | LinkedIn | descartado (Phase 1+) |
| 13–23 | Quais temas são de maior interesse? | [11 opções de tópico] | `topics_of_interest TEXT[]` (form_responses) |
| 24–26 | Você tem interesse em participar de eventos? | LP Day / Women Connection / Sem interesse | `interested_in_events TEXT[]` (form_responses) |
| 27–30 | Como prefere receber comunicações? | Email / WhatsApp / LinkedIn / Não desejo | `preferred_channels TEXT[]` (form_responses) |
| 31–35 | Quais conteúdos são de seu interesse? | [5 opções de conteúdo] | `content_interests TEXT[]` (form_responses) |
| 36 | Oportunidades de networking | Sim/Não | `networking_interest` (form_responses) — não mapeado nesta fase |
| 37 | Restrição alimentar | Sim/Não | `dietary_restrictions TEXT` (form_responses) |
| 38 | Detalhar | texto livre | `dietary_details TEXT` (form_responses) |
| 39 | Língua preferida | texto | descartado |
| 40 | Categoria | Attendee/Speaker/... | descartado |
| 41 | Observação interna | texto | descartado |
| 42 | Visível na sala de eventos | Sim/Não | descartado |
| 43 | Termos Opt-In | Sim/Não | descartado (usar preferred_channels) |
| 44 | **Membro ativo** | Sim/Não | `ticket_membership` enum — `Sim` → MEMBRO, `Não` → NAO_MEMBRO |
| 45 | **Empresa é membro** | Sim/Não | `is_company_member BOOLEAN` (participants) |
| 46 | Usuário Registrado | Sim/Não | descartado |
| 47 | Status do participante | Ativo/... | descartado |
| 48 | Código QR | hyperlink | descartado |
| 49 | Compra adicional | Sim/Não | descartado |
| 50 | Nome do ingresso | texto | descartado |
| 51 | Opção de preço | texto | descartado |
| 52 | **Preço do ingresso** | numérico float | `ticket_value NUMERIC` (participants) — já é float, não precisa parseBRLCurrency |
| 53 | **Status do pagamento** | texto livre | `payment_status TEXT` (participants) |
| 54 | Nome do desconto | texto | descartado |
| 55 | ID do registro # | numérico | descartado |
| 56 | data de registro | ISO string | descartado |
| 57–60 | Registro Nome/Sobrenome/Email/Telefone | texto | descartado (dados do comprador, não participante) |

### Comportamento de Multi-selects
- Colunas 13–35 são **colunas booleanas separadas** com marcador `"x"` quando selecionado
- Parse: para cada grupo de colunas, coletar os headers da row 2 onde o valor for `"x"`, formar `TEXT[]`
- HTML entities nos headers da row 2 precisam ser decodificados: `&amp;` → `&`, `&iacute;` → `í`, etc.

### Determinação de Membership
- **USAR APENAS col 44** `Membro ativo` = `"Sim"` → MEMBRO, `"Não"` → NAO_MEMBRO
- **NÃO derivar** do nome do ingresso (col 50) — não é confiável
- Col 45 `Empresa é membro` é campo separado (empresa vs pessoa)

### Ticket Value
- Col 52 já é `number` (float) no ExcelJS — NÃO precisa de `parseBRLCurrency()`
- COMBO com 3 ingressos: preço individual = preço total / quantidade de ingressos no combo
- Registros no mesmo compra: cols 57-60 indicam o comprador, cols 3-7 o participante individual

---

## Decisões de Schema (Phase 2 requer migrations adicionais)

### participants — campos a adicionar

```sql
ALTER TABLE participants ADD COLUMN job_title TEXT;
ALTER TABLE participants ADD COLUMN cpf TEXT;          -- string 11 dígitos com zero-padding
ALTER TABLE participants ADD COLUMN phone TEXT;
ALTER TABLE participants ADD COLUMN payment_status TEXT;
ALTER TABLE participants ADD COLUMN is_company_member BOOLEAN;
ALTER TABLE participants ADD COLUMN company_segment_raw TEXT;
ALTER TABLE participants ADD COLUMN company_segment_normalized company_segment;  -- enum
```

**Normalização de company_segment:** Função de mapeamento no parse:
- "Gestora de PE", "Private Equity", "GP" → GP
- "Gestora de VC", "Venture Capital" → GP (usar GP até ter enum VC separado)
- "Fundo de Pensão", "Endowment", "Investidor Institucional", "LP" → LP
- "Fundo de Fundos" → FUNDO
- "Banco", "Seguradora", "Corporativo" → CORPORATIVO
- "Governo", "Agência", "Regulador" → GOVERNO
- "Universidade", "Academia", "Pesquisa" → ACADEMIA
- "Prestador de Serviços" (qualquer variante) → OUTRO
- Qualquer valor não mapeado → OUTRO

### form_responses — campos a corrigir/adicionar

```sql
-- Alterar tipo de boolean para TEXT[]
ALTER TABLE form_responses DROP COLUMN interested_in_events;
ALTER TABLE form_responses ADD COLUMN interested_in_events TEXT[];

-- Adicionar campos faltando
ALTER TABLE form_responses ADD COLUMN content_interests TEXT[];
ALTER TABLE form_responses ADD COLUMN dietary_details TEXT;
```

> **Nota:** `company_segment` enum permanece em `form_responses` TAMBÉM, mas será redundante com `participants.company_segment_normalized`. Remover de form_responses está fora do escopo desta fase para evitar retrabalho em Phase 1.

---

## Decisões de Import Pipeline

### IMPORT-02: Detecção de cabeçalho
- Excel ABVCAP tem **sempre 2 linhas de cabeçalho** (row 1 = pergunta, row 2 = opção)
- `KNOWN_HEADERS` baseado em **row 1** (nomes das perguntas), não row 2
- Scoring: comparar row 1 vs KNOWN_HEADERS; se match > 80%, usar essa row como header principal
- Row 2 contém as opções dos multi-selects (necessária para construir os arrays)

### IMPORT-03: Células mescladas
- Cabeçalhos multi-select (cols 13-23, 24-26, etc.) têm a mesma string em row 1
- ExcelJS: `cellDates: false`, ler `worksheet.getRow(n).values`
- Achatar mescladas: usar o valor de row 2 como chave unique dentro do grupo

### IMPORT-04: UI de mapeamento — SEMPRE mostrar
- **Decisão:** Mostrar UI de mapeamento em todos os imports (não só quando auto-detect falha)
- **Motivo:** Plataforma será usada para múltiplos eventos; formatos podem variar por evento
- UI mostra: coluna Excel → campo destino, com dropdown para corrigir
- Colunas não mapeadas ficam em "ignorar" (não causam erro)
- Admin confirma antes de avançar para validação

### IMPORT-05/06: Validação e preview
- Zod `safeParse` coletando todos os erros antes de escrever
- Erros em PT-BR com número da linha Excel (ex: "Linha 45: Email inválido")
- Preview mostra: N linhas válidas / N com erros
- **Admin pode prosseguir com erros** — linhas com erro são puladas, linhas válidas são importadas
- (Não bloquear import se há erros; registrar erros no `import_jobs.error_log`)

### IMPORT-08: Normalização de dados
- **CPF:** `String(value).padStart(11, '0')` — col 9 vem como número
- **Phone:** `String(value)` — col 10 vem como número  
- **Preço:** já é `number` (float), nenhuma conversão necessária
- **HTML entities:** decodificar ao montar labels de multi-select
- **Formula injection:** sanitizar células que começam com `=`, `+`, `-`, `@`
- **Datas:** `cellDates: false` para receber timestamps Unix, converter depois

---

## Decisões de Auth

### Admin provisioning
- **Não discutido** (tópico D não selecionado)
- **Default assumido:** Criar admin manualmente via Supabase Dashboard → Authentication → Users
- Admin precisa ter `app_metadata.role = "admin"` (set via Supabase service role API após criação)
- Sem página de setup; sem invite flow nesta fase

### Supabase Auth setup
- `@supabase/ssr` para cookies em Next.js App Router (não `@supabase/auth-helpers-nextjs` — deprecated)
- Middleware Next.js: verificar sessão em todas as rotas `/dashboard` e `/api/import/*`
- Cookie: `supabase-auth-token` com `sameSite: lax`, `httpOnly: true`

---

## Deferred Ideas (fora do escopo desta fase)

- **LinkedIn field** (col 12): útil para networking, mas sem analytics value agora
- **Ticket name storage** (col 50): user não confirmou — pode ser derivado de ticket_membership se necessário
- **Registration date** (col 56): user não confirmou — pode ser adicionada em Phase 3
- **networking_interest** boolean (col 36): Phase 4 analytics
- **Mapping persistence**: salvar mapeamentos por evento para reutilizar — Phase 3+
- **Admin invite flow / setup page**: provisionamento manual suficiente agora

---

## KNOWN_HEADERS (para auto-detecção)

Colunas únicas em row 1 que identificam o arquivo como exportação ABVCAP:

```typescript
export const KNOWN_HEADERS = [
  'ID do ingresso',
  'ID do contato',
  'Primeiro nome',
  'Último nome',
  'Empresa',
  'Cargo / Posição',
  'Email',
  'CPF / CNPJ',
  'Telefone / WhatsApp',
  'Segmento de atuação',
  'Membro ativo',
  'Nome do ingresso',
  'Preço do ingresso',
  'Status do pagamento',
]
```

Score mínimo: 10/14 colunas presentes → arquivo válido.

---

*Context gerado: 2026-05-25*
