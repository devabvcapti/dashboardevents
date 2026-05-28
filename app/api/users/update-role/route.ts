import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z.object({
  userId: z.string().uuid(),
  role: z.enum(['admin', 'viewer']),
})

export async function POST(req: Request) {
  let me: Awaited<ReturnType<typeof requireAdmin>>
  try { me = await requireAdmin() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  let raw: unknown
  try { raw = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }
  const parsed = Body.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })

  if (parsed.data.userId === me.id && parsed.data.role !== 'admin') {
    return NextResponse.json({ error: 'Você não pode remover seu próprio acesso de admin.' }, { status: 400 })
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error } = await adminClient.auth.admin.updateUserById(parsed.data.userId, {
    app_metadata: { role: parsed.data.role },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
