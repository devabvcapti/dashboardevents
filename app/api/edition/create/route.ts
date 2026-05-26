import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { getSupabase } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z.object({
  name: z.string().min(1).max(200),
  year: z.number().int().min(2000).max(2100),
})

export async function POST(req: Request) {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  let raw: unknown
  try { raw = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }
  const parsed = Body.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Payload inválido', details: parsed.error.issues }, { status: 400 })

  const { data, error } = await getSupabase()
    .from('editions')
    .insert({ name: parsed.data.name, year: parsed.data.year })
    .select('id, name, year, created_at')
    .single()
  if (error) return NextResponse.json({ error: 'Falha ao criar edição', details: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
