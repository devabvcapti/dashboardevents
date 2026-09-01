import { StatCard } from '@/components/stat-card'
import type { OverviewStats } from '@/lib/database.types'

interface Props {
  stats: OverviewStats
  paidCount: number
  freeCount: number
  paidMembers: number
  paidNaoMembers: number
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-mono tracking-[0.20em] text-muted-foreground/70 uppercase mb-2">
      {children}
    </p>
  )
}

export function OverviewKpis({ stats, paidCount, freeCount, paidMembers, paidNaoMembers }: Props) {
  const paidPct = stats.total > 0 ? Math.round((paidCount / stats.total) * 100) : 0
  const freePct = stats.total > 0 ? Math.round((freeCount / stats.total) * 100) : 0
  const paidMemberPct = paidCount > 0 ? Math.round((paidMembers / paidCount) * 100) : 0
  const paidNaoMemberPct = paidCount > 0 ? Math.round((paidNaoMembers / paidCount) * 100) : 0

  const formatBRL = (v: number) =>
    `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  const formatBRLDecimal = (v: number) =>
    `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="space-y-4">
      <div>
        <SectionLabel>Panorama Geral</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatCard
            title="Total Inscritos"
            value={stats.total}
            accent="blue"
          />
          <StatCard
            title="Pagos"
            value={paidCount}
            subtitle={`${paidPct}% do total`}
            accent="teal"
          />
          <StatCard
            title="Grátis"
            value={freeCount}
            subtitle={`${freePct}% do total`}
            accent="default"
          />
        </div>
      </div>
      <div>
        <SectionLabel>Detalhamento — Ingressos Pagos</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            title="Membros"
            value={paidMembers}
            subtitle={`${paidMemberPct}% dos pagos`}
            accent="green"
          />
          <StatCard
            title="Não Membros"
            value={paidNaoMembers}
            subtitle={`${paidNaoMemberPct}% dos pagos`}
            accent="amber"
          />
          <StatCard
            title="Receita Total"
            value={formatBRL(stats.total_revenue)}
            accent="teal"
          />
          <StatCard
            title="Ticket Médio"
            value={formatBRLDecimal(stats.avg_ticket)}
            accent="teal"
          />
        </div>
      </div>
    </div>
  )
}
