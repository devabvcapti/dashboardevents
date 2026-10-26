'use client'

import { useMemo, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { COUPON_CATEGORY_LABELS } from '@/lib/data'
import type { CuponSummaryRow, CouponCategory } from '@/lib/data'
import { CouponCategorySelect } from './coupon-category-select'

const formatBRL = (v: number) =>
  `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

type CategoryFilter = 'ALL' | CouponCategory | 'SEM_CATEGORIA'

function categoryLabel(c: string): string {
  if (c === 'SEM_CATEGORIA') return 'Sem Categoria'
  return COUPON_CATEGORY_LABELS[c as CouponCategory]
}

interface Props {
  editionId: string
  isAdmin: boolean
  byCoupon: CuponSummaryRow[]
  totalParticipants: number
  avgTicketNoCoupon: number | null
  offlineTotalPaid: number
  hasOfflinePayments: boolean
}

export function CuponsAnalysis({
  editionId, isAdmin, byCoupon, totalParticipants, avgTicketNoCoupon, offlineTotalPaid, hasOfflinePayments,
}: Props) {
  const [category, setCategory] = useState<CategoryFilter>('ALL')

  const categoryOptions = useMemo(() => {
    const present = new Set<string>(byCoupon.map(r => r.category ?? 'SEM_CATEGORIA'))
    return Array.from(present).sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b)))
  }, [byCoupon])

  const filtered = category === 'ALL' ? byCoupon : byCoupon.filter(r => (r.category ?? 'SEM_CATEGORIA') === category)
  const isOfflineFilter = category === 'PAGAMENTO_OFFLINE'

  const totalWithCoupon = filtered.reduce((s, r) => s + r.count, 0)
  const uniqueCoupons = filtered.length
  const pct = totalParticipants > 0 ? Math.round((totalWithCoupon / totalParticipants) * 100) : 0
  // Pagamento offline não é "desconto" (avg_ticket ali é o valor pago, não um
  // preço promocional) — sempre excluído dessa estimativa, mesmo na visão
  // "Todas as categorias", senão infla/distorce o número sem sentido.
  const discountEstimate = avgTicketNoCoupon !== null
    ? filtered
        .filter(r => r.category !== 'PAGAMENTO_OFFLINE')
        .reduce((s, r) => s + (r.avg_ticket !== null ? Math.max(0, avgTicketNoCoupon - r.avg_ticket) * r.count : 0), 0)
    : null
  const offlineRevenueInFilter = filtered
    .filter(r => r.category === 'PAGAMENTO_OFFLINE')
    .reduce((s, r) => s + (r.avg_ticket ?? 0) * r.count, 0)

  const showOfflineCard = category === 'ALL' && hasOfflinePayments

  return (
    <div className="space-y-6">
      {/* KPIs — refletem o filtro de categoria abaixo */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${showOfflineCard ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
        <KpiCard title="Usaram Cupom" value={totalWithCoupon.toLocaleString('pt-BR')} />
        <KpiCard title="Cupons Únicos" value={uniqueCoupons.toLocaleString('pt-BR')} />
        <KpiCard title="% com Cupom" value={`${pct}%`} />
        {isOfflineFilter ? (
          <KpiCard
            title="Receita Offline Registrada"
            value={formatBRL(offlineRevenueInFilter)}
            sub="soma dos valores lançados manualmente"
          />
        ) : (
          <KpiCard
            title="Desconto Total Concedido"
            value={discountEstimate !== null ? formatBRL(discountEstimate) : '—'}
            sub="estimativa vs. preço sem cupom"
          />
        )}
        {showOfflineCard && (
          <KpiCard
            title="Receita Offline Registrada"
            value={formatBRL(offlineTotalPaid)}
            sub="soma dos valores lançados manualmente"
          />
        )}
      </div>

      {/* Tabela por cupom, com filtro de categoria */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-[10px] font-mono tracking-[0.18em] text-muted-foreground uppercase">
              Por Código de Cupom
            </p>
            {avgTicketNoCoupon !== null && (
              <p className="text-[11px] font-mono text-muted-foreground/60 mt-1">
                Ticket médio sem cupom: {formatBRL(avgTicketNoCoupon)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Categoria</label>
            <Select value={category} onValueChange={v => setCategory(v as CategoryFilter)}>
              <SelectTrigger size="sm" className="h-8 text-xs w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as categorias</SelectItem>
                {categoryOptions.map(c => (
                  <SelectItem key={c} value={c}>{categoryLabel(c)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Nenhum cupom nessa categoria.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 text-[10px] font-mono tracking-widest text-muted-foreground uppercase">Código</th>
                <th className="text-left px-5 py-3 text-[10px] font-mono tracking-widest text-muted-foreground uppercase">Categoria</th>
                <th className="text-right px-5 py-3 text-[10px] font-mono tracking-widest text-muted-foreground uppercase">Usos</th>
                <th className="text-right px-5 py-3 text-[10px] font-mono tracking-widest text-muted-foreground uppercase">Ticket Médio</th>
                <th className="text-right px-5 py-3 text-[10px] font-mono tracking-widest text-muted-foreground uppercase">Desconto Est.</th>
                <th className="text-left px-5 py-3 text-[10px] font-mono tracking-widest text-muted-foreground uppercase">Participantes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors align-top">
                  <td className="px-5 py-3 font-mono font-medium text-foreground">
                    {row.coupon_code}
                  </td>
                  <td className="px-5 py-3">
                    <CouponCategorySelect
                      editionId={editionId}
                      couponCode={row.coupon_code}
                      category={row.category}
                      isAdmin={isAdmin}
                    />
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums">
                    {row.count}
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums text-muted-foreground">
                    {row.avg_ticket !== null ? formatBRL(row.avg_ticket) : '—'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {row.discount_pct_estimate !== null ? (
                      <span className={`inline-block font-mono text-[11px] tabular-nums px-2 py-0.5 rounded border ${
                        row.discount_pct_estimate > 0
                          ? 'text-emerald-700 border-emerald-200 bg-emerald-50'
                          : 'text-muted-foreground border-border bg-muted/30'
                      }`}>
                        {row.discount_pct_estimate > 0 ? `-${row.discount_pct_estimate}%` : `${row.discount_pct_estimate}%`}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-3 text-[11px] font-mono text-muted-foreground/70 max-w-sm">
                    {row.participants.length > 0 ? (
                      <details className="group">
                        <summary className="cursor-pointer list-none marker:hidden truncate">
                          {row.participants.slice(0, 2).map(p => p.name).join(', ')}
                          {row.participants.length > 2 && (
                            <span className="text-muted-foreground/40"> +{row.participants.length - 2}</span>
                          )}
                        </summary>
                        <ul className="mt-2 space-y-1 pl-3 border-l border-border">
                          {row.participants.map((p, j) => (
                            <li key={j}>
                              {p.name}
                              {p.company && <span className="text-muted-foreground/40"> — {p.company}</span>}
                              {p.segment && <span className="text-muted-foreground/30"> ({p.segment})</span>}
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function KpiCard({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="border border-border rounded-lg bg-card p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary" />
      <p className="text-[10px] font-mono tracking-[0.20em] text-muted-foreground uppercase mb-3">{title}</p>
      <p className="font-display tabular-nums text-4xl text-foreground leading-none">{value}</p>
      {sub && <p className="text-[10px] font-mono text-muted-foreground/50 mt-2">{sub}</p>}
    </div>
  )
}
