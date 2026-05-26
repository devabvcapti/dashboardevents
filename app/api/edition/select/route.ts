import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { getSupabase } from '@/lib/supabase'
import { ACTIVE_EDITION_COOKIE } from '@/lib/edition-cookie'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z.object({ editionId: z.string().uuid() })

export async function POST(req: Request) {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  let raw: unknown
  try { raw = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }
  const parsed = Body.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Payload inválido', details: parsed.error.issues }, { status: 400 })

  // Anti cookie-poisoning: verifica que editionId existe
  const { data, error } = await getSupabase()
    .from('editions')
    .select('id')
    .eq('id', parsed.data.editionId)
    .maybeSingle()
  if (error) return NextResponse.json({ error: 'Erro ao verificar edição' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Edição não encontrada' }, { status: 404 })

  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_EDITION_COOKIE, parsed.data.editionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  return NextResponse.json({ ok: true })
}
