import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from './supabase-server'

export interface SessionUser {
  id: string
  email: string
  isAdmin: boolean
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const role = (user.app_metadata as { role?: string } | null)?.role
  return {
    id: user.id,
    email: user.email ?? '',
    isAdmin: role === 'admin',
  }
}

/** Redireciona para /login se não autenticado. Aceita qualquer role. */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
}

/** Redireciona para /login se não autenticado, ou throw 403 se não admin. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (!user.isAdmin) {
    throw new Response('Forbidden: admin required', { status: 403 })
  }
  return user
}
