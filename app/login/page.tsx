import Image from 'next/image'
import { LoginForm } from './login-form'

export const metadata = { title: 'Login — Dashboard ABVCAP' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>
}) {
  const { redirect, error } = await searchParams
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Image
              src="/logo-abvcap-azul.png"
              alt="ABVCAP"
              width={140}
              height={40}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="font-display text-2xl">Dashboard Eventos</h1>
          <p className="text-sm text-muted-foreground">
            Acesso restrito a administradores.
          </p>
        </div>
        <LoginForm
          redirectTo={redirect ?? '/dashboard'}
          initialError={
            error === 'forbidden'
              ? 'Acesso restrito a administradores.'
              : null
          }
        />
      </div>
    </div>
  )
}
