import { requireAuth } from '@/lib/auth'
import { getActiveEdition } from '@/lib/edition-cookie'
import { getCompanyAnalysis } from '@/lib/data'
import { EmpresasCharts } from './empresas-charts'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Empresas — Dashboard ABVCAP' }

export default async function EmpresasPage() {
  await requireAuth()

  let analysis = null
  let editionName: string | null = null
  let loadError = false

  try {
    const edition = await getActiveEdition()
    editionName = edition.name
    analysis = await getCompanyAnalysis(edition.id)
  } catch {
    loadError = true
  }

  return (
    <div className="p-8 space-y-8">
      <div className="border-b border-border pb-6">
        <p className="text-[10px] font-mono tracking-[0.22em] text-muted-foreground uppercase mb-1">
          Análise Gerencial
        </p>
        <h1 className="font-display text-3xl text-foreground leading-none">
          Análise de Empresas{editionName && <span className="text-muted-foreground"> — {editionName}</span>}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Concentração, ranking e perfil das empresas participantes da edição ativa.
        </p>
      </div>

      {loadError && (
        <div className="border border-red-500/20 bg-red-500/5 rounded-lg p-6 text-sm text-red-600">
          Falha ao carregar dados. Tente recarregar a página.
        </div>
      )}

      {!loadError && analysis && analysis.total_companies === 0 && (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma empresa encontrada nesta edição.</p>
        </div>
      )}

      {!loadError && analysis && analysis.total_companies > 0 && (
        <EmpresasCharts analysis={analysis} />
      )}
    </div>
  )
}
