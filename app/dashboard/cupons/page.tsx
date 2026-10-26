import { requireAuth } from '@/lib/auth'
import { getCuponsSummary } from '@/lib/data'
import { getActiveEdition } from '@/lib/edition-cookie'
import { OfflinePaymentsTable } from './offline-payments-table'
import { CategoryCards } from './category-cards'
import { CuponsAnalysis } from './cupons-analysis'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Cupons — Dashboard ABVCAP' }

export default async function CuponsPage() {
  const user = await requireAuth()

  let stats: Awaited<ReturnType<typeof getCuponsSummary>> | null = null
  let editionName: string | null = null
  let editionId: string | null = null
  let loadError = false

  try {
    const edition = await getActiveEdition()
    editionName = edition.name
    editionId = edition.id
    stats = await getCuponsSummary(edition.id)
  } catch {
    loadError = true
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-end justify-between border-b border-border pb-6">
        <div>
          <p className="text-[10px] font-mono tracking-[0.22em] text-muted-foreground uppercase mb-1">
            Análise
          </p>
          <h1 className="font-display text-3xl text-foreground leading-none">
            Cupons{editionName && <span className="text-muted-foreground"> — {editionName}</span>}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Utilização de cupons de desconto por participantes e empresas.
          </p>
        </div>
        {stats && (
          <p className="text-[11px] font-mono text-muted-foreground/60 pb-0.5">
            {stats.total_participants.toLocaleString('pt-BR')} inscritos no total
          </p>
        )}
      </div>

      {loadError && (
        <div className="border border-red-500/20 bg-red-500/5 rounded-lg p-6 text-sm text-red-600">
          Falha ao carregar dados de cupons. Tente recarregar a página.
        </div>
      )}

      {!loadError && (!stats || stats.total_participants === 0) && (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-sm text-muted-foreground">Sem dados de participantes nesta edição.</p>
        </div>
      )}

      {!loadError && stats && stats.total_participants > 0 && (
        <>
          {/* Cards por categoria */}
          <CategoryCards categories={stats.by_category} />

          {stats.total_with_coupon === 0 ? (
            <div className="border border-dashed border-border rounded-lg p-12 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhum participante com cupom detectado. Verifique se a coluna de cupom está mapeada na importação.
              </p>
            </div>
          ) : editionId && (
            <CuponsAnalysis
              editionId={editionId}
              isAdmin={user.isAdmin}
              byCoupon={stats.by_coupon}
              totalParticipants={stats.total_participants}
              avgTicketNoCoupon={stats.avg_ticket_no_coupon}
              offlineTotalPaid={stats.offline_total_paid}
              hasOfflinePayments={stats.offline_payments.length > 0}
            />
          )}

          {/* Pagamentos Offline */}
          {stats.offline_payments.length > 0 && (
            <OfflinePaymentsTable groups={stats.offline_payments} />
          )}

          {/* Ranking de empresas */}
          {stats.top_companies.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-5">
              <p className="text-[10px] font-mono tracking-[0.18em] text-muted-foreground uppercase mb-4">
                Empresas que Mais Utilizaram Cupons
              </p>
              <div className="space-y-3">
                {stats.top_companies.map((c, i) => {
                  const maxCount = stats.top_companies[0]?.count ?? 1
                  return (
                    <div key={i} className="flex items-center gap-4">
                      <span className="text-[10px] font-mono text-muted-foreground/40 w-4 shrink-0 tabular-nums">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1.5">
                          <span className="text-sm text-foreground/80 truncate">{c.company}</span>
                          <span className="text-[11px] font-mono text-muted-foreground ml-3 shrink-0">{c.count}</span>
                        </div>
                        <div className="h-1 bg-border rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary/70 transition-all duration-500"
                            style={{ width: `${Math.round((c.count / maxCount) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
