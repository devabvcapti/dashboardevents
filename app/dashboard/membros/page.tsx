import { requireAdmin } from '@/lib/auth'
import { getMemberAnalysis } from '@/lib/data'
import { getActiveEditionId } from '@/lib/edition-cookie'
import Link from 'next/link'
import { MembrosCharts } from './membros-charts'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Análise de Membros — Dashboard ABVCAP' }

export default async function MembrosPage() {
  await requireAdmin()

  let editionId: string | null = null
  try { editionId = await getActiveEditionId() } catch { editionId = null }

  if (!editionId) {
    return (
      <div className="p-8 space-y-6">
        <div className="border-b border-border pb-6">
          <h1 className="font-display text-3xl text-foreground leading-none">Análise de Membros</h1>
        </div>
        <div className="border border-dashed border-border rounded-lg p-12 text-center space-y-3">
          <p className="text-sm font-medium text-foreground">Nenhum evento cadastrado.</p>
          <Link href="/dashboard/eventos" className="inline-block text-sm text-primary hover:underline">
            Ir para Eventos →
          </Link>
        </div>
      </div>
    )
  }

  let rows: Awaited<ReturnType<typeof getMemberAnalysis>> = []
  let loadError = false
  try { rows = await getMemberAnalysis(editionId) } catch { loadError = true }

  // Agregados para KPI strip
  const totalMembros = rows.reduce((acc, r) => acc + r.membro_count, 0)
  const totalNaoMembros = rows.reduce((acc, r) => acc + r.nao_membro_count, 0)
  const totalGeral = totalMembros + totalNaoMembros
  const adesaoGlobal = totalGeral > 0 ? Math.round((totalMembros / totalGeral) * 1000) / 10 : 0

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-end justify-between border-b border-border pb-6">
        <div>
          <p className="text-[10px] font-mono tracking-[0.22em] text-muted-foreground uppercase mb-1">
            Análise
          </p>
          <h1 className="font-display text-3xl text-foreground leading-none">Análise de Membros</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Comparativo entre membros e não-membros por tipo de empresa, com taxa de adesão por segmento.
          </p>
        </div>
        <p className="text-[11px] font-mono text-muted-foreground/60 pb-0.5">
          {totalGeral.toLocaleString('pt-BR')} inscrito{totalGeral !== 1 ? 's' : ''}
        </p>
      </div>

      {loadError && (
        <div className="border border-red-500/20 bg-red-500/5 rounded-lg p-6 text-sm text-red-600">
          Falha ao carregar análise. Tente recarregar a página.
        </div>
      )}

      {!loadError && rows.length === 0 && (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-sm text-muted-foreground">Sem dados de participantes nesta edição.</p>
        </div>
      )}

      {!loadError && rows.length > 0 && (
        <>
          {/* KPIs agregados */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <KpiCard title="Membros" value={totalMembros} />
            <KpiCard title="Não Membros" value={totalNaoMembros} />
            <KpiCard
              title="Adesão Global"
              value={`${adesaoGlobal.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`}
            />
          </div>
          <MembrosCharts rows={rows} />
        </>
      )}
    </div>
  )
}

function KpiCard({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="border border-border rounded-lg bg-card p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary" />
      <p className="text-[10px] font-mono tracking-[0.20em] text-muted-foreground uppercase mb-3">{title}</p>
      <p className="font-display tabular-nums text-4xl text-foreground leading-none">
        {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
      </p>
    </div>
  )
}
