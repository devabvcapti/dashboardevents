import { getOverviewStats, getCompanySegmentSummary, getTicketMembershipSummary } from '@/lib/data'
import { getActiveEditionId } from '@/lib/edition-cookie'
import { MOCK_STATS, MOCK_BY_COMPANY_TYPE_ENUM, MOCK_BY_TICKET_TYPE } from '@/lib/mock-data'
import { PublicoCharts } from './publico-charts'

export const dynamic = 'force-dynamic'

export default async function PublicoPage() {
  let total = 0
  let byCompanyType: { type: string; count: number }[] = []
  let byTicketType: { type: string; count: number }[] = []
  let isMock = false

  try {
    const editionId = await getActiveEditionId()
    const [stats, segment, ticket] = await Promise.all([
      getOverviewStats(editionId),
      getCompanySegmentSummary(editionId),
      getTicketMembershipSummary(editionId),
    ])
    total = stats.total
    byCompanyType = segment
    byTicketType = ticket.map(r => ({ type: r.ticket_membership === 'MEMBRO' ? 'Membro' : 'Não Membro', count: r.count }))
  } catch {
    total = MOCK_STATS.total
    byCompanyType = MOCK_BY_COMPANY_TYPE_ENUM
    byTicketType = MOCK_BY_TICKET_TYPE
    isMock = true
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-end justify-between border-b border-border pb-6">
        <div>
          <p className="text-[10px] font-mono tracking-[0.22em] text-muted-foreground uppercase mb-1">
            Analytics
          </p>
          <h1 className="font-display text-3xl text-foreground leading-none">Análise de Público</h1>
        </div>
        <div className="flex items-center gap-3 pb-0.5">
          {isMock && (
            <span className="text-[9px] font-mono tracking-widest text-amber-500/70 uppercase border border-amber-500/20 bg-amber-500/5 px-2 py-0.5 rounded">
              dados demo
            </span>
          )}
          <p className="text-[11px] font-mono text-muted-foreground/50">
            Perfil demográfico
          </p>
        </div>
      </div>

      <PublicoCharts
        byCompanyType={byCompanyType}
        byTicketType={byTicketType}
        total={total}
      />
    </div>
  )
}
