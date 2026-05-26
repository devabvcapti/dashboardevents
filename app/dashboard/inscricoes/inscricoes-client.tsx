'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TicketBadge } from '@/components/status-badge'
import type { Participant, TicketMembership } from '@/lib/database.types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const MEMBERSHIP_TYPES: Array<{ value: TicketMembership | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Todos os ingressos' },
  { value: 'MEMBRO', label: 'Membro' },
  { value: 'NAO_MEMBRO', label: 'Não Membro' },
]

// activeEditionId: usado pelos Plans 03+ para paginação server-side (stub temporário)
export function InscricoesClient({ initialData = [], activeEditionId: _activeEditionId }: { initialData?: Participant[]; activeEditionId?: string }) {
  const [search, setSearch] = useState('')
  const [membershipFilter, setMembershipFilter] = useState<TicketMembership | 'ALL'>('ALL')

  const filtered = useMemo(() => {
    return initialData.filter(p => {
      if (membershipFilter !== 'ALL' && p.ticket_membership !== membershipFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !p.full_name.toLowerCase().includes(q) &&
          !p.email.toLowerCase().includes(q) &&
          !(p.company ?? '').toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [initialData, search, membershipFilter])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Buscar por nome, e-mail ou empresa..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={membershipFilter} onValueChange={v => setMembershipFilter(v as TicketMembership | 'ALL')}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MEMBERSHIP_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="self-center text-sm text-muted-foreground">
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="font-semibold">Nome</TableHead>
              <TableHead className="font-semibold">Empresa</TableHead>
              <TableHead className="font-semibold">Tipo</TableHead>
              <TableHead className="font-semibold text-right">Valor</TableHead>
              <TableHead className="font-semibold">Inscrição</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                  Nenhum participante encontrado.
                </TableCell>
              </TableRow>
            )}
            {filtered.map(p => (
              <TableRow key={p.id} className="hover:bg-muted/30">
                <TableCell>
                  <div>
                    <p className="font-medium">{p.full_name}</p>
                    <p className="text-xs text-muted-foreground">{p.email}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{p.company ?? '—'}</TableCell>
                <TableCell><TicketBadge type={p.ticket_membership} /></TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">
                  {p.ticket_value != null
                    ? `R$ ${Number(p.ticket_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    : '—'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {p.created_at
                    ? format(new Date(p.created_at), "dd/MM/yy HH:mm", { locale: ptBR })
                    : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
