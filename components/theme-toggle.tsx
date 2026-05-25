'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Mount detection: intentionally synchronous setState to hydrate UI
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  if (!mounted) return <div className={cn('w-8 h-8', className)} />

  const dark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label={dark ? 'Ativar tema claro' : 'Ativar tema escuro'}
      className={cn(
        'group relative flex items-center justify-center w-8 h-8 rounded-md transition-all duration-150',
        'text-sidebar-foreground/30 hover:text-sidebar-foreground/70 hover:bg-sidebar-accent/70',
        className
      )}
    >
      {dark
        ? <Sun className="w-4 h-4" />
        : <Moon className="w-4 h-4" />
      }
    </button>
  )
}
