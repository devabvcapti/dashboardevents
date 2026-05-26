import { requireAdmin } from '@/lib/auth'
import { getRevenueAnalysis } from '@/lib/data'
import { getActiveEditionId } from '@/lib/edition-cookie'
import Link from 'next/link'
import { StatCard } from '@/components/stat-card'
import { ReceitaCharts } from './receita-charts'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Análise de Receita — Dashboard ABVCAP' }

const formatBRL = (v: number) =>
  `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

const formatBRLDecimal = (v: number) =>
  `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default async function ReceitaPage() {
  await requireAdmin()

  let editionId: string | null = null
  try { editionId = await getActiveEditionId() } catch { editionId = null }

  if (!editionId) {
    return (
      <div className="p-8 space-y-6">
        <div className="border-b border-border pb-6">
          <h1 className="font-display text-3xl text-foreground leading-none">Análise de Receita</h1>
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

  let analysis: Awaited<ReturnType<typeof getRevenueAnalysis>> = { by_membership: [], histogram: [] }
  let loadError = false
  try { analysis = await getRevenueAnalysis(editionId) } catch { loadError = true }

  // REV-01: totais globais agregados de by_membership
  const totalRevenue = (analysis.by_membership ?? []).reduce((acc, r) => acc + Number(r.total_revenue || 0), 0)
  const totalCount = (analysis.by_membership ?? []).reduce((acc, r) => acc + Number(r.count || 0), 0)
  // Ticket médio global = média ponderada (sum of total_revenue / sum of count com ticket_value > 0)
  // Aproximação: média ponderada usando avg * count quando avg > 0, else ignora.
  let weightedSum = 0
  let weightedCount = 0
  for (const r of analysis.by_membership ?? []) {
    const c = Number(r.count || 0)
    const a = Number(r.avg_ticket || 0)
    if (a > 0 && c > 0) { weightedSum += a * c; weightedCount += c }
  }
  const avgTicketGlobal = weightedCount > 0 ? weightedSum / weightedCount : 0

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-end justify-between border-b border-border pb-6">
        <div>
          <p className="text-[10px] font-mono tracking-[0.22em] text-muted-foreground uppercase mb-1">
            Análise
          </p>
          <h1 className="font-display text-3xl text-foreground leading-none">Análise de Receita</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Receita total, ticket médio por categoria e distribuição de valores de ingresso.
          </p>
        </div>
        <p className="text-[11px] font-mono text-muted-foreground/60 pb-0.5">
          {totalCount.toLocaleString('pt-BR')} inscrito{totalCount !== 1 ? 's' : ''}
        </p>
      </div>

      {loadError && (
        <div className="border border-red-500/20 bg-red-500/5 rounded-lg p-6 text-sm text-red-600">
          Falha ao carregar análise. Tente recarregar a página.
        </div>
      )}

      {!loadError && (
        <>
          {/* REV-01 — Receita total + Ticket médio global */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <StatCard
              title="Receita Total"
              value={formatBRL(totalRevenue)}
              accent="teal"
            />
            <StatCard
              title="Ticket Médio Geral"
              value={formatBRLDecimal(avgTicketGlobal)}
              subtitle="Apenas ingressos pagos (> R$0)"
              accent="green"
            />
          </div>

          <ReceitaCharts analysis={analysis} />
        </>
      )}
    </div>
  )
}
