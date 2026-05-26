'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LabelList, Cell,
} from 'recharts'
import { useTheme } from 'next-themes'
import type { RevenueAnalysis } from '@/lib/database.types'

const NAVY_LIGHT = '#112468'
const NAVY_DARK = '#6b9be8'

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

const formatBRL = (v: number) =>
  `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

const formatBRLDecimal = (v: number) =>
  `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

interface Props {
  analysis: RevenueAnalysis
}

const MEMBERSHIP_LABEL: Record<string, string> = {
  MEMBRO: 'Membro',
  NAO_MEMBRO: 'Não Membro',
}

export function ReceitaCharts({ analysis }: Props) {
  const { resolvedTheme } = useTheme()
  const memberColor = '#00a99d'
  const naoMemberColor = resolvedTheme === 'dark' ? NAVY_DARK : NAVY_LIGHT

  const byMembership = (analysis.by_membership ?? []).map(r => ({
    membership: r.ticket_membership,
    label: MEMBERSHIP_LABEL[r.ticket_membership] ?? r.ticket_membership,
    count: Number(r.count || 0),
    total_revenue: Number(r.total_revenue || 0),
    avg_ticket: Number(r.avg_ticket || 0),
    color: r.ticket_membership === 'MEMBRO' ? memberColor : naoMemberColor,
  }))

  const histogram = (analysis.histogram ?? []).map(b => ({
    faixa: b.faixa,
    count: Number(b.count || 0),
  }))

  return (
    <div className="space-y-6">
      {/* REV-02 — Comparativo Receita + Ticket Médio por Membership */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
          <ChartLabel>Receita por Tipo de Ingresso</ChartLabel>
          {byMembership.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byMembership} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeOpacity={0.6} />
                <XAxis dataKey="label" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                <YAxis
                  tick={AXIS_STYLE}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `R$${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}k`}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ fill: 'oklch(0.21 0.11 265 / 0.04)' }}
                  formatter={(v) => [formatBRL(v as number), 'Receita']}
                />
                <Bar dataKey="total_revenue" name="Receita" radius={[3, 3, 0, 0]} maxBarSize={80}>
                  {byMembership.map((r, i) => <Cell key={i} fill={r.color} />)}
                  <LabelList
                    dataKey="total_revenue"
                    position="top"
                    formatter={(v: unknown) => formatBRL(Number(v))}
                    style={{ fontSize: 11, fontFamily: 'var(--font-ibm-mono)', fill: 'oklch(0.30 0.10 265)' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
          <ChartLabel>Ticket Médio por Tipo de Ingresso</ChartLabel>
          {byMembership.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byMembership} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeOpacity={0.6} />
                <XAxis dataKey="label" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                <YAxis
                  tick={AXIS_STYLE}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `R$${(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ fill: 'oklch(0.21 0.11 265 / 0.04)' }}
                  formatter={(v) => [formatBRLDecimal(v as number), 'Ticket médio']}
                />
                <Bar dataKey="avg_ticket" name="Ticket médio" radius={[3, 3, 0, 0]} maxBarSize={80}>
                  {byMembership.map((r, i) => <Cell key={i} fill={r.color} />)}
                  <LabelList
                    dataKey="avg_ticket"
                    position="top"
                    formatter={(v: unknown) => formatBRLDecimal(Number(v))}
                    style={{ fontSize: 11, fontFamily: 'var(--font-ibm-mono)', fill: 'oklch(0.30 0.10 265)' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* REV-02 — Tabela complementar */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-[10px] font-mono tracking-[0.20em] text-muted-foreground uppercase">
            Resumo por Tipo de Ingresso
          </p>
        </div>
        <table className="w-full">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left text-xs font-semibold p-3">Tipo</th>
              <th className="text-right text-xs font-semibold p-3">Inscritos</th>
              <th className="text-right text-xs font-semibold p-3">Receita</th>
              <th className="text-right text-xs font-semibold p-3">Ticket Médio</th>
            </tr>
          </thead>
          <tbody>
            {byMembership.map(r => (
              <tr key={r.membership} className="border-t border-border">
                <td className="p-3 text-sm font-medium">{r.label}</td>
                <td className="p-3 text-sm text-right font-mono tabular-nums">{r.count.toLocaleString('pt-BR')}</td>
                <td className="p-3 text-sm text-right font-mono tabular-nums">{formatBRL(r.total_revenue)}</td>
                <td className="p-3 text-sm text-right font-mono tabular-nums text-primary">{formatBRLDecimal(r.avg_ticket)}</td>
              </tr>
            ))}
            {byMembership.length === 0 && (
              <tr><td colSpan={4} className="p-6 text-center text-sm text-muted-foreground">Sem dados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* REV-03 — Histograma de distribuição */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
        <ChartLabel>Distribuição de Valores de Ingresso</ChartLabel>
        {histogram.length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={histogram} margin={{ top: 20, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeOpacity={0.6} />
              <XAxis
                dataKey="faixa"
                tick={{ ...AXIS_STYLE, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={0}
              />
              <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                cursor={{ fill: 'oklch(0.21 0.11 265 / 0.04)' }}
                formatter={(v) => [`${v} inscritos`, 'Quantidade']}
              />
              <Bar dataKey="count" name="Inscritos" fill={memberColor} radius={[3, 3, 0, 0]} maxBarSize={64}>
                <LabelList
                  dataKey="count"
                  position="top"
                  style={{ fontSize: 11, fontFamily: 'var(--font-ibm-mono)', fill: 'oklch(0.30 0.10 265)' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        <p className="text-[10px] font-mono text-muted-foreground/60 mt-3">
          Faixas: Gratuito · R$1–500 · R$501–1000 · R$1001–2000 · R$2001–3000 · Acima de R$3000
        </p>
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
      <p className="text-[11px] font-mono text-muted-foreground/40">sem dados ainda</p>
    </div>
  )
}
