import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

/**
 * AdminLogin — /admin/login
 *
 * No BottomNav (admin area has its own nav pattern).
 * Inline error display on bad credentials.
 * Successful sign-in navigates to /admin.
 */
export default function AdminLogin() {
  const { signIn } = useAuth()
  const navigate   = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState(null)
  const [busy,     setBusy]     = useState(false)

  useEffect(() => { document.title = 'Admin — Capsula' }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (busy) return
    setError(null)
    setBusy(true)

    const { error: authError } = await signIn(email.trim(), password)

    if (authError) {
      setError(authError.message ?? 'Sign-in failed. Check your credentials.')
      setBusy(false)
      return
    }

    navigate('/admin', { replace: true })
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-6) var(--space-4)',
      backgroundColor: 'var(--color-bg)',
    }}>

      {/* Logo / wordmark */}
      <div style={{ marginBottom: 'var(--space-8)', textAlign: 'center' }}>
        <div style={{
          fontSize: 28,
          fontWeight: 700,
          fontFamily: 'var(--font-body)',
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.02em',
        }}>
          Capsula
        </div>
        <div style={{
          marginTop: 'var(--space-1)',
          fontSize: 13,
          color: 'var(--color-text-tertiary)',
          fontFamily: 'var(--font-mono)',
        }}>
          Admin access
        </div>
      </div>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: 360,
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-6)',
        boxShadow: 'var(--shadow-card)',
      }}>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              style={inputStyle}
            />
          </div>

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              style={inputStyle}
            />
          </div>

          {/* Inline error */}
          {error && (
            <div style={{
              fontSize: 13,
              color: '#DC2626',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-2) var(--space-3)',
              lineHeight: 1.4,
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={busy}
            style={{
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: busy ? 'var(--color-border)' : 'var(--color-accent)',
              color: busy ? 'var(--color-text-tertiary)' : '#ffffff',
              fontSize: 15,
              fontWeight: 600,
              fontFamily: 'var(--font-body)',
              cursor: busy ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

        </form>
      </div>
    </div>
  )
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const labelStyle = {
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--color-text-secondary)',
  fontFamily: 'var(--font-body)',
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: 'var(--space-2) var(--space-3)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-bg)',
  color: 'var(--color-text-primary)',
  fontSize: 15,
  fontFamily: 'var(--font-body)',
  outline: 'none',
  appearance: 'none',
  WebkitAppearance: 'none',
}
