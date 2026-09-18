'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { StatCard } from '@/components/stat-card'
import type { VcDayQaSummary } from '@/lib/data'

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

function truncateLabel(text: string, max = 28) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function formatTime(t: string) {
  return t.slice(0, 5)
}

interface Props {
  summary: VcDayQaSummary
}

export function VcDayQaCharts({ summary }: Props) {
  const { panels, totalQuestions, totalEvaluations, overallAvgRating, comments } = summary

  const questionsData = [...panels]
    .sort((a, b) => b.questionCount - a.questionCount)
    .map(p => ({ ...p, label: truncateLabel(p.name) }))

  const ratedPanels = panels.filter(p => p.avgRating !== null)
  const ratingData = [...ratedPanels]
    .sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0))
    .map(p => ({ ...p, label: truncateLabel(p.name) }))

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard title="Perguntas Recebidas" value={totalQuestions} accent="teal" />
        <StatCard title="Avaliações Recebidas" value={totalEvaluations} accent="blue" />
        <StatCard
          title="Nota Média Geral"
          value={overallAvgRating !== null ? overallAvgRating.toFixed(1) : '—'}
          subtitle={overallAvgRating !== null ? 'de 5' : undefined}
          accent="green"
        />
      </div>

      {/* Perguntas por painel */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
        <ChartLabel>Perguntas por Painel</ChartLabel>
        {questionsData.every(p => p.questionCount === 0) ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={Math.max(260, questionsData.length * 38)}>
            <BarChart data={questionsData} layout="vertical" margin={{ top: 8, right: 32, left: 8, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid horizontal={false} stroke={GRID_COLOR} strokeOpacity={0.5} />
              <XAxis type="number" tick={AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="label" width={220} tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                cursor={{ fill: 'oklch(0.21 0.11 265 / 0.04)' }}
                formatter={(value) => [value, 'Perguntas']}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.name ?? ''}
              />
              <Bar dataKey="questionCount" fill="#00a99d" fillOpacity={0.85} radius={[0, 3, 3, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Nota média por painel */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
        <ChartLabel>Nota Média por Painel (1–5)</ChartLabel>
        {ratingData.length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={Math.max(260, ratingData.length * 38)}>
            <BarChart data={ratingData} layout="vertical" margin={{ top: 8, right: 32, left: 8, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid horizontal={false} stroke={GRID_COLOR} strokeOpacity={0.5} />
              <XAxis type="number" domain={[0, 5]} tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="label" width={220} tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                cursor={{ fill: 'oklch(0.21 0.11 265 / 0.04)' }}
                formatter={(value) => [typeof value === 'number' ? value.toFixed(1) : value, 'Nota média']}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.name ?? ''}
              />
              <Bar dataKey="avgRating" radius={[0, 3, 3, 0]} maxBarSize={22}>
                {ratingData.map(p => (
                  <Cell key={p.id} fill={(p.avgRating ?? 0) >= 4 ? '#00a99d' : (p.avgRating ?? 0) >= 3 ? '#f97316' : '#dc2626'} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Tabela detalhada por painel */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
        <ChartLabel>Detalhamento por Painel</ChartLabel>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left border-b border-border">
                <th className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground pb-2 pr-4">Painel</th>
                <th className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground pb-2 pr-4">Horário</th>
                <th className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground pb-2 pr-4 text-right">Perguntas</th>
                <th className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground pb-2 pr-4 text-right">Avaliações</th>
                <th className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground pb-2 text-right">Nota Média</th>
              </tr>
            </thead>
            <tbody>
              {panels.map(p => (
                <tr key={p.id} className="border-b border-border/50 last:border-0">
                  <td className="py-2.5 pr-4 text-foreground">{p.name}</td>
                  <td className="py-2.5 pr-4 font-mono text-muted-foreground">{formatTime(p.startsAt)}–{formatTime(p.endsAt)}</td>
                  <td className="py-2.5 pr-4 font-mono text-right tabular-nums text-foreground">{p.questionCount}</td>
                  <td className="py-2.5 pr-4 font-mono text-right tabular-nums text-foreground">{p.evaluationCount}</td>
                  <td className="py-2.5 font-mono text-right tabular-nums text-foreground">{p.avgRating !== null ? p.avgRating.toFixed(1) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comentários */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
        <ChartLabel>Comentários dos Participantes ({comments.length})</ChartLabel>
        {comments.length === 0 ? <EmptyChart height={120} /> : (
          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {comments.map(c => (
              <div key={c.id} className="border border-border/60 rounded-md p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11px] font-mono text-muted-foreground">
                    {c.panelName ?? 'Avaliação geral do evento'}
                    {c.authorName && <span className="text-muted-foreground/50"> · {c.authorName}</span>}
                  </p>
                  <span className="text-[11px] font-mono tabular-nums text-primary/70">{c.rating}/5</span>
                </div>
                {c.liked && (
                  <p className="text-[13px] text-foreground">
                    <span className="text-muted-foreground/60">Gostou: </span>{c.liked}
                  </p>
                )}
                {c.improve && (
                  <p className="text-[13px] text-foreground mt-1">
                    <span className="text-muted-foreground/60">A melhorar: </span>{c.improve}
                  </p>
                )}
              </div>
            ))}
          </div>
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
