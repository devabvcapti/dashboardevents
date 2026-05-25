# PLAN — Phase 1: Foundation

**Phase goal:** O banco de dados e a camada de dados existem na forma correta — schema
substituído, chave de serviço isolada no servidor, tipos TypeScript gerados
automaticamente, e todas as queries usando agregação SQL em vez de SELECT * + JS reduce.

**Status:** Not started  
**Plans:** 3 (sequential)  
**App root:** `abvcap-congress/` (inside project root)

---

## Overview

O schema atual (`supabase/schema.sql`) modela um sistema de check-in simples com uma
única tabela `participants` e ENUMs de status/ticket desalinhados com a realidade do
congresso. Este phase substitui esse modelo por um schema normalizado com edições,
importações e respostas de formulário separadas — e corrige dois riscos críticos:
a chave anon exposta no cliente e queries que fazem SELECT * em toda a tabela.

As três plans são sequenciais: o schema deve existir antes dos tipos serem gerados, e
os tipos devem existir antes de `data.ts` ser refatorado.

---

## Plan 1: Schema Migration

**Objetivo:** Substituir o schema existente pelo modelo normalizado com `editions`,
`import_jobs`, `participants` e `form_responses`.

### Tasks

- [ ] **Task 1.1 — Criar arquivo de migration SQL**

  Criar o arquivo `abvcap-congress/supabase/migrations/001_foundation.sql` com o
  conteúdo abaixo na íntegra. Se a pasta `migrations/` não existir, criá-la.

  ```sql
  -- Migration 001: Foundation schema
  -- Substitui o schema antigo (participants monolítico) pelo modelo normalizado.

  -- ============================================================
  -- 0. Limpar objetos antigos
  -- ============================================================
  DROP TABLE IF EXISTS participants CASCADE;

  DROP TYPE IF EXISTS ticket_type CASCADE;
  DROP TYPE IF EXISTS company_type CASCADE;
  DROP TYPE IF EXISTS participant_status CASCADE;

  -- ============================================================
  -- 1. ENUMs
  -- ============================================================
  CREATE TYPE ticket_membership AS ENUM ('MEMBRO', 'NAO_MEMBRO');

  CREATE TYPE company_segment AS ENUM (
    'GP', 'LP', 'FUNDO', 'CORPORATIVO', 'GOVERNO', 'ACADEMIA', 'OUTRO'
  );

  CREATE TYPE import_status AS ENUM (
    'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'
  );

  -- ============================================================
  -- 2. Tabelas
  -- ============================================================

  CREATE TABLE editions (
    id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    name        text        NOT NULL,
    year        int         NOT NULL UNIQUE,
    created_at  timestamptz DEFAULT now()
  );

  CREATE TABLE import_jobs (
    id            uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
    edition_id    uuid          REFERENCES editions(id),
    filename      text          NOT NULL,
    status        import_status DEFAULT 'PENDING',
    total_rows    int           DEFAULT 0,
    inserted_rows int           DEFAULT 0,
    updated_rows  int           DEFAULT 0,
    error_rows    int           DEFAULT 0,
    error_log     jsonb         DEFAULT '[]',
    imported_by   text,
    created_at    timestamptz   DEFAULT now()
  );

  CREATE TABLE participants (
    id                uuid             DEFAULT gen_random_uuid() PRIMARY KEY,
    edition_id        uuid             REFERENCES editions(id) NOT NULL,
    email             text             NOT NULL,
    full_name         text             NOT NULL,
    company           text,
    ticket_membership ticket_membership NOT NULL,
    ticket_value      numeric(10,2),
    import_job_id     uuid             REFERENCES import_jobs(id),
    created_at        timestamptz      DEFAULT now(),
    UNIQUE(email, edition_id)
  );

  CREATE TABLE form_responses (
    id                     uuid             DEFAULT gen_random_uuid() PRIMARY KEY,
    participant_id         uuid             REFERENCES participants(id) UNIQUE NOT NULL,
    professional_role      text,
    company_segment        company_segment,
    company_size           text,
    origin_state           text,
    opt_in_communication   boolean,
    preferred_channels     text[],
    topics_of_interest     text[],
    interested_in_events   boolean,
    dietary_restrictions   text,
    raw_data               jsonb,
    created_at             timestamptz      DEFAULT now()
  );

  -- ============================================================
  -- 3. Índices
  -- ============================================================
  CREATE INDEX ON form_responses USING GIN (preferred_channels);
  CREATE INDEX ON form_responses USING GIN (topics_of_interest);

  -- ============================================================
  -- 4. Dados iniciais
  -- ============================================================
  INSERT INTO editions (name, year) VALUES ('Congresso ABVCAP 2025', 2025);
  ```

