'use client'

import { useMemo, useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LabelList, Cell, Legend,
} from 'recharts'
import { useTheme } from 'next-themes'
import type { EditionComparison, EditionCountdown } from '@/lib/data'
import { TrendingUp, TrendingDown, Minus, ListFilter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuCheckboxItem, DropdownMenuSeparator, DropdownMenuItem,
} from '@/components/ui/dropdown-menu'

const NAVY_LIGHT = '#112468'
const NAVY_DARK = '#6b9be8'
const TEAL = '#00a89d'
const COUNTDOWN_PALETTE = ['#112468', '#00a89d', '#c2410c', '#7c3aed', '#be185d', '#0369a1']

const SEGMENT_LABELS: Record<string, string> = {
  GP: 'Gestora (GP)', LP: 'Investidor (LP)', FUNDO: 'Fundo',
  CORPORATIVO: 'Corporativo', GOVERNO: 'Governo', ACADEMIA: 'Academia', OUTRO: 'Outro',
}

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

export function ComparativoCharts({ data, countdownData }: { data: EditionComparison[]; countdownData: EditionCountdown[] }) {
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme === 'dark'
  const bar = dark ? NAVY_DARK : NAVY_LIGHT
  const teal = TEAL

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(data.map(d => d.edition.id))
  )

  function toggle(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filtered = useMemo(
    () => data.filter(d => selectedIds.has(d.edition.id)),
    [data, selectedIds]
  )

  const filteredCountdown = useMemo(
    () => countdownData.filter(d => selectedIds.has(d.edition.id) && d.points.length > 0),
    [countdownData, selectedIds]
  )

  if (data.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-lg p-12 text-center">
        <p className="text-sm text-muted-foreground">Nenhuma edição encontrada.</p>
      </div>
    )
  }

  const editionFilter = (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm">
            <ListFilter className="size-3.5" />
            {selectedIds.size === data.length
              ? 'Todas as edições'
              : `${selectedIds.size} de ${data.length} edições`}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuItem onClick={() => setSelectedIds(new Set(data.map(d => d.edition.id)))}>
          Selecionar todas
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setSelectedIds(new Set())}>
          Limpar seleção
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {data.map(d => (
          <DropdownMenuCheckboxItem
            key={d.edition.id}
            checked={selectedIds.has(d.edition.id)}
            onCheckedChange={() => toggle(d.edition.id)}
          >
            {d.edition.name}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  if (filtered.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">{editionFilter}</div>
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-sm text-muted-foreground">Selecione ao menos uma edição para comparar.</p>
        </div>
      </div>
    )
  }

  const last = filtered[filtered.length - 1]
  const prev = filtered.length >= 2 ? filtered[filtered.length - 2] : null

  const inscGrowth = prev ? growthPct(last.stats.total, prev.stats.total) : null
  const revGrowth = prev ? growthPct(last.stats.total_revenue, prev.stats.total_revenue) : null
  const ticketGrowth = prev ? growthPct(last.stats.avg_ticket, prev.stats.avg_ticket) : null
  const compGrowth = prev ? growthPct(last.stats.unique_companies, prev.stats.unique_companies) : null

  const inscData = filtered.map(d => ({ name: d.edition.name, value: d.stats.total }))
  const revData = filtered.map(d => ({ name: d.edition.name, value: Math.round(d.stats.total_revenue) }))

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    fontSize: 12,
    fontFamily: 'var(--font-mono)',
    color: 'hsl(var(--foreground))',
  }

  // Cumulativo de uma edição em um dia "X antes do evento" específico:
  // 0 antes da primeira inscrição, total após a última (linha estável até o evento).
  function cumulativeAt(ec: EditionCountdown, day: number): number {
    if (ec.points.length === 0) return 0
    const maxDays = ec.points[0].daysBefore
    const minDays = ec.points[ec.points.length - 1].daysBefore
    if (day > maxDays) return 0
    if (day < minDays) return ec.points[ec.points.length - 1].cumulative
    return ec.points[maxDays - day]?.cumulative ?? 0
  }

  const countdownGlobalMaxDays = filteredCountdown.length > 0
    ? Math.max(...filteredCountdown.map(ec => ec.points[0].daysBefore))
    : 0

  const countdownChartData: Array<Record<string, number>> = []
  for (let d = countdownGlobalMaxDays; d >= 0; d--) {
    const row: Record<string, number> = { daysBefore: d }
    filteredCountdown.forEach(ec => { row[ec.edition.name] = cumulativeAt(ec, d) })
    countdownChartData.push(row)
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-end">{editionFilter}</div>

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

      {/* Comparativo por contagem regressiva (dias antes do evento) */}
      {filteredCountdown.length > 0 && (
        <div className="border border-border rounded-lg bg-card p-5 space-y-4">
          <div>
            <p className="text-[10px] font-mono tracking-[0.18em] text-muted-foreground uppercase">
              Ritmo Comparado — Dias Antes do Evento
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Inscrições pagas acumuladas, alinhadas pela contagem regressiva até o evento de cada edição.
            </p>
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={countdownChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeOpacity={0.5} />
              <XAxis
                dataKey="daysBefore"
                tick={AXIS_STYLE}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v === 0 ? 'Evento' : `-${v}d`}
              />
              <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ stroke: 'hsl(var(--border))' }}
                labelFormatter={(v) => v === 0 ? 'No dia do evento' : `${v} dias antes do evento`}
              />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} />
              {filteredCountdown.map((ec, i) => (
                <Line
                  key={ec.edition.id}
                  type="monotone"
                  dataKey={ec.edition.name}
                  stroke={COUNTDOWN_PALETTE[i % COUNTDOWN_PALETTE.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2 text-[10px] font-mono tracking-wider text-muted-foreground uppercase">Marco</th>
                  {filteredCountdown.map(ec => (
                    <th key={ec.edition.id} className="text-right px-4 py-2 text-[10px] font-mono tracking-wider text-muted-foreground uppercase whitespace-nowrap">
                      {ec.edition.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCountdown[0].milestones.map((m, rowIdx) => (
                  <tr key={m.label} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 text-foreground/80 text-xs">{m.label}</td>
                    {filteredCountdown.map(ec => {
                      const cell = ec.milestones[rowIdx]
                      return (
                        <td key={ec.edition.id} className="px-4 py-2.5 text-right tabular-nums text-xs">
                          {cell?.cumulative != null ? cell.cumulative.toLocaleString('pt-BR') : '—'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Análise de Público por Edição */}
      {(() => {
        const hasSegData = filtered.some(d => d.top_segments.length > 0)
        const hasJobData = filtered.some(d => d.top_jobs.length > 0)
        if (!hasSegData && !hasJobData) return null
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Segmento de Atuação — ranking table */}
            {hasSegData && (
              <div className="border border-border rounded-lg bg-card overflow-hidden">
                <div className="px-5 py-3 border-b border-border">
                  <p className="text-[10px] font-mono tracking-[0.18em] text-muted-foreground uppercase">Segmento de Atuação por Edição</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-2 text-[10px] font-mono tracking-wider text-muted-foreground uppercase">#</th>
                        {filtered.map(d => (
                          <th key={d.edition.id} className="text-left px-4 py-2 text-[10px] font-mono tracking-wider text-muted-foreground uppercase whitespace-nowrap">
                            {d.edition.year}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[0, 1, 2, 3, 4].map(rank => (
                        <tr key={rank} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2.5 tabular-nums text-muted-foreground text-xs">{rank + 1}</td>
                          {filtered.map(d => {
                            const seg = d.top_segments[rank]
                            return (
                              <td key={d.edition.id} className="px-4 py-2.5 text-xs">
                                {seg ? (
                                  <span>
                                    <span className="font-medium text-foreground">{SEGMENT_LABELS[seg.type] ?? seg.type}</span>
                                    <span className="ml-1.5 text-muted-foreground">({seg.pct}%)</span>
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Cargo / Posição */}
            {hasJobData && (
              <div className="border border-border rounded-lg bg-card overflow-hidden">
                <div className="px-5 py-3 border-b border-border">
                  <p className="text-[10px] font-mono tracking-[0.18em] text-muted-foreground uppercase">Cargo / Posição por Edição</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-2 text-[10px] font-mono tracking-wider text-muted-foreground uppercase">#</th>
                        {filtered.map(d => (
                          <th key={d.edition.id} className="text-left px-4 py-2 text-[10px] font-mono tracking-wider text-muted-foreground uppercase whitespace-nowrap">
                            {d.edition.year}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[0, 1, 2, 3, 4].map(rank => (
                        <tr key={rank} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2.5 tabular-nums text-muted-foreground text-xs">{rank + 1}</td>
                          {filtered.map(d => (
                            <td key={d.edition.id} className="px-4 py-2.5 text-xs">
                              {d.top_jobs[rank] ? (
                                <span>
                                  <span className="font-medium text-foreground">{d.top_jobs[rank].label}</span>
                                  <span className="ml-1.5 text-muted-foreground">({d.top_jobs[rank].pct}%)</span>
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )
      })()}

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
                <th className="text-right px-4 py-2.5 text-[10px] font-mono tracking-wider text-muted-foreground uppercase">Segmento</th>
              </tr>
            </thead>
            <tbody>
              {[...filtered].reverse().map((d, idx) => {
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
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {d.top_segment ? (SEGMENT_LABELS[d.top_segment] ?? d.top_segment) : '—'}
                    </td>
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
