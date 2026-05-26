'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function EditionSelector({
  editions,
  activeEditionId,
}: {
  editions: { id: string; name: string; year: number }[]
  activeEditionId: string
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [value, setValue] = useState(activeEditionId)

  async function handleChange(editionId: string | null) {
    if (!editionId) return
    setValue(editionId)
    try {
      const res = await fetch('/api/edition/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editionId }),
      })
      if (!res.ok) {
        // revert visual
        setValue(activeEditionId)
        return
      }
      startTransition(() => router.refresh())
    } catch {
      setValue(activeEditionId)
    }
  }

  if (editions.length === 0) {
    return (
      <p className="text-[10px] font-mono text-sidebar-foreground/40 px-3 py-2">
        Nenhuma edição
      </p>
    )
  }

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger className="w-full text-[12px] bg-sidebar-accent/40 border-sidebar-border text-sidebar-foreground/80">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {editions.map(e => (
          <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
