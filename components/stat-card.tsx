import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: number | string
  subtitle?: string
  accent?: 'default' | 'teal' | 'green' | 'blue' | 'amber' | 'red'
}

const accentStyles: Record<string, { bar: string; bg: string }> = {
  default: { bar: 'bg-border', bg: '' },
  teal:    { bar: 'bg-primary', bg: 'bg-primary/[0.03]' },
  green:   { bar: 'bg-[oklch(0.62_0.14_162)]', bg: 'bg-[oklch(0.62_0.14_162)]/[0.03]' },
  blue:    { bar: 'bg-[oklch(0.36_0.10_265)]', bg: 'bg-[oklch(0.36_0.10_265)]/[0.03]' },
  amber:   { bar: 'bg-[oklch(0.72_0.14_68)]', bg: 'bg-[oklch(0.72_0.14_68)]/[0.03]' },
  red:     { bar: 'bg-[oklch(0.60_0.20_25)]', bg: '' },
}

// Map old accent names to new ones
const accentMap: Record<string, string> = {
  amber: 'teal',
  green: 'green',
  blue: 'blue',
  default: 'default',
  teal: 'teal',
  red: 'red',
}

export function StatCard({ title, value, subtitle, accent = 'default' }: StatCardProps) {
  const key = accentMap[accent] ?? 'default'
  const { bar, bg } = accentStyles[key]

  return (
    <div className={cn(
      'relative bg-card rounded-lg px-5 pt-5 pb-5 overflow-hidden',
      'border border-border hover:border-primary/30 hover:shadow-sm transition-all duration-200',
      bg
    )}>
      {/* Top accent line */}
      <div className={cn('absolute top-0 left-0 right-0 h-[2px]', bar)} />

      <p className="text-[10px] font-mono tracking-[0.20em] text-muted-foreground uppercase mb-3">
        {title}
      </p>

      <p className={cn(
        'font-display font-bold tabular-nums leading-none',
        typeof value === 'string' && value === '—'
          ? 'text-3xl text-muted-foreground/30'
          : 'text-4xl text-foreground'
      )}>
        {value}
      </p>

      {subtitle && (
        <p className="mt-2 text-[11px] font-mono text-primary/70">
          {subtitle}
        </p>
      )}
    </div>
  )
}
