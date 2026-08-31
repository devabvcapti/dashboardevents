'use client'

import { useState } from 'react'
import type { CategorySummaryGroup } from '@/lib/data'

export function CategoryCards({ categories }: { categories: CategorySummaryGroup[] }) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  if (categories.length === 0) return null

  const expandedGroup = categories.find(c => (c.category ?? 'SEM_CATEGORIA') === expandedKey) ?? null

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <p className="text-[10px] font-mono tracking-[0.18em] text-muted-foreground uppercase mb-4">
        Por Categoria
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {categories.map(c => {
          const key = c.category ?? 'SEM_CATEGORIA'
          const isOpen = expandedKey === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setExpandedKey(isOpen ? null : key)}
              className={`text-left border rounded-lg p-4 transition-colors ${
                isOpen ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
              }`}
            >
              <p className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase mb-1.5 truncate">
                {c.label}
              </p>
              <p className="font-display text-2xl text-foreground leading-none tabular-nums">
                {c.count}
              </p>
              <p className="text-[10px] font-mono text-muted-foreground/50 mt-1">
                {c.count === 1 ? 'participante' : 'participantes'}
              </p>
            </button>
          )
        })}
      </div>

      {expandedGroup && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase mb-3">
            {expandedGroup.label} ({expandedGroup.count})
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1 text-sm max-h-96 overflow-y-auto">
            {expandedGroup.participants.map((p, i) => (
              <li key={i} className="text-foreground/80 truncate">
                {p.name}
                {p.company && <span className="text-muted-foreground/50"> — {p.company}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
