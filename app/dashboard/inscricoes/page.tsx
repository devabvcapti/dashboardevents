import { requireAdmin } from '@/lib/auth'
import { getParticipantsPaginated } from '@/lib/data'
import { getActiveEditionId } from '@/lib/edition-cookie'
import Link from 'next/link'
import { InscricoesClient } from './inscricoes-client'
import type { TicketMembership, CompanySegment } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

interface SearchParams {
  page?: string
  page_size?: string
  search?: string
  membership?: string
  segment?: string
  state?: string
  min_value?: string
  max_value?: string
  sort?: string
  dir?: string
}

const ALLOWED_PAGE_SIZES = [25, 50, 100] as const
const ALLOWED_SORT_COLUMNS = ['created_at', 'full_name', 'company', 'ticket_value', 'ticket_membership'] as const
const ALLOWED_MEMBERSHIPS: TicketMembership[] = ['MEMBRO', 'NAO_MEMBRO']
const ALLOWED_SEGMENTS: CompanySegment[] = ['GP', 'LP', 'FUNDO', 'CORPORATIVO', 'GOVERNO', 'ACADEMIA', 'OUTRO']

function parsePageSize(raw: string | undefined): 25 | 50 | 100 {
  const n = Number(raw)
  return (ALLOWED_PAGE_SIZES as readonly number[]).includes(n) ? (n as 25 | 50 | 100) : 50
}

function parseMembership(raw: string | undefined): TicketMembership | undefined {
  return ALLOWED_MEMBERSHIPS.includes(raw as TicketMembership) ? (raw as TicketMembership) : undefined
}

function parseSegment(raw: string | undefined): CompanySegment | undefined {
  return ALLOWED_SEGMENTS.includes(raw as CompanySegment) ? (raw as CompanySegment) : undefined
}

function parseSort(raw: string | undefined): string {
  return (ALLOWED_SORT_COLUMNS as readonly string[]).includes(raw ?? '') ? (raw as string) : 'created_at'
}

function parseDir(raw: string | undefined): 'asc' | 'desc' {
  return raw === 'asc' ? 'asc' : 'desc'
}

function parseNumber(raw: string | undefined): number | undefined {
  if (!raw) return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

function parseState(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  const s = raw.trim().toUpperCase()
  return /^[A-Z]{2}$/.test(s) ? s : undefined
}

export default async function InscricoesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  await requireAdmin()

  let editionId: string | null = null
  try { editionId = await getActiveEditionId() } catch { editionId = null }

  if (!editionId) {
    return (
      <div className="p-8 space-y-6">
        <div className="border-b border-border pb-6">
          <h1 className="font-display text-3xl text-foreground leading-none">Inscrições</h1>
        </div>
        <div className="border border-dashed border-border rounded-lg p-12 text-center space-y-3">
          <p className="text-sm font-medium text-foreground">Nenhum evento cadastrado.</p>
          <Link href="/dashboard/eventos" className="inline-block text-sm text-primary hover:underline">
            Ir para Eventos →
          </Link>
        </div>
      </div>
    )
  }

  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? 1))
  const pageSize = parsePageSize(params.page_size)
  const offset = (page - 1) * pageSize

  const filters = {
    editionId,
    search: params.search?.trim() || undefined,
    membership: parseMembership(params.membership),
    segment: parseSegment(params.segment),
    state: parseState(params.state),
    minValue: parseNumber(params.min_value),
    maxValue: parseNumber(params.max_value),
    sort: parseSort(params.sort),
    dir: parseDir(params.dir),
    limit: pageSize,
    offset,
  }

  let data: Awaited<ReturnType<typeof getParticipantsPaginated>>['data'] = []
  let count = 0
  let loadError = false
  try {
    const result = await getParticipantsPaginated(filters)
    data = result.data
    count = result.count
  } catch {
    loadError = true
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-end justify-between border-b border-border pb-6">
        <div>
          <p className="text-[10px] font-mono tracking-[0.22em] text-muted-foreground uppercase mb-1">
            Gestão
          </p>
          <h1 className="font-display text-3xl text-foreground leading-none">Inscrições</h1>
        </div>
        <p className="text-[11px] font-mono text-muted-foreground/60 pb-0.5">
          {count.toLocaleString('pt-BR')} participante{count !== 1 ? 's' : ''}
        </p>
      </div>

      {loadError ? (
        <div className="border border-red-500/20 bg-red-500/5 rounded-lg p-6 text-sm text-red-600">
          Falha ao carregar participantes. Tente recarregar a página.
        </div>
      ) : (
        <InscricoesClient
          participants={data}
          totalCount={count}
          currentPage={page}
          pageSize={pageSize}
          filters={{
            search: params.search ?? '',
            membership: filters.membership ?? '',
            segment: filters.segment ?? '',
            state: filters.state ?? '',
            minValue: params.min_value ?? '',
            maxValue: params.max_value ?? '',
            sort: filters.sort,
            dir: filters.dir,
          }}
        />
      )}
    </div>
  )
}
