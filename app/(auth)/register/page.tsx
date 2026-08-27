'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter(); const [error, setError] = useState(''); const [loading, setLoading] = useState(false)
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading(true); setError(''); const form = new FormData(event.currentTarget); const response = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.get('name'), email: form.get('email'), password: form.get('password') }) }); if (response.ok) router.push('/login'); else { const data = await response.json(); setError(data.error) }; setLoading(false) }
  return <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6"><form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-8"><h1 className="text-2xl font-semibold">Create your TokenIQ account</h1><input name="name" required minLength={2} placeholder="Your name" className="w-full rounded border p-3" /><input name="email" required type="email" placeholder="you@company.com" className="w-full rounded border p-3" /><input name="password" required minLength={8} type="password" placeholder="Password (8+ characters)" className="w-full rounded border p-3" />{error && <p className="text-sm text-red-600">{error}</p>}<button disabled={loading} className="w-full rounded bg-indigo-600 p-3 text-white">{loading ? 'Creating account…' : 'Create account'}</button><p className="text-sm">Already have an account? <Link className="text-indigo-600" href="/login">Sign in</Link></p></form></main>
}