- [ ] **Task 1.2 — Aplicar a migration no Supabase**

  **Opção A — via MCP (preferida se disponível):**
  Usar a ferramenta `apply_migration` do MCP do Supabase com o nome
  `001_foundation` e o SQL acima.

  **Opção B — manual (fallback):**
  1. Abrir o Supabase Dashboard → SQL Editor.
  2. Copiar e colar o conteúdo completo de `001_foundation.sql`.
  3. Executar. Confirmar que não há erros.
  4. Em Table Editor, verificar que as tabelas `editions`, `import_jobs`,
     `participants` e `form_responses` existem.
  5. Verificar que `editions` contém 1 linha: `Congresso ABVCAP 2025 / 2025`.

### Verification

```sql
-- Executar no SQL Editor do Supabase para confirmar:
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('editions','import_jobs','participants','form_responses')
ORDER BY table_name;
-- Esperado: 4 linhas

SELECT * FROM editions;
-- Esperado: 1 linha — Congresso ABVCAP 2025, 2025

SELECT typname, enumlabel
FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE typname IN ('ticket_membership','company_segment','import_status')
ORDER BY typname, enumsortorder;
-- Esperado: 2 + 7 + 4 = 13 linhas
```

---

## Plan 2: Security Hardening

**Objetivo:** Substituir a chave `NEXT_PUBLIC_SUPABASE_ANON_KEY` (exposta ao browser)
pela `SUPABASE_SERVICE_ROLE_KEY` (somente servidor), e documentar as variáveis de
ambiente obrigatórias.

**Pré-requisito:** Plan 1 concluído (tabelas devem existir para o cliente funcionar).

### Tasks

- [ ] **Task 2.1 — Atualizar `lib/supabase.ts`**

  Arquivo: `abvcap-congress/lib/supabase.ts`

  Substituir o conteúdo atual por:

  ```typescript
  import { createClient, type SupabaseClient } from '@supabase/supabase-js'
  import type { Database } from './database.types'

  let _client: SupabaseClient<Database> | null = null

  export function getSupabase(): SupabaseClient<Database> {
    if (_client) return _client
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || url.startsWith('your_') || !key || key.startsWith('your_')) {
      throw new Error(
        'Supabase não configurado. Preencha .env.local com ' +
        'NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.'
      )
    }
    _client = createClient<Database>(url, key)
    return _client
  }
  ```

  Mudanças em relação ao original:
  - `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY` → `process.env.SUPABASE_SERVICE_ROLE_KEY`
  - Mensagem de erro atualizada para mencionar a variável correta.

  **Por que:** `NEXT_PUBLIC_*` é injetado no bundle do browser pelo Next.js. A
  service role key bypassa RLS e nunca deve chegar ao cliente. Todas as chamadas
  ao Supabase neste projeto ocorrem em Server Components / Route Handlers, então
  a chave de serviço é a correta.

- [ ] **Task 2.2 — Criar `.env.local.example`**

  Arquivo: `abvcap-congress/.env.local.example`

  Criar com o conteúdo:

  ```bash
  # ─── Supabase ───────────────────────────────────────────────────────────────
  # URL do projeto — seguro expor ao browser (apenas identifica o projeto)
  NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co

  # Service Role Key — NUNCA usar prefixo NEXT_PUBLIC_
  # Obter em: Supabase Dashboard → Project Settings → API → service_role
  # Esta chave bypassa RLS. Usar somente em Server Components e Route Handlers.
  SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```

  Confirmar que `abvcap-congress/.gitignore` (ou o `.gitignore` na raiz) já
  contém `.env.local`. Se não contiver, adicionar a linha `.env.local` ao
  `.gitignore` mais próximo.

