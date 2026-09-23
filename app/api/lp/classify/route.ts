import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { upsertLpCompanyCategory, deleteLpCompanyCategory, LP_CATEGORIES } from '@/lib/data'
import type { LpCategory } from '@/lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CATEGORY_VALUES = LP_CATEGORIES as [LpCategory, ...LpCategory[]]

const Body = z.object({
  companyName: z.string().trim().min(1),
  category: z.enum(CATEGORY_VALUES),
})

export async function POST(req: Request) {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  let raw: unknown
  try { raw = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }
  const parsed = Body.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })

  try {
    await upsertLpCompanyCategory(parsed.data.companyName, parsed.data.category)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro ao classificar' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

const DeleteBody = z.object({
  companyKey: z.string().trim().min(1),
})

export async function DELETE(req: Request) {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  let raw: unknown
  try { raw = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }
  const parsed = DeleteBody.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })

  try {
    await deleteLpCompanyCategory(parsed.data.companyKey)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro ao remover classificação' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
