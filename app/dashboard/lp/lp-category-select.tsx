'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LP_CATEGORIES, LP_CATEGORY_LABELS, LP_SUBCATEGORIES, LP_SUBCATEGORY_LABELS, LP_SUBCATEGORY_CATEGORY } from '@/lib/data'
import type { LpSubcategory } from '@/lib/data'

interface Props {
  companyName: string
  currentSubcategory?: LpSubcategory | null
}

export function LpCategorySelect({ companyName, currentSubcategory }: Props) {
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
        body: JSON.stringify({ companyName, subcategory: value }),
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
      <Select value={currentSubcategory ?? undefined} onValueChange={handleChange} disabled={saving}>
        <SelectTrigger size="sm" className="h-7 text-[11px] w-[260px]">
          <SelectValue>
            {currentSubcategory ? LP_SUBCATEGORY_LABELS[currentSubcategory] : <span className="text-muted-foreground/40">classificar</span>}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {LP_CATEGORIES.map((category) => (
            <SelectGroup key={category}>
              <SelectLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                {LP_CATEGORY_LABELS[category]}
              </SelectLabel>
              {LP_SUBCATEGORIES
                .filter((s) => LP_SUBCATEGORY_CATEGORY[s] === category)
                .map((s) => (
                  <SelectItem key={s} value={s}>{LP_SUBCATEGORY_LABELS[s]}</SelectItem>
                ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      {error && <p role="alert" className="text-[10px] text-red-600 mt-1">{error}</p>}
    </div>
  )
}
