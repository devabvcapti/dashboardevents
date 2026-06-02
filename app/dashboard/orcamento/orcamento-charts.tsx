'use client'

import { useState, useRef } from 'react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, LabelList, ReferenceLine,
} from 'recharts'
import type { BudgetSummary, BudgetCategoryGroup } from '@/lib/data'

const formatBRL = (v: number) =>
  `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

const STATUS_COLOR = { ok: '#00a99d', warning: '#f59e0b', over: '#ef4444' } as const
const STATUS_LABEL = { ok: 'Dentro do orçamento', warning: 'Atenção (≥ 90%)', over: 'Acima do orçado' } as const

const TOOLTIP_STYLE = {
  backgroundColor: '#ffffff',
  border: '1px solid oklch(0.89 0.010 240)',
  borderRadius: '6px',
  color: '#112468',
  fontSize: '12px',
  fontFamily: 'var(--font-ibm-mono)',
  boxShadow: '0 4px 16px rgba(17,36,104,0.08)',
}

interface Props {
  summary: BudgetSummary | null
  editionId: string
}

export function OrcamentoCharts({ summary, editionId }: Props) {
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadMsg(null)
    const form = new FormData()
    form.append('file', file)
    form.append('editionId', editionId)
    try {
      const res = await fetch('/api/import/budget', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro desconhecido')
      setUploadMsg({ type: 'ok', text: `${json.inserted} linhas importadas com sucesso.` })
      setTimeout(() => window.location.reload(), 1200)
    } catch (err) {
      setUploadMsg({ type: 'error', text: err instanceof Error ? err.message : 'Falha na importação.' })
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Upload bar ── */}
      <div className="flex items-center gap-4 flex-wrap">
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUpload} />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {uploading ? 'Importando…' : '↑ Importar planilha de orçamento'}
        </button>
        <p className="text-[11px] font-mono text-muted-foreground/60">
          Colunas esperadas: Categoria · Subcategoria (opcional) · Orçado · Realizado
        </p>
        {uploadMsg && (
          <span className={`text-xs font-mono px-3 py-1 rounded border ${
            uploadMsg.type === 'ok'
              ? 'text-emerald-700 border-emerald-200 bg-emerald-50'
              : 'text-red-600 border-red-200 bg-red-50'
          }`}>
            {uploadMsg.text}
          </span>
        )}
      </div>

      {/* ── Empty state ── */}
      {!summary && (
        <div className="space-y-6">
          <div className="border border-dashed border-border rounded-lg p-12 text-center">
            <p className="text-sm text-muted-foreground">Nenhum orçamento importado para esta edição.</p>
            <p className="text-xs font-mono text-muted-foreground/50 mt-2">
              Clique em "Importar planilha" acima para começar.
            </p>
          </div>
          <TemplateHint />
        </div>
      )}

      {/* ── Dashboard ── */}
      {summary && <BudgetDashboard summary={summary} />}
    </div>
  )
}

function BudgetDashboard({ summary }: { summary: BudgetSummary }) {
  const { totalBudgeted, totalRealized, balance, executionPct, byCategory } = summary

  const gaugeColor = executionPct > 100 ? '#ef4444' : executionPct >= 90 ? '#f59e0b' : '#00a99d'
  const gaugeData = [
    { name: 'Realizado', value: Math.min(executionPct, 100) },
    { name: 'Restante', value: Math.max(0, 100 - executionPct) },
  ]

  const barData = [...byCategory]
    .sort((a, b) => b.variationPct - a.variationPct)
    .map(g => ({
      name: g.category.length > 20 ? g.category.slice(0, 18) + '…' : g.category,
      fullName: g.category,
      pct: g.variationPct,
      color: STATUS_COLOR[g.status],
    }))

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard title="Total Orçado" value={formatBRL(totalBudgeted)} accent="default" />
        <KpiCard
          title="Total Realizado"
          value={formatBRL(totalRealized)}
          accent={executionPct > 100 ? 'red' : executionPct >= 90 ? 'amber' : 'teal'}
        />
        <KpiCard
          title="Saldo"
          value={formatBRL(Math.abs(balance))}
          sub={balance >= 0 ? 'economia' : 'estouro'}
          accent={balance >= 0 ? 'teal' : 'red'}
        />
        <KpiCard
          title="% Executado"
          value={`${executionPct}%`}
          sub={`de ${formatBRL(totalBudgeted)}`}
          accent={executionPct > 100 ? 'red' : executionPct >= 90 ? 'amber' : 'teal'}
        />
      </div>

      {/* Gauge + Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-5 shadow-sm flex flex-col items-center">
          <p className="text-[10px] font-mono tracking-[0.20em] text-muted-foreground uppercase mb-2 self-start">
            Execução Orçamentária
          </p>
          <div className="relative w-full max-w-[220px] mx-auto">
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie
                  data={gaugeData}
                  cx="50%" cy="100%"
                  startAngle={180} endAngle={0}
                  innerRadius={70} outerRadius={100}
                  paddingAngle={0} dataKey="value"
                >
                  <Cell fill={gaugeColor} stroke="transparent" />
                  <Cell fill="oklch(0.93 0.01 240)" stroke="transparent" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute bottom-0 inset-x-0 flex flex-col items-center pointer-events-none">
              <p className="font-display text-4xl leading-none" style={{ color: gaugeColor }}>{executionPct}%</p>
              <p className="text-[10px] font-mono text-muted-foreground mt-1">do orçamento total</p>
            </div>
          </div>
          <div className="mt-6 flex gap-4 flex-wrap justify-center">
            {(Object.entries(STATUS_LABEL) as [keyof typeof STATUS_LABEL, string][]).map(([k, label]) => (
              <div key={k} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLOR[k] }} />
                <span className="text-[10px] font-mono text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
          <p className="text-[10px] font-mono tracking-[0.20em] text-muted-foreground uppercase mb-4">
            % Realizado por Categoria
          </p>
          <ResponsiveContainer width="100%" height={Math.max(180, barData.length * 38)}>
            <BarChart layout="vertical" data={barData} margin={{ top: 0, right: 56, left: 8, bottom: 0 }}>
              <XAxis type="number" hide domain={[0, Math.max(120, ...barData.map(d => d.pct))]} />
              <YAxis type="category" dataKey="name" width={120}
                tick={{ fontSize: 11, fontFamily: 'var(--font-ibm-mono)', fill: 'oklch(0.52 0.04 254)' }}
                axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v, _, props) => {
                  const g = byCategory.find(g => g.category === props.payload?.fullName)
                  return [`${v}%  —  ${formatBRL(g?.realized ?? 0)}`, 'Realizado']
                }}
              />
              <ReferenceLine x={100} stroke="#112468" strokeDasharray="3 3" strokeOpacity={0.35} />
              <Bar dataKey="pct" radius={[0, 3, 3, 0]} maxBarSize={22}>
                {barData.map((d, i) => <Cell key={i} fill={d.color} />)}
                <LabelList dataKey="pct" position="right"
                  formatter={(v: unknown) => `${v}%`}
                  style={{ fontSize: 11, fontFamily: 'var(--font-ibm-mono)', fill: 'oklch(0.52 0.04 254)' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-[10px] font-mono tracking-[0.18em] text-muted-foreground uppercase">
            Detalhamento por Item
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Categoria', 'Subcategoria', 'Orçado', 'Realizado', 'Saldo', '%', ''].map((h, i) => (
                  <th key={i} className={`px-5 py-3 text-[10px] font-mono tracking-widest text-muted-foreground uppercase ${i >= 2 && i <= 5 ? 'text-right' : 'text-left'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byCategory.map(group => <CategoryRows key={group.category} group={group} />)}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/20 font-semibold">
                <td className="px-5 py-3 text-sm" colSpan={2}>Total</td>
                <td className="px-5 py-3 text-right font-mono tabular-nums text-sm">{formatBRL(totalBudgeted)}</td>
                <td className="px-5 py-3 text-right font-mono tabular-nums text-sm">{formatBRL(totalRealized)}</td>
                <td className={`px-5 py-3 text-right font-mono tabular-nums text-sm ${balance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {balance >= 0 ? '' : '−'}{formatBRL(Math.abs(balance))}
                </td>
                <td className="px-5 py-3 text-right font-mono tabular-nums text-sm">{executionPct}%</td>
                <td className="px-5 py-3">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: gaugeColor }} />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

function CategoryRows({ group }: { group: BudgetCategoryGroup }) {
  const [open, setOpen] = useState(false)
  const hasChildren = group.items.some(i => i.subcategory)
  const balance = group.budgeted - group.realized

  return (
    <>
      <tr
        className={`border-b border-border hover:bg-muted/20 transition-colors ${hasChildren ? 'cursor-pointer select-none' : ''}`}
        onClick={() => hasChildren && setOpen(o => !o)}
      >
        <td className="px-5 py-3 font-medium text-sm">
          <span className="flex items-center gap-2">
            {hasChildren && (
              <span className="text-[10px] font-mono text-muted-foreground/40">{open ? '▼' : '▶'}</span>
            )}
            {group.category}
          </span>
        </td>
        <td className="px-5 py-3 text-muted-foreground text-xs" />
        <td className="px-5 py-3 text-right font-mono tabular-nums">{formatBRL(group.budgeted)}</td>
        <td className="px-5 py-3 text-right font-mono tabular-nums">{formatBRL(group.realized)}</td>
        <td className={`px-5 py-3 text-right font-mono tabular-nums ${balance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
          {balance >= 0 ? '' : '−'}{formatBRL(Math.abs(balance))}
        </td>
        <td className="px-5 py-3 text-right font-mono tabular-nums">{group.variationPct}%</td>
        <td className="px-5 py-3"><TrafficLight status={group.status} /></td>
      </tr>
      {open && group.items.map((item, i) => {
        const ib = item.budgeted - item.realized
        return (
          <tr key={i} className="border-b border-border bg-muted/10">
            <td className="px-5 py-2 pl-10 text-xs text-muted-foreground" />
            <td className="px-5 py-2 text-xs text-muted-foreground">{item.subcategory ?? '—'}</td>
            <td className="px-5 py-2 text-right font-mono tabular-nums text-xs">{formatBRL(item.budgeted)}</td>
            <td className="px-5 py-2 text-right font-mono tabular-nums text-xs">{formatBRL(item.realized)}</td>
            <td className={`px-5 py-2 text-right font-mono tabular-nums text-xs ${ib >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {ib >= 0 ? '' : '−'}{formatBRL(Math.abs(ib))}
            </td>
            <td className="px-5 py-2 text-right font-mono tabular-nums text-xs">{item.variationPct}%</td>
            <td className="px-5 py-2"><TrafficLight status={item.status} /></td>
          </tr>
        )
      })}
    </>
  )
}

function TrafficLight({ status }: { status: 'ok' | 'warning' | 'over' }) {
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full"
      style={{ backgroundColor: STATUS_COLOR[status] }}
      title={STATUS_LABEL[status]}
    />
  )
}

function KpiCard({ title, value, sub, accent = 'default' }: {
  title: string; value: string; sub?: string
  accent?: 'default' | 'teal' | 'amber' | 'red'
}) {
  const bar = { default: 'bg-border', teal: 'bg-primary', amber: 'bg-amber-400', red: 'bg-red-500' }[accent]
  return (
    <div className="relative bg-card rounded-lg px-5 pt-5 pb-5 overflow-hidden border border-border hover:border-primary/30 transition-all duration-200">
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${bar}`} />
      <p className="text-[10px] font-mono tracking-[0.20em] text-muted-foreground uppercase mb-3">{title}</p>
      <p className="font-display tabular-nums text-3xl text-foreground leading-none">{value}</p>
      {sub && <p className="text-[10px] font-mono text-muted-foreground/50 mt-2">{sub}</p>}
    </div>
  )
}

function TemplateHint() {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <p className="text-[10px] font-mono tracking-[0.18em] text-muted-foreground uppercase mb-3">
        Modelo de planilha esperado
      </p>
      <table className="w-full text-xs font-mono border-collapse">
        <thead>
          <tr className="bg-muted/40">
            {['Categoria', 'Subcategoria', 'Orçado', 'Realizado'].map(h => (
              <th key={h} className="text-left px-3 py-2 border border-border font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="text-muted-foreground">
          {[
            ['Infraestrutura', 'Venue / Espaço', '150000', '148000'],
            ['Infraestrutura', 'Palco e A/V', '80000', '85000'],
            ['Catering', 'Almoço', '50000', '47200'],
            ['Marketing', 'Material gráfico', '30000', '28000'],
            ['Palestrantes', 'Honorários', '60000', '55000'],
          ].map((row, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-1.5 border border-border">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
