'use client'

import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, LabelList,
} from 'recharts'
import { useTheme } from 'next-themes'

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

function toWeekly(daily: { date: string; count: number; paidCount: number }[]) {
  const weeks: Record<string, { count: number; paidCount: number }> = {}
  for (const d of daily) {
    const key = startOfWeek(d.date)
    if (!weeks[key]) weeks[key] = { count: 0, paidCount: 0 }
    weeks[key].count += d.count
    weeks[key].paidCount += d.paidCount
  }
  return Object.entries(weeks)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }))
}

interface TicketParticipant { id: string; name: string; company: string | null }

interface Props {
  byTicketType: { type: string; count: number }[]
  byCompanyType: { type: string; count: number }[]
  registrationsByDay: { date: string; count: number; paidCount: number }[]
  freeTickets: {
    free: number
    paid: number
    total: number
    freeParticipants: TicketParticipant[]
    paidParticipants: TicketParticipant[]
  }
  totalInscritos: number
}

export function OverviewCharts({
  byTicketType,
  byCompanyType,
  registrationsByDay,
  freeTickets,
  totalInscritos,
}: Props) {
  const CHART_COLORS = useChartColors()
  const [granularity, setGranularity] = useState<'daily' | 'weekly'>('daily')
  const [ticketFilter, setTicketFilter] = useState<'all' | 'paid'>('all')
  const [expandedTicketGroup, setExpandedTicketGroup] = useState<'Grátis (R$0)' | 'Pagos' | null>(null)

  const timelineData = useMemo(() => {
    const base = granularity === 'weekly' ? toWeekly(registrationsByDay) : registrationsByDay
    return base.map(d => ({ ...d, dateLabel: formatDateLabel(d.date) }))
  }, [registrationsByDay, granularity])

  const timelineDataKey = ticketFilter === 'paid' ? 'paidCount' : 'count'

  // Evita amontoar rótulos no eixo quando há muitos pontos
  const tickStep = Math.max(1, Math.ceil(timelineData.length / 15))
  const timelineTicks = timelineData
    .filter((_, i) => i % tickStep === 0 || i === timelineData.length - 1)
    .map(d => d.dateLabel)

  // OV-04: ordenar desc + computar % sobre total
  const sumCompany = byCompanyType.reduce((acc, r) => acc + r.count, 0)
  const companyData = [...byCompanyType]
    .sort((a, b) => b.count - a.count)
    .map(r => ({
      ...r,
      pct: sumCompany > 0 ? Math.round((r.count / sumCompany) * 1000) / 10 : 0,
      label: `${r.count} (${sumCompany > 0 ? Math.round((r.count / sumCompany) * 100) : 0}%)`,
    }))

  const freePct = freeTickets.total > 0 ? Math.round((freeTickets.free / freeTickets.total) * 100) : 0
  const freeChartData = freeTickets.total > 0
    ? [
        { type: 'Grátis (R$0)', count: freeTickets.free },
        { type: 'Pagos', count: freeTickets.paid },
      ]
    : []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* OV-03 — Donut Membros vs Não-Membros com label central */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
        <ChartLabel>Membros vs Não-Membros</ChartLabel>
        {byTicketType.length === 0 ? <EmptyChart /> : (
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
                >
                  {byTicketType.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v, name) => [`${v} inscritos`, name as string]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="font-display tabular-nums text-3xl text-foreground leading-none">{totalInscritos}</p>
              <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mt-1">total</p>
            </div>
          </div>
        )}
      </div>

      {/* OV-04 — Barras HORIZONTAIS por tipo de empresa (sorted desc) */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
        <ChartLabel>Perfil por Tipo de Empresa</ChartLabel>
        {companyData.length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={Math.max(220, companyData.length * 36)}>
            <BarChart data={companyData} layout="vertical" margin={{ top: 8, right: 80, left: 8, bottom: 0 }}>
              <CartesianGrid horizontal={false} stroke={GRID_COLOR} strokeOpacity={0.5} />
              <XAxis type="number" tick={AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis dataKey="type" type="category" tick={AXIS_STYLE} axisLine={false} tickLine={false} width={120} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                cursor={{ fill: 'oklch(0.21 0.11 265 / 0.04)' }}
                formatter={(v, _name, ctx) => [
                  `${v} (${(ctx as { payload?: { pct?: number } })?.payload?.pct ?? 0}%)`,
                  'Inscritos',
                ]}
              />
              <Bar dataKey="count" name="Inscritos" radius={[0, 3, 3, 0]} maxBarSize={22}>
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

      {/* Free vs Pagos (mantido — informativo) */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
        <ChartLabel>Ingressos Grátis (R$0) vs Pagos</ChartLabel>
        {freeChartData.length === 0 ? <EmptyChart height={120} /> : (
          <div className="flex items-center gap-8">
            <div className="shrink-0 text-center">
              <p className="font-display tabular-nums text-5xl text-foreground leading-none">{freeTickets.free}</p>
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
                    onClick={(d: { type?: string }) => {
                      if (d.type !== 'Grátis (R$0)' && d.type !== 'Pagos') return
                      const clicked = d.type
                      setExpandedTicketGroup(prev => prev === clicked ? null : clicked)
                    }}
                  >
                    <Cell fill={CHART_COLORS[0]} />
                    <Cell fill={CHART_COLORS[1]} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {expandedTicketGroup && (
          <TicketParticipantList
            title={expandedTicketGroup}
            participants={expandedTicketGroup === 'Grátis (R$0)' ? freeTickets.freeParticipants : freeTickets.paidParticipants}
            onClose={() => setExpandedTicketGroup(null)}
          />
        )}
      </div>

      {/* Linha — inscrições ao longo do tempo */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <ChartLabel>Inscrições ao Longo do Tempo</ChartLabel>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-border overflow-hidden text-[10px] font-mono uppercase tracking-wider">
              {(['all', 'paid'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setTicketFilter(f)}
                  className={`px-2.5 py-1 transition-colors ${
                    ticketFilter === f
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-transparent text-muted-foreground hover:bg-accent/40'
                  }`}
                >
                  {f === 'all' ? 'Todos' : 'Só Pagos'}
                </button>
              ))}
            </div>
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
                dataKey={timelineDataKey}
                name={ticketFilter === 'paid' ? 'Inscrições pagas' : 'Inscrições'}
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
  )
}

function TicketParticipantList({
  title,
  participants,
  onClose,
}: {
  title: string
  participants: TicketParticipant[]
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
