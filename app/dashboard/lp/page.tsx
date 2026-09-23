import { requireAuth } from '@/lib/auth'
import { getLpAnalysis, getLpMasterCoverage, getLpExcludedCompanies } from '@/lib/data'
import { getActiveEdition } from '@/lib/edition-cookie'
import { LpCharts } from './lp-charts'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Análise de LPs — Dashboard ABVCAP' }

export default async function LpPage() {
  const user = await requireAuth()

  let editionName: string | null = null
  let analysis: Awaited<ReturnType<typeof getLpAnalysis>> | null = null
  let coverage: Awaited<ReturnType<typeof getLpMasterCoverage>> | null = null
  let excluded: Awaited<ReturnType<typeof getLpExcludedCompanies>> = []
  let loadError = false

  try {
    const edition = await getActiveEdition()
    editionName = edition.name
    ;[analysis, coverage, excluded] = await Promise.all([
      getLpAnalysis(edition.id),
      getLpMasterCoverage(edition.id),
      getLpExcludedCompanies(),
    ])
  } catch {
    loadError = true
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-end justify-between border-b border-border pb-6">
        <div>
          <p className="text-[10px] font-mono tracking-[0.22em] text-muted-foreground uppercase mb-1">
            Analytics
          </p>
          <h1 className="font-display text-3xl text-foreground leading-none">
            Análise de LPs{editionName && <span className="text-muted-foreground"> — {editionName}</span>}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Perfil dos investidores (LPs) presentes no evento, por subcategoria.
          </p>
        </div>
      </div>

      {loadError && (
        <div className="border border-red-500/20 bg-red-500/5 rounded-lg p-6 text-sm text-red-600">
          Falha ao carregar dados. Tente recarregar a página.
        </div>
      )}

      {!loadError && analysis && analysis.totalLpParticipants === 0 && excluded.length === 0 && (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-sm text-muted-foreground">Sem participantes LP nesta edição.</p>
        </div>
      )}

      {!loadError && analysis && (analysis.totalLpParticipants > 0 || excluded.length > 0) && coverage && (
        <LpCharts analysis={analysis} coverage={coverage} excluded={excluded} isAdmin={user.isAdmin} />
      )}
    </div>
  )
}
