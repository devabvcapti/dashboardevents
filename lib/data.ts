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
  Database,
  VcDayPanel,
  LpCategory,
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

// ─── Overview Participants (dados crus para os cards da Visão Geral) ─────────
// Uma única busca alimenta donut de membros, perfil por empresa, grátis vs
// pagos e a linha do tempo — os 4 cards recalculam tudo no client quando o
// usuário filtra por Grátis/Pagos, sem precisar de round-trips extras.

export interface OverviewParticipant {
  id: string
  name: string
  company: string | null
  ticket_membership: TicketMembership
  company_segment_raw: string | null
  valor_efetivo: number
  date: string | null
}

export async function getOverviewParticipants(editionId: string): Promise<OverviewParticipant[]> {
  const { data, error } = await getSupabase()
    .from('participants')
    .select('id, full_name, company, ticket_membership, company_segment_raw, valor_efetivo, registered_at, created_at')
    .eq('edition_id', editionId)
    .limit(5000)
  if (error) throw error

  return (data ?? []).map(row => {
    // registered_at (col BM — data real de inscrição) é a fonte correta;
    // created_at (timestamp do import) só entra como fallback para linhas
    // antigas ou planilhas sem essa coluna mapeada.
    const raw = (row.registered_at as string | null) ?? (row.created_at as string | null)
    return {
      id: row.id as string,
      name: (row.full_name as string | null) ?? '—',
      company: row.company as string | null,
      ticket_membership: row.ticket_membership as TicketMembership,
      company_segment_raw: row.company_segment_raw as string | null,
      valor_efetivo: (row.valor_efetivo as number | null) ?? 0,
      date: raw ? raw.slice(0, 10) : null,
    }
  })
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

// Normaliza variações de grafia/gênero/idioma do cargo para exibição/agrupamento
// nos rankings — o valor gravado em participants.job_title nunca é alterado.
const JOB_TITLE_ALIASES: Record<string, string> = {
  'sócio': 'Sócio(a) / Partner',
  'sócia': 'Sócio(a) / Partner',
  'socio': 'Sócio(a) / Partner',
  'socia': 'Sócio(a) / Partner',
  'partner': 'Sócio(a) / Partner',
  'sócio / partner': 'Sócio(a) / Partner',
  'sócia / partner': 'Sócio(a) / Partner',
  'socio / partner': 'Sócio(a) / Partner',
  'socia / partner': 'Sócio(a) / Partner',
  'sócio diretor': 'Sócio(a) / Partner',
  'sócia diretora': 'Sócio(a) / Partner',
  'socio diretor': 'Sócio(a) / Partner',
  'socia diretora': 'Sócio(a) / Partner',
  'diretor': 'Diretor(a)',
  'diretora': 'Diretor(a)',
  'analista': 'Analista',
  'analyst': 'Analista',
  '.': 'Outros',
  '-': 'Outros',
}

function normalizeJobTitle(raw: string): string {
  const trimmed = raw.trim()
  return JOB_TITLE_ALIASES[trimmed.toLowerCase()] ?? trimmed
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
      const t = normalizeJobTitle(row.job_title)
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

export type CouponCategory = Database['public']['Enums']['coupon_category']

export const COUPON_CATEGORIES: { value: CouponCategory; label: string }[] = [
  { value: 'PATROCINADOR', label: 'Patrocinador' },
  { value: 'APOIADOR', label: 'Apoiador' },
  { value: 'ESTRATEGICO', label: 'Estratégico' },
  { value: 'PALESTRANTES', label: 'Palestrantes' },
  { value: 'CONVIDADOS_PALESTRANTES', label: 'Convidados Palestrantes' },
  { value: 'IMPRENSA', label: 'Imprensa' },
  { value: 'VIPS', label: 'VIPs' },
  { value: 'CONSELHO_ABVCAP', label: 'Conselho ABVCAP' },
  { value: 'PARCEIRO', label: 'Parceiro' },
  { value: 'LPS', label: 'LPs' },
  { value: 'FINANCEIRO', label: 'Financeiro' },
]

export const COUPON_CATEGORY_LABELS: Record<CouponCategory, string> =
  Object.fromEntries(COUPON_CATEGORIES.map(c => [c.value, c.label])) as Record<CouponCategory, string>

export async function getCouponCategories(editionId: string): Promise<Record<string, CouponCategory>> {
  const { data, error } = await getSupabase()
    .from('coupon_categories')
    .select('coupon_code, category')
    .eq('edition_id', editionId)
  if (error) throw error
  return Object.fromEntries(
    (data ?? []).map(r => [r.coupon_code as string, r.category as CouponCategory])
  )
}

export interface CuponSummaryRow {
  coupon_code: string
  count: number
  avg_ticket: number | null
  discount_pct_estimate: number | null
  companies: string[]
  participants: { name: string; company: string | null; segment: string | null }[]
  category: CouponCategory | null
}

export interface OfflinePaymentParticipant {
  id: string
  name: string
  company: string | null
  segment: string | null
  valor_pago_manual: number | null
  valor_efetivo: number
}

export interface OfflinePaymentGroup {
  coupon_code: string
  count: number
  total_paid: number
  participants: OfflinePaymentParticipant[]
}

export interface CategorySummaryGroup {
  category: CouponCategory | 'PAGAMENTO_OFFLINE' | null
  label: string
  count: number
  participants: { name: string; company: string | null; segment: string | null }[]
}

export interface CuponsStats {
  total_with_coupon: number
  total_participants: number
  unique_coupons: number
  avg_ticket_no_coupon: number | null
  total_discount_estimate: number | null
  by_coupon: CuponSummaryRow[]
  by_category: CategorySummaryGroup[]
  top_companies: { company: string; count: number }[]
  offline_payments: OfflinePaymentGroup[]
  offline_total_paid: number
}

const OFFLINE_COUPON_PREFIX = 'PAGAMENTO OFFLINE'

const DIACRITICS_REGEX = new RegExp('[\\u0300-\\u036f]', 'g')

function isOfflinePaymentCoupon(code: string): boolean {
  const normalized = code
    .normalize('NFD')
    .replace(DIACRITICS_REGEX, '')
    .trim()
    .toUpperCase()
  return normalized.startsWith(OFFLINE_COUPON_PREFIX)
}

export async function getCuponsSummary(editionId: string): Promise<CuponsStats> {
  const [{ data, error }, categories] = await Promise.all([
    getSupabase()
      .from('participants')
      .select('id, coupon_code, ticket_value, valor_pago_manual, valor_efetivo, company, full_name, company_segment_raw')
      .eq('edition_id', editionId)
      .limit(5000),
    getCouponCategories(editionId),
  ])
  if (error) throw error

  const rows = (data ?? []) as {
    id: string
    coupon_code: string | null
    ticket_value: number | null
    valor_pago_manual: number | null
    valor_efetivo: number | null
    company: string | null
    full_name: string | null
    company_segment_raw: string | null
  }[]

  const noCouponValues = rows.filter(r => !r.coupon_code && r.ticket_value !== null).map(r => r.ticket_value as number)
  const avgNoCopon = noCouponValues.length > 0
    ? noCouponValues.reduce((s, v) => s + v, 0) / noCouponValues.length
    : null

  // Cupons "PAGAMENTO OFFLINE X" não são desconto promocional — são marcadores
  // operacionais de pagamento via boleto fora do gateway. Tratados à parte,
  // sem contaminar os KPIs/estatísticas de cupons de desconto reais.
  const offlineRows = rows.filter(r => r.coupon_code && isOfflinePaymentCoupon(r.coupon_code))
  const withCoupon = rows.filter(r => r.coupon_code && !isOfflinePaymentCoupon(r.coupon_code))

  const byCode: Record<string, { count: number; values: number[]; companies: Set<string>; participants: { name: string; company: string | null; segment: string | null }[] }> = {}
  const companyCounts: Record<string, number> = {}

  for (const row of withCoupon) {
    const code = row.coupon_code!
    if (!byCode[code]) byCode[code] = { count: 0, values: [], companies: new Set(), participants: [] }
    byCode[code].count++
    if (row.ticket_value !== null) byCode[code].values.push(row.ticket_value)
    if (row.company) {
      byCode[code].companies.add(row.company)
      companyCounts[row.company] = (companyCounts[row.company] ?? 0) + 1
    }
    if (row.full_name) {
      byCode[code].participants.push({ name: row.full_name, company: row.company, segment: row.company_segment_raw })
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
        participants: d.participants.sort((a, b) => a.name.localeCompare(b.name)),
        category: categories[code] ?? null,
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

  const offlineByCode: Record<string, OfflinePaymentParticipant[]> = {}
  for (const row of offlineRows) {
    const code = row.coupon_code!
    if (!offlineByCode[code]) offlineByCode[code] = []
    if (row.full_name) {
      offlineByCode[code].push({
        id: row.id,
        name: row.full_name,
        company: row.company,
        segment: row.company_segment_raw,
        valor_pago_manual: row.valor_pago_manual,
        valor_efetivo: row.valor_efetivo ?? row.ticket_value ?? 0,
      })
    }
  }

  const offline_payments: OfflinePaymentGroup[] = Object.entries(offlineByCode)
    .map(([code, participants]) => ({
      coupon_code: code,
      count: participants.length,
      total_paid: Math.round(participants.reduce((s, p) => s + p.valor_efetivo, 0) * 100) / 100,
      participants: participants.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => b.count - a.count)

  const offline_total_paid = Math.round(
    offline_payments.reduce((s, g) => s + g.total_paid, 0) * 100
  ) / 100

  const categoryGroups: Record<string, { name: string; company: string | null; segment: string | null }[]> = {}
  for (const row of by_coupon) {
    const key = row.category ?? 'SEM_CATEGORIA'
    if (!categoryGroups[key]) categoryGroups[key] = []
    categoryGroups[key].push(...row.participants)
  }
  if (offline_payments.length > 0) {
    const key = 'PAGAMENTO_OFFLINE'
    if (!categoryGroups[key]) categoryGroups[key] = []
    for (const g of offline_payments) {
      for (const p of g.participants) categoryGroups[key].push({ name: p.name, company: p.company, segment: p.segment })
    }
  }

  const by_category: CategorySummaryGroup[] = Object.entries(categoryGroups)
    .map(([key, participants]) => ({
      category: (
        key === 'SEM_CATEGORIA' ? null :
        key === 'PAGAMENTO_OFFLINE' ? 'PAGAMENTO_OFFLINE' :
        key
      ) as CouponCategory | 'PAGAMENTO_OFFLINE' | null,
      label:
        key === 'SEM_CATEGORIA' ? 'Sem Categoria' :
        key === 'PAGAMENTO_OFFLINE' ? 'Pagamento Offline' :
        COUPON_CATEGORY_LABELS[key as CouponCategory],
      count: participants.length,
      participants: participants.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => b.count - a.count)

  return {
    total_with_coupon: withCoupon.length,
    total_participants: rows.length,
    unique_coupons: Object.keys(byCode).length,
    avg_ticket_no_coupon: avgNoCopon !== null ? Math.round(avgNoCopon * 100) / 100 : null,
    total_discount_estimate,
    by_coupon,
    by_category,
    top_companies,
    offline_payments,
    offline_total_paid,
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
  daysActive: number
  total: number
  peakDay: { date: string; count: number } | null
  avgPerDay: number
  milestones: { pct: number; date: string; dayNumber: number }[]
}

export async function getRegistrationRhythm(editionId: string): Promise<RegistrationRhythm> {
  const { data, error } = await getSupabase()
    .from('participants')
    .select('registered_at, created_at, valor_efetivo')
    .eq('edition_id', editionId)
    .limit(5000)
  if (error) throw error

  // registered_at (col BM — data real de inscrição) é a fonte correta;
  // created_at (timestamp do import) só entra como fallback para linhas
  // antigas ou planilhas sem essa coluna mapeada. Só ingressos pagos contam
  // (valor_efetivo > 0) — grátis não representam ritmo de venda real.
  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    const valorEfetivo = row.valor_efetivo as number | null
    if (valorEfetivo === null || valorEfetivo <= 0) continue
    const raw = (row.registered_at as string | null) ?? (row.created_at as string | null)
    if (!raw) continue
    const date = raw.slice(0, 10)
    counts[date] = (counts[date] ?? 0) + 1
  }

  const daysWithRegistration = Object.keys(counts).sort()

  // Preenche dias sem inscrição com 0 para o gráfico refletir a linha do tempo real
  const byDay: RegistrationRhythmDay[] = []
  if (daysWithRegistration.length > 0) {
    let cumulative = 0
    const cursor = new Date(`${daysWithRegistration[0]}T00:00:00Z`)
    const end = new Date(`${daysWithRegistration[daysWithRegistration.length - 1]}T00:00:00Z`)
    while (cursor <= end) {
      const iso = cursor.toISOString().slice(0, 10)
      cumulative += counts[iso] ?? 0
      byDay.push({ date: iso, count: counts[iso] ?? 0, cumulative })
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }
  }

  const total = byDay.length > 0 ? byDay[byDay.length - 1].cumulative : 0
  const peakDay = byDay.length > 0
    ? byDay.reduce((best, d) => d.count > best.count ? d : best)
    : null

  const avgPerDay = daysWithRegistration.length > 0
    ? Math.round(total / daysWithRegistration.length)
    : 0

  const milestoneTargets = [25, 50, 75, 100]
  const milestones = milestoneTargets.flatMap(pct => {
    const target = Math.ceil(total * pct / 100)
    const idx = byDay.findIndex(d => d.cumulative >= target)
    if (idx === -1) return []
    return [{ pct, date: byDay[idx].date, dayNumber: idx + 1 }]
  })

  return { byDay, daysActive: daysWithRegistration.length, total, peakDay, avgPerDay, milestones }
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

// ─── Registration Weekly Goals (meta semanal progressiva) ────────────────────

export interface RegistrationWeeklyGoal {
  id: string
  weekStart: string
  targetCount: number
}

export async function getRegistrationWeeklyGoals(editionId: string): Promise<RegistrationWeeklyGoal[]> {
  const { data, error } = await getSupabase()
    .from('registration_weekly_goals')
    .select('id, week_start, target_count')
    .eq('edition_id', editionId)
    .order('week_start', { ascending: true })
  if (error) throw error
  return (data ?? []).map(r => ({
    id: r.id as string,
    weekStart: r.week_start as string,
    targetCount: r.target_count as number,
  }))
}

// ─── Marketing Communications (correlação com picos de inscrição) ────────────

export interface MarketingCommunication {
  id: string
  sentAt: string
  channel: string
  description: string | null
}

export async function getMarketingCommunications(editionId: string): Promise<MarketingCommunication[]> {
  const { data, error } = await getSupabase()
    .from('marketing_communications')
    .select('id, sent_at, channel, description')
    .eq('edition_id', editionId)
    .order('sent_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map(r => ({
    id: r.id as string,
    sentAt: r.sent_at as string,
    channel: r.channel as string,
    description: r.description as string | null,
  }))
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

export interface SegmentCount { type: string; count: number; pct: number }
export interface JobCount { label: string; count: number; pct: number }

export interface EditionComparison {
  edition: Edition
  stats: OverviewStats
  top_segment: string | null
  top_segments: SegmentCount[]
  top_jobs: JobCount[]
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
    (editions as Edition[]).map(async (edition): Promise<EditionComparison | null> => {
      const [statsResult, segResult, jobResult] = await Promise.all([
        supabase.rpc('get_overview_stats', { p_edition_id: edition.id }),
        supabase
          .from('participants')
          .select('company_segment_raw')
          .eq('edition_id', edition.id)
          .not('company_segment_raw', 'is', null)
          .limit(5000),
        supabase
          .from('participants')
          .select('job_title')
          .eq('edition_id', edition.id)
          .not('job_title', 'is', null)
          .limit(5000),
      ])
      if (statsResult.error || !statsResult.data) return null

      // Segment counts
      const segCounts: Record<string, number> = {}
      for (const row of segResult.data ?? []) {
        const seg = (row.company_segment_raw as string).trim()
        if (seg) segCounts[seg] = (segCounts[seg] ?? 0) + 1
      }
      const segTotal = Object.values(segCounts).reduce((s, n) => s + n, 0) || 1
      const top_segments: SegmentCount[] = Object.entries(segCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7)
        .map(([type, count]) => ({ type, count, pct: Math.round((count / segTotal) * 100) }))
      const top_segment = top_segments[0]?.type ?? null

      // Job title counts
      const jobCounts: Record<string, number> = {}
      for (const row of jobResult.data ?? []) {
        const job = normalizeJobTitle(row.job_title as string)
        if (job) jobCounts[job] = (jobCounts[job] ?? 0) + 1
      }
      const jobTotal = Object.values(jobCounts).reduce((s, n) => s + n, 0) || 1
      const top_jobs: JobCount[] = Object.entries(jobCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([label, count]) => ({ label, count, pct: Math.round((count / jobTotal) * 100) }))

      return { edition, stats: statsResult.data as unknown as OverviewStats, top_segment, top_segments, top_jobs }
    })
  )
  return results.filter((r): r is EditionComparison => r !== null && r.stats.total >= 20)
}

// ─── Comparativo por contagem regressiva (dias antes do evento) ──────────────

export interface CountdownPoint { daysBefore: number; cumulative: number }
export interface CountdownMilestone { label: string; daysBefore: number; cumulative: number | null }
export interface EditionCountdown {
  edition: Edition
  points: CountdownPoint[]
  milestones: CountdownMilestone[]
}

// [dias antes do evento, rótulo] — do mais distante para o mais próximo do evento.
const COUNTDOWN_MILESTONES: Array<[number, string]> = [
  [84, '12 semanas antes'],
  [56, '8 semanas antes'],
  [28, '4 semanas antes'],
  [14, '2 semanas antes'],
  [7, '1 semana antes'],
  [3, '3 dias antes'],
  [0, 'No dia'],
]

export async function getEditionsCountdownComparison(): Promise<EditionCountdown[]> {
  const supabase = getSupabase()
  const { data: editions, error } = await supabase
    .from('editions')
    .select('*')
    .not('event_date', 'is', null)
    .order('year', { ascending: true })
  if (error) throw error
  if (!editions || editions.length === 0) return []

  const results = await Promise.all(
    (editions as Edition[]).map(async (edition): Promise<EditionCountdown> => {
      const { data, error: pErr } = await supabase
        .from('participants')
        .select('registered_at, created_at, valor_efetivo')
        .eq('edition_id', edition.id)
        .limit(5000)
      if (pErr) throw pErr

      // registered_at é a data real de inscrição (created_at é fallback do
      // import). Só ingressos pagos contam — mesmo critério do Ritmo.
      const eventDate = new Date(`${edition.event_date}T00:00:00Z`)
      const counts: Record<number, number> = {}
      for (const row of data ?? []) {
        const valorEfetivo = row.valor_efetivo as number | null
        if (valorEfetivo === null || valorEfetivo <= 0) continue
        const raw = (row.registered_at as string | null) ?? (row.created_at as string | null)
        if (!raw) continue
        const regDate = new Date(`${raw.slice(0, 10)}T00:00:00Z`)
        const daysBefore = Math.round((eventDate.getTime() - regDate.getTime()) / 86_400_000)
        counts[daysBefore] = (counts[daysBefore] ?? 0) + 1
      }

      const daysWithData = Object.keys(counts).map(Number)
      const points: CountdownPoint[] = []
      const cumByDay = new Map<number, number>()
      if (daysWithData.length > 0) {
        const maxDays = Math.max(...daysWithData)
        const minDays = Math.min(...daysWithData)
        let cumulative = 0
        for (let d = maxDays; d >= minDays; d--) {
          cumulative += counts[d] ?? 0
          points.push({ daysBefore: d, cumulative })
          cumByDay.set(d, cumulative)
        }
      }

      const total = points.length > 0 ? points[points.length - 1].cumulative : 0
      const maxDays = points.length > 0 ? points[0].daysBefore : null
      const minDays = points.length > 0 ? points[points.length - 1].daysBefore : null

      const milestones: CountdownMilestone[] = COUNTDOWN_MILESTONES.map(([daysBefore, label]) => {
        let cumulative: number | null
        if (maxDays === null) cumulative = null
        else if (daysBefore > maxDays) cumulative = 0
        else if (minDays !== null && daysBefore < minDays) cumulative = total
        else cumulative = cumByDay.get(daysBefore) ?? null
        return { label, daysBefore, cumulative }
      })

      return { edition, points, milestones }
    })
  )

  return results
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

// ─── VC Day — Q&A e Avaliações de Painéis ─────────────────────────────────────

export interface VcDayPanelSummary {
  id: string
  name: string
  nameEn: string | null
  startsAt: string
  endsAt: string
  speakers: string | null
  questionCount: number
  evaluationCount: number
  avgRating: number | null
}

export interface VcDayComment {
  id: string
  panelId: string | null
  panelName: string | null
  rating: number
  liked: string | null
  improve: string | null
  authorName: string | null
  createdAt: string
}

export interface VcDayQaSummary {
  panels: VcDayPanelSummary[]
  totalQuestions: number
  totalEvaluations: number
  overallAvgRating: number | null
  comments: VcDayComment[]
}

// A mesma plataforma de Q&A/avaliação é reaproveitada para outros eventos
// (ex.: Congresso ABVCAP, cujos painéis já estão cadastrados para 22–23/09) —
// vcday_panels.event_date é o único campo que identifica a qual evento cada
// painel pertence, então o resultado precisa ser filtrado por essa data para
// não misturar perguntas/avaliações de eventos diferentes.
export async function getVcDayQaSummary(eventDate: string): Promise<VcDayQaSummary> {
  const supabase = getSupabase()
  const [panelsRes, questionsRes, evaluationsRes] = await Promise.all([
    supabase.from('vcday_panels').select('*').eq('event_date', eventDate).order('sort_order', { ascending: true }),
    supabase.from('vcday_questions').select('panel_id'),
    supabase.from('vcday_evaluations').select('*'),
  ])
  if (panelsRes.error) throw panelsRes.error
  if (questionsRes.error) throw questionsRes.error
  if (evaluationsRes.error) throw evaluationsRes.error

  const panels = (panelsRes.data ?? []) as VcDayPanel[]
  const panelIds = new Set(panels.map(p => p.id))
  const questions = (questionsRes.data ?? []).filter(q => panelIds.has(q.panel_id))
  const allEvaluations = evaluationsRes.data ?? []

  // Avaliações "gerais" (sem panel_id) só pertencem a este evento se
  // compartilharem o event_slug usado pelas avaliações já ligadas aos
  // painéis deste evento — evita atribuir avaliações gerais do Congresso ao VC Day.
  const eventSlugs = new Set(
    allEvaluations.filter(ev => ev.panel_id && panelIds.has(ev.panel_id)).map(ev => ev.event_slug)
  )
  const evaluations = allEvaluations.filter(ev =>
    (ev.panel_id && panelIds.has(ev.panel_id)) || (!ev.panel_id && eventSlugs.has(ev.event_slug))
  )

  const questionCountByPanel = new Map<string, number>()
  for (const q of questions) {
    questionCountByPanel.set(q.panel_id, (questionCountByPanel.get(q.panel_id) ?? 0) + 1)
  }

  const ratingsByPanel = new Map<string, number[]>()
  for (const ev of evaluations) {
    if (!ev.panel_id) continue
    const arr = ratingsByPanel.get(ev.panel_id) ?? []
    arr.push(ev.rating)
    ratingsByPanel.set(ev.panel_id, arr)
  }

  const panelSummaries: VcDayPanelSummary[] = panels.map(p => {
    const ratings = ratingsByPanel.get(p.id) ?? []
    return {
      id: p.id,
      name: p.name,
      nameEn: p.name_en,
      startsAt: p.starts_at,
      endsAt: p.ends_at,
      speakers: p.speakers,
      questionCount: questionCountByPanel.get(p.id) ?? 0,
      evaluationCount: ratings.length,
      avgRating: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
    }
  })

  const panelNameById = new Map(panels.map(p => [p.id, p.name]))
  const comments: VcDayComment[] = evaluations
    .filter(ev => (ev.liked && ev.liked.trim() !== '') || (ev.improve && ev.improve.trim() !== ''))
    .map(ev => ({
      id: ev.id,
      panelId: ev.panel_id,
      panelName: ev.panel_id ? (panelNameById.get(ev.panel_id) ?? null) : null,
      rating: ev.rating,
      liked: ev.liked,
      improve: ev.improve,
      authorName: ev.author_name,
      createdAt: ev.created_at,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const allRatings = evaluations.map(ev => ev.rating)

  return {
    panels: panelSummaries,
    totalQuestions: questions.length,
    totalEvaluations: evaluations.length,
    overallAvgRating: allRatings.length > 0 ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : null,
    comments,
  }
}

// ─── LPs — Classificação por subcategoria e análise por evento ────────────────

export type { LpCategory }

export const LP_CATEGORY_LABELS: Record<LpCategory, string> = {
  AGENCIA_FOMENTO_DFI: 'Agência de Fomento / DFI',
  FAMILY_OFFICE: 'Family Office',
  FUNDO_PENSAO: 'Fundo de Pensão',
  FUNDO_DE_FUNDOS: 'Fundo de Fundos',
  RPPS: 'RPPS',
  WEALTH_MANAGEMENT: 'Wealth Management',
  ASSET_MANAGER: 'Asset Manager',
  HNI: 'HNI',
}

export const LP_CATEGORIES = Object.keys(LP_CATEGORY_LABELS) as LpCategory[]

// Empresas LP se repetem entre eventos e chegam com pequenas variações de grafia
// entre importações (acento, maiúscula, travessão vs hífen) — normaliza antes de
// comparar/gravar para que a mesma empresa não vire duas linhas no cadastro.
// Não resolve variações mais distantes (abreviação, nome fantasia x razão social);
// isso fica para o matching com a planilha mestre (fase 2).
export function normalizeCompanyKey(raw: string): string {
  return raw
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[‐-―]/g, '-')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*\/\s*/g, '/')
}

export interface LpCompanyCategoryRow {
  companyKey: string
  displayName: string
  category: LpCategory
}

export async function getLpCompanyCategories(): Promise<LpCompanyCategoryRow[]> {
  const { data, error } = await getSupabase()
    .from('lp_company_categories')
    .select('company_key, display_name, category')
  if (error) throw error
  return (data ?? []).map(r => ({
    companyKey: r.company_key,
    displayName: r.display_name,
    category: r.category,
  }))
}

export async function upsertLpCompanyCategory(
  companyName: string,
  category: LpCategory
): Promise<void> {
  const companyKey = normalizeCompanyKey(companyName)
  const { error } = await getSupabase()
    .from('lp_company_categories')
    .upsert(
      { company_key: companyKey, display_name: companyName.trim(), category, updated_at: new Date().toISOString() },
      { onConflict: 'company_key' }
    )
  if (error) throw error
}

export async function deleteLpCompanyCategory(companyKey: string): Promise<void> {
  const { error } = await getSupabase()
    .from('lp_company_categories')
    .delete()
    .eq('company_key', companyKey)
  if (error) throw error
}

export interface LpUnclassifiedCompany {
  companyKey: string
  displayName: string
  participantCount: number
}

export interface LpCategoryBreakdown {
  category: LpCategory
  companyCount: number
  participantCount: number
}

export interface LpCompanyRow {
  companyKey: string
  displayName: string
  participantCount: number
  category: LpCategory | null
}

export interface LpAnalysis {
  totalLpParticipants: number
  totalAudience: number
  pctOfAudience: number
  distinctCompanies: number
  avgParticipantsPerCompany: number
  classifiedParticipants: number
  byCategory: LpCategoryBreakdown[]
  unclassified: LpUnclassifiedCompany[]
  companies: LpCompanyRow[]
}

export interface LpExcludedCompany {
  companyKey: string
  displayName: string
  reason: string | null
}

export async function getLpExcludedCompanies(): Promise<LpExcludedCompany[]> {
  const { data, error } = await getSupabase()
    .from('lp_excluded_companies')
    .select('company_key, display_name, reason')
  if (error) throw error
  return (data ?? []).map(r => ({ companyKey: r.company_key, displayName: r.display_name, reason: r.reason }))
}

// Marca uma empresa como "não é LP" — para casos em que company_segment_normalized
// classificou errado (derivado por regex de texto livre, ver lib/import/segment-mapper.ts).
// Reversível via restoreLpCompany. Também remove a subcategoria, se houver, para não
// deixar dado órfão de uma empresa que não conta mais como LP.
export async function excludeLpCompany(companyName: string, reason: string | null): Promise<void> {
  const companyKey = normalizeCompanyKey(companyName)
  const { error } = await getSupabase()
    .from('lp_excluded_companies')
    .upsert({ company_key: companyKey, display_name: companyName.trim(), reason }, { onConflict: 'company_key' })
  if (error) throw error
  await deleteLpCompanyCategory(companyKey).catch(() => {})
}

export async function restoreLpCompany(companyKey: string): Promise<void> {
  const { error } = await getSupabase()
    .from('lp_excluded_companies')
    .delete()
    .eq('company_key', companyKey)
  if (error) throw error
}

// Conta participantes LP por empresa (chave normalizada) numa edição — usado tanto
// pela classificação por subcategoria quanto pela cobertura vs. planilha mestre.
// Empresas em lp_excluded_companies nunca contam como LP em nenhuma métrica.
async function getLpParticipantCompanyCounts(editionId: string): Promise<Map<string, { displayName: string; count: number }>> {
  const [{ data, error }, excluded] = await Promise.all([
    getSupabase()
      .from('participants')
      .select('company')
      .eq('edition_id', editionId)
      .eq('company_segment_normalized', 'LP')
      .not('company', 'is', null)
      .limit(5000),
    getLpExcludedCompanies(),
  ])
  if (error) throw error

  const excludedKeys = new Set(excluded.map(e => e.companyKey))

  const companyCounts = new Map<string, { displayName: string; count: number }>()
  for (const row of data ?? []) {
    const raw = (row.company as string).trim()
    if (!raw) continue
    const key = normalizeCompanyKey(raw)
    if (excludedKeys.has(key)) continue
    const existing = companyCounts.get(key)
    if (existing) existing.count++
    else companyCounts.set(key, { displayName: raw, count: 1 })
  }
  return companyCounts
}

export async function getLpAnalysis(editionId: string): Promise<LpAnalysis> {
  const supabase = getSupabase()
  const [companyCounts, { count: totalAudience, error: totalErr }, categories] = await Promise.all([
    getLpParticipantCompanyCounts(editionId),
    supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('edition_id', editionId),
    getLpCompanyCategories(),
  ])
  if (totalErr) throw totalErr

  const categoryByKey = new Map(categories.map(c => [c.companyKey, c.category]))

  const totalLpParticipants = Array.from(companyCounts.values()).reduce((s, c) => s + c.count, 0)
  const distinctCompanies = companyCounts.size

  const byCategoryMap = new Map<LpCategory, { companyCount: number; participantCount: number }>()
  let classifiedParticipants = 0
  const unclassified: LpUnclassifiedCompany[] = []

  for (const [key, { displayName, count }] of companyCounts) {
    const category = categoryByKey.get(key)
    if (!category) {
      unclassified.push({ companyKey: key, displayName, participantCount: count })
      continue
    }
    classifiedParticipants += count
    const bucket = byCategoryMap.get(category) ?? { companyCount: 0, participantCount: 0 }
    bucket.companyCount++
    bucket.participantCount += count
    byCategoryMap.set(category, bucket)
  }

  const byCategory: LpCategoryBreakdown[] = LP_CATEGORIES
    .map(category => ({ category, ...(byCategoryMap.get(category) ?? { companyCount: 0, participantCount: 0 }) }))
    .filter(b => b.companyCount > 0)
    .sort((a, b) => b.participantCount - a.participantCount)

  unclassified.sort((a, b) => b.participantCount - a.participantCount)

  const companies: LpCompanyRow[] = Array.from(companyCounts.entries())
    .map(([key, { displayName, count }]) => ({
      companyKey: key,
      displayName,
      participantCount: count,
      category: categoryByKey.get(key) ?? null,
    }))
    .sort((a, b) => b.participantCount - a.participantCount || a.displayName.localeCompare(b.displayName))

  return {
    totalLpParticipants,
    totalAudience: totalAudience ?? 0,
    pctOfAudience: (totalAudience ?? 0) > 0 ? (totalLpParticipants / (totalAudience as number)) * 100 : 0,
    distinctCompanies,
    avgParticipantsPerCompany: distinctCompanies > 0 ? totalLpParticipants / distinctCompanies : 0,
    classifiedParticipants,
    byCategory,
    unclassified,
    companies,
  }
}

// ─── LPs — Planilha mestre e cobertura (Fase 2) ────────────────────────────────

// Normaliza texto livre de categoria vindo da planilha mestre (ex. "Fundos de Pensão",
// "Single Family Office") para o enum lp_category. Reaproveita normalizeCompanyKey
// (acento/caixa/espaço) — não é fuzzy matching, só variações conhecidas.
const LP_CATEGORY_TEXT_ALIASES: Record<string, LpCategory> = (() => {
  const map: Record<string, LpCategory> = {}
  for (const cat of LP_CATEGORIES) map[normalizeCompanyKey(LP_CATEGORY_LABELS[cat])] = cat
  map[normalizeCompanyKey('DFI')] = 'AGENCIA_FOMENTO_DFI'
  map[normalizeCompanyKey('Agência de Fomento')] = 'AGENCIA_FOMENTO_DFI'
  map[normalizeCompanyKey('Fomento')] = 'AGENCIA_FOMENTO_DFI'
  map[normalizeCompanyKey('Fundos de Pensão')] = 'FUNDO_PENSAO'
  map[normalizeCompanyKey('Fundo de Fundo')] = 'FUNDO_DE_FUNDOS'
  map[normalizeCompanyKey('FoF')] = 'FUNDO_DE_FUNDOS'
  map[normalizeCompanyKey('Single Family Office')] = 'FAMILY_OFFICE'
  map[normalizeCompanyKey('Multi Family Office')] = 'FAMILY_OFFICE'
  map[normalizeCompanyKey('MFO')] = 'FAMILY_OFFICE'
  map[normalizeCompanyKey('SFO')] = 'FAMILY_OFFICE'
  return map
})()

export function parseLpCategoryText(raw: string): LpCategory | null {
  return LP_CATEGORY_TEXT_ALIASES[normalizeCompanyKey(raw)] ?? null
}

export interface LpMasterCompany {
  companyKey: string
  displayName: string
  category: LpCategory | null
  country: string | null
}

export async function getLpMasterList(): Promise<LpMasterCompany[]> {
  const { data, error } = await getSupabase()
    .from('lp_master_companies')
    .select('company_key, display_name, category, country')
  if (error) throw error
  return (data ?? []).map(r => ({
    companyKey: r.company_key,
    displayName: r.display_name,
    category: r.category,
    country: r.country,
  }))
}

export interface LpMasterUploadRow {
  displayName: string
  category: LpCategory | null
  country: string | null
}

// Substitui a planilha mestre inteira (é um snapshot do universo conhecido de LPs,
// não um log incremental — cada upload representa "isto é tudo que sabemos hoje").
export async function replaceLpMasterList(rows: LpMasterUploadRow[]): Promise<{ inserted: number }> {
  const supabase = getSupabase()
  const dedup = new Map<string, { company_key: string; display_name: string; category: LpCategory | null; country: string | null }>()
  for (const r of rows) {
    const name = r.displayName.trim()
    if (!name) continue
    const key = normalizeCompanyKey(name)
    dedup.set(key, { company_key: key, display_name: name, category: r.category, country: r.country })
  }

  const { error: delError } = await supabase.from('lp_master_companies').delete().not('id', 'is', null)
  if (delError) throw delError

  const insertRows = Array.from(dedup.values())
  if (insertRows.length > 0) {
    const { error: insError } = await supabase.from('lp_master_companies').insert(insertRows)
    if (insError) throw insError
  }
  return { inserted: insertRows.length }
}

export interface LpMasterCategoryCoverage {
  category: LpCategory
  totalInMaster: number
  confirmed: number
  pctConfirmed: number
}

export interface LpMasterUnconfirmed {
  companyKey: string
  displayName: string
  category: LpCategory | null
}

export interface LpNewLp {
  companyKey: string
  displayName: string
  participantCount: number
}

export interface LpMasterCoverage {
  hasMasterList: boolean
  totalMasterCompanies: number
  confirmedCompanies: number
  pctConfirmed: number
  byCategory: LpMasterCategoryCoverage[]
  unconfirmed: LpMasterUnconfirmed[]
  newLpsNotInMaster: LpNewLp[]
}

export async function getLpMasterCoverage(editionId: string): Promise<LpMasterCoverage> {
  const [master, participantCompanies] = await Promise.all([
    getLpMasterList(),
    getLpParticipantCompanyCounts(editionId),
  ])

  if (master.length === 0) {
    return {
      hasMasterList: false,
      totalMasterCompanies: 0,
      confirmedCompanies: 0,
      pctConfirmed: 0,
      byCategory: [],
      unconfirmed: [],
      newLpsNotInMaster: [],
    }
  }

  const masterKeys = new Set(master.map(m => m.companyKey))
  const confirmedKeys = new Set(master.filter(m => participantCompanies.has(m.companyKey)).map(m => m.companyKey))

  const byCategoryMap = new Map<LpCategory, { totalInMaster: number; confirmed: number }>()
  for (const m of master) {
    if (!m.category) continue
    const bucket = byCategoryMap.get(m.category) ?? { totalInMaster: 0, confirmed: 0 }
    bucket.totalInMaster++
    if (confirmedKeys.has(m.companyKey)) bucket.confirmed++
    byCategoryMap.set(m.category, bucket)
  }
  const byCategory: LpMasterCategoryCoverage[] = LP_CATEGORIES
    .map(category => {
      const b = byCategoryMap.get(category)
      return b ? { category, totalInMaster: b.totalInMaster, confirmed: b.confirmed, pctConfirmed: (b.confirmed / b.totalInMaster) * 100 } : null
    })
    .filter((b): b is LpMasterCategoryCoverage => b !== null)
    .sort((a, b) => b.totalInMaster - a.totalInMaster)

  const unconfirmed: LpMasterUnconfirmed[] = master
    .filter(m => !confirmedKeys.has(m.companyKey))
    .map(m => ({ companyKey: m.companyKey, displayName: m.displayName, category: m.category }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName))

  const newLpsNotInMaster: LpNewLp[] = Array.from(participantCompanies.entries())
    .filter(([key]) => !masterKeys.has(key))
    .map(([key, v]) => ({ companyKey: key, displayName: v.displayName, participantCount: v.count }))
    .sort((a, b) => b.participantCount - a.participantCount)

  return {
    hasMasterList: true,
    totalMasterCompanies: master.length,
    confirmedCompanies: confirmedKeys.size,
    pctConfirmed: (confirmedKeys.size / master.length) * 100,
    byCategory,
    unconfirmed,
    newLpsNotInMaster,
  }
}
