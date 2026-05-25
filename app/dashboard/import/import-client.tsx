'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ColumnMappingUI } from './column-mapping'
import { PreviewTable } from './preview-table'
import type { PreviewResponse, ColumnMapping as ColumnMappingType } from '@/lib/import/types'

type Stage = 'idle' | 'uploading' | 'mapping' | 'preview' | 'error'

export function ImportClient() {
  const [stage, setStage] = useState<Stage>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mapping, setMapping] = useState<ColumnMappingType | null>(null)

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

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    if (f) void upload(f)
  }

  return (
    <div className="space-y-6">
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
          onConfirm={() => {
            // Plan 04 will wire up POST /api/import/commit using preview.serverToken
            alert(
              `[Plan 04 pendente] Commit usará serverToken=${preview.serverToken} ` +
              `com ${preview.validation.validRows.length} linhas válidas.`
            )
          }}
        />
      )}
    </div>
  )
}
