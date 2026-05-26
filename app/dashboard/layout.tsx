import { Sidebar } from '@/components/sidebar'
import { getEditions } from '@/lib/data'
import { getActiveEditionId } from '@/lib/edition-cookie'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let editions: Awaited<ReturnType<typeof getEditions>> = []
  let activeEditionId = ''
  try {
    editions = await getEditions()
    if (editions.length > 0) {
      try { activeEditionId = await getActiveEditionId() } catch { activeEditionId = editions[0].id }
    }
  } catch {
    // banco vazio ou erro de conexão — sidebar renderiza estado vazio
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar editions={editions} activeEditionId={activeEditionId} />
      <main className="flex-1 overflow-auto bg-background">
        {children}
      </main>
    </div>
  )
}
