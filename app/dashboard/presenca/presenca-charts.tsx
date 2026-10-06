'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, LabelList,
} from 'recharts'
import { useTheme } from 'next-themes'
import type { AttendanceStats } from '@/lib/data'

const NAVY_LIGHT = '#112468'
const NAVY_DARK = '#6b9be8'

const MEMBERSHIP_LABEL: Record<string, string> = {
  MEMBRO: 'Membro',
  NAO_MEMBRO: 'Não Membro',
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
  stats: AttendanceStats
}

export function PresencaCharts({ stats }: Props) {
  const { resolvedTheme } = useTheme()
  const navy = resolvedTheme === 'dark' ? NAVY_DARK : NAVY_LIGHT
  const presentColor = '#00a99d'
  const absentColor = navy

  const overallData = [
    { type: 'Compareceram', count: stats.checkedIn, groupKey: 'present' as const },
    { type: 'Não Compareceram', count: stats.notCheckedIn, groupKey: 'absent' as const },
  ]

  const byMembershipData = stats.byMembership.map(m => ({
    membership: m.membership,
    membershipLabel: MEMBERSHIP_LABEL[m.membership] ?? m.membership,
    Compareceram: m.checkedIn,
    'Não Compareceram': m.total - m.checkedIn,
    total: m.total,
    label: `${m.checkedIn}/${m.total} (${m.pctAttendance.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%)`,
  }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Quebra geral — Compareceram vs Não Compareceram, donut com total central */}
        <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
          <ChartLabel>Comparecimento Geral</ChartLabel>
          <div className="relative">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={overallData}
                  dataKey="count"
                  nameKey="type"
                  cx="50%" cy="50%"
                  innerRadius={70}
                  outerRadius={105}
                  paddingAngle={2}
                  stroke="transparent"
                >
                  {overallData.map((d, i) => (
                    <Cell key={i} fill={d.groupKey === 'present' ? presentColor : absentColor} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v, name) => [`${v} inscritos`, name as string]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="font-display tabular-nums text-3xl text-foreground leading-none">
                {stats.pctAttendance.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
              </p>
              <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mt-1">presença</p>
            </div>
          </div>
        </div>

        {/* Quebra por Tipo de Ingresso — barras empilhadas Compareceram/Não */}
        <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
          <ChartLabel>Presença por Tipo de Ingresso</ChartLabel>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={byMembershipData}
              layout="vertical"
              margin={{ top: 8, right: 70, left: 8, bottom: 0 }}
            >
              <CartesianGrid horizontal={false} stroke={GRID_COLOR} strokeOpacity={0.5} />
              <XAxis type="number" tick={AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis
                dataKey="membershipLabel"
                type="category"
                tick={AXIS_STYLE}
                axisLine={false}
                tickLine={false}
                width={90}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v, name) => [`${v} inscritos`, name as string]}
              />
              <Bar dataKey="Compareceram" stackId="presenca" fill={presentColor} radius={[0, 0, 0, 0]} maxBarSize={36} />
              <Bar dataKey="Não Compareceram" stackId="presenca" fill={absentColor} radius={[0, 3, 3, 0]} maxBarSize={36}>
                <LabelList
                  dataKey="label"
                  position="right"
                  style={{ fontSize: 11, fontFamily: 'var(--font-ibm-mono)', fill: 'oklch(0.52 0.04 254)' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 text-[11px] font-mono text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: presentColor }} />
              Compareceram
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: absentColor }} />
              Não Compareceram
            </span>
          </div>
        </div>
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
