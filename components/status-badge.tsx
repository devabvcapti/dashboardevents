import { Badge } from '@/components/ui/badge'
import type { TicketMembership } from '@/lib/database.types'

const membershipConfig: Record<TicketMembership, { label: string; className: string }> = {
  MEMBRO: { label: 'Membro', className: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50' },
  NAO_MEMBRO: { label: 'Não Membro', className: 'bg-amber-950/60 text-amber-400 border-amber-800/50' },
}

export function TicketBadge({ type }: { type: TicketMembership }) {
  const cfg = membershipConfig[type]
  return (
    <Badge variant="outline" className={cfg.className}>
      {cfg.label}
    </Badge>
  )
}
