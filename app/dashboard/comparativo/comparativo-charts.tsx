'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LabelList, Cell,
} from 'recharts'
import { useTheme } from 'next-themes'
import type { EditionComparison } from '@/lib/data'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAVY_LIGHT = '#112468'
const NAVY_DARK = '#6b9be8'
const TEAL = '#00a89d'

const AXIS_STYLE = { fontSize: 11, fontFamily: 'var(--font-mono)', fill: 'hsl(var(--muted-foreground))' }
const GRID_COLOR = 'hsl(var(--border))'

function fmtBRL(n: number) {
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function growthPct(current: number, previous: number): number | null {
  if (!previous) return null
  return Math.round(((current - previous) / previous) * 1000) / 10
}

function GrowthBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null
  const up = pct > 0
  const flat = pct === 0
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-[11px] font-mono px-1.5 py-0.5 rounded',
      flat ? 'text-muted-foreground bg-muted/50' :
      up ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' :
           'text-red-500 bg-red-500/10'
    )}>
      {flat ? <Minus className="w-3 h-3" /> : up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {up ? '+' : ''}{pct.toFixed(1)}%
    </span>
  )
}

function KpiCard({ label, value, sub, growth }: { label: string; value: string; sub?: string; growth?: number | null }) {
  return (
    <div className="border border-border rounded-lg bg-card p-5 space-y-1">
      <p className="text-[10px] font-mono tracking-[0.18em] text-muted-foreground uppercase">{label}</p>
      <p className="font-display text-2xl text-foreground leading-none">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      {growth !== undefined && <GrowthBadge pct={growth} />}
    </div>
  )
}

export function ComparativoCharts({ data }: { data: EditionComparison[] }) {
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme === 'dark'
  const bar = dark ? NAVY_DARK : NAVY_LIGHT
  const teal = TEAL

  if (data.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-lg p-12 text-center">
        <p className="text-sm text-muted-foreground">Nenhuma edição encontrada.</p>
      </div>
    )
  }

  const last = data[data.length - 1]
  const prev = data.length >= 2 ? data[data.length - 2] : null

  const inscGrowth = prev ? growthPct(last.stats.total, prev.stats.total) : null
  const revGrowth = prev ? growthPct(last.stats.total_revenue, prev.stats.total_revenue) : null
  const ticketGrowth = prev ? growthPct(last.stats.avg_ticket, prev.stats.avg_ticket) : null
  const compGrowth = prev ? growthPct(last.stats.unique_companies, prev.stats.unique_companies) : null

  const inscData = data.map(d => ({ name: d.edition.name, value: d.stats.total }))
  const revData = data.map(d => ({ name: d.edition.name, value: Math.round(d.stats.total_revenue) }))

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    fontSize: 12,
    fontFamily: 'var(--font-mono)',
    color: 'hsl(var(--foreground))',
  }

  return (
    <div className="space-y-8">
      {/* KPIs edição atual */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Inscritos"
          value={last.stats.total.toLocaleString('pt-BR')}
          sub={prev ? `vs ${prev.stats.total.toLocaleString('pt-BR')} em ${prev.edition.year}` : last.edition.name}
          growth={inscGrowth}
        />
        <KpiCard
          label="Receita Total"
          value={fmtBRL(last.stats.total_revenue)}
          sub={prev ? `vs ${fmtBRL(prev.stats.total_revenue)} em ${prev.edition.year}` : last.edition.name}
          growth={revGrowth}
        />
        <KpiCard
          label="Ticket Médio"
          value={fmtBRL(last.stats.avg_ticket)}
          sub={prev ? `vs ${fmtBRL(prev.stats.avg_ticket)} em ${prev.edition.year}` : last.edition.name}
          growth={ticketGrowth}
        />
        <KpiCard
          label="Empresas"
          value={last.stats.unique_companies.toLocaleString('pt-BR')}
          sub={prev ? `vs ${prev.stats.unique_companies.toLocaleString('pt-BR')} em ${prev.edition.year}` : last.edition.name}
          growth={compGrowth}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inscrições */}
        <div className="border border-border rounded-lg bg-card p-5 space-y-3">
          <p className="text-[10px] font-mono tracking-[0.18em] text-muted-foreground uppercase">Inscrições por Edição</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={inscData} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeOpacity={0.5} />
              <XAxis dataKey="name" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} />
              <Bar dataKey="value" name="Inscritos" radius={[4, 4, 0, 0]}>
                {inscData.map((_, i) => (
                  <Cell key={i} fill={i === inscData.length - 1 ? teal : bar} fillOpacity={i === inscData.length - 1 ? 1 : 0.55} />
                ))}
                <LabelList dataKey="value" position="top" style={{ ...AXIS_STYLE, fill: 'hsl(var(--foreground))' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Receita */}
        <div className="border border-border rounded-lg bg-card p-5 space-y-3">
          <p className="text-[10px] font-mono tracking-[0.18em] text-muted-foreground uppercase">Receita por Edição</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revData} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeOpacity={0.5} />
              <XAxis dataKey="name" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} width={60}
                tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                formatter={(v) => [fmtBRL(v as number), 'Receita']} />
              <Bar dataKey="value" name="Receita" radius={[4, 4, 0, 0]}>
                {revData.map((_, i) => (
                  <Cell key={i} fill={i === revData.length - 1 ? teal : bar} fillOpacity={i === revData.length - 1 ? 1 : 0.55} />
                ))}
                <LabelList dataKey="value" position="top" style={{ ...AXIS_STYLE, fill: 'hsl(var(--foreground))' }}
                  formatter={(v) => `R$${(Number(v) / 1000).toFixed(0)}k`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela comparativa */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-muted/30 px-4 py-2.5 border-b border-border">
          <p className="text-[10px] font-mono tracking-[0.18em] text-muted-foreground uppercase">Comparativo Completo</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2.5 text-[10px] font-mono tracking-wider text-muted-foreground uppercase">Edição</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-mono tracking-wider text-muted-foreground uppercase">Inscritos</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-mono tracking-wider text-muted-foreground uppercase">Membros</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-mono tracking-wider text-muted-foreground uppercase">Receita</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-mono tracking-wider text-muted-foreground uppercase">Ticket Médio</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-mono tracking-wider text-muted-foreground uppercase">Empresas</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-mono tracking-wider text-muted-foreground uppercase">Estados</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((d, idx) => {
                const isLast = idx === 0
                return (
                  <tr key={d.edition.id} className={cn('border-b border-border last:border-0', isLast && 'bg-primary/5')}>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {d.edition.name}
                      {isLast && <span className="ml-2 text-[9px] font-mono text-primary bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5 uppercase">Atual</span>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{d.stats.total.toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {d.stats.total > 0 ? `${Math.round((d.stats.membro / d.stats.total) * 100)}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmtBRL(d.stats.total_revenue)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmtBRL(d.stats.avg_ticket)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{d.stats.unique_companies.toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{d.stats.states_represented}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
