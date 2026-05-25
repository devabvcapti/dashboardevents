import { getOverviewStats } from '@/lib/data'
import { StatCard } from '@/components/stat-card'
import { OverviewCharts } from './overview-charts'
import {
  MOCK_STATS,
  MOCK_BY_TICKET_TYPE,
  MOCK_BY_COMPANY_TYPE_DISPLAY,
  MOCK_REGISTRATIONS_BY_DAY,
} from '@/lib/mock-data'

export const revalidate = 60

export default async function DashboardPage() {
  let stats
  try {
    stats = await getOverviewStats()
  } catch {
    stats = null
  }

  const display = stats ?? MOCK_STATS
  const isMock = !stats

  const memberPct = display.total > 0
    ? Math.round((display.membro / display.total) * 100)
    : 0

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-end justify-between border-b border-border pb-6">
        <div>
          <p className="text-[10px] font-mono tracking-[0.22em] text-muted-foreground uppercase mb-1">
            Painel de Controle
          </p>
          <h1 className="font-display text-3xl text-foreground leading-none">
            Visão Geral
          </h1>
        </div>
        <div className="flex items-center gap-3 pb-0.5">
          {isMock && (
            <span className="text-[9px] font-mono tracking-widest text-amber-500/70 uppercase border border-amber-500/20 bg-amber-500/5 px-2 py-0.5 rounded">
              dados demo
            </span>
          )}
          <p className="text-[11px] font-mono text-muted-foreground/50">
            Eventos ABVCAP
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Inscritos"
          value={display.total}
          accent="blue"
        />
        <StatCard
          title="Membros"
          value={display.membro}
          subtitle={`${memberPct}% do total`}
          accent="green"
        />
        <StatCard
          title="Não Membros"
          value={display.nao_membro}
          accent="amber"
        />
        <StatCard
          title="Receita Total"
          value={`R$ ${Number(display.total_revenue).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`}
          accent="teal"
        />
      </div>

      <OverviewCharts
        byTicketType={MOCK_BY_TICKET_TYPE}
        byCompanyType={MOCK_BY_COMPANY_TYPE_DISPLAY}
        registrationsByDay={MOCK_REGISTRATIONS_BY_DAY}
      />
    </div>
  )
}
