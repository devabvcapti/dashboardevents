import { requireAdmin } from '@/lib/auth'
import { getEditions, getRegistrationWeeklyGoals } from '@/lib/data'
import type { RegistrationWeeklyGoal } from '@/lib/data'
import { EventosClient } from './eventos-client'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Eventos — Dashboard ABVCAP' }

export default async function EventosPage() {
  await requireAdmin()
  let editions: Awaited<ReturnType<typeof getEditions>> = []
  let weeklyGoalsByEdition: Record<string, RegistrationWeeklyGoal[]> = {}
  try {
    editions = await getEditions()
    const goalLists = await Promise.all(editions.map(e => getRegistrationWeeklyGoals(e.id)))
    weeklyGoalsByEdition = Object.fromEntries(editions.map((e, i) => [e.id, goalLists[i]]))
  } catch { editions = [] }

  return (
    <div className="p-8 space-y-8">
      <div className="border-b border-border pb-6">
        <p className="text-[10px] font-mono tracking-[0.22em] text-muted-foreground uppercase mb-1">
          Gestão
        </p>
        <h1 className="font-display text-3xl text-foreground leading-none">Eventos</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Crie e gerencie edições do Congresso ABVCAP. Cada edição agrupa participantes, inscrições e respostas de formulário.
        </p>
      </div>
      <EventosClient editions={editions} weeklyGoalsByEdition={weeklyGoalsByEdition} />
    </div>
  )
}
