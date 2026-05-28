import { requireAuth } from '@/lib/auth'
import { getTicketMembershipSummary, getTicketNameSummary } from '@/lib/data'
import { getActiveEditionId } from '@/lib/edition-cookie'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TicketBadge } from '@/components/status-badge'
import type { TicketMembership } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function IngressosPage() {
  await requireAuth()
  let summary: { ticket_membership: TicketMembership; count: number }[] = []
  let nameSummary: Awaited<ReturnType<typeof getTicketNameSummary>> = []
  let isMock = false

  try {
    const editionId = await getActiveEditionId()
    ;[summary, nameSummary] = await Promise.all([
      getTicketMembershipSummary(editionId),
      getTicketNameSummary(editionId),
    ])
  } catch {
    isMock = true
  }

  const grandTotal = summary.reduce((s, r) => s + r.count, 0)
  const nameGrandTotal = nameSummary.reduce((s, r) => s + r.count, 0)

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-end justify-between border-b border-border pb-6">
        <div>
          <p className="text-[10px] font-mono tracking-[0.22em] text-muted-foreground uppercase mb-1">
            Controle
          </p>
          <h1 className="font-display text-3xl text-foreground leading-none">Ingressos</h1>
        </div>
        <div className="flex items-center gap-3 pb-0.5">
          {isMock && (
            <span className="text-[9px] font-mono tracking-widest text-amber-500/70 uppercase border border-amber-500/20 bg-amber-500/5 px-2 py-0.5 rounded">
              dados demo
            </span>
          )}
          <p className="text-[11px] font-mono text-muted-foreground/50">
            Distribuição por categoria
          </p>
        </div>
      </div>

      {/* Cards MEMBRO / NÃO MEMBRO */}
      <div className="grid grid-cols-2 gap-3">
        {summary.map(row => (
          <div key={row.ticket_membership} className="relative bg-card border border-border rounded-lg px-5 pt-4 pb-5 overflow-hidden">
            <div className="absolute top-0 left-5 right-5 h-px bg-primary/60" />
            <div className="mb-3"><TicketBadge type={row.ticket_membership} /></div>
            <p className="font-display tabular-nums text-4xl text-foreground leading-none">{row.count}</p>
            <p className="mt-2 text-[11px] font-mono text-muted-foreground/60">
              {grandTotal > 0 ? `${Math.round((row.count / grandTotal) * 100)}% do total` : '—'}
            </p>
          </div>
        ))}
      </div>

      {/* Tabela por nome do ingresso */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-[10px] font-mono tracking-[0.18em] text-muted-foreground uppercase">
            Resumo por Nome do Ingresso
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">Nome do Ingresso</TableHead>
              <TableHead className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">Tipo</TableHead>
              <TableHead className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase text-right">Total</TableHead>
              <TableHead className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase text-right">% do Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {nameSummary.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12">
                  <p className="text-[11px] font-mono text-muted-foreground/40">sem dados — importe participantes primeiro</p>
                </TableCell>
              </TableRow>
            )}
            {nameSummary.map((row, i) => (
              <TableRow key={i} className="border-border hover:bg-accent/40">
                <TableCell className="font-medium text-sm">
                  {row.ticket_name ?? <span className="text-muted-foreground/50 italic">sem nome</span>}
                </TableCell>
                <TableCell><TicketBadge type={row.ticket_membership} /></TableCell>
                <TableCell className="text-right font-mono font-medium tabular-nums">{row.count}</TableCell>
                <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                  {nameGrandTotal > 0 ? `${Math.round((row.count / nameGrandTotal) * 100)}%` : '—'}
                </TableCell>
              </TableRow>
            ))}
            {nameSummary.length > 0 && (
              <TableRow className="border-t border-primary/20 bg-primary/5 hover:bg-primary/8">
                <TableCell className="font-mono text-xs text-primary uppercase tracking-wider" colSpan={2}>Total</TableCell>
                <TableCell className="text-right font-mono font-semibold tabular-nums text-foreground">{nameGrandTotal}</TableCell>
                <TableCell className="text-right font-mono tabular-nums text-muted-foreground">100%</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
