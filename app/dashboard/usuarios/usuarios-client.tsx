'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Shield, Eye } from 'lucide-react'

interface UserRow {
  id: string
  email: string
  role: 'admin' | 'viewer'
  last_sign_in: string | null
}

export function UsuariosClient({
  users: initialUsers,
  currentUserId,
}: {
  users: UserRow[]
  currentUserId: string
}) {
  const router = useRouter()
  const [users, setUsers] = useState(initialUsers)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function toggleRole(user: UserRow) {
    const newRole = user.role === 'admin' ? 'viewer' : 'admin'
    setLoadingId(user.id)
    setError(null)
    try {
      const res = await fetch('/api/users/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, role: newRole }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError((json as { error?: string }).error ?? 'Erro ao atualizar role.')
        return
      }
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u))
      router.refresh()
    } catch {
      setError('Erro de rede.')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-5 py-3 text-[10px] font-mono tracking-widest text-muted-foreground uppercase">Email</th>
              <th className="text-left px-5 py-3 text-[10px] font-mono tracking-widest text-muted-foreground uppercase">Acesso</th>
              <th className="text-left px-5 py-3 text-[10px] font-mono tracking-widest text-muted-foreground uppercase">Último acesso</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-12">
                  <p className="text-[11px] font-mono text-muted-foreground/40">Nenhum usuário encontrado.</p>
                </td>
              </tr>
            )}
            {users.map(u => (
              <tr key={u.id} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                <td className="px-5 py-3.5 font-mono text-sm text-foreground/80">
                  {u.email}
                  {u.id === currentUserId && (
                    <span className="ml-2 text-[9px] font-mono tracking-widest text-primary/70 uppercase border border-primary/20 bg-primary/5 px-1.5 py-0.5 rounded">
                      você
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 rounded border ${
                    u.role === 'admin'
                      ? 'text-primary border-primary/30 bg-primary/5'
                      : 'text-muted-foreground border-border bg-muted/30'
                  }`}>
                    {u.role === 'admin'
                      ? <><Shield className="w-2.5 h-2.5" />Admin</>
                      : <><Eye className="w-2.5 h-2.5" />Viewer</>
                    }
                  </span>
                </td>
                <td className="px-5 py-3.5 text-[11px] font-mono text-muted-foreground/60">
                  {u.last_sign_in
                    ? new Date(u.last_sign_in).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })
                    : '—'}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={loadingId === u.id || u.id === currentUserId}
                    onClick={() => toggleRole(u)}
                    className="text-[11px]"
                    title={u.id === currentUserId ? 'Você não pode alterar seu próprio acesso' : undefined}
                  >
                    {loadingId === u.id
                      ? 'Atualizando…'
                      : u.role === 'admin' ? 'Remover admin' : 'Tornar admin'
                    }
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] font-mono text-muted-foreground/50">
        Apenas usuários que já fizeram login aparecem nesta lista. Viewers podem visualizar o dashboard mas não importar dados nem criar eventos.
      </p>
    </div>
  )
}
