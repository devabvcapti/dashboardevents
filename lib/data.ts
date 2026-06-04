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

export interface RankingItem { label: string; count: number }

export interface PublicoAnalysis {
  jobTitles: RankingItem[]
  topics: RankingItem[]
  events: RankingItem[]
  contents: RankingItem[]
  channels: RankingItem[]
  vcDayTopics: RankingItem[]
}

function countArray(items: string[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const item of items) {
    const s = item.trim()
    if (s) counts[s] = (counts[s] ?? 0) + 1
  }
  return counts
}

function toRanking(counts: Record<string, number>): RankingItem[] {
  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
}

export async function getPublicoAnalysis(editionId: string): Promise<PublicoAnalysis> {
  const { data, error } = await getSupabase()
    .from('participants')
    .select('job_title, form_responses(topics_of_interest, interested_in_events, content_interests, preferred_channels, vc_day_topics)')
    .eq('edition_id', editionId)
    .limit(5000)
  if (error) throw error

  const jobCounts: Record<string, number> = {}
  const topicCounts: Record<string, number> = {}
  const eventCounts: Record<string, number> = {}
  const contentCounts: Record<string, number> = {}
  const channelCounts: Record<string, number> = {}
  const vcDayCounts: Record<string, number> = {}

  for (const row of data ?? []) {
    if (row.job_title) {
      const t = row.job_title.trim()
      if (t) jobCounts[t] = (jobCounts[t] ?? 0) + 1
    }
    const fr = Array.isArray(row.form_responses) ? row.form_responses[0] : row.form_responses
    if (fr) {
      for (const [k, v] of Object.entries(countArray(fr.topics_of_interest ?? []))) topicCounts[k] = (topicCounts[k] ?? 0) + v
      for (const [k, v] of Object.entries(countArray(fr.interested_in_events ?? []))) eventCounts[k] = (eventCounts[k] ?? 0) + v
      for (const [k, v] of Object.entries(countArray(fr.content_interests ?? []))) contentCounts[k] = (contentCounts[k] ?? 0) + v
      for (const [k, v] of Object.entries(countArray(fr.preferred_channels ?? []))) channelCounts[k] = (channelCounts[k] ?? 0) + v
      for (const [k, v] of Object.entries(countArray((fr as { vc_day_topics?: string[] | null }).vc_day_topics ?? []))) vcDayCounts[k] = (vcDayCounts[k] ?? 0) + v
    }
  }

  return {
    jobTitles: toRanking(jobCounts).slice(0, 20),
    topics: toRanking(topicCounts),
    events: toRanking(eventCounts),
    contents: toRanking(contentCounts),
    channels: toRanking(channelCounts),
    vcDayTopics: toRanking(vcDayCounts),
  }
}

export interface CuponSummaryRow {
  coupon_code: string
  count: number
  avg_ticket: number | null
  discount_pct_estimate: number | null
  companies: string[]
}

export interface CuponsStats {
  total_with_coupon: number
  total_participants: number
  unique_coupons: number
  avg_ticket_no_coupon: number | null
  total_discount_estimate: number | null
  by_coupon: CuponSummaryRow[]
  top_companies: { company: string; count: number }[]
}

