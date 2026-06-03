import { requireAuth } from '@/lib/auth'
import { getAllEditionsComparison } from '@/lib/data'
import { ComparativoCharts } from './comparativo-charts'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Comparativo — Dashboard ABVCAP' }

export default async function ComparativoPage() {
  await requireAuth()

  let data = null
  let loadError = false

  try {
    data = await getAllEditionsComparison()
  } catch {
    loadError = true
  }

  return (
    <div className="p-8 space-y-8">
      <div className="border-b border-border pb-6">
        <p className="text-[10px] font-mono tracking-[0.22em] text-muted-foreground uppercase mb-1">
          Análise Gerencial
        </p>
        <h1 className="font-display text-3xl text-foreground leading-none">Comparativo entre Edições</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Evolução histórica de inscrições, receita e ticket médio entre todas as edições do evento.
        </p>
      </div>

      {loadError && (
        <div className="border border-red-500/20 bg-red-500/5 rounded-lg p-6 text-sm text-red-600">
          Falha ao carregar dados. Tente recarregar a página.
        </div>
      )}

      {!loadError && data && <ComparativoCharts data={data} />}
    </div>
  )
}
