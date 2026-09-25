'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function CancelRegistrationButton({ participantId }: { participantId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCancel() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/participants/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        setError((json as { error?: string })?.error ?? 'Falha ao cancelar.')
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
        <span className="text-[10px] text-muted-foreground">cancelar inscrição?</span>
        <Button size="xs" variant="destructive" disabled={saving} onClick={handleCancel}>
          {saving ? '…' : 'Confirmar'}
        </Button>
        <Button size="xs" variant="ghost" disabled={saving} onClick={() => setConfirming(false)}>
          Voltar
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="xs" variant="ghost" className="text-muted-foreground hover:text-red-600" onClick={() => setConfirming(true)}>
        Cancelar
      </Button>
      {error && <p role="alert" className="text-[10px] text-red-600">{error}</p>}
    </div>
  )
}
