'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TokenIQMark } from '@/components/brand/TokenIQMark'
import { Activity, ArrowRight, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('demo@example.com')
  const [password, setPassword] = useState('demo123')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
      } else if (result?.ok) {
        router.push('/')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#090d1b] px-5 py-8 text-slate-950 sm:px-8 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:p-0">
      <div className="pointer-events-none absolute -left-32 top-[-12rem] h-[34rem] w-[34rem] rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-52 left-[28%] h-[34rem] w-[34rem] rounded-full bg-indigo-500/25 blur-3xl" />

      <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden border-r border-white/10 px-12 py-10 text-white lg:flex xl:px-20">
        <div className="flex items-center gap-3">
          <TokenIQMark className="h-10 w-10" />
          <span className="text-xl font-semibold tracking-tight">TokenIQ</span>
        </div>

        <div className="max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-cyan-100 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            AI platform observability
          </div>
          <h1 className="text-5xl font-semibold leading-[1.05] tracking-[-0.04em] xl:text-6xl">
            Clarity for every AI request.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
            See the models, tokens, latency, and spend shaping your engineering workflows.
          </p>
        </div>

        <div className="grid max-w-xl grid-cols-3 gap-3 text-sm">
          {[
            ['Providers', 'OpenAI · Anthropic'],
            ['Signals', 'Tokens · latency'],
            ['Context', 'Costs · traces'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
              <Activity className="mb-4 h-4 w-4 text-cyan-300" />
              <p className="font-medium">{label}</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <main className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center lg:min-h-screen lg:bg-slate-50 lg:px-12">
        <div className="w-full max-w-[420px] rounded-3xl bg-white p-6 shadow-2xl shadow-slate-950/30 sm:p-8 lg:shadow-xl lg:shadow-slate-900/10">
          <div className="mb-9">
            <div className="mb-6 flex items-center justify-between lg:hidden">
              <div className="flex items-center gap-2.5 text-slate-950"><TokenIQMark className="h-8 w-8" /><span className="font-semibold">TokenIQ</span></div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">Workspace</span>
            </div>
            <p className="text-sm font-medium text-indigo-600">Welcome back</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Sign in to TokenIQ</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Access your team&apos;s AI platform signals.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">Work email</label>
              <div className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input id="email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} className="h-11 border-slate-200 pl-10 shadow-sm focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20" /></div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between"><label htmlFor="password" className="text-sm font-medium text-slate-700">Password</label><span className="text-xs text-slate-400">Credentials required</span></div>
              <div className="relative"><LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input id="password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} className="h-11 border-slate-200 pl-10 shadow-sm focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20" /></div>
            </div>

            {error && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}

            <Button type="submit" className="h-11 w-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700" disabled={isLoading}>
              {isLoading ? 'Signing you in…' : <>Continue to workspace <ArrowRight className="ml-1 h-4 w-4" /></>}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-600">New to TokenIQ? <Link href="/register" className="font-medium text-indigo-600 hover:underline">Create an account</Link></p>

          <div className="mt-7 flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3.5 text-xs leading-5 text-slate-600">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <p><span className="font-semibold text-slate-700">Demo access</span><br />demo@example.com · demo123</p>
          </div>
        </div>
      </main>
    </div>
  )
}
