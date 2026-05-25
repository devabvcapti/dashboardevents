'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from 'recharts'
import { useTheme } from 'next-themes'

const NAVY_LIGHT = '#112468'
const NAVY_DARK  = '#6b9be8'  /* azul legível em fundo escuro */

/* ABVCAP — teal âncora, depois navy adaptativo, esmeralda, âmbar, coral */
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

interface Props {
  byTicketType: { type: string; count: number }[]
  byCompanyType: { type: string; count: number }[]
  registrationsByDay: { date: string; count: number }[]
  freeTickets: { free: number; paid: number; total: number }
}

export function OverviewCharts({ byTicketType, byCompanyType, registrationsByDay, freeTickets }: Props) {
  const CHART_COLORS = useChartColors()
  const freePct = freeTickets.total > 0 ? Math.round((freeTickets.free / freeTickets.total) * 100) : 0
  const freeChartData = freeTickets.total > 0
    ? [
        { type: 'Grátis (R$0)', count: freeTickets.free },
        { type: 'Pagos', count: freeTickets.paid },
      ]
    : []
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Bar — ticket type */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
        <ChartLabel>Inscritos por Tipo de Ingresso</ChartLabel>
        {byTicketType.length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byTicketType} margin={{ top: 8, right: 0, left: -28, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeOpacity={0.6} />
              <XAxis dataKey="type" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'oklch(0.21 0.11 265 / 0.04)' }} />
              <Bar dataKey="count" name="Inscritos" radius={[3, 3, 0, 0]} maxBarSize={48}>
                {byTicketType.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Pie — company type */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
        <ChartLabel>Perfil por Tipo de Empresa</ChartLabel>
        {byCompanyType.length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={byCompanyType}
                dataKey="count"
                nameKey="type"
                cx="50%" cy="50%"
                innerRadius={55} outerRadius={88}
                paddingAngle={2}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={{ stroke: 'oklch(0.52 0.04 254)', strokeWidth: 1 }}
              >
                {byCompanyType.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v} inscritos`]} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Bar — free vs paid */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-sm lg:col-span-2">
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
                  <Bar dataKey="count" name="Inscritos" radius={[3, 3, 0, 0]} maxBarSize={48}>
                    <Cell fill={CHART_COLORS[0]} />
                    <Cell fill={CHART_COLORS[1]} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Line — over time */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-sm lg:col-span-2">
        <ChartLabel>Inscrições ao Longo do Tempo</ChartLabel>
        {registrationsByDay.length === 0 ? <EmptyChart height={180} /> : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={registrationsByDay} margin={{ top: 8, right: 8, left: -28, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeOpacity={0.6} />
              <XAxis dataKey="date" tick={{ ...AXIS_STYLE, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line
                type="monotone"
                dataKey="count"
                name="Inscrições"
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
