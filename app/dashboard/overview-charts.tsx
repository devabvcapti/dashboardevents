'use client'

import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, LabelList, Legend,
} from 'recharts'
import { useTheme } from 'next-themes'
import type { OverviewParticipant, OverviewStats, RegistrationWeeklyGoal } from '@/lib/data'
import { OverviewKpis } from './overview-kpis'

const NAVY_LIGHT = '#112468'
const NAVY_DARK  = '#6b9be8'

function useChartColors() {
  const { resolvedTheme } = useTheme()
  const navy = resolvedTheme === 'dark' ? NAVY_DARK : NAVY_LIGHT
  return [
    '#00a99d',
    navy,
    'oklch(0.62 0.14 162)',
    'oklch(0.72 0.14 68)',
    'oklch(0.64 0.18 28)',
    'oklch(0.60 0.15 295)',
    'oklch(0.68 0.12 130)',
  ]
}

const AXIS_STYLE = {
  fontSize: 11,
  fontFamily: 'var(--font-ibm-mono)',
  fill: 'oklch(0.52 0.04 254)',
}

const TOOLTIP_STYLE = {
  backgroundColor: '#ffffff',
  border: '1px solid oklch(0.89 0.010 240)',
  borderRadius: '6px',
  color: '#112468',
  fontSize: '12px',
  fontFamily: 'var(--font-ibm-mono)',
  boxShadow: '0 4px 16px rgba(17, 36, 104, 0.08)',
}

const GRID_COLOR = 'oklch(0.89 0.010 240)'

function formatDateLabel(iso: string) {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
}

// Segunda-feira da semana ISO a que a data pertence, em UTC
function startOfWeek(iso: string) {
  const dt = new Date(`${iso}T00:00:00Z`)
  const diffToMonday = (dt.getUTCDay() + 6) % 7
  dt.setUTCDate(dt.getUTCDate() - diffToMonday)
  return dt.toISOString().slice(0, 10)
}

function buildTimeline(list: { date: string | null }[]): { date: string; count: number }[] {
  const counts: Record<string, number> = {}
  for (const p of list) {
    if (!p.date) continue
    counts[p.date] = (counts[p.date] ?? 0) + 1
  }
  const dates = Object.keys(counts).sort()
  if (dates.length === 0) return []

  // Preenche dias sem inscrição com 0 para o gráfico refletir a linha do tempo real
  const result: { date: string; count: number }[] = []
  const cursor = new Date(`${dates[0]}T00:00:00Z`)
  const end = new Date(`${dates[dates.length - 1]}T00:00:00Z`)
  while (cursor <= end) {
    const iso = cursor.toISOString().slice(0, 10)
    result.push({ date: iso, count: counts[iso] ?? 0 })
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return result
}

function toWeekly(daily: { date: string; count: number }[]) {
  const weeks: Record<string, number> = {}
  for (const d of daily) {
    const key = startOfWeek(d.date)
    weeks[key] = (weeks[key] ?? 0) + d.count
  }
  return Object.entries(weeks)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))
}

type TicketFilter = 'all' | 'free' | 'paid'
type MembershipFilter = 'all' | 'MEMBRO' | 'NAO_MEMBRO'

const TICKET_FILTER_LABEL: Record<Exclude<TicketFilter, 'all'>, string> = {
  free: 'Grátis (R$0)',
  paid: 'Pagos',
}
const MEMBERSHIP_FILTER_LABEL: Record<Exclude<MembershipFilter, 'all'>, string> = {
  MEMBRO: 'Membros',
  NAO_MEMBRO: 'Não Membros',
}

function matchesTicket(p: OverviewParticipant, f: TicketFilter) {
  if (f === 'all') return true
  return f === 'free' ? p.valor_efetivo === 0 : p.valor_efetivo > 0
}
function matchesMembership(p: OverviewParticipant, f: MembershipFilter) {
  return f === 'all' || p.ticket_membership === f
}

