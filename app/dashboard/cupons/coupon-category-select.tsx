'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { COUPON_CATEGORIES, COUPON_CATEGORY_LABELS } from '@/lib/data'
import type { CouponCategory } from '@/lib/data'

interface Props {
  editionId: string
  couponCode: string
  category: CouponCategory | null
  isAdmin: boolean
}

export function CouponCategorySelect({ editionId, couponCode, category, isAdmin }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleChange(value: string | null) {
    if (!value || value === category) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/edition/coupon-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editionId, couponCode, category: value }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        setError((json as { error?: string })?.error ?? 'Falha ao salvar categoria.')
        return
      }
      router.refresh()
    } catch {
      setError('Erro de rede.')
    } finally {
      setSaving(false)
    }
  }

  if (!isAdmin) {
    return category ? (
      <Badge variant="outline" className="text-[10px] font-mono">
        {COUPON_CATEGORY_LABELS[category]}
      </Badge>
    ) : (
      <span className="text-muted-foreground/40 text-[11px]">—</span>
    )
  }

  return (
    <div>
      <Select value={category ?? undefined} onValueChange={handleChange} disabled={saving}>
        <SelectTrigger size="sm" className="h-7 text-[11px]">
          <SelectValue>
            {category ? COUPON_CATEGORY_LABELS[category] : <span className="text-muted-foreground/40">definir</span>}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {COUPON_CATEGORIES.map(c => (
            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p role="alert" className="text-[10px] text-red-600 mt-1">{error}</p>}
    </div>
  )
}
