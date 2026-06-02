import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { isEmailAllowed } from '@/lib/auth-config'

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

  const email = data.user.email ?? ''
  if (!isEmailAllowed(email)) {
    await supabase.auth.signOut()
    return NextResponse.json(
      { error: 'Acesso não autorizado para este email.' },
      { status: 403 }
    )
  }

  // Auto-concede viewer a usuários @abvcap.com.br sem role definido
  const role = (data.user.app_metadata as { role?: string } | null)?.role
  if (!role) {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    await adminClient.auth.admin.updateUserById(data.user.id, {
      app_metadata: { role: 'viewer' },
    })
  }

  return NextResponse.json({ ok: true, redirect: '/dashboard' })
}