interface Props {
  participants: OverviewParticipant[]
  stats: OverviewStats
  registrationGoal: number | null
  weeklyGoals: RegistrationWeeklyGoal[]
}

const SEMAFORO: Record<'green' | 'yellow' | 'red', { label: string; dot: string; text: string; bg: string }> = {
  green:  { label: 'No ritmo',           dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  yellow: { label: 'Levemente atrasado', dot: 'bg-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' },
  red:    { label: 'Atrasado',           dot: 'bg-red-500',     text: 'text-red-700',     bg: 'bg-red-50 border-red-200' },
}

export function OverviewCharts({ participants, stats, registrationGoal, weeklyGoals }: Props) {
  const CHART_COLORS = useChartColors()
  const [granularity, setGranularity] = useState<'daily' | 'weekly'>('daily')
  const [ticketFilter, setTicketFilter] = useState<TicketFilter>('all')
  const [membershipFilter, setMembershipFilter] = useState<MembershipFilter>('all')
  const [showTicketList, setShowTicketList] = useState(false)
  const [showMembershipList, setShowMembershipList] = useState(false)

  const noFilterActive = ticketFilter === 'all' && membershipFilter === 'all'

  function handleTicketBarClick(clicked: 'free' | 'paid') {
    if (ticketFilter === clicked) {
      setTicketFilter('all')
      setShowTicketList(false)
    } else {
      setTicketFilter(clicked)
      setShowTicketList(true)
    }
  }

  function handleMembershipClick(clicked: 'MEMBRO' | 'NAO_MEMBRO') {
    if (membershipFilter === clicked) {
      setMembershipFilter('all')
      setShowMembershipList(false)
    } else {
      setMembershipFilter(clicked)
      setShowMembershipList(true)
    }
  }

  function clearAllFilters() {
    setTicketFilter('all')
    setMembershipFilter('all')
    setShowTicketList(false)
    setShowMembershipList(false)
  }

  // Filtro combinado (Grátis/Pagos + Membros/Não-Membros) — alimenta o
  // perfil por empresa, a linha do tempo e a faixa de KPIs.
  const filtered = useMemo(
    () => participants.filter(p => matchesTicket(p, ticketFilter) && matchesMembership(p, membershipFilter)),
    [participants, ticketFilter, membershipFilter]
  )

  // Cada card fonte de filtro (Membros/Não-Membros e Grátis/Pagos) se
  // recalcula cruzado pela OUTRA dimensão, mas nunca pela própria — senão
  // clicar numa fatia faria as demais desaparecerem do próprio gráfico.
  const byMembershipDimension = useMemo(
    () => participants.filter(p => matchesTicket(p, ticketFilter)),
    [participants, ticketFilter]
  )
  const byTicketDimension = useMemo(
    () => participants.filter(p => matchesMembership(p, membershipFilter)),
    [participants, membershipFilter]
  )

  const displayTotal = noFilterActive ? stats.total : filtered.length

  // Meta de inscrições — sempre sobre o total real do evento, independente
  // dos filtros Grátis/Pagos e Membros/Não-Membros (é uma meta do evento
  // como um todo, não faria sentido "cair" ao aplicar um filtro).
  const goalTotal = participants.length
  const goalPct = registrationGoal ? Math.min(100, Math.round((goalTotal / registrationGoal) * 100)) : 0

  // Ritmo semanal — compara o acumulado real com os checkpoints manuais
  // (registration_weekly_goals) para o gráfico de ritmo e o sinal de semáforo.
  const todayWeekStart = useMemo(() => startOfWeek(new Date().toISOString().slice(0, 10)), [])

  const sortedWeeklyGoals = useMemo(
    () => [...weeklyGoals].sort((a, b) => a.weekStart.localeCompare(b.weekStart)),
    [weeklyGoals]
  )

  const paceChartData = useMemo(() => {
    const realWeekly = toWeekly(buildTimeline(participants))
    const realCumulative: Record<string, number> = {}
    let running = 0
    for (const w of realWeekly) {
      running += w.count
      realCumulative[w.date] = running
    }
    const realWeeksSorted = Object.keys(realCumulative).sort()

    const allWeeks = Array.from(new Set([
      ...realWeeksSorted,
      ...sortedWeeklyGoals.map(g => g.weekStart),
    ])).sort()

    let lastKnownReal = 0
    return allWeeks.map(week => {
      if (realCumulative[week] !== undefined) lastKnownReal = realCumulative[week]
      const meta = sortedWeeklyGoals.find(g => g.weekStart === week)?.targetCount ?? null
      return {
        week,
        dateLabel: formatDateLabel(week),
        real: week <= todayWeekStart ? lastKnownReal : null,
        meta,
      }
    })
  }, [participants, sortedWeeklyGoals, todayWeekStart])

  // Semáforo: compara o real de hoje com o checkpoint mais recente já alcançado
  const currentCheckpoint = useMemo(() => {
    const passed = sortedWeeklyGoals.filter(g => g.weekStart <= todayWeekStart)
    return passed.length > 0 ? passed[passed.length - 1] : null
  }, [sortedWeeklyGoals, todayWeekStart])

  const semaforoStatus: 'green' | 'yellow' | 'red' | null = useMemo(() => {
    if (!currentCheckpoint) return null
    const ratio = goalTotal / currentCheckpoint.targetCount
    if (ratio >= 1) return 'green'
    if (ratio >= 0.85) return 'yellow'
    return 'red'
  }, [currentCheckpoint, goalTotal])

  // Faixa de KPIs no topo — recalculada a partir dos filtros ativos.
  // states_represented depende de form_responses (fora do fetch de participants),
  // então mantém o valor não filtrado nesse único campo.
  const filteredStats: OverviewStats = useMemo(() => {
    if (noFilterActive) return stats
    let membro = 0
    let totalRevenue = 0
    let paidSum = 0
    let paidCount = 0
    const companies = new Set<string>()
    for (const p of filtered) {
      if (p.ticket_membership === 'MEMBRO') membro++
      totalRevenue += p.valor_efetivo
      if (p.valor_efetivo > 0) { paidSum += p.valor_efetivo; paidCount++ }
      if (p.company) companies.add(p.company)
    }
    const total = filtered.length
    return {
      total,
      membro,
      nao_membro: total - membro,
      total_revenue: totalRevenue,
      avg_ticket: paidCount > 0 ? paidSum / paidCount : 0,
      unique_companies: companies.size,
      states_represented: stats.states_represented,
    }
  }, [filtered, noFilterActive, stats])

  // Membros vs Não-Membros — cruzado pelo filtro Grátis/Pagos
  const byTicketType = useMemo(() => {
    let membro = 0
    let naoMembro = 0
    for (const p of byMembershipDimension) {
      if (p.ticket_membership === 'MEMBRO') membro++
      else naoMembro++
    }
    return [
      { type: 'Membros', count: membro, groupKey: 'MEMBRO' as const },
      { type: 'Não Membros', count: naoMembro, groupKey: 'NAO_MEMBRO' as const },
    ]
  }, [byMembershipDimension])

  // Perfil por Tipo de Empresa — respeita os dois filtros
  const companyData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of filtered) {
      const seg = p.company_segment_raw?.trim()
      if (seg) counts[seg] = (counts[seg] ?? 0) + 1
    }
    const sumCompany = Object.values(counts).reduce((a, b) => a + b, 0)
    return Object.entries(counts)
      .map(([type, count]) => ({
        type,
        count,
        pct: sumCompany > 0 ? Math.round((count / sumCompany) * 1000) / 10 : 0,
        label: `${count} (${sumCompany > 0 ? Math.round((count / sumCompany) * 100) : 0}%)`,
      }))
      .sort((a, b) => b.count - a.count)
  }, [filtered])

  // Grátis vs Pagos — cruzado pelo filtro Membros/Não-Membros
  const freeCount = useMemo(() => byTicketDimension.filter(p => p.valor_efetivo === 0).length, [byTicketDimension])
  const paidCount = byTicketDimension.length - freeCount
  const freePct = byTicketDimension.length > 0 ? Math.round((freeCount / byTicketDimension.length) * 100) : 0
  const freeChartData = byTicketDimension.length > 0
    ? [
        { type: 'Grátis (R$0)', count: freeCount, groupKey: 'free' as const },
        { type: 'Pagos', count: paidCount, groupKey: 'paid' as const },
      ]
    : []

  const filteredParticipantList = useMemo(
    () => filtered
      .map(p => ({ id: p.id, name: p.name, company: p.company }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [filtered]
  )

  // Linha — inscrições ao longo do tempo (reflete os filtros ativos)
  const timelineBase = useMemo(() => buildTimeline(filtered), [filtered])
  const timelineData = useMemo(() => {
    const base = granularity === 'weekly' ? toWeekly(timelineBase) : timelineBase
    return base.map(d => ({ ...d, dateLabel: formatDateLabel(d.date) }))
  }, [timelineBase, granularity])

  // Evita amontoar rótulos no eixo quando há muitos pontos
  const tickStep = Math.max(1, Math.ceil(timelineData.length / 15))
  const timelineTicks = timelineData
    .filter((_, i) => i % tickStep === 0 || i === timelineData.length - 1)
    .map(d => d.dateLabel)

  const timelineName = ticketFilter === 'free' ? 'Inscrições grátis' : ticketFilter === 'paid' ? 'Inscrições pagas' : 'Inscrições'

  const activeFilterLabels = [
    ticketFilter !== 'all' ? TICKET_FILTER_LABEL[ticketFilter] : null,
    membershipFilter !== 'all' ? MEMBERSHIP_FILTER_LABEL[membershipFilter] : null,
  ].filter((v): v is string => v !== null)

  return (
    <div className="space-y-8">
      <OverviewKpis stats={filteredStats} />
      {(registrationGoal !== null || sortedWeeklyGoals.length > 0) && (
        <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
            <ChartLabel>Meta de Inscrições</ChartLabel>
            <div className="flex items-center gap-3">
              {semaforoStatus && (
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded border ${SEMAFORO[semaforoStatus].bg} ${SEMAFORO[semaforoStatus].text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${SEMAFORO[semaforoStatus].dot}`} />
                  {SEMAFORO[semaforoStatus].label}
                  {currentCheckpoint && (
                    <span className="text-muted-foreground/60">
                      ({goalTotal.toLocaleString('pt-BR')} de {currentCheckpoint.targetCount.toLocaleString('pt-BR')} esperados)
                    </span>
                  )}
                </span>
              )}
              {registrationGoal !== null && (
                <p className="text-[11px] font-mono text-muted-foreground">
                  <span className="text-foreground font-medium">{goalTotal.toLocaleString('pt-BR')}</span>
                  {' de '}{registrationGoal.toLocaleString('pt-BR')} no total ({goalPct}%)
                </p>
              )}
            </div>
          </div>

          {registrationGoal !== null && (
            <div className="h-2 bg-border rounded-full overflow-hidden mb-4">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${goalPct}%` }}
              />
            </div>
          )}

          {sortedWeeklyGoals.length > 0 && (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={paceChartData} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeOpacity={0.6} />
                <XAxis dataKey="dateLabel" tick={{ ...AXIS_STYLE, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelFormatter={label => `Semana de ${label}`}
                  formatter={(v, name) => [v, name === 'real' ? 'Real acumulado' : 'Meta acumulada']}
                />
                <Legend
                  formatter={value => value === 'real' ? 'Real acumulado' : 'Meta acumulada'}
                  wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font-ibm-mono)' }}
                />
                <Line
                  type="monotone"
                  dataKey="real"
                  name="real"
                  stroke="#00a99d"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#00a99d', strokeWidth: 0 }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="meta"
                  name="meta"
                  stroke={CHART_COLORS[1]}
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  dot={{ r: 3, fill: CHART_COLORS[1], strokeWidth: 0 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
      <div className="space-y-3">
      {!noFilterActive && (
        <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
          <span>Filtrando por: <span className="text-foreground">{activeFilterLabels.join(' e ')}</span></span>
          <button type="button" onClick={clearAllFilters} className="text-primary hover:underline">
            limpar
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Membros vs Não-Membros e Grátis vs Pagos lado a lado */}
      {/* OV-03 — Donut Membros vs Não-Membros com label central — clicável */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
        <ChartLabel>Membros vs Não-Membros</ChartLabel>
        {byTicketType.every(t => t.count === 0) ? <EmptyChart /> : (
          <div className="relative">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={byTicketType}
                  dataKey="count"
                  nameKey="type"
                  cx="50%" cy="50%"
                  innerRadius={70}
                  outerRadius={105}
                  paddingAngle={2}
                  stroke="transparent"
                  cursor="pointer"
                  onClick={(d: unknown) => {
                    const item = d as { payload?: { groupKey?: string }; groupKey?: string }
                    const clicked = item?.payload?.groupKey ?? item?.groupKey
                    if (clicked === 'MEMBRO' || clicked === 'NAO_MEMBRO') handleMembershipClick(clicked)
                  }}
                >
                  {byTicketType.map((d, i) => (
                    <Cell
                      key={i}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                      fillOpacity={membershipFilter === 'all' || membershipFilter === d.groupKey ? 1 : 0.35}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v, name) => [`${v} inscritos`, name as string]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="font-display tabular-nums text-3xl text-foreground leading-none">{displayTotal}</p>
              <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mt-1">total</p>
            </div>
          </div>
        )}
        {showMembershipList && membershipFilter !== 'all' && (
          <TicketParticipantList
            title={MEMBERSHIP_FILTER_LABEL[membershipFilter]}
            participants={filteredParticipantList}
            onClose={() => { setMembershipFilter('all'); setShowMembershipList(false) }}
          />
        )}
      </div>

      {/* Free vs Pagos — clicar em uma barra filtra os demais cards */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
        <ChartLabel>Ingressos Grátis (R$0) vs Pagos</ChartLabel>
        {freeChartData.length === 0 ? <EmptyChart height={120} /> : (
          <div className="flex items-center gap-8">
            <div className="shrink-0 text-center">
              <p className="font-display tabular-nums text-5xl text-foreground leading-none">{freeCount}</p>
              <p className="mt-1 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">grátis</p>
              <p className="mt-0.5 text-[11px] font-mono text-muted-foreground/60">{freePct}% do total</p>
            </div>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={freeChartData} margin={{ top: 8, right: 0, left: -28, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeOpacity={0.6} />
                  <XAxis dataKey="type" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'oklch(0.21 0.11 265 / 0.04)' }} />
                  <Bar
                    dataKey="count"
                    name="Inscritos"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={48}
                    cursor="pointer"
                    onClick={(d: unknown) => {
                      const item = d as { payload?: { groupKey?: string }; groupKey?: string }
                      const clicked = item?.payload?.groupKey ?? item?.groupKey
                      if (clicked === 'free' || clicked === 'paid') handleTicketBarClick(clicked)
                    }}
                  >
                    {freeChartData.map((d, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                        fillOpacity={ticketFilter === 'all' || ticketFilter === d.groupKey ? 1 : 0.35}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {showTicketList && ticketFilter !== 'all' && (
          <TicketParticipantList
            title={TICKET_FILTER_LABEL[ticketFilter]}
            participants={filteredParticipantList}
            onClose={() => { setTicketFilter('all'); setShowTicketList(false) }}
          />
        )}
      </div>
      </div>

      {/* OV-04 — Barras HORIZONTAIS por tipo de empresa (sorted desc) — linha própria */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
        <ChartLabel>Perfil por Tipo de Empresa</ChartLabel>
        {companyData.length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={Math.max(260, companyData.length * 42)}>
            <BarChart data={companyData} layout="vertical" margin={{ top: 8, right: 48, left: 8, bottom: 0 }}
              barCategoryGap="30%">
              <CartesianGrid horizontal={false} stroke={GRID_COLOR} strokeOpacity={0.5} />
              <XAxis type="number" tick={AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis dataKey="type" type="category" tick={AXIS_STYLE} axisLine={false} tickLine={false} width={300} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                cursor={{ fill: 'oklch(0.21 0.11 265 / 0.04)' }}
                formatter={(v, _name, ctx) => [
                  `${v} (${(ctx as { payload?: { pct?: number } })?.payload?.pct ?? 0}%)`,
                  'Inscritos',
                ]}
              />
              <Bar dataKey="count" name="Inscritos" radius={[0, 3, 3, 0]} maxBarSize={26}>
                {companyData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
                <LabelList
                  dataKey="label"
                  position="right"
                  style={{ fontSize: 11, fontFamily: 'var(--font-ibm-mono)', fill: 'oklch(0.52 0.04 254)' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Linha — inscrições ao longo do tempo — linha própria */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <ChartLabel>Inscrições ao Longo do Tempo</ChartLabel>
          <div className="flex rounded-md border border-border overflow-hidden text-[10px] font-mono uppercase tracking-wider">
            {(['daily', 'weekly'] as const).map(g => (
              <button
                key={g}
                type="button"
                onClick={() => setGranularity(g)}
                className={`px-2.5 py-1 transition-colors ${
                  granularity === g
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-transparent text-muted-foreground hover:bg-accent/40'
                }`}
              >
                {g === 'daily' ? 'Diário' : 'Semanal'}
              </button>
            ))}
          </div>
        </div>
        {timelineData.length === 0 ? <EmptyChart height={180} /> : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={timelineData} margin={{ top: 8, right: 8, left: -28, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeOpacity={0.6} />
              <XAxis
                dataKey="dateLabel"
                tick={{ ...AXIS_STYLE, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                ticks={timelineTicks}
              />
              <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelFormatter={label => granularity === 'weekly' ? `Semana de ${label}` : label}
              />
              <Line
                type="monotone"
                dataKey="count"
                name={timelineName}
                stroke="#00a99d"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#00a99d', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#00a99d', stroke: '#ffffff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      </div>
    </div>
  )
}

function TicketParticipantList({
  title,
  participants,
  onClose,
}: {
  title: string
  participants: { id: string; name: string; company: string | null }[]
  onClose: () => void
}) {
  return (
    <div className="mt-4 pt-4 border-t border-border">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-mono text-muted-foreground">
          {title} <span className="text-muted-foreground/50">({participants.length})</span>
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          Fechar ✕
        </button>
      </div>
      {participants.length === 0 ? (
        <p className="text-[11px] font-mono text-muted-foreground/40">sem participantes</p>
      ) : (
        <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
          {participants.map(p => (
            <div key={p.id} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-foreground/90 truncate">{p.name}</span>
              {p.company && (
                <span className="text-[11px] font-mono text-muted-foreground/60 shrink-0 truncate max-w-[45%]">
                  {p.company}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ChartLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-mono tracking-[0.20em] text-muted-foreground uppercase mb-4">
      {children}
    </p>
  )
}

function EmptyChart({ height = 220 }: { height?: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2" style={{ height }}>
      <div className="w-6 h-6 rounded-full border-2 border-dashed border-border" />
      <p className="text-[11px] font-mono text-muted-foreground/40">
        sem dados ainda
      </p>
    </div>
  )
}
