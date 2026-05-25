import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { Database } from './lib/database.types'

/**
 * Middleware: refresca sessão Supabase e protege rotas.
 * Rotas protegidas: /dashboard/**, /api/** EXCETO /api/auth/**.
 * Rotas públicas: /login, /api/auth/**, /, /_next/**.
 */
export async function middleware(req: NextRequest) {
  let response = NextResponse.next({ request: req })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          response = NextResponse.next({ request: req })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              httpOnly: true,
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
            } as CookieOptions)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = req.nextUrl.pathname
  const isProtected =
    path.startsWith('/dashboard') ||
    (path.startsWith('/api') && !path.startsWith('/api/auth'))

  if (isProtected) {
    if (!user) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('redirect', path)
      return NextResponse.redirect(loginUrl)
    }
    const role = (user.app_metadata as { role?: string } | null)?.role
    if (role !== 'admin') {
      // Não-admin: logout forçado e redirect
      await supabase.auth.signOut()
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('error', 'forbidden')
      return NextResponse.redirect(loginUrl)
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static, _next/image
     * - favicon, public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
