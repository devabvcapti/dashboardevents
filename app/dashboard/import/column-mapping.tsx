'use client'

import { Button } from '@/components/ui/button'
import type { ColumnMapping, ParseResult, TargetField } from '@/lib/import/types'

const TARGET_OPTIONS: Array<{ value: TargetField | 'ignore'; label: string }> = [
  { value: 'ignore', label: '— Ignorar —' },
  { value: 'ticket_id', label: 'ID do ingresso' },
  { value: 'full_name', label: 'Nome completo' },
  { value: 'email', label: 'Email' },
  { value: 'company', label: 'Empresa' },
  { value: 'job_title', label: 'Cargo' },
  { value: 'cpf', label: 'CPF/CNPJ' },
  { value: 'phone', label: 'Telefone' },
  { value: 'company_segment_raw', label: 'Segmento (texto bruto)' },
  { value: 'topics_of_interest', label: 'Temas de interesse (multi-select)' },
  { value: 'interested_in_events', label: 'Eventos de interesse (multi-select)' },
  { value: 'preferred_channels', label: 'Canais preferidos (multi-select)' },
  { value: 'content_interests', label: 'Conteúdos de interesse (multi-select)' },
  { value: 'dietary_restrictions', label: 'Restrição alimentar (Sim/Não)' },
  { value: 'dietary_details', label: 'Detalhe da restrição' },
  { value: 'ticket_membership', label: 'Membro ativo (MEMBRO/NAO_MEMBRO)' },
  { value: 'is_company_member', label: 'Empresa é membro' },
  { value: 'ticket_name', label: 'Nome do ingresso' },
  { value: 'ticket_value', label: 'Preço do ingresso' },
  { value: 'payment_status', label: 'Status do pagamento' },
]

export function ColumnMappingUI({
  parseResult,
  mapping,
  onChange,
  onConfirm,
  onCancel,
}: {
  parseResult: ParseResult
  mapping: ColumnMapping
  onChange: (m: ColumnMapping) => void
  onConfirm: () => void
  onCancel: () => void
}) {
  const cols = parseResult.rawHeaders.row1.length
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Mapeamento de colunas</p>
          <p className="text-xs text-muted-foreground">
            Cabeçalho detectado na linha {parseResult.headerRowIndex + 1} (score {parseResult.headerScore}/14).
            Confirme o destino de cada coluna. {parseResult.totalRows} linhas de dados encontradas.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={onConfirm}>Confirmar e validar →</Button>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-x-auto max-h-[60vh]">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-3 py-2">Col Excel</th>
              <th className="text-left px-3 py-2">Cabeçalho (linha 1)</th>
              <th className="text-left px-3 py-2">Sub-label (linha 2)</th>
              <th className="text-left px-3 py-2">Destino</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: cols }).map((_, idx) => {
              const current = mapping[idx] ?? 'ignore'
              return (
                <tr key={idx} className="border-t border-border">
                  <td className="px-3 py-1.5 font-mono text-xs">{idx + 1}</td>
                  <td className="px-3 py-1.5">{parseResult.rawHeaders.row1[idx] ?? ''}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">
                    {parseResult.rawHeaders.row2[idx] ?? ''}
                  </td>
                  <td className="px-3 py-1.5">
                    <select
                      value={current}
                      onChange={(e) =>
                        onChange({ ...mapping, [idx]: e.target.value as TargetField | 'ignore' })
                      }
                      className="bg-background border border-input rounded px-2 py-1 text-xs"
                    >
                      {TARGET_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
