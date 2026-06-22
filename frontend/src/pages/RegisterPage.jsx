import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import { register } from '../services/authService'
import { useAuthStore } from '../store/authStore'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function RegisterPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!EMAIL_RE.test(email)) {
      setError('Enter a valid email address.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      const res = await register({ email, password })
      setAuth(res.access_token, res.user)
      navigate('/app')
    } catch (err) {
      setError(err.message || 'Sign up failed.')
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-900 px-6 py-12 text-mist-100">
      <Link to="/" className="mb-8 flex items-center gap-2">
        <Logo className="h-8 w-8" />
        <span className="font-display text-xl font-semibold tracking-tight">
          Video<span className="text-amber-500">RAG</span>
        </span>
      </Link>

      <div className="w-full max-w-sm rounded-2xl border border-ink-600 bg-ink-800/60 p-7 shadow-lg backdrop-blur">
        <p className="font-mono text-xs uppercase tracking-eyebrow text-amber-500">
          Get started
        </p>
        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight">
          Create your account
        </h1>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-xs uppercase tracking-eyebrow text-mist-500">
              Email
            </span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-mist-100 placeholder:text-mist-500 focus:border-amber-500/50 focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-xs uppercase tracking-eyebrow text-mist-500">
              Password
            </span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-mist-100 placeholder:text-mist-500 focus:border-amber-500/50 focus:outline-none"
            />
            <span className="text-xs text-mist-500">At least 8 characters.</span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-xs uppercase tracking-eyebrow text-mist-500">
              Confirm password
            </span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className="rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-mist-100 placeholder:text-mist-500 focus:border-amber-500/50 focus:outline-none"
            />
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 rounded-xl bg-amber-500 px-4 py-2.5 font-semibold text-ink-900 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-mist-300">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-amber-500 hover:text-amber-400">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
