import { requireAuth } from '@/lib/auth'
import { getVcDayQaSummary } from '@/lib/data'
import { getActiveEdition } from '@/lib/edition-cookie'
import { isClosedEventWithQaPlatform } from '@/lib/vcday'
import { VcDayQaCharts } from './vcday-qa-charts'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Q&A e Avaliações — Dashboard ABVCAP' }

export default async function VcDayQaPage() {
  await requireAuth()

  let editionName: string | null = null
  let isEligible = false
  let summary: Awaited<ReturnType<typeof getVcDayQaSummary>> | null = null
  let loadError = false

  try {
    const edition = await getActiveEdition()
    editionName = edition.name
    isEligible = isClosedEventWithQaPlatform(edition)
    if (isEligible && edition.event_date) {
      summary = await getVcDayQaSummary(edition.event_date)
    }
  } catch {
    loadError = true
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-end justify-between border-b border-border pb-6">
        <div>
          <p className="text-[10px] font-mono tracking-[0.22em] text-muted-foreground uppercase mb-1">
            Pós-Evento
          </p>
          <h1 className="font-display text-3xl text-foreground leading-none">
            Q&amp;A e Avaliações{editionName && <span className="text-muted-foreground"> — {editionName}</span>}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Perguntas enviadas e avaliações de satisfação por painel, coletadas na plataforma do evento.
          </p>
        </div>
      </div>

      {loadError && (
        <div className="border border-red-500/20 bg-red-500/5 rounded-lg p-6 text-sm text-red-600">
          Falha ao carregar dados. Tente recarregar a página.
        </div>
      )}

      {!loadError && !isEligible && (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-sm text-muted-foreground">
            Esta área fica disponível somente para edições já realizadas. Selecione uma edição encerrada no menu lateral.
          </p>
        </div>
      )}

      {!loadError && isEligible && summary && summary.panels.length === 0 && (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-sm text-muted-foreground">Sem painéis cadastrados na plataforma de Q&amp;A.</p>
        </div>
      )}

      {!loadError && isEligible && summary && summary.panels.length > 0 && (
        <VcDayQaCharts summary={summary} />
      )}
    </div>
  )
}