- [ ] **Task 2.3 — Atualizar `.env.local` real (manual)**

  No arquivo `abvcap-congress/.env.local` (não commitado):
  1. Remover a linha `NEXT_PUBLIC_SUPABASE_ANON_KEY=...` se existir.
  2. Adicionar (ou confirmar que já existe):
     ```
     SUPABASE_SERVICE_ROLE_KEY=<valor real do Dashboard>
     ```
  3. Obter o valor em: Supabase Dashboard → Project Settings → API →
     **service_role** (não a "anon" key).

### Verification

```bash
# Confirmar que a anon key NÃO aparece mais em lib/supabase.ts:
grep -r "NEXT_PUBLIC_SUPABASE_ANON_KEY" abvcap-congress/lib/
# Esperado: nenhuma linha encontrada

# Confirmar que a service role key não tem prefixo NEXT_PUBLIC_:
grep -r "NEXT_PUBLIC_SUPABASE_SERVICE\|NEXT_PUBLIC_SERVICE_ROLE" abvcap-congress/
# Esperado: nenhuma linha encontrada

# Confirmar que .env.local.example existe:
ls abvcap-congress/.env.local.example

# Iniciar o servidor e confirmar sem erros de env:
cd abvcap-congress && npm run dev
# Esperado: sem "Supabase não configurado" no console
```

---

## Plan 3: Type Generation + Data Layer

**Objetivo:** Gerar tipos TypeScript a partir do schema real do Supabase e refatorar
`data.ts` para usar queries SQL eficientes (GROUP BY, COUNT, RPC) em vez de
SELECT * + reduce em JavaScript.

**Pré-requisito:** Plans 1 e 2 concluídos (schema deve existir, cliente deve apontar
para service role key).

### Tasks

- [ ] **Task 3.1 — Criar migration para a função RPC `get_overview_stats`**

  Criar o arquivo `abvcap-congress/supabase/migrations/002_rpc_stats.sql`:

  ```sql
  -- Migration 002: RPC para estatísticas do overview
  -- Evita SELECT * + reduce em JS; calcula tudo no banco.

  CREATE OR REPLACE FUNCTION get_overview_stats(p_edition_year int DEFAULT 2025)
  RETURNS json AS $$
  DECLARE
    v_edition_id uuid;
    v_result     json;
  BEGIN
    SELECT id INTO v_edition_id
    FROM editions
    WHERE year = p_edition_year;

    SELECT json_build_object(
      'total',         COUNT(*),
      'membro',        COUNT(*) FILTER (WHERE ticket_membership = 'MEMBRO'),
      'nao_membro',    COUNT(*) FILTER (WHERE ticket_membership = 'NAO_MEMBRO'),
      'total_revenue', COALESCE(SUM(ticket_value), 0),
      'avg_ticket',    COALESCE(AVG(ticket_value), 0)
    ) INTO v_result
    FROM participants
    WHERE edition_id = v_edition_id;

    RETURN v_result;
  END;
  $$ LANGUAGE plpgsql STABLE;
  ```

  Aplicar via MCP (`apply_migration` com nome `002_rpc_stats`) ou manualmente
  no SQL Editor do Supabase.

