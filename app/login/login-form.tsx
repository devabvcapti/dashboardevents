'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

export function LoginForm({
  redirectTo,
  initialError,
}: {
  redirectTo: string
  initialError: string | null
}) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(initialError)
  const [loading, setLoading] = useState(false)
  const [ssoLoading, setSsoLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Falha no login.')
        return
      }
      router.push(redirectTo || '/dashboard')
      router.refresh()
    } catch {
      setError('Erro de rede. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function onMicrosoftLogin() {
    setSsoLoading(true)
    setError(null)
    try {
      const supabase = createSupabaseBrowserClient()
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo || '/dashboard')}`,
          scopes: 'email profile openid',
        },
      })
      if (oauthError) setError(oauthError.message)
    } catch {
      setError('Erro ao conectar com Microsoft.')
      setSsoLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Microsoft SSO */}
      <Button
        type="button"
        variant="outline"
        className="w-full flex items-center gap-3"
        onClick={onMicrosoftLogin}
        disabled={ssoLoading || loading}
      >
        {/* Microsoft logo */}
        <svg width="18" height="18" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
          <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
          <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
          <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
        </svg>
        {ssoLoading ? 'Redirecionando...' : 'Entrar com Microsoft'}
      </Button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider">ou</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Email + senha */}
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Email
          </span>
          <Input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Senha
          </span>
          <Input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <p
            role="alert"
            className="text-sm text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2"
          >
            {error}
          </p>
        )}
        <Button type="submit" disabled={loading || ssoLoading} className="w-full">
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
    </div>
  )
}
