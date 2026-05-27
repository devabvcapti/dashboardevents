import { StatCard } from '@/components/stat-card'
import type { OverviewStats } from '@/lib/database.types'

interface Props {
  stats: OverviewStats
}

export function OverviewKpis({ stats }: Props) {
  const memberPct = stats.total > 0
    ? Math.round((stats.membro / stats.total) * 100)
    : 0
  const naoMembroPct = stats.total > 0
    ? Math.round((stats.nao_membro / stats.total) * 100)
    : 0

  const formatBRL = (v: number) =>
    `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  const formatBRLDecimal = (v: number) =>
    `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      <StatCard
        title="Total Inscritos"
        value={stats.total}
        accent="blue"
      />
      <StatCard
        title="Membros"
        value={stats.membro}
        subtitle={`${memberPct}% do total`}
        accent="green"
      />
      <StatCard
        title="Não Membros"
        value={stats.nao_membro}
        subtitle={`${naoMembroPct}% do total`}
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
  )
}
