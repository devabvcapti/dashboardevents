import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { deleteParticipant } from '@/lib/data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z.object({
  participantId: z.string().uuid(),
})

export async function DELETE(req: Request) {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  let raw: unknown
  try { raw = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }
  const parsed = Body.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })

  try {
    await deleteParticipant(parsed.data.participantId)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Falha ao cancelar inscrição' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
