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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Row 1 — OV-01: total, membros %, não-membros %, receita */}
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

      {/* Row 2 — OV-01 (ticket médio) + OV-02 (empresas + estados) */}
      <StatCard
        title="Ticket Médio"
        value={formatBRLDecimal(stats.avg_ticket)}
        accent="teal"
      />
      <StatCard
        title="Empresas Únicas"
        value={stats.unique_companies}
        accent="blue"
      />
      <StatCard
        title="Estados Representados"
        value={stats.states_represented}
        accent="default"
      />
      {/* Placeholder vazio para manter grade 4-col equilibrada em desktop */}
      <div className="hidden lg:block" />
    </div>
  )
}
