import { requireAdmin } from '@/lib/auth'
import { ImportClient } from './import-client'

export const metadata = { title: 'Importar Excel — Dashboard ABVCAP' }

export default async function ImportPage() {
  await requireAdmin()
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
      <ImportClient />
    </div>
  )
}
