import { requireAuth } from '@/lib/auth'
import { getAttendanceStats } from '@/lib/data'
import { getActiveEdition } from '@/lib/edition-cookie'
import { isClosedEventWithQaPlatform } from '@/lib/vcday'
import { StatCard } from '@/components/stat-card'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Presença — Dashboard ABVCAP' }

const MEMBERSHIP_LABEL: Record<string, string> = {
  MEMBRO: 'Membro',
  NAO_MEMBRO: 'Não Membro',
}

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

          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <p className="text-[10px] font-mono tracking-[0.20em] text-muted-foreground uppercase mb-4">
              Presença por Tipo de Ingresso
            </p>
            <div className="space-y-3">
              {stats.byMembership.map(m => (
                <div key={m.membership} className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1.5">
                      <span className="text-sm text-foreground/80 truncate">{MEMBERSHIP_LABEL[m.membership] ?? m.membership}</span>
                      <span className="text-[11px] font-mono text-muted-foreground ml-3 shrink-0">
                        {m.checkedIn} de {m.total} <span className="text-muted-foreground/40">({m.pctAttendance.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%)</span>
                      </span>
                    </div>
                    <div className="h-1 bg-border rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${m.pctAttendance}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
