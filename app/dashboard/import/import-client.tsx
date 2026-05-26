'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ColumnMappingUI } from './column-mapping'
import { PreviewTable } from './preview-table'
import type { PreviewResponse, ColumnMapping as ColumnMappingType } from '@/lib/import/types'
import type { Edition } from '@/lib/database.types'

type Stage = 'idle' | 'uploading' | 'mapping' | 'preview' | 'committing' | 'done' | 'error'

interface CommitResult {
  jobId: string
  inserted: number
  updated: number
  errors: number
  totalRows: number
  formInserted: number
  formUpdated: number
  formErrors: number
}

export function ImportClient({
  editions,
  initialEditionId,
}: {
  editions: Edition[]
  initialEditionId: string
}) {
  const [stage, setStage] = useState<Stage>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mapping, setMapping] = useState<ColumnMappingType | null>(null)
  const [result, setResult] = useState<CommitResult | null>(null)
  const [selectedEditionId, setSelectedEditionId] = useState(initialEditionId || editions[0]?.id || '')

  async function upload(f: File, overrideMapping?: ColumnMappingType) {
    setStage('uploading')
    setError(null)
    const fd = new FormData()
    fd.append('file', f)
    if (overrideMapping) fd.append('mapping', JSON.stringify(overrideMapping))
    try {
      const res = await fetch('/api/import/preview', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) {
        setError((json as { error?: string }).error ?? 'Falha no upload.')
        setStage('error')
        return
      }
      setPreview(json as PreviewResponse)
      setMapping((json as PreviewResponse).parseResult.detectedMapping)
      setStage(overrideMapping ? 'preview' : 'mapping')
    } catch {
      setError('Erro de rede.')
      setStage('error')
    }
  }

  async function commit(serverToken: string) {
    setStage('committing')
    setError(null)
    try {
      const res = await fetch('/api/import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverToken, editionId: selectedEditionId }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError((json as { error?: string }).error ?? 'Falha ao importar.')
        setStage('error')
        return
      }
      setResult(json as CommitResult)
      setStage('done')
    } catch {
      setError('Erro de rede durante importação.')
      setStage('error')
    }
  }

  function reset() {
    setStage('idle')
    setFile(null)
    setPreview(null)
    setError(null)
    setMapping(null)
    setResult(null)
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    if (f) void upload(f)
  }

  return (
    <div className="space-y-6">
      {/* Picker de evento de destino */}
      <div className="flex items-center gap-3 border border-border rounded-lg bg-card px-4 py-3">
        <div className="flex-1">
          <p className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase mb-1">
            Evento de destino
          </p>
          <Select
            value={selectedEditionId}
            onValueChange={(v) => { if (v) setSelectedEditionId(v) }}
            disabled={stage === 'committing' || stage === 'uploading'}
          >
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue>
                {editions.find(e => e.id === selectedEditionId)?.name ?? selectedEditionId}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {editions.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-[10px] font-mono text-muted-foreground/60 max-w-xs">
          Os dados serão associados a este evento. Verifique antes de confirmar.
        </p>
      </div>

      {(stage === 'idle' || stage === 'error') && (
        <div className="border border-dashed border-border rounded-lg p-12 text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Selecione um arquivo .xlsx (até 20 MB)
          </p>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={onFileChange}
            className="block mx-auto text-sm"
          />
          {error && (
            <p role="alert" className="text-sm text-red-600 bg-red-500/10 border border-red-500/20 rounded p-2">
              {error}
            </p>
          )}
        </div>
      )}

      {stage === 'uploading' && (
        <p className="text-sm text-muted-foreground">Analisando arquivo…</p>
      )}

      {stage === 'mapping' && preview && mapping && (
        <ColumnMappingUI
          parseResult={preview.parseResult}
          mapping={mapping}
          onChange={setMapping}
          onConfirm={() => file && void upload(file, mapping)}
          onCancel={() => { setStage('idle'); setPreview(null); setFile(null) }}
        />
      )}

      {stage === 'preview' && preview && (
        <PreviewTable
          preview={preview}
          onBack={() => setStage('mapping')}
          onConfirm={() => void commit(preview.serverToken)}
        />
      )}

      {stage === 'committing' && (
        <div className="border border-border rounded-lg p-12 text-center space-y-2">
          <p className="text-sm font-medium">Importando participantes…</p>
          <p className="text-xs text-muted-foreground">
            Isso pode levar alguns segundos dependendo do tamanho do arquivo.
          </p>
        </div>
      )}

      {stage === 'done' && result && (
        <div className="space-y-6">
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-muted/40 px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold">Participantes</h3>
            </div>
            <div className="grid grid-cols-4 divide-x divide-border">
              {[
                { label: 'Total', value: result.totalRows },
                { label: 'Inseridos', value: result.inserted },
                { label: 'Atualizados', value: result.updated },
                { label: 'Erros', value: result.errors },
              ].map(({ label, value }) => (
                <div key={label} className="px-4 py-3 text-center">
                  <p className="text-2xl font-bold tabular-nums">{value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-muted/40 px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold">Respostas de formulário</h3>
            </div>
            <div className="grid grid-cols-3 divide-x divide-border">
              {[
                { label: 'Inseridas', value: result.formInserted },
                { label: 'Atualizadas', value: result.formUpdated },
                { label: 'Erros', value: result.formErrors },
              ].map(({ label, value }) => (
                <div key={label} className="px-4 py-3 text-center">
                  <p className="text-2xl font-bold tabular-nums">{value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Job ID: <code className="font-mono">{result.jobId}</code></span>
          </div>

          <Button variant="outline" onClick={reset}>
            Importar outro arquivo
          </Button>
        </div>
      )}
    </div>
  )
}
