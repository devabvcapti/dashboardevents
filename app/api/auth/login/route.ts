import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { z } from 'zod'

const Body = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const parsed = Body.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Payload inválido' },
      { status: 400 }
    )
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error || !data.user) {
    return NextResponse.json(
      { error: 'Email ou senha inválidos.' },
      { status: 401 }
    )
  }

  const role = (data.user.app_metadata as { role?: string } | null)?.role
  if (role !== 'admin' && role !== 'viewer') {
    await supabase.auth.signOut()
    return NextResponse.json(
      { error: 'Acesso não autorizado. Solicite acesso ao administrador.' },
      { status: 403 }
    )
  }

  return NextResponse.json({ ok: true, redirect: '/dashboard' })
}
