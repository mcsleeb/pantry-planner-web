'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName.trim() || email.split('@')[0] },
          emailRedirectTo: `${window.location.origin}/plan`
        }
      })
      if (error) {
        setError(error.message)
        return
      }

      // Two scenarios:
      //   - "Confirm email" enabled in Supabase: data.user has no session yet; we tell user to check email
      //   - Confirmation disabled: session exists; redirect straight to app
      if (data.session) {
        router.push('/plan')
        router.refresh()
      } else {
        setInfo('Check your email for a confirmation link.')
      }
    } catch {
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

      <h1>Create an account</h1>
      <p className="auth-sub">A small, careful kitchen of your own.</p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div>
          <label className="field-label" htmlFor="display_name">Your name</label>
          <input
            id="display_name"
            type="text"
            className="input"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="What should we call you?"
            autoFocus
          />
        </div>
        <div>
          <label className="field-label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="input"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
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
            minLength={8}
            placeholder="At least 8 characters"
          />
        </div>

        {error && <div className="auth-error">{error}</div>}
        {info && (
          <div className="auth-error" style={{ background: 'rgba(74, 92, 46, 0.06)', borderLeftColor: 'var(--moss)', color: 'var(--moss-deep)' }}>
            {info}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || !email || !password}
        >
          {loading ? 'Creating account…' : 'Sign up'}
        </button>
      </form>

      <div className="auth-footer">
        Already have one? <Link href="/login">Log in</Link>
      </div>
    </div>
  )
}
