'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Edition } from '@/lib/database.types'
import type { RegistrationWeeklyGoal } from '@/lib/data'

const formatWeekStart = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

interface Props {
  editions: Edition[]
  weeklyGoalsByEdition: Record<string, RegistrationWeeklyGoal[]>
}

export function EventosClient({ editions, weeklyGoalsByEdition }: Props) {
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

  // Metas semanais: edição expandida + rascunho de nova linha + estados
  const [expandedWeeklyId, setExpandedWeeklyId] = useState<string | null>(null)
  const [weekDraft, setWeekDraft] = useState('')
  const [targetDraft, setTargetDraft] = useState('')
  const [savingWeekly, setSavingWeekly] = useState(false)
  const [deletingWeeklyId, setDeletingWeeklyId] = useState<string | null>(null)
  const [weeklyError, setWeeklyError] = useState<string | null>(null)

  async function handleAddWeeklyGoal(editionId: string) {
    if (!weekDraft) {
      setWeeklyError('Escolha uma data.')
      return
    }
    const targetCount = Number(targetDraft)
    if (!Number.isInteger(targetCount) || targetCount <= 0) {
      setWeeklyError('Informe um número inteiro maior que zero.')
      return
    }
    setSavingWeekly(true)
    setWeeklyError(null)
    try {
      const res = await fetch('/api/edition/weekly-goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editionId, weekStart: weekDraft, targetCount }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        setWeeklyError((json as { error?: string })?.error ?? 'Falha ao salvar meta semanal.')
        return
      }
      setWeekDraft('')
      setTargetDraft('')
      router.refresh()
    } catch {
      setWeeklyError('Erro de rede.')
    } finally {
      setSavingWeekly(false)
    }
  }

  async function handleDeleteWeeklyGoal(id: string) {
    setDeletingWeeklyId(id)
    setWeeklyError(null)
    try {
      const res = await fetch('/api/edition/weekly-goal', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        setWeeklyError((json as { error?: string })?.error ?? 'Falha ao remover meta semanal.')
        return
      }
      router.refresh()
    } catch {
      setWeeklyError('Erro de rede.')
    } finally {
      setDeletingWeeklyId(null)
    }
  }

  // Meta de inscrições: id em edição + rascunho + estado de salvamento
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
  const [goalDraft, setGoalDraft] = useState('')
  const [savingGoalId, setSavingGoalId] = useState<string | null>(null)
  const [goalError, setGoalError] = useState<string | null>(null)

  function startEditGoal(e: Edition) {
    setEditingGoalId(e.id)
    setGoalDraft(e.registration_goal != null ? String(e.registration_goal) : '')
    setGoalError(null)
  }

  async function handleSaveGoal(id: string) {
    const trimmed = goalDraft.trim()
    const registrationGoal = trimmed === '' ? null : Number(trimmed)
    if (registrationGoal !== null && (!Number.isInteger(registrationGoal) || registrationGoal <= 0)) {
      setGoalError('Informe um número inteiro maior que zero, ou deixe em branco.')
      return
    }
    setSavingGoalId(id)
    setGoalError(null)
    try {
      const res = await fetch('/api/edition/update-goal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, registrationGoal }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        setGoalError((json as { error?: string })?.error ?? 'Falha ao salvar meta.')
        return
      }
      setEditingGoalId(null)
      router.refresh()
    } catch {
      setGoalError('Erro de rede.')
    } finally {
      setSavingGoalId(null)
    }
  }

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

              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase mb-1.5">
                  Meta de Inscrições
                </p>
                {editingGoalId === e.id ? (
                  <div className="space-y-2">
                    <Input
                      type="number"
                      min={1}
                      placeholder="ex. 200"
                      value={goalDraft}
                      onChange={ev => setGoalDraft(ev.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                    />
                    {goalError && <p role="alert" className="text-[11px] text-red-600">{goalError}</p>}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={savingGoalId === e.id}
                        onClick={() => handleSaveGoal(e.id)}
                      >
                        {savingGoalId === e.id ? 'Salvando…' : 'Salvar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={savingGoalId === e.id}
                        onClick={() => { setEditingGoalId(null); setGoalError(null) }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => startEditGoal(e)}
                    className="text-sm text-foreground/80 hover:text-primary transition-colors text-left"
                  >
                    {e.registration_goal != null
                      ? `${e.registration_goal.toLocaleString('pt-BR')} inscritos`
                      : <span className="text-muted-foreground/50 italic">ainda não definida — clique para definir</span>}
                  </button>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => { setExpandedWeeklyId(expandedWeeklyId === e.id ? null : e.id); setWeeklyError(null) }}
                  className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase hover:text-primary transition-colors"
                >
                  Metas Semanais ({(weeklyGoalsByEdition[e.id] ?? []).length}) {expandedWeeklyId === e.id ? '▾' : '▸'}
                </button>

                {expandedWeeklyId === e.id && (
                  <div className="mt-3 space-y-2">
                    {(weeklyGoalsByEdition[e.id] ?? []).length === 0 && (
                      <p className="text-[11px] font-mono text-muted-foreground/50 italic">
                        Nenhuma meta semanal ainda.
                      </p>
                    )}
                    {(weeklyGoalsByEdition[e.id] ?? []).map(g => (
                      <div key={g.id} className="flex items-center justify-between text-sm">
                        <span className="text-foreground/80">
                          Semana de {formatWeekStart(g.weekStart)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {g.targetCount.toLocaleString('pt-BR')} acum.
                          </span>
                          <button
                            type="button"
                            disabled={deletingWeeklyId === g.id}
                            onClick={() => handleDeleteWeeklyGoal(g.id)}
                            className="text-[11px] text-red-500 hover:text-red-600 disabled:opacity-50"
                          >
                            {deletingWeeklyId === g.id ? '…' : '✕'}
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center gap-2 pt-2">
                      <Input
                        type="date"
                        value={weekDraft}
                        onChange={ev => setWeekDraft(ev.target.value)}
                        className="h-8 text-xs flex-1"
                      />
                      <Input
                        type="number"
                        min={1}
                        placeholder="meta acum."
                        value={targetDraft}
                        onChange={ev => setTargetDraft(ev.target.value)}
                        className="h-8 text-xs w-24"
                      />
                      <Button
                        size="sm"
                        disabled={savingWeekly}
                        onClick={() => handleAddWeeklyGoal(e.id)}
                      >
                        {savingWeekly ? '…' : '+'}
                      </Button>
                    </div>
                    <p className="text-[10px] font-mono text-muted-foreground/50">
                      Use qualquer data da semana — é arredondada para a segunda-feira. &quot;Meta acum.&quot; = total esperado até essa semana.
                    </p>
                    {weeklyError && <p role="alert" className="text-[11px] text-red-600">{weeklyError}</p>}
                  </div>
                )}
              </div>

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
