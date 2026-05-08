'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
        return
      }
      // Force a full navigation so middleware re-runs and sees the new session
      router.push('/plan')
      router.refresh()
    } catch (err) {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-brand">
        <div className="auth-brand-mark">P</div>
        <div className="auth-brand-name">Pantry Planner</div>
      </div>

      <h1>Welcome back</h1>
      <p className="auth-sub">Log in to plan the week.</p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div>
          <label className="field-label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="input"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div>
          <label className="field-label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className="input"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <div className="auth-error">{error}</div>}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || !email || !password}
        >
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <div className="auth-footer">
        New here? <Link href="/signup">Create an account</Link>
      </div>
    </div>
  )
}
