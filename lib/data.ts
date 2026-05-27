import { getSupabase } from './supabase'
import type {
  Participant,
  OverviewStats,
  TicketMembership,
  CompanySegment,
  Edition,
  MemberAnalysisRow,
  RevenueAnalysis,
  PaginatedParticipants,
  ParticipantWithState,
} from './database.types'

export type {
  Participant, OverviewStats, TicketMembership, CompanySegment, Edition,
  MemberAnalysisRow, RevenueAnalysis, PaginatedParticipants, ParticipantWithState,
}

// ─── Overview Stats (via RPC — todo o cálculo ocorre no banco) ───────────────

export async function getOverviewStats(editionId: string): Promise<OverviewStats> {
  const { data, error } = await getSupabase()
    .rpc('get_overview_stats', { p_edition_id: editionId })
  if (error) throw error
  return data as unknown as OverviewStats
}

// ─── Editions ────────────────────────────────────────────────────────────────

export async function getEditions(): Promise<Edition[]> {
  const { data, error } = await getSupabase()
    .from('editions')
    .select('*')
    .order('year', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Edition[]
}

// ─── Company Segment Summary ──────────────────────────────────────────────────

export interface CompanySegmentSummary { type: string; count: number }
export async function getCompanySegmentSummary(editionId: string): Promise<CompanySegmentSummary[]> {
  const { data, error } = await getSupabase()
    .from('participants')
    .select('company_segment_raw')
    .eq('edition_id', editionId)
    .not('company_segment_raw', 'is', null)
    .limit(5000)
  if (error) throw error
  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    const seg = (row.company_segment_raw as string).trim()
    if (seg) counts[seg] = (counts[seg] ?? 0) + 1
  }
  return Object.entries(counts).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count)
}

// ─── Registrations by Day ─────────────────────────────────────────────────────

export interface RegistrationsByDay { date: string; count: number }
export async function getRegistrationsByDay(editionId: string): Promise<RegistrationsByDay[]> {
  const { data, error } = await getSupabase()
    .from('participants')
    .select('created_at')
    .eq('edition_id', editionId)
    .not('created_at', 'is', null)
    .order('created_at', { ascending: true })
    .limit(5000)
  if (error) throw error
  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    const date = (row.created_at as string).slice(0, 10)
    counts[date] = (counts[date] ?? 0) + 1
  }
  return Object.entries(counts).map(([date, count]) => ({ date, count }))
}

// ─── Ticket Membership Summary (COUNT no banco via head:true) ─────────────────

export interface TicketMembershipSummary { ticket_membership: TicketMembership; count: number }
export async function getTicketMembershipSummary(editionId: string): Promise<TicketMembershipSummary[]> {
  const membershipTypes: TicketMembership[] = ['MEMBRO', 'NAO_MEMBRO']
  const results = await Promise.all(
    membershipTypes.map(async tm => {
      const { count, error } = await getSupabase()
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('edition_id', editionId)
        .eq('ticket_membership', tm)
      if (error) throw error
      return { ticket_membership: tm, count: count ?? 0 }
    })
  )
  return results.sort((a, b) => b.count - a.count)
}

// ─── Free Tickets (ticket_value = 0) ─────────────────────────────────────────

export interface FreeTicketStats { free: number; paid: number; total: number }
export async function getFreeTicketStats(editionId: string): Promise<FreeTicketStats> {
  const [{ count: free, error: e1 }, { count: total, error: e2 }] = await Promise.all([
    getSupabase().from('participants').select('*', { count: 'exact', head: true }).eq('edition_id', editionId).eq('ticket_value', 0),
    getSupabase().from('participants').select('*', { count: 'exact', head: true }).eq('edition_id', editionId),
  ])
  if (e1) throw e1
  if (e2) throw e2
  const f = free ?? 0
  const t = total ?? 0
  return { free: f, paid: t - f, total: t }
}

// ─── NOVOS — consumidos pelos Plans 03/04/05 ─────────────────────────────────

const ALLOWED_SORT_COLUMNS = ['created_at', 'full_name', 'company', 'ticket_value', 'ticket_membership'] as const
type SortColumn = typeof ALLOWED_SORT_COLUMNS[number]

