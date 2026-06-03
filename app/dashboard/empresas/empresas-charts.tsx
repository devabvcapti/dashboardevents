'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, PieChart, Pie, Legend,
} from 'recharts'
import { useTheme } from 'next-themes'
import type { CompanyAnalysis } from '@/lib/data'
import { cn } from '@/lib/utils'

const NAVY_LIGHT = '#112468'
const NAVY_DARK = '#6b9be8'
const TEAL = '#00a89d'
const COLORS = ['#112468', '#1a3a8f', '#00a89d', '#2d5be3', '#0e8c82', '#4878f0', '#15b5a8']

const AXIS_STYLE = { fontSize: 11, fontFamily: 'var(--font-mono)', fill: 'hsl(var(--muted-foreground))' }
const GRID_COLOR = 'hsl(var(--border))'

const SEGMENT_LABELS: Record<string, string> = {
  GP: 'Gestora (GP)', LP: 'Investidor (LP)', FUNDO: 'Fundo',
  CORPORATIVO: 'Corporativo', GOVERNO: 'Governo', ACADEMIA: 'Academia', OUTRO: 'Outro',
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-border rounded-lg bg-card p-5 space-y-1">
      <p className="text-[10px] font-mono tracking-[0.18em] text-muted-foreground uppercase">{label}</p>
      <p className="font-display text-2xl text-foreground leading-none">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

export function EmpresasCharts({ analysis }: { analysis: CompanyAnalysis }) {
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme === 'dark'
  const bar = dark ? NAVY_DARK : NAVY_LIGHT

  const top20 = analysis.companies.slice(0, 20)
  const top5 = analysis.companies.slice(0, 5)
  const restCount = analysis.total_participants - top5.reduce((s, c) => s + c.count, 0)

  const pieData = [
    ...top5.map((c, i) => ({ name: c.company.length > 22 ? c.company.slice(0, 22) + '…' : c.company, value: c.count, fill: COLORS[i] })),
    { name: 'Demais empresas', value: restCount, fill: '#94a3b8' },
  ]

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    fontSize: 12,
    fontFamily: 'var(--font-mono)',
    color: 'hsl(var(--foreground))',
  }

  const topCompany = analysis.companies[0]

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Total de Empresas"
          value={analysis.total_companies.toLocaleString('pt-BR')}
          sub={`de ${analysis.total_participants.toLocaleString('pt-BR')} inscritos`}
        />
        <KpiCard
          label="Maior Empresa"
          value={topCompany ? topCompany.count.toString() : '—'}
          sub={topCompany ? topCompany.company : '—'}
        />
        <KpiCard
          label="Concentração Top 5"
          value={`${analysis.top5_pct.toLocaleString('pt-BR')}%`}
          sub="do total de participantes"
        />
        <KpiCard
          label="Média por Empresa"
          value={analysis.avg_per_company.toLocaleString('pt-BR')}
          sub="participantes / empresa"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 20 horizontal bar */}
        <div className="lg:col-span-2 border border-border rounded-lg bg-card p-5 space-y-3">
          <p className="text-[10px] font-mono tracking-[0.18em] text-muted-foreground uppercase">
            Top {Math.min(20, analysis.companies.length)} Empresas por Participantes
          </p>
          <ResponsiveContainer width="100%" height={Math.max(300, top20.length * 28)}>
            <BarChart
              data={top20.map(c => ({ name: c.company.length > 28 ? c.company.slice(0, 28) + '…' : c.company, value: c.count, pct: c.pct }))}
              layout="vertical"
              margin={{ top: 4, right: 48, left: 4, bottom: 4 }}
            >
              <CartesianGrid horizontal={false} stroke={GRID_COLOR} strokeOpacity={0.5} />
              <XAxis type="number" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={AXIS_STYLE} axisLine={false} tickLine={false} width={160} />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                formatter={(v, _, props) => [
                  `${v} participantes (${(props as { payload?: { pct?: number } }).payload?.pct ?? 0}%)`,
                  'Empresa',
                ]}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {top20.map((_, i) => (
                  <Cell key={i} fill={i < 5 ? TEAL : bar} fillOpacity={i < 5 ? 1 : 0.6} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Concentração pie */}
        <div className="border border-border rounded-lg bg-card p-5 space-y-3">
          <p className="text-[10px] font-mono tracking-[0.18em] text-muted-foreground uppercase">Concentração Top 5</p>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="45%"
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
                paddingAngle={2}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v) => [`${v} participantes`, '']}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 10, fontFamily: 'var(--font-mono)', marginTop: 8 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela completa */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-muted/30 px-4 py-2.5 border-b border-border flex items-center justify-between">
          <p className="text-[10px] font-mono tracking-[0.18em] text-muted-foreground uppercase">
            Todas as Empresas ({analysis.total_companies})
          </p>
        </div>
        <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2.5 text-[10px] font-mono tracking-wider text-muted-foreground uppercase">#</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-mono tracking-wider text-muted-foreground uppercase">Empresa</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-mono tracking-wider text-muted-foreground uppercase">Segmento</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-mono tracking-wider text-muted-foreground uppercase">Participantes</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-mono tracking-wider text-muted-foreground uppercase">% Total</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-mono tracking-wider text-muted-foreground uppercase">Membros</th>
              </tr>
            </thead>
            <tbody>
              {analysis.companies.map((c, i) => (
                <tr key={c.company} className={cn('border-b border-border last:border-0 hover:bg-muted/20 transition-colors', i < 5 && 'bg-primary/3')}>
                  <td className="px-4 py-2.5 tabular-nums text-muted-foreground text-xs">{i + 1}</td>
                  <td className="px-4 py-2.5 font-medium text-foreground max-w-[240px] truncate">{c.company}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">
                    {c.segment ? (SEGMENT_LABELS[c.segment] ?? c.segment) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">{c.count}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{c.pct.toLocaleString('pt-BR')}%</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                    {c.members > 0 ? c.members : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
