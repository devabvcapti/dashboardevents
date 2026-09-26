import { requireAuth } from '@/lib/auth'
import { getNpsHistory } from '@/lib/data'
import { NpsCharts } from './nps-charts'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Pesquisas NPS — Dashboard ABVCAP' }

export default async function NpsPage() {
  await requireAuth()

  let years: Awaited<ReturnType<typeof getNpsHistory>> = []
  let loadError = false
  try {
    years = await getNpsHistory()
  } catch {
    loadError = true
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-end justify-between border-b border-border pb-6">
        <div>
          <p className="text-[10px] font-mono tracking-[0.22em] text-muted-foreground uppercase mb-1">
            ABVCAP Experience
          </p>
          <h1 className="font-display text-3xl text-foreground leading-none">
            Pesquisas NPS
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Pesquisas pós-evento por público (Participantes, Painelistas e Moderadores, Patrocinadores, Women Connection),
            comparáveis entre edições do Experience.
          </p>
        </div>
      </div>

      {loadError && (
        <div className="border border-red-500/20 bg-red-500/5 rounded-lg p-6 text-sm text-red-600">
          Falha ao carregar dados. Tente recarregar a página.
        </div>
      )}

      {!loadError && years.length === 0 && (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma resposta de pesquisa registrada ainda.</p>
        </div>
      )}

      {!loadError && years.length > 0 && <NpsCharts years={years} />}
    </div>
  )
}
