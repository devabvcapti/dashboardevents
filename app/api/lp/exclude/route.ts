import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { excludeLpCompany, restoreLpCompany } from '@/lib/data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z.object({
  companyName: z.string().trim().min(1),
  reason: z.string().trim().min(1).nullable().optional(),
})

export async function POST(req: Request) {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  let raw: unknown
  try { raw = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }
  const parsed = Body.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })

  try {
    await excludeLpCompany(parsed.data.companyName, parsed.data.reason ?? null)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro ao excluir empresa' }, { status: 500 })
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
    await restoreLpCompany(parsed.data.companyKey)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro ao restaurar empresa' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
