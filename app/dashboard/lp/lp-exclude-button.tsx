'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function LpExcludeButton({ companyName }: { companyName: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleExclude() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/lp/exclude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        setError((json as { error?: string })?.error ?? 'Falha ao excluir.')
        setSaving(false)
        return
      }
      router.refresh()
    } catch {
      setError('Erro de rede.')
      setSaving(false)
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5 justify-end">
        <span className="text-[10px] text-muted-foreground">não é LP?</span>
        <Button size="xs" variant="destructive" disabled={saving} onClick={handleExclude}>
          {saving ? '…' : 'Confirmar'}
        </Button>
        <Button size="xs" variant="ghost" disabled={saving} onClick={() => setConfirming(false)}>
          Cancelar
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="xs" variant="ghost" className="text-muted-foreground hover:text-red-600" onClick={() => setConfirming(true)}>
        Excluir
      </Button>
      {error && <p role="alert" className="text-[10px] text-red-600">{error}</p>}
    </div>
  )
}

export function LpRestoreButton({ companyKey }: { companyKey: string }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRestore() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/lp/exclude', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyKey }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        setError((json as { error?: string })?.error ?? 'Falha ao restaurar.')
        setSaving(false)
        return
      }
      router.refresh()
    } catch {
      setError('Erro de rede.')
      setSaving(false)
    }
  }

  return (
    <div>
      <Button size="xs" variant="outline" disabled={saving} onClick={handleRestore}>
        {saving ? '…' : 'Restaurar'}
      </Button>
      {error && <p role="alert" className="text-[10px] text-red-600 mt-1">{error}</p>}
    </div>
  )
}
