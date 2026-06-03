'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Users, BarChart3, TicketIcon, LogOut, Upload, Calendar, Wallet, Tag, UserCog, Activity, PiggyBank, BookOpen, GitCompareArrows, Building2 } from 'lucide-react'
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

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const nav = isAdmin ? [...commonNav, ...adminNav] : commonNav

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-sidebar text-sidebar-foreground shrink-0">

      {/* Brand */}
      <div className="px-6 pt-8 pb-7">
        {/* Teal accent bar + logo */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5 w-[3px] h-10 bg-sidebar-primary rounded-full shrink-0" />
          <div>
            <Image
              src="/logo-abvcap.png"
              alt="ABVCAP"
              width={96}
              height={28}
              className="mb-2 object-contain"
              priority
            />
            <p className="font-display text-[17px] leading-tight text-sidebar-foreground">
              Dashboard
            </p>
            <p className="font-display text-[17px] leading-none text-sidebar-foreground/50">
              Eventos
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-6 h-px bg-sidebar-border" />
      </div>

      {/* Edition selector */}
      <div className="px-6 pb-5 -mt-2">
        <p className="text-[9px] font-mono tracking-[0.25em] text-sidebar-foreground/30 uppercase mb-2">
          Evento Ativo
        </p>
        <EditionSelector editions={editions} activeEditionId={activeEditionId} />
      </div>

      {/* Nav label */}
      <div className="px-6 mb-2">
        <p className="text-[9px] font-mono tracking-[0.25em] text-sidebar-foreground/30 uppercase">
          Menu
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {commonNav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group relative flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] transition-all duration-150',
                active
                  ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
                  : 'text-sidebar-foreground/45 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground/80'
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-sidebar-primary rounded-r-full" />
              )}
              <Icon
                className={cn(
                  'w-4 h-4 shrink-0 transition-colors',
                  active ? 'text-sidebar-primary' : 'text-sidebar-foreground/25 group-hover:text-sidebar-foreground/50'
                )}
              />
              <span className="tracking-wide">{label}</span>
            </Link>
          )
        })}

        {isAdmin && (
          <>
            <div className="pt-3 pb-1 px-3">
              <p className="text-[9px] font-mono tracking-[0.25em] text-sidebar-foreground/25 uppercase">
                Admin
              </p>
            </div>
            {adminNav.map(({ href, label, icon: Icon }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'group relative flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] transition-all duration-150',
                    active
                      ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
                      : 'text-sidebar-foreground/45 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground/80'
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-sidebar-primary rounded-r-full" />
                  )}
                  <Icon
                    className={cn(
                      'w-4 h-4 shrink-0 transition-colors',
                      active ? 'text-sidebar-primary' : 'text-sidebar-foreground/25 group-hover:text-sidebar-foreground/50'
                    )}
                  />
                  <span className="tracking-wide">{label}</span>
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 mt-4 border-t border-sidebar-border space-y-3">
        <button
          onClick={handleLogout}
          className="group flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-[13px] text-sidebar-foreground/45 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground/80 transition-all duration-150"
        >
          <LogOut className="w-4 h-4 shrink-0 text-sidebar-foreground/25 group-hover:text-sidebar-foreground/50 transition-colors" />
          <span className="tracking-wide">Sair</span>
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-sidebar-primary/60" />
            <p className="text-[10px] font-mono text-sidebar-foreground/25 tracking-wider">
              DASHBOARD · v1.0
            </p>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}
