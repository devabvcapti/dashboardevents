'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface UploadResult {
  totalRows: number
  inserted: number
  unrecognizedCategories: string[]
  skippedRows: number
}

export function LpMasterUpload() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<UploadResult | null>(null)

  async function handleFile(file: File) {
    setUploading(true)
    setError(null)
    setResult(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/lp/master-upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) {
        setError((json as { error?: string }).error ?? 'Falha no upload.')
        return
      }
      setResult(json as UploadResult)
      router.refresh()
    } catch {
      setError('Erro de rede.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-3">
      <p className="text-[10px] font-mono tracking-[0.20em] text-muted-foreground uppercase">
        Planilha Mestre de LPs
      </p>
      <p className="text-[12px] text-muted-foreground">
        Envie a planilha com o universo conhecido de LPs (colunas: Empresa, Categoria opcional, País opcional).
        Cada envio substitui a planilha mestre inteira. Linhas categorizadas como &quot;Universidades&quot; ou
        &quot;A revisar&quot; são ignoradas — não fazem parte do universo de LPs.
      </p>
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          disabled={uploading}
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
          }}
          className="hidden"
        />
        <Button
          size="sm"
          variant="outline"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? 'Enviando…' : 'Selecionar planilha (.xlsx)'}
        </Button>
      </div>
      {error && <p role="alert" className="text-[11px] text-red-600">{error}</p>}
      {result && (
        <div className="text-[11px] font-mono text-muted-foreground space-y-1">
          <p>{result.inserted} empresas carregadas (de {result.totalRows} linhas na planilha).</p>
          {result.skippedRows > 0 && (
            <p>{result.skippedRows} linha{result.skippedRows !== 1 ? 's' : ''} ignorada{result.skippedRows !== 1 ? 's' : ''} (Universidades/A revisar).</p>
          )}
          {result.unrecognizedCategories.length > 0 && (
            <p className="text-amber-600">
              Categorias não reconhecidas (ficaram sem subcategoria): {result.unrecognizedCategories.join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
