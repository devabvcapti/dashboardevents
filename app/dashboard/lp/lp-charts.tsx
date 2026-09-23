'use client'

import { StatCard } from '@/components/stat-card'
import { LP_CATEGORY_LABELS } from '@/lib/data'
import type { LpAnalysis } from '@/lib/data'
import { LpCategorySelect } from './lp-category-select'

const CHART_COLORS = [
  '#00a99d',
  '#112468',
  'oklch(0.62 0.14 162)',
  'oklch(0.72 0.14 68)',
  'oklch(0.64 0.18 28)',
  'oklch(0.60 0.15 295)',
  'oklch(0.68 0.12 130)',
  'oklch(0.66 0.10 340)',
]

interface Props {
  analysis: LpAnalysis
  isAdmin: boolean
}

export function LpCharts({ analysis, isAdmin }: Props) {
  const {
    totalLpParticipants, pctOfAudience, distinctCompanies, avgParticipantsPerCompany,
    classifiedParticipants, byCategory, unclassified,
  } = analysis

  const maxCategoryCount = byCategory[0]?.participantCount ?? 1
  const classifiedPct = totalLpParticipants > 0 ? Math.round((classifiedParticipants / totalLpParticipants) * 100) : 0

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard
          title="Participantes LP"
          value={totalLpParticipants.toLocaleString('pt-BR')}
          subtitle={`${pctOfAudience.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% da audiência`}
          accent="teal"
        />
        <StatCard
          title="Empresas LP Distintas"
          value={distinctCompanies.toLocaleString('pt-BR')}
          accent="blue"
        />
        <StatCard
          title="Média de Participantes por LP"
          value={avgParticipantsPerCompany.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
          accent="green"
        />
        <StatCard
          title="Classificados por Subcategoria"
          value={`${classifiedPct}%`}
          subtitle={`${classifiedParticipants} de ${totalLpParticipants}`}
          accent="default"
        />
      </div>

      {/* Ranking por subcategoria */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
        <ChartLabel>Participantes por Subcategoria de LP</ChartLabel>
        {byCategory.length === 0 ? (
          <EmptyChart height={120} />
        ) : (
          <div className="space-y-3 mt-2">
            {byCategory.map((c, i) => (
              <div key={c.category} className="flex items-center gap-4">
                <span className="text-[10px] font-mono text-muted-foreground/40 w-4 shrink-0 tabular-nums">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-sm text-foreground/80 truncate">{LP_CATEGORY_LABELS[c.category]}</span>
                    <span className="text-[11px] font-mono text-muted-foreground ml-3 shrink-0">
                      {c.participantCount} <span className="text-muted-foreground/40">({c.companyCount} empresa{c.companyCount !== 1 ? 's' : ''})</span>
                    </span>
                  </div>
                  <div className="h-1 bg-border rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.round((c.participantCount / maxCategoryCount) * 100)}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Empresas ainda não classificadas */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <p className="text-[10px] font-mono tracking-[0.20em] text-muted-foreground uppercase">
            Empresas Não Classificadas ({unclassified.length})
          </p>
          {!isAdmin && (
            <span className="text-[10px] font-mono text-muted-foreground/50">apenas admins podem classificar</span>
          )}
        </div>
        {unclassified.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Todas as empresas LP desta edição já estão classificadas.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left text-xs font-semibold p-3">Empresa</th>
                <th className="text-right text-xs font-semibold p-3">Participantes</th>
                {isAdmin && <th className="text-right text-xs font-semibold p-3">Subcategoria</th>}
              </tr>
            </thead>
            <tbody>
              {unclassified.map(u => (
                <tr key={u.companyKey} className="border-t border-border">
                  <td className="p-3 text-sm">{u.displayName}</td>
                  <td className="p-3 text-sm text-right font-mono tabular-nums">{u.participantCount}</td>
                  {isAdmin && (
                    <td className="p-3 text-right">
                      <div className="flex justify-end">
                        <LpCategorySelect companyName={u.displayName} />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
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
      <p className="text-[11px] font-mono text-muted-foreground/40">sem dados ainda</p>
    </div>
  )
}
