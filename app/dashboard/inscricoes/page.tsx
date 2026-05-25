import { getParticipants } from '@/lib/data'
import { MOCK_PARTICIPANTS } from '@/lib/mock-data'
import { InscricoesClient } from './inscricoes-client'

export const dynamic = 'force-dynamic'

export default async function InscricoesPage() {
  let participants: Awaited<ReturnType<typeof getParticipants>> = []
  let isMock = false
  try {
    participants = await getParticipants()
  } catch {
    participants = MOCK_PARTICIPANTS
    isMock = true
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-end justify-between border-b border-border pb-6">
        <div>
          <p className="text-[10px] font-mono tracking-[0.22em] text-muted-foreground uppercase mb-1">
            Gestão
          </p>
          <h1 className="font-display text-3xl text-foreground leading-none">Inscrições</h1>
        </div>
        <div className="flex items-center gap-3 pb-0.5">
          {isMock && (
            <span className="text-[9px] font-mono tracking-widest text-amber-500/70 uppercase border border-amber-500/20 bg-amber-500/5 px-2 py-0.5 rounded">
              dados demo
            </span>
          )}
          <p className="text-[11px] font-mono text-muted-foreground/50">
            {participants.length} participante{participants.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
      <InscricoesClient initialData={participants} />
    </div>
  )
}
