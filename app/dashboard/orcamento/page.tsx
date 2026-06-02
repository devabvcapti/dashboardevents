import { requireAuth } from '@/lib/auth'
import { getBudgetSummary } from '@/lib/data'
import { getActiveEditionId } from '@/lib/edition-cookie'
import { OrcamentoCharts } from './orcamento-charts'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Orçamento — Dashboard ABVCAP' }

export default async function OrcamentoPage() {
  await requireAuth()

  let summary: Awaited<ReturnType<typeof getBudgetSummary>> = null
  let editionId = ''
  let loadError = false

  try {
    editionId = await getActiveEditionId()
    summary = await getBudgetSummary(editionId)
  } catch {
    loadError = true
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-end justify-between border-b border-border pb-6">
        <div>
          <p className="text-[10px] font-mono tracking-[0.22em] text-muted-foreground uppercase mb-1">
            Financeiro
          </p>
          <h1 className="font-display text-3xl text-foreground leading-none">Orçamento</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Acompanhamento orçado × realizado por categoria do evento.
          </p>
        </div>
        {summary && (
          <p className="text-[11px] font-mono text-muted-foreground/60 pb-0.5">
            {summary.items.length} {summary.items.length === 1 ? 'item' : 'itens'} importados
          </p>
        )}
      </div>

      {loadError ? (
        <div className="border border-red-500/20 bg-red-500/5 rounded-lg p-6 text-sm text-red-600">
          Falha ao carregar dados. Tente recarregar a página.
        </div>
      ) : (
        <OrcamentoCharts summary={summary} editionId={editionId} />
      )}
    </div>
  )
}
