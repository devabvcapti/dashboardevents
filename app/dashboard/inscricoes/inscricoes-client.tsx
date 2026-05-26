'use client'

import { useCallback, useRef, useState, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { TicketBadge } from '@/components/status-badge'
import { ChevronLeft, ChevronRight, Download, ArrowUpDown } from 'lucide-react'
import type { Participant, TicketMembership, CompanySegment } from '@/lib/database.types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Filters {
  search: string
  membership: TicketMembership | '' | string
  segment: CompanySegment | '' | string
  state: string
  minValue: string
  maxValue: string
  sort: string
  dir: 'asc' | 'desc'
}

interface Props {
  participants: Participant[]
  totalCount: number
  currentPage: number
  pageSize: 25 | 50 | 100
  filters: Filters
}

const SEGMENT_LABELS: Record<string, string> = {
  GP: 'Gestora de PE/VC',
  LP: 'Investidor (LP)',
  FUNDO: 'Fundo de Pensão',
  CORPORATIVO: 'Corporativo',
  GOVERNO: 'Governo',
  ACADEMIA: 'Academia',
  OUTRO: 'Outro',
}

const SORTABLE_COLUMNS: Array<{ key: string; label: string }> = [
  { key: 'full_name', label: 'Nome' },
  { key: 'company', label: 'Empresa' },
  { key: 'ticket_membership', label: 'Tipo' },
  { key: 'ticket_value', label: 'Valor' },
  { key: 'created_at', label: 'Inscrição' },
]

export function InscricoesClient({ participants, totalCount, currentPage, pageSize, filters }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [searchLocal, setSearchLocal] = useState(filters.search)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const pushParams = useCallback((updates: Record<string, string | null>, resetPage = true) => {
    const next = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === '') next.delete(k)
      else next.set(k, v)
    }
    if (resetPage) next.delete('page')
    startTransition(() => router.push(`${pathname}?${next.toString()}`))
  }, [router, pathname, searchParams])

  function onSearchChange(value: string) {
    setSearchLocal(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      pushParams({ search: value || null })
    }, 400)
  }

  function toggleSort(col: string) {
    const isCurrent = filters.sort === col
    const nextDir: 'asc' | 'desc' = isCurrent && filters.dir === 'desc' ? 'asc' : 'desc'
    pushParams({ sort: col, dir: nextDir }, false)
  }

  function buildExportUrl(): string {
    const next = new URLSearchParams(searchParams.toString())
    next.delete('page')
    next.delete('page_size')
    return `/api/export/participants?${next.toString()}`
  }

  function goToPage(n: number) {
    const target = Math.min(Math.max(1, n), totalPages)
    const next = new URLSearchParams(searchParams.toString())
    if (target === 1) next.delete('page')
    else next.set('page', String(target))
    startTransition(() => router.push(`${pathname}?${next.toString()}`))
  }

  return (
    <div className="space-y-4">
      {/* Linha de controles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <Input
          placeholder="Buscar por nome, e-mail ou empresa…"
          value={searchLocal}
          onChange={e => onSearchChange(e.target.value)}
          className="lg:col-span-2"
        />
        <Select value={filters.membership || 'ALL'} onValueChange={v => pushParams({ membership: v === 'ALL' ? null : v })}>
          <SelectTrigger><SelectValue placeholder="Tipo de ingresso" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os ingressos</SelectItem>
            <SelectItem value="MEMBRO">Membro</SelectItem>
            <SelectItem value="NAO_MEMBRO">Não Membro</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.segment || 'ALL'} onValueChange={v => pushParams({ segment: v === 'ALL' ? null : v })}>
          <SelectTrigger><SelectValue placeholder="Tipo de empresa" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os tipos</SelectItem>
            {Object.entries(SEGMENT_LABELS).map(([k, label]) => (
              <SelectItem key={k} value={k}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Input
          placeholder="Estado (UF, ex: SP)"
          value={filters.state}
          maxLength={2}
          onChange={e => {
            const s = e.target.value.toUpperCase()
            pushParams({ state: /^[A-Z]{0,2}$/.test(s) ? (s.length === 2 ? s : null) : null })
          }}
        />
        <Input
          placeholder="Valor mínimo (R$)"
          type="number"
          inputMode="decimal"
          value={filters.minValue}
          onChange={e => pushParams({ min_value: e.target.value || null })}
        />
        <Input
          placeholder="Valor máximo (R$)"
          type="number"
          inputMode="decimal"
          value={filters.maxValue}
          onChange={e => pushParams({ max_value: e.target.value || null })}
        />
        <Select value={String(pageSize)} onValueChange={v => pushParams({ page_size: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="25">25 por página</SelectItem>
            <SelectItem value="50">50 por página</SelectItem>
            <SelectItem value="100">100 por página</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs font-mono text-muted-foreground">
          {totalCount.toLocaleString('pt-BR')} resultado{totalCount !== 1 ? 's' : ''} · página {currentPage} de {totalPages}
        </p>
        <a href={buildExportUrl()} download>
          <Button variant="outline" size="sm" type="button">
            <Download className="w-4 h-4 mr-2" />
            Exportar (.xlsx)
          </Button>
        </a>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              {SORTABLE_COLUMNS.map(col => {
                const isActive = filters.sort === col.key
                return (
                  <TableHead key={col.key} className="font-semibold">
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      {col.label}
                      <ArrowUpDown className={`w-3 h-3 ${isActive ? 'text-primary' : 'text-muted-foreground/40'}`} />
                      {isActive && <span className="text-[9px] font-mono text-primary">{filters.dir}</span>}
                    </button>
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {participants.length === 0 && (
              <TableRow>
                <TableCell colSpan={SORTABLE_COLUMNS.length} className="text-center text-muted-foreground py-12">
                  Nenhum participante encontrado.
                </TableCell>
              </TableRow>
            )}
            {participants.map(p => (
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
                    ? format(new Date(p.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })
                    : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          type="button"
          disabled={currentPage <= 1}
          onClick={() => goToPage(currentPage - 1)}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Anterior
        </Button>
        <p className="text-xs font-mono text-muted-foreground">
          {currentPage} / {totalPages}
        </p>
        <Button
          variant="outline"
          size="sm"
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => goToPage(currentPage + 1)}
        >
          Próxima
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}
