'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Edition } from '@/lib/database.types'

export function EventosClient({ editions }: { editions: Edition[] }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(editions.length === 0)
  const [name, setName] = useState('')
  const [year, setYear] = useState<string>(new Date().getFullYear().toString())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Delete state: id pendente de confirmação + id em processo
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/edition/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), year: Number(year) }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError((json as { error?: string }).error ?? 'Falha ao criar evento.')
        return
      }
      setName(''); setYear(new Date().getFullYear().toString())
      setShowForm(false)
      router.refresh()
    } catch {
      setError('Erro de rede.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    setDeleteError(null)
    try {
      const res = await fetch('/api/edition/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const json = await res.json()
      if (!res.ok) {
        setDeleteError((json as { error?: string }).error ?? 'Falha ao deletar evento.')
        return
      }
      setConfirmDeleteId(null)
      router.refresh()
    } catch {
      setDeleteError('Erro de rede.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground/80">Edições cadastradas</h2>
        {!showForm && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            + Novo evento
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="border border-border rounded-lg p-5 bg-card space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Nome</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Congresso ABVCAP 2026" required minLength={1} maxLength={200} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Ano</label>
              <Input type="number" value={year} onChange={e => setYear(e.target.value)} min={2000} max={2100} required />
            </div>
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting}>{submitting ? 'Criando…' : 'Criar evento'}</Button>
            {editions.length > 0 && (
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)} disabled={submitting}>Cancelar</Button>
            )}
          </div>
        </form>
      )}

      {deleteError && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{deleteError}</p>
      )}

      {editions.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma edição cadastrada ainda. Use o formulário acima para criar a primeira.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {editions.map(e => (
            <div key={e.id} className="border border-border rounded-lg p-5 bg-card hover:border-primary/30 transition-all">
              <p className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase mb-2">Edição {e.year}</p>
              <p className="font-display text-lg text-foreground leading-tight">{e.name}</p>
              {e.created_at && (
                <p className="text-[11px] font-mono text-muted-foreground/60 mt-3">
                  criada {new Date(e.created_at).toLocaleDateString('pt-BR')}
                </p>
              )}

              <div className="mt-4 pt-3 border-t border-border">
                {confirmDeleteId === e.id ? (
                  <div className="space-y-2">
                    <p className="text-[11px] font-mono text-red-600">
                      Deletar apaga todos os participantes e dados do evento. Confirmar?
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={deletingId === e.id}
                        onClick={() => handleDelete(e.id)}
                      >
                        {deletingId === e.id ? 'Deletando…' : 'Confirmar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={deletingId === e.id}
                        onClick={() => { setConfirmDeleteId(null); setDeleteError(null) }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 text-[11px]"
                    onClick={() => { setConfirmDeleteId(e.id); setDeleteError(null) }}
                  >
                    Deletar evento
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