- [ ] **Task 3.2 — Gerar `lib/database.types.ts` a partir do schema real**

  **Opção A — Supabase CLI (preferida se disponível localmente):**
  ```bash
  cd abvcap-congress
  supabase gen types typescript --project-id <PROJECT_ID> > lib/database.types.ts
  ```
  Substituir `<PROJECT_ID>` pelo ID do projeto (encontrado em Project Settings →
  General).

  **Opção B — MCP `generate_typescript_types` (se CLI não disponível):**
  Usar a ferramenta MCP para obter os tipos e escrever o resultado em
  `abvcap-congress/lib/database.types.ts`, substituindo o conteúdo atual.

  **Opção C — Escrita manual (fallback definitivo):**
  Se nenhuma das opções acima estiver disponível, substituir o conteúdo de
  `abvcap-congress/lib/database.types.ts` por:

  ```typescript
  export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

  // ─── ENUMs ────────────────────────────────────────────────────────────────
  export type TicketMembership = 'MEMBRO' | 'NAO_MEMBRO'
  export type CompanySegment =
    | 'GP' | 'LP' | 'FUNDO' | 'CORPORATIVO'
    | 'GOVERNO' | 'ACADEMIA' | 'OUTRO'
  export type ImportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

  // ─── Table Row Types ──────────────────────────────────────────────────────
  export interface Edition {
    id: string
    name: string
    year: number
    created_at: string
  }

  export interface ImportJob {
    id: string
    edition_id: string | null
    filename: string
    status: ImportStatus
    total_rows: number
    inserted_rows: number
    updated_rows: number
    error_rows: number
    error_log: Json
    imported_by: string | null
    created_at: string
  }

  export interface Participant {
    id: string
    edition_id: string
    email: string
    full_name: string
    company: string | null
    ticket_membership: TicketMembership
    ticket_value: number | null
    import_job_id: string | null
    created_at: string
  }

  export interface FormResponse {
    id: string
    participant_id: string
    professional_role: string | null
    company_segment: CompanySegment | null
    company_size: string | null
    origin_state: string | null
    opt_in_communication: boolean | null
    preferred_channels: string[] | null
    topics_of_interest: string[] | null
    interested_in_events: boolean | null
    dietary_restrictions: string | null
    raw_data: Json | null
    created_at: string
  }

  // ─── RPC Return Types ─────────────────────────────────────────────────────
  export interface OverviewStats {
    total: number
    membro: number
    nao_membro: number
    total_revenue: number
    avg_ticket: number
  }

  // ─── Supabase Database Type ───────────────────────────────────────────────
  export type Database = {
    public: {
      Tables: {
        editions: {
          Row: Edition
          Insert: Omit<Edition, 'id' | 'created_at'>
          Update: Partial<Omit<Edition, 'id' | 'created_at'>>
        }
        import_jobs: {
          Row: ImportJob
          Insert: Omit<ImportJob, 'id' | 'created_at'>
          Update: Partial<Omit<ImportJob, 'id' | 'created_at'>>
        }
        participants: {
          Row: Participant
          Insert: Omit<Participant, 'id' | 'created_at'>
          Update: Partial<Omit<Participant, 'id' | 'created_at'>>
        }
        form_responses: {
          Row: FormResponse
          Insert: Omit<FormResponse, 'id' | 'created_at'>
          Update: Partial<Omit<FormResponse, 'id' | 'created_at'>>
        }
      }
      Views: Record<string, never>
      Functions: {
        get_overview_stats: {
          Args: { p_edition_year?: number }
          Returns: OverviewStats
        }
      }
      Enums: {
        ticket_membership: TicketMembership
        company_segment: CompanySegment
        import_status: ImportStatus
      }
    }
  }
  ```

- [ ] **Task 3.3 — Refatorar `lib/data.ts`**

  Substituir o conteúdo de `abvcap-congress/lib/data.ts` por:

  ```typescript
  import { getSupabase } from './supabase'
  import type { Participant, OverviewStats, TicketMembership } from './database.types'

  export type { Participant, OverviewStats, TicketMembership }

  // ─── Overview Stats (via RPC — todo o cálculo ocorre no banco) ───────────

  export async function getOverviewStats(editionYear = 2025): Promise<OverviewStats> {
    const { data, error } = await getSupabase()
      .rpc('get_overview_stats', { p_edition_year: editionYear })
    if (error) throw error
    return data as OverviewStats
  }

  // ─── Participants (paginado — máximo 50 por chamada) ──────────────────────

  export async function getParticipants(filters?: {
    ticketMembership?: TicketMembership | 'ALL'
    search?: string
    limit?: number
    offset?: number
  }): Promise<Participant[]> {
    const limit = Math.min(filters?.limit ?? 50, 50)
    const offset = filters?.offset ?? 0

    let query = getSupabase()
      .from('participants')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (filters?.ticketMembership && filters.ticketMembership !== 'ALL') {
      query = query.eq('ticket_membership', filters.ticketMembership)
    }
    if (filters?.search) {
      query = query.or(
        `full_name.ilike.%${filters.search}%,` +
        `email.ilike.%${filters.search}%,` +
        `company.ilike.%${filters.search}%`
      )
    }

    const { data, error } = await query
    if (error) throw error
    return data as Participant[]
  }

  // ─── Ticket Membership Summary (GROUP BY no banco) ────────────────────────

  export interface TicketMembershipSummary {
    ticket_membership: TicketMembership
    count: number
  }

  export async function getTicketMembershipSummary(
    editionYear = 2025
  ): Promise<TicketMembershipSummary[]> {
    const { data: edition, error: editionError } = await getSupabase()
      .from('editions')
      .select('id')
      .eq('year', editionYear)
      .single()
    if (editionError) throw editionError

    // COUNT executado no banco via head:true — zero linhas trafegam na rede
    const membershipTypes: TicketMembership[] = ['MEMBRO', 'NAO_MEMBRO']
    const results: TicketMembershipSummary[] = []

    for (const tm of membershipTypes) {
      const { count, error } = await getSupabase()
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('edition_id', edition.id)
        .eq('ticket_membership', tm)
      if (error) throw error
      results.push({ ticket_membership: tm, count: count ?? 0 })
    }

    return results.sort((a, b) => b.count - a.count)
  }
  ```

