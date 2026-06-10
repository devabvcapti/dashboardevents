import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { getSupabase } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z.object({
  id: z.string().min(1),
})

export async function DELETE(req: Request) {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  let raw: unknown
  try { raw = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }
  const parsed = Body.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })

  const supabase = getSupabase()
  const editionId = parsed.data.id

  // Delete in FK order: form_responses → participants → import_jobs → editions
  const participantIds = await supabase
    .from('participants')
    .select('id')
    .eq('edition_id', editionId)
  if (participantIds.error) return NextResponse.json({ error: participantIds.error.message }, { status: 500 })

  const ids = (participantIds.data ?? []).map(r => r.id)
  if (ids.length > 0) {
    const { error: frErr } = await supabase.from('form_responses').delete().in('participant_id', ids)
    if (frErr) return NextResponse.json({ error: frErr.message }, { status: 500 })
  }

  const { error: pErr } = await supabase.from('participants').delete().eq('edition_id', editionId)
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })

  const { error: ijErr } = await supabase.from('import_jobs').delete().eq('edition_id', editionId)
  if (ijErr) return NextResponse.json({ error: ijErr.message }, { status: 500 })

  const { error: eErr } = await supabase.from('editions').delete().eq('id', editionId)
  if (eErr) return NextResponse.json({ error: eErr.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
