import { requireAdmin } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { UsuariosClient } from './usuarios-client'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Usuários — Dashboard ABVCAP' }

export default async function UsuariosPage() {
  const me = await requireAdmin()

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
  const users = (data?.users ?? [])
    .filter(u => u.email?.endsWith('@abvcap.com.br'))
    .map(u => ({
      id: u.id,
      email: u.email ?? '',
      role: (((u.app_metadata as { role?: string } | null)?.role) ?? 'viewer') as 'admin' | 'viewer',
      last_sign_in: u.last_sign_in_at ?? null,
    }))
    .sort((a, b) => a.email.localeCompare(b.email))

  return (
    <div className="p-8 space-y-8">
      <div className="border-b border-border pb-6">
        <p className="text-[10px] font-mono tracking-[0.22em] text-muted-foreground uppercase mb-1">
          Gestão
        </p>
        <h1 className="font-display text-3xl text-foreground leading-none">Usuários</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Gerencie os acessos dos colaboradores. Admins podem importar dados e criar eventos.
        </p>
      </div>
      <UsuariosClient users={users} currentUserId={me.id} />
    </div>
  )
}
