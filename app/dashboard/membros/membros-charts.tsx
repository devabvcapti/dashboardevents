'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LabelList, Cell,
} from 'recharts'
import { useTheme } from 'next-themes'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { MemberAnalysisRow } from '@/lib/database.types'

const NAVY_LIGHT = '#112468'
const NAVY_DARK = '#6b9be8'

const SEGMENT_LABELS: Record<string, string> = {
  GP: 'Gestora de PE/VC',
  LP: 'Investidor (LP)',
  FUNDO: 'Fundo de Pensão',
  CORPORATIVO: 'Corporativo',
  GOVERNO: 'Governo',
  ACADEMIA: 'Academia',
  OUTRO: 'Outro',
  SEM_SEGMENTO: 'Sem segmento',
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
  rows: MemberAnalysisRow[]
}

export function MembrosCharts({ rows }: Props) {
  const { resolvedTheme } = useTheme()
  const navy = resolvedTheme === 'dark' ? NAVY_DARK : NAVY_LIGHT
  const memberColor = '#00a99d'
  const naoMemberColor = navy

  // Para barras empilhadas (MBR-01/MBR-02): mesmo dado, label legível
  const stackedData = rows.map(r => ({
    segment: r.segment,
    segmentLabel: SEGMENT_LABELS[r.segment] ?? r.segment,
    Membro: r.membro_count,
    'Não Membro': r.nao_membro_count,
    total: r.total,
    pct: r.membership_pct,
  }))

  // Para adesão (MBR-03): filtro total >= 3 evita ruído; ordenado desc por membership_pct
  const adesaoData = [...rows]
    .filter(r => r.total >= 3)
    .sort((a, b) => b.membership_pct - a.membership_pct)
    .map(r => ({
      segment: r.segment,
      segmentLabel: SEGMENT_LABELS[r.segment] ?? r.segment,
      pct: r.membership_pct,
      total: r.total,
      label: `${r.membership_pct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`,
    }))

  return (
    <div className="space-y-6">
      {/* MBR-01/MBR-02 — Stacked bars Membros + Não-Membros por segmento */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
        <ChartLabel>Membros vs Não-Membros por Tipo de Empresa</ChartLabel>
        <ResponsiveContainer width="100%" height={Math.max(280, stackedData.length * 50)}>
          <BarChart
            data={stackedData}
            layout="vertical"
            margin={{ top: 8, right: 60, left: 8, bottom: 0 }}
          >
            <CartesianGrid horizontal={false} stroke={GRID_COLOR} strokeOpacity={0.5} />
            <XAxis type="number" tick={AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis
              dataKey="segmentLabel"
              type="category"
              tick={AXIS_STYLE}
              axisLine={false}
              tickLine={false}
              width={150}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              cursor={{ fill: 'oklch(0.21 0.11 265 / 0.04)' }}
              formatter={(v, name) => [`${v} inscritos`, name as string]}
            />
            <Bar dataKey="Membro" stackId="a" fill={memberColor} radius={[0, 0, 0, 0]} maxBarSize={26} />
            <Bar dataKey="Não Membro" stackId="a" fill={naoMemberColor} radius={[0, 3, 3, 0]} maxBarSize={26}>
              <LabelList
                dataKey="total"
                position="right"
                formatter={(v) => `${v} total`}
                style={{ fontSize: 11, fontFamily: 'var(--font-ibm-mono)', fill: 'oklch(0.52 0.04 254)' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-3 text-[11px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: memberColor }} />
            Membros
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: naoMemberColor }} />
            Não-Membros
          </span>
        </div>
      </div>

      {/* MBR-03 — Taxa de Adesão por Tipo de Empresa (ordenado desc) */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
        <ChartLabel>Taxa de Adesão por Tipo de Empresa (segmentos com ≥ 3 inscritos)</ChartLabel>
        {adesaoData.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(220, adesaoData.length * 42)}>
            <BarChart
              data={adesaoData}
              layout="vertical"
              margin={{ top: 8, right: 70, left: 8, bottom: 0 }}
            >
              <CartesianGrid horizontal={false} stroke={GRID_COLOR} strokeOpacity={0.5} />
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={AXIS_STYLE}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                dataKey="segmentLabel"
                type="category"
                tick={AXIS_STYLE}
                axisLine={false}
                tickLine={false}
                width={150}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                cursor={{ fill: 'oklch(0.21 0.11 265 / 0.04)' }}
                formatter={(_v, _name, ctx) => [
                  `${(ctx as { payload?: { pct?: number; total?: number } })?.payload?.pct ?? 0}% (${(ctx as { payload?: { pct?: number; total?: number } })?.payload?.total ?? 0} inscritos)`,
                  'Adesão',
                ]}
              />
              <Bar dataKey="pct" name="Adesão" radius={[0, 3, 3, 0]} maxBarSize={22}>
                {adesaoData.map((_, i) => (
                  <Cell key={i} fill={memberColor} />
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

      {/* Tabela detalhada (MBR-01 alternativa numérica) */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-[10px] font-mono tracking-[0.20em] text-muted-foreground uppercase">
            Detalhamento por Segmento
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Segmento</TableHead>
              <TableHead className="text-right">Membros</TableHead>
              <TableHead className="text-right">Não-Membros</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Adesão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.segment}>
                <TableCell className="font-medium">{SEGMENT_LABELS[r.segment] ?? r.segment}</TableCell>
                <TableCell className="text-right font-mono tabular-nums text-sm">{r.membro_count}</TableCell>
                <TableCell className="text-right font-mono tabular-nums text-sm">{r.nao_membro_count}</TableCell>
                <TableCell className="text-right font-mono tabular-nums text-sm">{r.total}</TableCell>
                <TableCell className="text-right font-mono tabular-nums text-sm text-primary">
                  {r.membership_pct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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

function EmptyChart({ height = 180 }: { height?: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2" style={{ height }}>
      <div className="w-6 h-6 rounded-full border-2 border-dashed border-border" />
      <p className="text-[11px] font-mono text-muted-foreground/40">sem dados ainda</p>
    </div>
  )
}
