import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { getSupabase } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CATEGORY_VALUES = [
  'PATROCINADOR',
  'APOIADOR',
  'ESTRATEGICO',
  'PALESTRANTES',
  'CONVIDADOS_PALESTRANTES',
  'IMPRENSA',
  'VIPS',
  'CONSELHO_ABVCAP',
  'PARCEIRO',
] as const

const PostBody = z.object({
  editionId: z.string().uuid(),
  couponCode: z.string().min(1).max(200),
  category: z.enum(CATEGORY_VALUES),
})

export async function POST(req: Request) {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  let raw: unknown
  try { raw = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }
  const parsed = PostBody.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Payload inválido', details: parsed.error.issues }, { status: 400 })

  const { data, error } = await getSupabase()
    .from('coupon_categories')
    .upsert(
      {
        edition_id: parsed.data.editionId,
        coupon_code: parsed.data.couponCode,
        category: parsed.data.category,
      },
      { onConflict: 'edition_id,coupon_code' }
    )
    .select('id, coupon_code, category')
    .single()

  if (error) return NextResponse.json({ error: 'Falha ao salvar categoria', details: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

const DeleteBody = z.object({
  editionId: z.string().uuid(),
  couponCode: z.string().min(1).max(200),
})

export async function DELETE(req: Request) {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  let raw: unknown
  try { raw = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }
  const parsed = DeleteBody.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Payload inválido', details: parsed.error.issues }, { status: 400 })

  const { error } = await getSupabase()
    .from('coupon_categories')
    .delete()
    .eq('edition_id', parsed.data.editionId)
    .eq('coupon_code', parsed.data.couponCode)

  if (error) return NextResponse.json({ error: 'Falha ao remover categoria', details: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
