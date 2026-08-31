import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { getSupabase } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PostBody = z.object({
  editionId: z.string().uuid(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (esperado YYYY-MM-DD)'),
  targetCount: z.number().int().positive(),
})

// Segunda-feira da semana ISO a que a data pertence, em UTC — mesma
// convenção usada nos gráficos semanais (overview-charts.tsx).
function startOfWeek(iso: string): string {
  const dt = new Date(`${iso}T00:00:00Z`)
  const diffToMonday = (dt.getUTCDay() + 6) % 7
  dt.setUTCDate(dt.getUTCDate() - diffToMonday)
  return dt.toISOString().slice(0, 10)
}

export async function POST(req: Request) {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  let raw: unknown
  try { raw = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }
  const parsed = PostBody.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Payload inválido', details: parsed.error.issues }, { status: 400 })

  const { data, error } = await getSupabase()
    .from('registration_weekly_goals')
    .upsert(
      {
        edition_id: parsed.data.editionId,
        week_start: startOfWeek(parsed.data.weekStart),
        target_count: parsed.data.targetCount,
      },
      { onConflict: 'edition_id,week_start' }
    )
    .select('id, week_start, target_count')
    .single()

  if (error) return NextResponse.json({ error: 'Falha ao salvar meta semanal', details: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 200 })
}

const DeleteBody = z.object({
  id: z.string().uuid(),
})

export async function DELETE(req: Request) {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  let raw: unknown
  try { raw = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }
  const parsed = DeleteBody.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Payload inválido', details: parsed.error.issues }, { status: 400 })

  const { error } = await getSupabase()
    .from('registration_weekly_goals')
    .delete()
    .eq('id', parsed.data.id)

  if (error) return NextResponse.json({ error: 'Falha ao remover meta semanal', details: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
