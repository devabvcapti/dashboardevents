import { requireAuth } from '@/lib/auth'
import { getRegistrationRhythm } from '@/lib/data'
import { getActiveEditionId } from '@/lib/edition-cookie'
import { RitmoCharts } from './ritmo-charts'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Ritmo de Inscrições — Dashboard ABVCAP' }

function formatDate(iso: string) {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
}

export default async function RitmoPage() {
  await requireAuth()

  let rhythm: Awaited<ReturnType<typeof getRegistrationRhythm>> | null = null
  let loadError = false

  try {
    const editionId = await getActiveEditionId()
    rhythm = await getRegistrationRhythm(editionId)
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
          <h1 className="font-display text-3xl text-foreground leading-none">Ritmo de Inscrições</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Evolução diária e acumulada das inscrições ao longo do evento.
          </p>
        </div>
        {rhythm && (
          <p className="text-[11px] font-mono text-muted-foreground/60 pb-0.5">
            {rhythm.byDay.length} dias com inscrições
          </p>
        )}
      </div>

      {loadError && (
        <div className="border border-red-500/20 bg-red-500/5 rounded-lg p-6 text-sm text-red-600">
          Falha ao carregar dados. Tente recarregar a página.
        </div>
      )}

      {!loadError && (!rhythm || rhythm.total === 0) && (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-sm text-muted-foreground">Sem dados de inscrições nesta edição.</p>
        </div>
      )}

      {!loadError && rhythm && rhythm.total > 0 && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <KpiCard
              title="Total de Inscritos"
              value={rhythm.total.toLocaleString('pt-BR')}
            />
            <KpiCard
              title="Pico Diário"
              value={rhythm.peakDay ? rhythm.peakDay.count.toLocaleString('pt-BR') : '—'}
              sub={rhythm.peakDay ? `em ${formatDate(rhythm.peakDay.date)}` : undefined}
            />
            <KpiCard
              title="Média por Dia"
              value={rhythm.avgPerDay.toLocaleString('pt-BR')}
              sub="em dias com inscrição"
            />
          </div>

          {/* Milestones */}
          {rhythm.milestones.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-5">
              <p className="text-[10px] font-mono tracking-[0.18em] text-muted-foreground uppercase mb-4">
                Marcos de Inscrição
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {rhythm.milestones.map(m => (
                  <div key={m.pct} className="text-center">
                    <p className="font-display text-2xl text-foreground leading-none">{m.pct}%</p>
                    <p className="text-[11px] font-mono text-muted-foreground mt-1">{formatDate(m.date)}</p>
                    <p className="text-[10px] font-mono text-muted-foreground/50">dia {m.dayNumber}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Charts */}
          <RitmoCharts byDay={rhythm.byDay} />
        </>
      )}
    </div>
  )
}

function KpiCard({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="border border-border rounded-lg bg-card p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary" />
      <p className="text-[10px] font-mono tracking-[0.20em] text-muted-foreground uppercase mb-3">{title}</p>
      <p className="font-display tabular-nums text-4xl text-foreground leading-none">{value}</p>
      {sub && <p className="text-[10px] font-mono text-muted-foreground/50 mt-2">{sub}</p>}
    </div>
  )
}