export async function getParticipantsPaginated(filters: {
  editionId: string
  search?: string
  membership?: TicketMembership
  segment?: CompanySegment
  company?: string
  sort?: string
  dir?: 'asc' | 'desc'
  limit: number
  offset: number
}): Promise<PaginatedParticipants> {
  const sort: SortColumn = (ALLOWED_SORT_COLUMNS as readonly string[]).includes(filters.sort ?? '')
    ? (filters.sort as SortColumn)
    : 'created_at'
  const dir = filters.dir === 'asc' ? 'asc' : 'desc'

  let query = getSupabase()
    .from('participants')
    .select('*', { count: 'exact' })
    .eq('edition_id', filters.editionId)
    .order(sort, { ascending: dir === 'asc' })
    .range(filters.offset, filters.offset + filters.limit - 1)

  if (filters.membership) query = query.eq('ticket_membership', filters.membership)
  if (filters.segment) query = query.eq('company_segment_normalized', filters.segment)
  if (filters.company) {
    const c = filters.company.replace(/[%,]/g, '')
    query = query.ilike('company', `%${c}%`)
  }
  if (filters.search) {
    const s = filters.search.replace(/[%,]/g, '')
    query = query.or(`full_name.ilike.%${s}%,email.ilike.%${s}%,company.ilike.%${s}%`)
  }

  const { data, count, error } = await query
  if (error) throw error
  return { data: (data ?? []) as unknown as Participant[], count: count ?? 0 }
}

export async function getParticipantsForExport(filters: {
  editionId: string
  search?: string
  membership?: TicketMembership
  segment?: CompanySegment
  state?: string
  minValue?: number
  maxValue?: number
}): Promise<ParticipantWithState[]> {
  // Sempre faz LEFT JOIN para trazer origin_state — necessário para o export
  let query = getSupabase()
    .from('participants')
    .select('*, form_responses(origin_state)')
    .eq('edition_id', filters.editionId)
    .order('created_at', { ascending: false })
    .limit(10000)

  if (filters.membership) query = query.eq('ticket_membership', filters.membership)
  if (filters.segment) query = query.eq('company_segment_normalized', filters.segment)
  if (filters.minValue !== undefined) query = query.gte('ticket_value', filters.minValue)
  if (filters.maxValue !== undefined) query = query.lte('ticket_value', filters.maxValue)
  if (filters.search) {
    const s = filters.search.replace(/[%,]/g, '')
    query = query.or(`full_name.ilike.%${s}%,email.ilike.%${s}%,company.ilike.%${s}%`)
  }

  const { data, error } = await query
  if (error) throw error

  // Para filtro de state, aplica em memória após o fetch (export trabalha com até 10k rows)
  const rows = (data ?? []) as unknown as Array<Participant & { form_responses: { origin_state: string | null } | { origin_state: string | null }[] | null }>
  const flattened: ParticipantWithState[] = rows.map(r => {
    const fr = Array.isArray(r.form_responses) ? r.form_responses[0] : r.form_responses
    return { ...r, origin_state: fr?.origin_state ?? null } as ParticipantWithState
  })
  if (filters.state) return flattened.filter(r => r.origin_state === filters.state)
  return flattened
}

export interface TicketNameSummaryRow {
  ticket_name: string | null
  ticket_membership: TicketMembership
  count: number
}

export async function getTicketNameSummary(editionId: string): Promise<TicketNameSummaryRow[]> {
  const { data, error } = await getSupabase()
    .from('participants')
    .select('ticket_name, ticket_membership')
    .eq('edition_id', editionId)
    .limit(5000)
  if (error) throw error
  const counts: Record<string, TicketNameSummaryRow> = {}
  for (const row of data ?? []) {
    const key = `${row.ticket_name ?? ''}|||${row.ticket_membership}`
    if (counts[key]) {
      counts[key].count++
    } else {
      counts[key] = {
        ticket_name: row.ticket_name ?? null,
        ticket_membership: row.ticket_membership as TicketMembership,
        count: 1,
      }
    }
  }
  return Object.values(counts).sort((a, b) => b.count - a.count)
}

export async function getMemberAnalysis(editionId: string): Promise<MemberAnalysisRow[]> {
  const { data, error } = await getSupabase()
    .rpc('get_member_analysis', { p_edition_id: editionId })
  if (error) throw error
  return (data as unknown as MemberAnalysisRow[]) ?? []
}

export async function getRevenueAnalysis(editionId: string): Promise<RevenueAnalysis> {
  const { data, error } = await getSupabase()
    .rpc('get_revenue_analysis', { p_edition_id: editionId })
  if (error) throw error
  return data as unknown as RevenueAnalysis
}
