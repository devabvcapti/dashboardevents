import { requireAdmin } from '@/lib/auth'
import { getEditions } from '@/lib/data'
import { getActiveEditionId } from '@/lib/edition-cookie'
import Link from 'next/link'
import { ImportClient } from './import-client'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Importar Excel — Dashboard ABVCAP' }

export default async function ImportPage() {
  await requireAdmin()

  let editions: Awaited<ReturnType<typeof getEditions>> = []
  let activeEditionId = ''
  try {
    editions = await getEditions()
    if (editions.length > 0) {
      try { activeEditionId = await getActiveEditionId() } catch { activeEditionId = editions[0].id }
    }
  } catch { editions = [] }

  return (
    <div className="p-8 space-y-6">
      <div className="border-b border-border pb-6">
        <p className="text-[10px] font-mono tracking-[0.22em] text-muted-foreground uppercase mb-1">
          Pipeline
        </p>
        <h1 className="font-display text-3xl text-foreground leading-none">
          Importar Excel
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Faça upload de uma planilha exportada da plataforma ABVCAP. O sistema irá detectar o cabeçalho,
          pedir confirmação do mapeamento de colunas e mostrar uma prévia antes de gravar no banco.
        </p>
      </div>

      {editions.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-12 text-center space-y-3">
          <p className="text-sm font-medium text-foreground">Nenhum evento cadastrado.</p>
          <p className="text-sm text-muted-foreground">
            Crie um evento antes de importar participantes.
          </p>
          <Link
            href="/dashboard/eventos"
            className="inline-block text-sm text-primary hover:underline mt-2"
          >
            Ir para Eventos →
          </Link>
        </div>
      ) : (
        <ImportClient editions={editions} initialEditionId={activeEditionId} />
      )}
    </div>
  )
}
