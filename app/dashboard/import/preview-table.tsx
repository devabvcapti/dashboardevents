'use client'

import { Button } from '@/components/ui/button'
import type { PreviewResponse } from '@/lib/import/types'

export function PreviewTable({
  preview,
  onBack,
  onConfirm,
}: {
  preview: PreviewResponse
  onBack: () => void
  onConfirm: () => void
}) {
  const { validRows, errors } = preview.validation
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Prévia da importação</p>
          <p className="text-xs text-muted-foreground">
            <span className="text-emerald-600">{validRows.length} linhas válidas</span>
            {' · '}
            <span className="text-red-600">{errors.length} erros</span>
            {' — '}arquivo {preview.parseResult.filename}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>← Voltar ao mapeamento</Button>
          <Button onClick={onConfirm} disabled={validRows.length === 0}>
            Confirmar import ({validRows.length} linhas)
          </Button>
        </div>
      </div>

      {errors.length > 0 && (
        <details className="border border-red-500/30 bg-red-500/5 rounded-lg p-3">
          <summary className="text-sm font-medium text-red-700 cursor-pointer">
            {errors.length} erros encontrados (clique para expandir)
          </summary>
          <ul className="mt-3 space-y-1 text-xs font-mono max-h-60 overflow-y-auto">
            {errors.slice(0, 200).map((e, i) => (
              <li key={i}>
                Linha {e.excel_row}{e.field ? ` · ${e.field}` : ''}: {e.message}
              </li>
            ))}
            {errors.length > 200 && (
              <li className="text-muted-foreground">… e mais {errors.length - 200} erros.</li>
            )}
          </ul>
        </details>
      )}

      <div className="border border-border rounded-lg overflow-x-auto max-h-[60vh]">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-3 py-2">Linha</th>
              <th className="text-left px-3 py-2">Nome</th>
              <th className="text-left px-3 py-2">Email</th>
              <th className="text-left px-3 py-2">Empresa</th>
              <th className="text-left px-3 py-2">Segmento</th>
              <th className="text-left px-3 py-2">Membro</th>
              <th className="text-right px-3 py-2">Valor</th>
            </tr>
          </thead>
          <tbody>
            {validRows.slice(0, 100).map((r) => (
              <tr key={r.excel_row} className="border-t border-border">
                <td className="px-3 py-1.5 font-mono text-xs">{r.excel_row}</td>
                <td className="px-3 py-1.5">{r.full_name}</td>
                <td className="px-3 py-1.5 text-muted-foreground">{r.email}</td>
                <td className="px-3 py-1.5">{r.company ?? '—'}</td>
                <td className="px-3 py-1.5">{r.company_segment_normalized ?? '—'}</td>
                <td className="px-3 py-1.5">{r.ticket_membership}</td>
                <td className="px-3 py-1.5 text-right">
                  {r.ticket_value !== null
                    ? r.ticket_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                    : '—'}
                </td>
              </tr>
            ))}
            {validRows.length > 100 && (
              <tr><td colSpan={7} className="px-3 py-2 text-center text-muted-foreground text-xs">
                Mostrando primeiras 100 de {validRows.length} linhas.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
