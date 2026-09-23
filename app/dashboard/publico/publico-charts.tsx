'use client'

import type { PublicoAnalysis, RankingItem } from '@/lib/data'

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

const COMPANY_LABELS: Record<string, string> = {
  GP: 'Gestora (GP)',
  LP: 'Investidor (LP)',
  GESTORA: 'Gestora',
  FUNDO: 'Fundo',
  CORPORATIVO: 'Corporativo',
  GOVERNO: 'Governo',
  ACADEMIA: 'Academia',
  OUTRO: 'Outro',
}

interface Props {
  byCompanyType: { type: string; count: number }[]
  byTicketType: { type: string; count: number }[]
  total: number
  analise: PublicoAnalysis
}

export function PublicoCharts({ byCompanyType, total, analise }: Props) {
  const companyData = byCompanyType.map(d => ({
    ...d,
    name: COMPANY_LABELS[d.type] ?? d.type,
    pct: total > 0 ? Math.round((d.count / total) * 100) : 0,
  }))
  const topCompanyData = companyData.slice(0, 10)

  return (
    <div className="space-y-6">

      {/* ── Segmento de Atuação (ranking) ── */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
        <ChartLabel>Segmento de Atuação (Top 10)</ChartLabel>
        {topCompanyData.length === 0 ? <EmptyChart height={120} /> : (
          <div className="space-y-3 mt-2">
            {topCompanyData.map((d, i) => (
              <div key={d.type} className="flex items-center gap-4">
                <span className="text-[10px] font-mono text-muted-foreground/40 w-4 shrink-0 tabular-nums">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-sm text-foreground/80 truncate">{d.name}</span>
                    <span className="text-[11px] font-mono text-muted-foreground ml-3 shrink-0">
                      {d.count} <span className="text-muted-foreground/40">({d.pct}%)</span>
                    </span>
                  </div>
                  <div className="h-1 bg-border rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${d.pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Form responses: 2 colunas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RankingSection
          title="Temas de Maior Interesse no Congresso"
          items={analise.topics}
          color="#00a99d"
        />
        <RankingSection
          title="Temas de Maior Interesse no VC Day"
          items={analise.vcDayTopics}
          color="#112468"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RankingSection
          title="Interesse em Eventos do Ecossistema"
          items={analise.events}
          color="oklch(0.62 0.14 162)"
        />
        <RankingSection
          title="Conteúdos de Interesse"
          items={analise.contents}
          color="oklch(0.72 0.14 68)"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RankingSection
          title="Canais Preferidos"
          items={analise.channels}
          color="oklch(0.64 0.18 28)"
        />
        <RankingSection
          title="Cargo / Posição"
          items={analise.jobTitles}
          color="#112468"
        />
      </div>
    </div>
  )
}

function RankingSection({ title, items, color }: { title: string; items: RankingItem[]; color: string }) {
  const max = items[0]?.count ?? 1
  return (
    <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
      <ChartLabel>{title}</ChartLabel>
      {items.length === 0 ? <EmptyChart height={120} /> : (
        <div className="space-y-3 mt-2">
          {items.map((d, i) => (
            <div key={i} className="flex items-center gap-4">
              <span className="text-[10px] font-mono text-muted-foreground/40 w-4 shrink-0 tabular-nums">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className="text-sm text-foreground/80 truncate">{d.label}</span>
                  <span className="text-[11px] font-mono text-muted-foreground ml-3 shrink-0">{d.count}</span>
                </div>
                <div className="h-1 bg-border rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.round((d.count / max) * 100)}%`, backgroundColor: color }} />
                </div>
              </div>
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

function EmptyChart({ height = 260 }: { height?: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2" style={{ height }}>
      <div className="w-6 h-6 rounded-full border-2 border-dashed border-border" />
      <p className="text-[11px] font-mono text-muted-foreground/40">sem dados ainda</p>
    </div>
  )
}
