import { getActiveEditionId } from '@/lib/edition-cookie'
import { InscricoesClient } from './inscricoes-client'

export const dynamic = 'force-dynamic'

export default async function InscricoesPage() {
  let activeEditionId = ''
  try {
    activeEditionId = await getActiveEditionId()
  } catch {
    // sem edição — InscricoesClient lida com estado vazio
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
          <p className="text-[11px] font-mono text-muted-foreground/50">
            Lista de participantes
          </p>
        </div>
      </div>
      <InscricoesClient activeEditionId={activeEditionId} />
    </div>
  )
}