- [ ] **Task 3.4 — Atualizar `components/status-badge.tsx`**

  Substituir conteúdo por:

  ```typescript
  import { Badge } from '@/components/ui/badge'
  import type { TicketMembership } from '@/lib/database.types'

  const membershipConfig: Record<TicketMembership, { label: string; className: string }> = {
    MEMBRO: { label: 'Membro', className: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50' },
    NAO_MEMBRO: { label: 'Não Membro', className: 'bg-amber-950/60 text-amber-400 border-amber-800/50' },
  }

  export function TicketBadge({ type }: { type: TicketMembership }) {
    const cfg = membershipConfig[type]
    return (
      <Badge variant="outline" className={cfg.className}>
        {cfg.label}
      </Badge>
    )
  }
  ```

  Remoções: `StatusBadge`, `ParticipantStatus`, `TicketType` (tipos que não existem
  mais no schema). `StatusBadge` será reimplementado na Phase 3 se necessário.

- [ ] **Task 3.5 — Atualizar `app/dashboard/page.tsx`**

  Substituir conteúdo por:

  ```typescript
  import { getOverviewStats } from '@/lib/data'
  import { StatCard } from '@/components/stat-card'
  import { OverviewCharts } from './overview-charts'

  export const revalidate = 60

  export default async function DashboardPage() {
    let stats
    try {
      stats = await getOverviewStats()
    } catch {
      stats = null
    }

    const memberPct = stats && stats.total > 0
      ? Math.round((stats.membro / stats.total) * 100)
      : 0

    return (
      <div className="p-8 space-y-8">
        <div className="flex items-end justify-between border-b border-border pb-6">
          <div>
            <p className="text-[10px] font-mono tracking-[0.22em] text-muted-foreground uppercase mb-1">
              Painel de Controle
            </p>
            <h1 className="font-display text-3xl text-foreground leading-none">
              Visão Geral
            </h1>
          </div>
          <p className="text-[11px] font-mono text-muted-foreground/50 pb-0.5">
            Congresso ABVCAP 2025
          </p>
        </div>

        {!stats && (
          <div className="border border-primary/20 bg-primary/5 rounded-lg px-4 py-3">
            <p className="text-[11px] font-mono text-primary/70">
              Configure{' '}
              <code className="text-primary">NEXT_PUBLIC_SUPABASE_URL</code> e{' '}
              <code className="text-primary">SUPABASE_SERVICE_ROLE_KEY</code>{' '}
              em <code className="text-primary">.env.local</code>
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard title="Total Inscritos" value={stats?.total ?? '—'} accent="blue" />
          <StatCard
            title="Membros"
            value={stats?.membro ?? '—'}
            subtitle={`${memberPct}% do total`}
            accent="green"
          />
          <StatCard title="Não Membros" value={stats?.nao_membro ?? '—'} accent="amber" />
          <StatCard
            title="Receita Total"
            value={stats?.total_revenue
              ? `R$ ${Number(stats.total_revenue).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`
              : '—'}
            accent="default"
          />
        </div>

        <OverviewCharts byTicketType={[]} byCompanyType={[]} registrationsByDay={[]} />
      </div>
    )
  }
  ```

  Campos removidos: `confirmed`, `pending`, `waitlist` (sem status no schema Phase 1).
  Charts passam arrays vazios — dados reais chegam na Phase 3.

- [ ] **Task 3.6 — Atualizar `app/dashboard/inscricoes/inscricoes-client.tsx`**

  Substituir conteúdo por:

  ```typescript
  'use client'

  import { useState, useMemo } from 'react'
  import { Input } from '@/components/ui/input'
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
  import { TicketBadge } from '@/components/status-badge'
  import type { Participant, TicketMembership } from '@/lib/database.types'
  import { format } from 'date-fns'
  import { ptBR } from 'date-fns/locale'

  const MEMBERSHIP_TYPES: Array<{ value: TicketMembership | 'ALL'; label: string }> = [
    { value: 'ALL', label: 'Todos os ingressos' },
    { value: 'MEMBRO', label: 'Membro' },
    { value: 'NAO_MEMBRO', label: 'Não Membro' },
  ]

  export function InscricoesClient({ initialData }: { initialData: Participant[] }) {
    const [search, setSearch] = useState('')
    const [membershipFilter, setMembershipFilter] = useState<TicketMembership | 'ALL'>('ALL')

    const filtered = useMemo(() => {
      return initialData.filter(p => {
        if (membershipFilter !== 'ALL' && p.ticket_membership !== membershipFilter) return false
        if (search) {
          const q = search.toLowerCase()
          if (
            !p.full_name.toLowerCase().includes(q) &&
            !p.email.toLowerCase().includes(q) &&
            !(p.company ?? '').toLowerCase().includes(q)
          ) return false
        }
        return true
      })
    }, [initialData, search, membershipFilter])

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Buscar por nome, e-mail ou empresa..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={membershipFilter} onValueChange={v => setMembershipFilter(v as TicketMembership | 'ALL')}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MEMBERSHIP_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="self-center text-sm text-muted-foreground">
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold">Nome</TableHead>
                <TableHead className="font-semibold">Empresa</TableHead>
                <TableHead className="font-semibold">Tipo</TableHead>
                <TableHead className="font-semibold text-right">Valor</TableHead>
                <TableHead className="font-semibold">Inscrição</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                    Nenhum participante encontrado.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map(p => (
                <TableRow key={p.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div>
                      <p className="font-medium">{p.full_name}</p>
                      <p className="text-xs text-muted-foreground">{p.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{p.company ?? '—'}</TableCell>
                  <TableCell><TicketBadge type={p.ticket_membership} /></TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {p.ticket_value != null
                      ? `R$ ${Number(p.ticket_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.created_at
                      ? format(new Date(p.created_at), "dd/MM/yy HH:mm", { locale: ptBR })
                      : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }
  ```

  Mudanças: `name` → `full_name`, `ticket_type` → `ticket_membership`, removido filtro de
  status, adicionada coluna de valor (`ticket_value`).

- [ ] **Task 3.7 — Atualizar `app/dashboard/ingressos/page.tsx`**

  Substituir conteúdo por:

  ```typescript
  import { getTicketMembershipSummary } from '@/lib/data'
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
  import { TicketBadge } from '@/components/status-badge'
  import type { TicketMembership } from '@/lib/database.types'

  export const revalidate = 30

  export default async function IngressosPage() {
    let summary: { ticket_membership: TicketMembership; count: number }[] = []
    try {
      summary = await getTicketMembershipSummary()
    } catch {
      summary = []
    }

    const grandTotal = summary.reduce((s, r) => s + r.count, 0)

    return (
      <div className="p-8 space-y-8">
        <div className="flex items-end justify-between border-b border-border pb-6">
          <div>
            <p className="text-[10px] font-mono tracking-[0.22em] text-muted-foreground uppercase mb-1">
              Controle
            </p>
            <h1 className="font-display text-3xl text-foreground leading-none">Ingressos</h1>
          </div>
          <p className="text-[11px] font-mono text-muted-foreground/50 pb-0.5">
            Distribuição por categoria
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {summary.map(row => (
            <div key={row.ticket_membership} className="relative bg-card border border-border rounded-lg px-5 pt-4 pb-5 overflow-hidden">
              <div className="absolute top-0 left-5 right-5 h-px bg-primary/60" />
              <div className="mb-3"><TicketBadge type={row.ticket_membership} /></div>
              <p className="font-display tabular-nums text-4xl text-foreground leading-none">{row.count}</p>
              <p className="mt-2 text-[11px] font-mono text-muted-foreground/60">
                {grandTotal > 0 ? `${Math.round((row.count / grandTotal) * 100)}% do total` : '—'}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-[10px] font-mono tracking-[0.18em] text-muted-foreground uppercase">
              Resumo por Tipo de Ingresso
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">Tipo</TableHead>
                <TableHead className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase text-right">Total</TableHead>
                <TableHead className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase text-right">% do Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-12">
                    <p className="text-[11px] font-mono text-muted-foreground/40">sem dados — importe participantes primeiro</p>
                  </TableCell>
                </TableRow>
              )}
              {summary.map(row => (
                <TableRow key={row.ticket_membership} className="border-border hover:bg-accent/40">
                  <TableCell><TicketBadge type={row.ticket_membership} /></TableCell>
                  <TableCell className="text-right font-mono font-medium tabular-nums">{row.count}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {grandTotal > 0 ? `${Math.round((row.count / grandTotal) * 100)}%` : '—'}
                  </TableCell>
                </TableRow>
              ))}
              {summary.length > 0 && (
                <TableRow className="border-t border-primary/20 bg-primary/5 hover:bg-primary/8">
                  <TableCell className="font-mono text-xs text-primary uppercase tracking-wider">Total</TableCell>
                  <TableCell className="text-right font-mono font-semibold tabular-nums text-foreground">{grandTotal}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">100%</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }
  ```

  Simplificado para MEMBRO/NAO_MEMBRO — colunas de status (confirmed/pending/cancelled/waitlist)
  removidas pois não existem no novo schema.

- [ ] **Task 3.8 — Atualizar `app/dashboard/publico/page.tsx`**

  Substituir conteúdo por:

  ```typescript
  import { getOverviewStats } from '@/lib/data'
  import { PublicoCharts } from './publico-charts'

  export const revalidate = 60

  export default async function PublicoPage() {
    let total = 0
    try {
      const stats = await getOverviewStats()
      total = stats.total
    } catch {
      total = 0
    }

    return (
      <div className="p-8 space-y-8">
        <div className="flex items-end justify-between border-b border-border pb-6">
          <div>
            <p className="text-[10px] font-mono tracking-[0.22em] text-muted-foreground uppercase mb-1">
              Analytics
            </p>
            <h1 className="font-display text-3xl text-foreground leading-none">Análise de Público</h1>
          </div>
          <p className="text-[11px] font-mono text-muted-foreground/50 pb-0.5">
            Perfil demográfico
          </p>
        </div>

        <PublicoCharts byCompanyType={[]} byTicketType={[]} total={total} />
      </div>
    )
  }
  ```

  `byCompanyType` e `byTicketType` passam arrays vazios — dados demográficos chegam na Phase 3.

### Verification

```bash
# 1. TypeScript deve compilar sem erros:
cd abvcap-congress && npx tsc --noEmit
# Esperado: nenhuma saída (zero erros)

# 2. Servidor de desenvolvimento deve iniciar sem erros:
npm run dev
# Esperado: "Ready" sem erros de tipo ou import

# 3. Confirmar que nenhuma query faz SELECT * sobre participantes para agregar:
grep -n "\.select\('\*'\)" abvcap-congress/lib/data.ts
# Esperado: apenas chamadas com { count: 'exact', head: true } ou nenhuma

# 4. Testar RPC diretamente no SQL Editor do Supabase:
# SELECT get_overview_stats(2025);
# Esperado: JSON com campos total, membro, nao_membro, total_revenue, avg_ticket
```

---

## Success Criteria

1. As quatro tabelas (`editions`, `import_jobs`, `participants`, `form_responses`)
   existem no Supabase e a tabela `editions` contém a linha do congresso 2025.

2. Os três ENUMs novos (`ticket_membership`, `company_segment`, `import_status`)
   existem; os ENUMs antigos (`ticket_type`, `company_type`, `participant_status`)
   não existem.

3. `lib/supabase.ts` usa `process.env.SUPABASE_SERVICE_ROLE_KEY` e nenhuma
   referência a `NEXT_PUBLIC_SUPABASE_ANON_KEY` permanece no codebase.

4. `lib/database.types.ts` reflete as tabelas reais: `Edition`, `Participant`,
   `FormResponse`, `ImportJob`, `OverviewStats`, sem os tipos antigos
   (`TicketType`, `ParticipantStatus`, `CompanyType`).

5. `lib/data.ts` não contém nenhum `.filter(` ou `.reduce(` operando sobre
   arrays completos de participantes — toda agregação ocorre no banco.

6. `npx tsc --noEmit` passa sem erros dentro de `abvcap-congress/`.
