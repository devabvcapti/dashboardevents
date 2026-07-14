'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { OfflinePaymentGroup } from '@/lib/data'

const formatBRL = (v: number) =>
  `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

export function OfflinePaymentsTable({ groups }: { groups: OfflinePaymentGroup[] }) {
  const router = useRouter()
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [errorId, setErrorId] = useState<string | null>(null)

  async function handleSave(participantId: string) {
    const raw = drafts[participantId]
    const parsed = raw !== undefined && raw.trim() !== '' ? Number(raw.replace(',', '.')) : null
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) {
      setErrorId(participantId)
      return
    }
    setSavingId(participantId)
    setErrorId(null)
    try {
      const res = await fetch('/api/participants/valor-pago', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, valorPagoManual: parsed }),
      })
      if (!res.ok) {
        setErrorId(participantId)
        return
      }
      router.refresh()
    } catch {
      setErrorId(participantId)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <p className="text-[10px] font-mono tracking-[0.18em] text-muted-foreground uppercase">
          Pagamentos Offline
        </p>
        <p className="text-[11px] font-mono text-muted-foreground/60 mt-1">
          Cupons usados para registrar pagamentos via boleto fora do gateway. O valor não é desconto — informe manualmente o valor real pago por cada participante.
        </p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-left px-5 py-3 text-[10px] font-mono tracking-widest text-muted-foreground uppercase">Cupom</th>
            <th className="text-left px-5 py-3 text-[10px] font-mono tracking-widest text-muted-foreground uppercase">Participante</th>
            <th className="text-left px-5 py-3 text-[10px] font-mono tracking-widest text-muted-foreground uppercase">Empresa</th>
            <th className="text-right px-5 py-3 text-[10px] font-mono tracking-widest text-muted-foreground uppercase">Valor Pago</th>
            <th className="text-right px-5 py-3 text-[10px] font-mono tracking-widest text-muted-foreground uppercase"></th>
          </tr>
        </thead>
        <tbody>
          {groups.map(group => (
            group.participants.map((p, i) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                {i === 0 && (
                  <td className="px-5 py-3 font-mono font-medium text-foreground align-top" rowSpan={group.participants.length}>
                    {group.coupon_code}
                  </td>
                )}
                <td className="px-5 py-3 text-foreground/90">{p.name}</td>
                <td className="px-5 py-3 text-[11px] font-mono text-muted-foreground/70">{p.company ?? '—'}</td>
                <td className="px-5 py-3">
                  <div className="flex justify-end">
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder={formatBRL(p.valor_efetivo)}
                      defaultValue={p.valor_pago_manual !== null ? String(p.valor_pago_manual) : ''}
                      onChange={e => setDrafts(d => ({ ...d, [p.id]: e.target.value }))}
                      className="h-8 w-32 text-right font-mono text-sm"
                    />
                  </div>
                  {errorId === p.id && (
                    <p className="text-[10px] text-red-600 mt-1 text-right">Valor inválido</p>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={savingId === p.id}
                    onClick={() => handleSave(p.id)}
                  >
                    {savingId === p.id ? 'Salvando…' : 'Salvar'}
                  </Button>
                </td>
              </tr>
            ))
          ))}
        </tbody>
      </table>
    </div>
  )
}