export async function getCuponsSummary(editionId: string): Promise<CuponsStats> {
  const { data, error } = await getSupabase()
    .from('participants')
    .select('coupon_code, ticket_value, company')
    .eq('edition_id', editionId)
    .limit(5000)
  if (error) throw error

  const rows = (data ?? []) as { coupon_code: string | null; ticket_value: number | null; company: string | null }[]
  const withCoupon = rows.filter(r => r.coupon_code)
  const noCouponValues = rows.filter(r => !r.coupon_code && r.ticket_value !== null).map(r => r.ticket_value as number)
  const avgNoCopon = noCouponValues.length > 0
    ? noCouponValues.reduce((s, v) => s + v, 0) / noCouponValues.length
    : null

  const byCode: Record<string, { count: number; values: number[]; companies: Set<string> }> = {}
  const companyCounts: Record<string, number> = {}

  for (const row of withCoupon) {
    const code = row.coupon_code!
    if (!byCode[code]) byCode[code] = { count: 0, values: [], companies: new Set() }
    byCode[code].count++
    if (row.ticket_value !== null) byCode[code].values.push(row.ticket_value)
    if (row.company) {
      byCode[code].companies.add(row.company)
      companyCounts[row.company] = (companyCounts[row.company] ?? 0) + 1
    }
  }

  const by_coupon: CuponSummaryRow[] = Object.entries(byCode)
    .map(([code, d]) => {
      const avg = d.values.length > 0 ? d.values.reduce((s, v) => s + v, 0) / d.values.length : null
      const discount = avg !== null && avgNoCopon !== null && avgNoCopon > 0
        ? Math.round(((avgNoCopon - avg) / avgNoCopon) * 100)
        : null
      return {
        coupon_code: code,
        count: d.count,
        avg_ticket: avg !== null ? Math.round(avg * 100) / 100 : null,
        discount_pct_estimate: discount,
        companies: Array.from(d.companies).sort(),
      }
    })
    .sort((a, b) => b.count - a.count)

  const top_companies = Object.entries(companyCounts)
    .map(([company, count]) => ({ company, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  let total_discount_estimate: number | null = null
  if (avgNoCopon !== null) {
    total_discount_estimate = Math.round(
      withCoupon.reduce((sum, r) => {
        if (r.ticket_value === null) return sum
        return sum + Math.max(0, avgNoCopon - r.ticket_value)
      }, 0) * 100
    ) / 100
  }

  return {
    total_with_coupon: withCoupon.length,
    total_participants: rows.length,
    unique_coupons: Object.keys(byCode).length,
    avg_ticket_no_coupon: avgNoCopon !== null ? Math.round(avgNoCopon * 100) / 100 : null,
    total_discount_estimate,
    by_coupon,
    top_companies,
  }
}

// ─── Registration Rhythm ──────────────────────────────────────────────────────

export interface RegistrationRhythmDay {
  date: string
  count: number
  cumulative: number
}

export interface RegistrationRhythm {
  byDay: RegistrationRhythmDay[]
  total: number
  peakDay: { date: string; count: number } | null
  avgPerDay: number
  milestones: { pct: number; date: string; dayNumber: number }[]
}

export async function getRegistrationRhythm(editionId: string): Promise<RegistrationRhythm> {
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

  const sortedDates = Object.keys(counts).sort()
  let cumulative = 0
  const byDay: RegistrationRhythmDay[] = sortedDates.map(date => {
    cumulative += counts[date]
    return { date, count: counts[date], cumulative }
  })

  const total = cumulative
  const peakDay = byDay.length > 0
    ? byDay.reduce((best, d) => d.count > best.count ? d : best)
    : null

  const avgPerDay = byDay.length > 0 ? Math.round(total / byDay.length) : 0

  const milestoneTargets = [25, 50, 75, 100]
  const milestones = milestoneTargets.flatMap(pct => {
    const target = Math.ceil(total * pct / 100)
    const idx = byDay.findIndex(d => d.cumulative >= target)
    if (idx === -1) return []
    return [{ pct, date: byDay[idx].date, dayNumber: idx + 1 }]
  })

  return { byDay, total, peakDay, avgPerDay, milestones }
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

// ─── Budget ──────────────────────────────────────────────────────────────────

export interface BudgetItem {
  id: string
  category: string
  subcategory: string | null
  budgeted: number
  realized: number
  sort_order: number
}

export interface BudgetCategoryGroup {
  category: string
  budgeted: number
  realized: number
  variationPct: number
  status: 'ok' | 'warning' | 'over'
  items: (BudgetItem & { variationPct: number; status: 'ok' | 'warning' | 'over' })[]
}

export interface BudgetSummary {
  totalBudgeted: number
  totalRealized: number
  balance: number
  executionPct: number
  byCategory: BudgetCategoryGroup[]
  items: (BudgetItem & { variationPct: number; status: 'ok' | 'warning' | 'over' })[]
}

function budgetStatus(budgeted: number, realized: number): 'ok' | 'warning' | 'over' {
  if (budgeted === 0) return realized > 0 ? 'over' : 'ok'
  const pct = (realized / budgeted) * 100
  if (pct > 100) return 'over'
  if (pct >= 90) return 'warning'
  return 'ok'
}

export async function getBudgetSummary(editionId: string): Promise<BudgetSummary | null> {
  const { data, error } = await getSupabase()
    .from('budget_items')
    .select('id, category, subcategory, budgeted, realized, sort_order')
    .eq('edition_id', editionId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  if (!data || data.length === 0) return null

  const items = (data as BudgetItem[]).map(r => ({
    ...r,
    budgeted: Number(r.budgeted),
    realized: Number(r.realized),
    variationPct: r.budgeted > 0 ? Math.round((Number(r.realized) / Number(r.budgeted)) * 100) : 0,
    status: budgetStatus(Number(r.budgeted), Number(r.realized)),
  }))

  const totalBudgeted = items.reduce((s, r) => s + r.budgeted, 0)
  const totalRealized = items.reduce((s, r) => s + r.realized, 0)
  const balance = totalBudgeted - totalRealized
  const executionPct = totalBudgeted > 0 ? Math.round((totalRealized / totalBudgeted) * 100) : 0

  const groupMap: Record<string, BudgetCategoryGroup> = {}
  for (const item of items) {
    if (!groupMap[item.category]) {
      groupMap[item.category] = { category: item.category, budgeted: 0, realized: 0, variationPct: 0, status: 'ok', items: [] }
    }
    groupMap[item.category].budgeted += item.budgeted
    groupMap[item.category].realized += item.realized
    groupMap[item.category].items.push(item)
  }
  const byCategory = Object.values(groupMap).map(g => ({
    ...g,
    variationPct: g.budgeted > 0 ? Math.round((g.realized / g.budgeted) * 100) : 0,
    status: budgetStatus(g.budgeted, g.realized),
  }))

  return { totalBudgeted, totalRealized, balance, executionPct, byCategory, items }
}

// ─── Comparativo entre edições ───────────────────────────────────────────────

export interface EditionComparison {
  edition: Edition
  stats: OverviewStats
  top_segment: string | null
}

export async function getAllEditionsComparison(): Promise<EditionComparison[]> {
  const supabase = getSupabase()
  const { data: editions, error } = await supabase
    .from('editions')
    .select('*')
    .order('year', { ascending: true })
  if (error) throw error
  if (!editions || editions.length === 0) return []

  const results = await Promise.all(
    (editions as Edition[]).map(async (edition) => {
      const [statsResult, segResult] = await Promise.all([
        supabase.rpc('get_overview_stats', { p_edition_id: edition.id }),
        supabase
          .from('participants')
          .select('company_segment_raw')
          .eq('edition_id', edition.id)
          .not('company_segment_raw', 'is', null)
          .limit(5000),
      ])
      if (statsResult.error || !statsResult.data) return null

      let top_segment: string | null = null
      if (segResult.data && segResult.data.length > 0) {
        const counts: Record<string, number> = {}
        for (const row of segResult.data) {
          const seg = (row.company_segment_raw as string).trim()
          if (seg) counts[seg] = (counts[seg] ?? 0) + 1
        }
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
        top_segment = sorted[0]?.[0] ?? null
      }

      return { edition, stats: statsResult.data as unknown as OverviewStats, top_segment }
    })
  )
  return results.filter((r): r is EditionComparison => r !== null && r.stats.total >= 20)
}

// ─── Análise de empresas ──────────────────────────────────────────────────────

export interface CompanyRow {
  company: string
  count: number
  members: number
  non_members: number
  segment: string | null
  pct: number
}

export interface CompanyAnalysis {
  companies: CompanyRow[]
  total_companies: number
  total_participants: number
  top5_pct: number
  avg_per_company: number
}

export async function getCompanyAnalysis(editionId: string): Promise<CompanyAnalysis> {
  const { data, error } = await getSupabase()
    .from('participants')
    .select('company, ticket_membership, company_segment_normalized')
    .eq('edition_id', editionId)
    .limit(5000)
  if (error) throw error

  const rows = (data ?? []) as { company: string | null; ticket_membership: string; company_segment_normalized: string | null }[]
  const total = rows.length
  const withCompany = rows.filter(r => r.company && r.company.trim() !== '')

  const map = new Map<string, { count: number; members: number; non_members: number; segment: string | null }>()
  for (const p of withCompany) {
    const key = p.company!.trim()
    const v = map.get(key) ?? { count: 0, members: 0, non_members: 0, segment: p.company_segment_normalized }
    v.count++
    if (p.ticket_membership === 'MEMBRO') v.members++
    else v.non_members++
    map.set(key, v)
  }

  const companies: CompanyRow[] = Array.from(map.entries())
    .map(([company, v]) => ({
      company,
      count: v.count,
      members: v.members,
      non_members: v.non_members,
      segment: v.segment,
      pct: total > 0 ? Math.round((v.count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count)

  const top5Total = companies.slice(0, 5).reduce((s, c) => s + c.count, 0)

  return {
    companies,
    total_companies: companies.length,
    total_participants: total,
    top5_pct: total > 0 ? Math.round((top5Total / total) * 1000) / 10 : 0,
    avg_per_company: companies.length > 0 ? Math.round((withCompany.length / companies.length) * 10) / 10 : 0,
  }
}
