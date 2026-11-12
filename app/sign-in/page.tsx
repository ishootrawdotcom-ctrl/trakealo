import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { GoogleSignIn } from '@/components/google-sign-in'
import { auth } from '@/lib/auth'

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect('/')

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#061a30] px-5 py-10 text-white">
      <section className="w-full max-w-md rounded-[32px] border border-white/10 bg-[#0c2946] p-7 shadow-2xl sm:p-10">
        <div className="mb-10 flex items-center justify-center gap-2 text-xl font-black tracking-tight">
          <span className="grid size-9 place-items-center rounded-xl bg-[#fcb515] text-[#061a30]">T</span>
          <span><b className="text-[#fcb515]">Tra</b>kealo</span>
        </div>
        <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-[#fcb515]">Tus finanzas, contigo</p>
        <h1 className="mt-3 text-center text-3xl font-bold">Bienvenido</h1>
        <p className="mx-auto mt-3 max-w-xs text-center text-sm leading-6 text-white/60">
          Inicia sesión con Google para guardar tus gastos y verlos en cualquier dispositivo.
        </p>
        <div className="mt-8"><GoogleSignIn /></div>
        <p className="mt-6 text-center text-xs leading-5 text-white/40">
          Cada cuenta de Google tiene sus propios datos privados. Al continuar, aceptas usar Trakealo para guardar tu información financiera.
        </p>
      </section>
    </main>
  )
}
