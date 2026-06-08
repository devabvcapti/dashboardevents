'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import {
  LayoutDashboard, Users, BarChart3, TicketIcon, LogOut, Upload,
  Calendar, Wallet, Tag, UserCog, Activity, PiggyBank, BookOpen,
  GitCompareArrows, Building2, Pin, PinOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme-toggle'
import { EditionSelector } from '@/components/edition-selector'

const commonNav = [
  { href: '/dashboard', label: 'Visão Geral', icon: LayoutDashboard },
  { href: '/dashboard/inscricoes', label: 'Inscrições', icon: Users },
  { href: '/dashboard/ingressos', label: 'Ingressos', icon: TicketIcon },
  { href: '/dashboard/cupons', label: 'Cupons', icon: Tag },
  { href: '/dashboard/publico', label: 'Análise de Público', icon: BarChart3 },
  { href: '/dashboard/ritmo', label: 'Ritmo de Inscrições', icon: Activity },
  { href: '/dashboard/receita', label: 'Análise de Receita', icon: Wallet },
  { href: '/dashboard/comparativo', label: 'Comparativo', icon: GitCompareArrows },
  { href: '/dashboard/empresas', label: 'Empresas', icon: Building2 },
  { href: '/dashboard/manual', label: 'Manual', icon: BookOpen },
]

const adminNav = [
  { href: '/dashboard/eventos', label: 'Eventos', icon: Calendar },
  { href: '/dashboard/orcamento', label: 'Orçamento', icon: PiggyBank },
  { href: '/dashboard/import', label: 'Importar', icon: Upload },
  { href: '/dashboard/usuarios', label: 'Usuários', icon: UserCog },
]

function NavItem({
  href, label, icon: Icon, active, collapsed,
}: {
  href: string; label: string; icon: React.ElementType; active: boolean; collapsed: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group relative flex items-center rounded-md text-[13px] transition-all duration-150',
        collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
        active
          ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
          : 'text-sidebar-foreground/45 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground/80'
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-sidebar-primary rounded-r-full" />
      )}
      <Icon className={cn(
        'w-4 h-4 shrink-0 transition-colors',
        active ? 'text-sidebar-primary' : 'text-sidebar-foreground/25 group-hover:text-sidebar-foreground/50'
      )} />
      {!collapsed && <span className="tracking-wide truncate">{label}</span>}
      {collapsed && (
        <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-md bg-popover border border-border px-2.5 py-1.5 text-[12px] text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {label}
        </span>
      )}
    </Link>
  )
}

export function Sidebar({
  editions,
  activeEditionId,
  isAdmin,
}: {
  editions: { id: string; name: string; year: number }[]
  activeEditionId: string
  isAdmin: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [pinned, setPinned] = useState(false)
  const [hovered, setHovered] = useState(false)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const collapsed = !pinned && !hovered

  useEffect(() => {
    const stored = localStorage.getItem('sidebar-pinned')
    if (stored === 'true') setPinned(true)
  }, [])

  function togglePin() {
    setPinned(prev => {
      const next = !prev
      localStorage.setItem('sidebar-pinned', String(next))
      return next
    })
  }

  function handleMouseEnter() {
    if (leaveTimer.current) clearTimeout(leaveTimer.current)
    setHovered(true)
  }

  function handleMouseLeave() {
    leaveTimer.current = setTimeout(() => setHovered(false), 200)
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'relative flex flex-col min-h-screen bg-sidebar text-sidebar-foreground shrink-0 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Pin button — visible when expanded */}
      {!collapsed && (
        <button
          onClick={togglePin}
          className="absolute right-3 top-4 z-50 flex h-6 w-6 items-center justify-center rounded text-sidebar-foreground/30 hover:text-sidebar-foreground/70 transition-colors"
          aria-label={pinned ? 'Desafixar menu' : 'Fixar menu expandido'}
          title={pinned ? 'Desafixar' : 'Fixar expandido'}
        >
          {pinned
            ? <Pin className="w-3.5 h-3.5 fill-sidebar-primary text-sidebar-primary" />
            : <PinOff className="w-3.5 h-3.5" />}
        </button>
      )}

      {/* Brand */}
      <div className={cn('pt-8 pb-7 transition-all duration-300', collapsed ? 'px-3' : 'px-6')}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 w-[3px] h-10 bg-sidebar-primary rounded-full shrink-0" />
          {!collapsed && (
            <div>
              <Image
                src="/logo-abvcap.png"
                alt="ABVCAP"
                width={96}
                height={28}
                className="mb-2 object-contain"
                priority
              />
              <p className="font-display text-[17px] leading-tight text-sidebar-foreground">Dashboard</p>
              <p className="font-display text-[17px] leading-none text-sidebar-foreground/50">Eventos</p>
            </div>
          )}
        </div>
        <div className="mt-6 h-px bg-sidebar-border" />
      </div>

      {/* Edition selector */}
      {!collapsed && (
        <div className="px-6 pb-5 -mt-2">
          <p className="text-[9px] font-mono tracking-[0.25em] text-sidebar-foreground/30 uppercase mb-2">
            Evento Ativo
          </p>
          <EditionSelector editions={editions} activeEditionId={activeEditionId} />
        </div>
      )}

      {/* Nav section label */}
      {!collapsed && (
        <div className="px-6 mb-2">
          <p className="text-[9px] font-mono tracking-[0.25em] text-sidebar-foreground/30 uppercase">Menu</p>
        </div>
      )}

      {/* Nav */}
      <nav className={cn('flex-1 space-y-0.5 transition-all duration-300', collapsed ? 'px-2' : 'px-3')}>
        {commonNav.map(({ href, label, icon }) => (
          <NavItem key={href} href={href} label={label} icon={icon} active={pathname === href} collapsed={collapsed} />
        ))}

        {isAdmin && (
          <>
            {!collapsed ? (
              <div className="pt-3 pb-1 px-3">
                <p className="text-[9px] font-mono tracking-[0.25em] text-sidebar-foreground/25 uppercase">Admin</p>
              </div>
            ) : (
              <div className="my-2 h-px bg-sidebar-border/50" />
            )}
            {adminNav.map(({ href, label, icon }) => (
              <NavItem key={href} href={href} label={label} icon={icon} active={pathname === href} collapsed={collapsed} />
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className={cn('py-4 mt-4 border-t border-sidebar-border space-y-3 transition-all duration-300', collapsed ? 'px-2' : 'px-4')}>
        <button
          onClick={handleLogout}
          className={cn(
            'group relative flex w-full items-center rounded-md text-[13px] text-sidebar-foreground/45 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground/80 transition-all duration-150',
            collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'
          )}
        >
          <LogOut className="w-4 h-4 shrink-0 text-sidebar-foreground/25 group-hover:text-sidebar-foreground/50 transition-colors" />
          {!collapsed && <span className="tracking-wide">Sair</span>}
          {collapsed && (
            <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-md bg-popover border border-border px-2.5 py-1.5 text-[12px] text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              Sair
            </span>
          )}
        </button>

        {!collapsed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-sidebar-primary/60" />
              <p className="text-[10px] font-mono text-sidebar-foreground/25 tracking-wider">DASHBOARD · v1.0</p>
            </div>
            <ThemeToggle />
          </div>
        ) : (
          <div className="flex justify-center">
            <ThemeToggle />
          </div>
        )}
      </div>
    </aside>
  )
}
