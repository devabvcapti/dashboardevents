'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LP_CATEGORIES, LP_CATEGORY_LABELS } from '@/lib/data'
import type { LpCategory } from '@/lib/data'

interface Props {
  companyName: string
}

export function LpCategorySelect({ companyName }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleChange(value: string | null) {
    if (!value) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/lp/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, category: value }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        setError((json as { error?: string })?.error ?? 'Falha ao classificar.')
        return
      }
      router.refresh()
    } catch {
      setError('Erro de rede.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Select onValueChange={handleChange} disabled={saving}>
        <SelectTrigger size="sm" className="h-7 text-[11px] w-[200px]">
          <SelectValue>
            <span className="text-muted-foreground/40">classificar</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {LP_CATEGORIES.map((c: LpCategory) => (
            <SelectItem key={c} value={c}>{LP_CATEGORY_LABELS[c]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p role="alert" className="text-[10px] text-red-600 mt-1">{error}</p>}
    </div>
  )
}
