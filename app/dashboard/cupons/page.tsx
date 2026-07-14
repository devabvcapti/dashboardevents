import { requireAuth } from '@/lib/auth'
import { getCuponsSummary } from '@/lib/data'
import { getActiveEditionId } from '@/lib/edition-cookie'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Cupons — Dashboard ABVCAP' }

const formatBRL = (v: number) =>
  `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

export default async function CuponsPage() {
  await requireAuth()

  let stats: Awaited<ReturnType<typeof getCuponsSummary>> | null = null
  let loadError = false

  try {
    const editionId = await getActiveEditionId()
    stats = await getCuponsSummary(editionId)
  } catch {
    loadError = true
  }

  const pct = stats && stats.total_participants > 0
    ? Math.round((stats.total_with_coupon / stats.total_participants) * 100)
    : 0

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-end justify-between border-b border-border pb-6">
        <div>
          <p className="text-[10px] font-mono tracking-[0.22em] text-muted-foreground uppercase mb-1">
            Análise
          </p>
          <h1 className="font-display text-3xl text-foreground leading-none">Cupons</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Utilização de cupons de desconto por participantes e empresas.
          </p>
        </div>
        {stats && (
          <p className="text-[11px] font-mono text-muted-foreground/60 pb-0.5">
            {stats.total_participants.toLocaleString('pt-BR')} inscritos no total
          </p>
        )}
      </div>

      {loadError && (
        <div className="border border-red-500/20 bg-red-500/5 rounded-lg p-6 text-sm text-red-600">
          Falha ao carregar dados de cupons. Tente recarregar a página.
        </div>
      )}

      {!loadError && (!stats || stats.total_participants === 0) && (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-sm text-muted-foreground">Sem dados de participantes nesta edição.</p>
        </div>
      )}

      {!loadError && stats && stats.total_participants > 0 && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard title="Usaram Cupom" value={stats.total_with_coupon.toLocaleString('pt-BR')} />
            <KpiCard title="Cupons Únicos" value={stats.unique_coupons.toLocaleString('pt-BR')} />
            <KpiCard title="% com Cupom" value={`${pct}%`} />
            <KpiCard
              title="Desconto Total Concedido"
              value={stats.total_discount_estimate !== null ? formatBRL(stats.total_discount_estimate) : '—'}
              sub="estimativa vs. preço sem cupom"
            />
          </div>

          {stats.total_with_coupon === 0 ? (
            <div className="border border-dashed border-border rounded-lg p-12 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhum participante com cupom detectado. Verifique se a coluna de cupom está mapeada na importação.
              </p>
            </div>
          ) : (
            <>
              {/* Tabela por cupom */}
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <p className="text-[10px] font-mono tracking-[0.18em] text-muted-foreground uppercase">
                    Por Código de Cupom
                  </p>
                  {stats.avg_ticket_no_coupon !== null && (
                    <p className="text-[11px] font-mono text-muted-foreground/60 mt-1">
                      Ticket médio sem cupom: {formatBRL(stats.avg_ticket_no_coupon)}
                    </p>
                  )}
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-5 py-3 text-[10px] font-mono tracking-widest text-muted-foreground uppercase">Código</th>
                      <th className="text-right px-5 py-3 text-[10px] font-mono tracking-widest text-muted-foreground uppercase">Usos</th>
                      <th className="text-right px-5 py-3 text-[10px] font-mono tracking-widest text-muted-foreground uppercase">Ticket Médio</th>
                      <th className="text-right px-5 py-3 text-[10px] font-mono tracking-widest text-muted-foreground uppercase">Desconto Est.</th>
                      <th className="text-left px-5 py-3 text-[10px] font-mono tracking-widest text-muted-foreground uppercase">Participantes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.by_coupon.map((row, i) => (
                      <tr key={i} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors align-top">
                        <td className="px-5 py-3 font-mono font-medium text-foreground">
                          {row.coupon_code}
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
              </div>

              {/* Ranking de empresas */}
              {stats.top_companies.length > 0 && (
                <div className="bg-card border border-border rounded-lg p-5">
                  <p className="text-[10px] font-mono tracking-[0.18em] text-muted-foreground uppercase mb-4">
                    Empresas que Mais Utilizaram Cupons
                  </p>
                  <div className="space-y-3">
                    {stats.top_companies.map((c, i) => {
                      const maxCount = stats.top_companies[0]?.count ?? 1
                      return (
                        <div key={i} className="flex items-center gap-4">
                          <span className="text-[10px] font-mono text-muted-foreground/40 w-4 shrink-0 tabular-nums">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-1.5">
                              <span className="text-sm text-foreground/80 truncate">{c.company}</span>
                              <span className="text-[11px] font-mono text-muted-foreground ml-3 shrink-0">{c.count}</span>
                            </div>
                            <div className="h-1 bg-border rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary/70 transition-all duration-500"
                                style={{ width: `${Math.round((c.count / maxCount) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
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
