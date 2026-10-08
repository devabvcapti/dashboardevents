import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { getSupabase } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z.object({
  id: z.string().uuid(),
  eventSeries: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/).max(50).nullable(),
})

export async function PATCH(req: Request) {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  let raw: unknown
  try { raw = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }
  const parsed = Body.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Payload inválido', details: parsed.error.issues }, { status: 400 })

  const { error } = await getSupabase()
    .from('editions')
    .update({ event_series: parsed.data.eventSeries })
    .eq('id', parsed.data.id)

  if (error) return NextResponse.json({ error: 'Falha ao salvar série do evento', details: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
