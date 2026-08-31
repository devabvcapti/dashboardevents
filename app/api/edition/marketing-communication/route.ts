import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { getSupabase } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PostBody = z.object({
  editionId: z.string().uuid(),
  sentAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (esperado YYYY-MM-DD)'),
  channel: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
})

export async function POST(req: Request) {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  let raw: unknown
  try { raw = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }
  const parsed = PostBody.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Payload inválido', details: parsed.error.issues }, { status: 400 })

  const { data, error } = await getSupabase()
    .from('marketing_communications')
    .insert({
      edition_id: parsed.data.editionId,
      sent_at: parsed.data.sentAt,
      channel: parsed.data.channel.trim(),
      description: parsed.data.description?.trim() || null,
    })
    .select('id, sent_at, channel, description')
    .single()

  if (error) return NextResponse.json({ error: 'Falha ao salvar comunicado', details: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
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
    .from('marketing_communications')
    .delete()
    .eq('id', parsed.data.id)

  if (error) return NextResponse.json({ error: 'Falha ao remover comunicado', details: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
