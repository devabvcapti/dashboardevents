import { requireAuth } from '@/lib/auth'
import { getAttendanceStats } from '@/lib/data'
import { getActiveEdition } from '@/lib/edition-cookie'
import { isClosedEventWithQaPlatform } from '@/lib/vcday'
import { StatCard } from '@/components/stat-card'
import { PresencaCharts } from './presenca-charts'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Presença — Dashboard ABVCAP' }

export default async function PresencaPage() {
  await requireAuth()

  let editionName: string | null = null
  let isEligible = false
  let stats: Awaited<ReturnType<typeof getAttendanceStats>> | null = null
  let loadError = false

  try {
    const edition = await getActiveEdition()
    editionName = edition.name
    isEligible = isClosedEventWithQaPlatform(edition)
    if (isEligible) {
      stats = await getAttendanceStats(edition.id)
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
            Presença{editionName && <span className="text-muted-foreground"> — {editionName}</span>}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Quantos inscritos de fato compareceram ao evento (check-in registrado no local).
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

      {!loadError && isEligible && stats && !stats.hasData && (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum participante desta edição tem check-in registrado ainda. Importe uma planilha exportada
            após o evento (com a coluna &quot;Fez check-in&quot;) para ver os números de presença.
          </p>
        </div>
      )}

      {!loadError && isEligible && stats && stats.hasData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatCard
              title="Compareceram (Check-in)"
              value={stats.checkedIn.toLocaleString('pt-BR')}
              subtitle={`${stats.pctAttendance.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% dos inscritos`}
              accent="teal"
            />
            <StatCard
              title="Não Compareceram"
              value={stats.notCheckedIn.toLocaleString('pt-BR')}
              accent="default"
            />
            <StatCard
              title="Total de Inscritos"
              value={stats.totalParticipants.toLocaleString('pt-BR')}
              accent="blue"
            />
          </div>

          <PresencaCharts stats={stats} />
        </div>
      )}
    </div>
  )
}
