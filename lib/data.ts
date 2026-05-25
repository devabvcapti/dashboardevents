import { getSupabase } from './supabase'
import type { Participant, OverviewStats, TicketMembership } from './database.types'

export type { Participant, OverviewStats, TicketMembership }

// ─── Overview Stats (via RPC — todo o cálculo ocorre no banco) ───────────────

export async function getOverviewStats(editionYear = 2025): Promise<OverviewStats> {
  const { data, error } = await getSupabase()
    .rpc('get_overview_stats', { p_edition_year: editionYear })
  if (error) throw error
  return data as unknown as OverviewStats
}

// ─── Participants (paginado — máximo 50 por chamada) ─────────────────────────

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

// ─── Company Segment Summary ──────────────────────────────────────────────────

export interface CompanySegmentSummary {
  type: string
  count: number
}

export async function getCompanySegmentSummary(
  editionYear = 2025
): Promise<CompanySegmentSummary[]> {
  const { data: edition, error: editionError } = await getSupabase()
    .from('editions')
    .select('id')
    .eq('year', editionYear)
    .single()
  if (editionError) throw editionError

  const { data, error } = await getSupabase()
    .from('participants')
    .select('company_segment_raw')
    .eq('edition_id', edition.id)
    .not('company_segment_raw', 'is', null)
  if (error) throw error

  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    const seg = (row.company_segment_raw as string).trim()
    if (seg) counts[seg] = (counts[seg] ?? 0) + 1
  }
  return Object.entries(counts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
}

// ─── Registrations by Day ─────────────────────────────────────────────────────

export interface RegistrationsByDay {
  date: string
  count: number
}

export async function getRegistrationsByDay(
  editionYear = 2025
): Promise<RegistrationsByDay[]> {
  const { data: edition, error: editionError } = await getSupabase()
    .from('editions')
    .select('id')
    .eq('year', editionYear)
    .single()
  if (editionError) throw editionError

  const { data, error } = await getSupabase()
    .from('participants')
    .select('created_at')
    .eq('edition_id', edition.id)
    .not('created_at', 'is', null)
    .order('created_at', { ascending: true })
  if (error) throw error

  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    const date = (row.created_at as string).slice(0, 10)
    counts[date] = (counts[date] ?? 0) + 1
  }
  return Object.entries(counts).map(([date, count]) => ({ date, count }))
}

// ─── Ticket Membership Summary (COUNT no banco via head:true) ─────────────────

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

// ─── Free Tickets (ticket_value = 0) ─────────────────────────────────────────

export interface FreeTicketStats {
  free: number
  paid: number
  total: number
}

export async function getFreeTicketStats(
  editionYear = 2025
): Promise<FreeTicketStats> {
  const { data: edition, error: editionError } = await getSupabase()
    .from('editions')
    .select('id')
    .eq('year', editionYear)
    .single()
  if (editionError) throw editionError

  const [{ count: free, error: e1 }, { count: total, error: e2 }] = await Promise.all([
    getSupabase()
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('edition_id', edition.id)
      .eq('ticket_value', 0),
    getSupabase()
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('edition_id', edition.id),
  ])
  if (e1) throw e1
  if (e2) throw e2

  const f = free ?? 0
  const t = total ?? 0
  return { free: f, paid: t - f, total: t }
}
