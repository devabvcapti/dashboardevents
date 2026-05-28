import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

const ALLOWED_DOMAIN = '@abvcap.com.br'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirect = searchParams.get('redirect') || '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const email = data.user.email ?? ''
  if (!email.endsWith(ALLOWED_DOMAIN)) {
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/login?error=forbidden`)
  }

  // Novos usuários recebem role 'viewer'. Usuários com role existente mantêm o role atual.
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const existingRole = (data.user.app_metadata as { role?: string } | null)?.role
  if (!existingRole) {
    await adminClient.auth.admin.updateUserById(data.user.id, {
      app_metadata: { role: 'viewer' },
    })
  }

  const safeRedirect = redirect.startsWith('/') ? redirect : '/dashboard'
  return NextResponse.redirect(`${origin}${safeRedirect}`)
}
