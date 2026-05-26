import { requireAdmin } from '@/lib/auth'
import {
  getOverviewStats, getCompanySegmentSummary, getRegistrationsByDay,
  getTicketMembershipSummary, getFreeTicketStats,
} from '@/lib/data'
import { getActiveEditionId } from '@/lib/edition-cookie'
import Link from 'next/link'
import { OverviewKpis } from './overview-kpis'
import { OverviewCharts } from './overview-charts'
import type { OverviewStats } from '@/lib/data'

const EMPTY_STATS: OverviewStats = {
  total: 0, membro: 0, nao_membro: 0, total_revenue: 0, avg_ticket: 0,
  unique_companies: 0, states_represented: 0,
}

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  await requireAdmin()

  // Resolver editionId — sem editions, renderiza CTA
  let editionId: string | null = null
  try {
    editionId = await getActiveEditionId()
  } catch {
    editionId = null
  }

  if (!editionId) {
    return (
      <div className="p-8 space-y-6">
        <div className="border-b border-border pb-6">
          <h1 className="font-display text-3xl text-foreground leading-none">Visão Geral</h1>
        </div>
        <div className="border border-dashed border-border rounded-lg p-12 text-center space-y-3">
          <p className="text-sm font-medium text-foreground">Nenhum evento cadastrado.</p>
          <p className="text-sm text-muted-foreground">
            Crie uma edição para começar a visualizar dados.
          </p>
          <Link href="/dashboard/eventos" className="inline-block text-sm text-primary hover:underline">
            Ir para Eventos →
          </Link>
        </div>
      </div>
    )
  }

  let stats: Awaited<ReturnType<typeof getOverviewStats>> | null = null
  let byTicketType: { type: string; count: number }[] = []
  let byCompanyType: { type: string; count: number }[] = []
  let registrationsByDay: { date: string; count: number }[] = []
  let freeTickets = { free: 0, paid: 0, total: 0 }
  let isMock = false

  try {
    const [s, ticket, segment, regByDay, free] = await Promise.all([
      getOverviewStats(editionId),
      getTicketMembershipSummary(editionId),
      getCompanySegmentSummary(editionId),
      getRegistrationsByDay(editionId),
      getFreeTicketStats(editionId),
    ])
    stats = s
    byTicketType = ticket.map(r => ({
      type: r.ticket_membership === 'MEMBRO' ? 'Membros' : 'Não Membros',
      count: r.count,
    }))
    byCompanyType = segment
    registrationsByDay = regByDay
    freeTickets = free
  } catch {
    stats = null
    isMock = true
  }

  const display = stats ?? EMPTY_STATS

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
            <span className="text-[9px] font-mono tracking-widest text-red-500/70 uppercase border border-red-500/20 bg-red-500/5 px-2 py-0.5 rounded">
              erro ao carregar dados
            </span>
          )}
          <p className="text-[11px] font-mono text-muted-foreground/50">
            Eventos ABVCAP
          </p>
        </div>
      </div>

      <OverviewKpis stats={display} />

      <OverviewCharts
        byTicketType={byTicketType}
        byCompanyType={byCompanyType}
        registrationsByDay={registrationsByDay}
        freeTickets={freeTickets}
        totalInscritos={display.total}
      />
    </div>
  )
}
