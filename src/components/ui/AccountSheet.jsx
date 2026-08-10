/**
 * src/components/ui/AccountSheet.jsx
 *
 * The sign-in popup — opened either manually (header icon in layout.jsx)
 * or automatically after a user's first favourite of a visit (D12/D16,
 * via useSignInPrompt). Never gates content on its own; it's just a
 * dismissible surface.
 *
 * Built on ConfirmSheet.jsx's pattern (portal to body,
 * shouldRender/animateIn delayed-unmount, fade+scale entrance,
 * token-based styling) rather than inventing a separate visual language
 * for this one popup.
 *
 * Props:
 *   isOpen             boolean
 *   onClose            () => void
 *   user               SupabaseUser | null
 *   signInWithGoogle    () => Promise<{ error }>
 *   signOut             () => Promise<void>
 *   onDismissForever    () => void   — signed-out only; "don't ask again" (D16).
 *                                      Omit to hide that option (e.g. when
 *                                      opened manually via the header icon,
 *                                      where it isn't relevant).
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export default function AccountSheet({
  isOpen,
  onClose,
  user,
  signInWithGoogle,
  signOut,
  onDismissForever,
}) {
  const overlayRef = useRef(null)
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState(null)

  // shouldRender keeps the DOM present during the exit transition.
  // animateIn drives the CSS open/closed visual state.
  const [shouldRender, setShouldRender] = useState(isOpen)
  const [animateIn,    setAnimateIn]    = useState(isOpen)

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
      requestAnimationFrame(() => setAnimateIn(true))
      setError(null)
    } else {
      setAnimateIn(false)
      const t = setTimeout(() => setShouldRender(false), 220)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!shouldRender) return null

  async function handleGoogleSignIn() {
    if (busy) return
    setBusy(true)
    setError(null)
    const { error: authError } = await signInWithGoogle()
    if (authError) {
      setError(authError.message ?? 'Sign-in failed. Please try again.')
      setBusy(false)
    }
    // On success, Supabase navigates away through the Google OAuth flow —
    // nothing further to do here.
  }

  async function handleSignOut() {
    if (busy) return
    setBusy(true)
    await signOut()
    setBusy(false)
    onClose()
  }

  function handleDismissForever() {
    onDismissForever?.()
    onClose()
  }

  // Rendered via portal to document.body — same reasoning as ConfirmSheet:
  // position: fixed only resolves against the viewport if no ancestor has
  // a transform/filter/etc that creates its own containing block, and
  // this can be opened from screens that do (e.g. condition detail's
  // tab-swipe wrapper).
  return createPortal(
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
      style={{
        position:        'fixed',
        inset:           0,
        zIndex:          1000,
        backgroundColor: 'rgba(0,0,0,0.45)',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        padding:         'var(--space-4)',
        opacity:         animateIn ? 1 : 0,
        transition:      'opacity var(--motion-base) var(--ease-reveal)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={user ? 'Account' : 'Sign in'}
        style={{
          width:           '100%',
          maxWidth:        360,
          backgroundColor: 'var(--color-surface)',
          borderRadius:    'var(--radius-lg)',
          boxShadow:       '0 24px 64px rgba(0,0,0,0.18)',
          padding:         'var(--space-5)',
          fontFamily:      'var(--font-body)',
          opacity:         animateIn ? 1 : 0,
          transform:       animateIn ? 'scale(1)' : 'scale(0.96)',
          transition:      'opacity var(--motion-base) var(--ease-reveal), transform var(--motion-base) var(--ease-settle)',
        }}
      >
        {user ? (
          <>
            <div style={{
              fontSize:     16,
              fontWeight:   700,
              color:        'var(--color-text-primary)',
              marginBottom: 'var(--space-2)',
            }}>
              Signed in
            </div>
            <p style={{
              margin:     '0 0 var(--space-5)',
              fontSize:   14,
              lineHeight: 1.55,
              color:      'var(--color-text-secondary)',
              wordBreak:  'break-word',
            }}>
              {user.email}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <button onClick={onClose} style={secondaryButtonStyle}>
                Close
              </button>
              <button
                onClick={handleSignOut}
                disabled={busy}
                style={primaryButtonStyle({ busy, destructive: true })}
              >
                {busy ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{
              fontSize:     16,
              fontWeight:   700,
              color:        'var(--color-text-primary)',
              marginBottom: 'var(--space-2)',
            }}>
              Create a free account
            </div>
            <p style={{
              margin:     '0 0 var(--space-5)',
              fontSize:   14,
              lineHeight: 1.55,
              color:      'var(--color-text-secondary)',
            }}>
              Sign in with Google to keep your favourites synced across devices.
            </p>

            {error && (
              <div style={{
                fontSize:        13,
                color:           '#DC2626',
                backgroundColor: '#FEF2F2',
                border:          '1px solid #FECACA',
                borderRadius:    'var(--radius-sm)',
                padding:         'var(--space-2) var(--space-3)',
                lineHeight:      1.4,
                marginBottom:    'var(--space-4)',
              }}>
                {error}
              </div>
            )}

            <button
              onClick={handleGoogleSignIn}
              disabled={busy}
              style={{
                ...primaryButtonStyle({ busy, destructive: false }),
                width:        '100%',
                marginBottom: 'var(--space-3)',
              }}
            >
              {busy ? 'Opening Google…' : 'Continue with Google'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={onClose} style={linkButtonStyle}>
                Not now
              </button>
              {onDismissForever && (
                <button onClick={handleDismissForever} style={linkButtonStyle}>
                  Don't ask again
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const secondaryButtonStyle = {
  padding:         'var(--space-2) var(--space-4)',
  borderRadius:    'var(--radius-sm)',
  border:          '1px solid var(--color-border)',
  backgroundColor: 'transparent',
  color:           'var(--color-text-secondary)',
  fontSize:        14,
  fontWeight:      500,
  fontFamily:      'var(--font-body)',
  cursor:          'pointer',
}

function primaryButtonStyle({ busy, destructive }) {
  return {
    padding:         'var(--space-2) var(--space-4)',
    borderRadius:    'var(--radius-sm)',
    border:          'none',
    backgroundColor: busy
      ? 'var(--color-border)'
      : destructive ? 'var(--color-danger)' : 'var(--color-accent)',
    color:           busy ? 'var(--color-text-tertiary)' : '#fff',
    fontSize:        14,
    fontWeight:      600,
    fontFamily:      'var(--font-body)',
    cursor:          busy ? 'not-allowed' : 'pointer',
  }
}

const linkButtonStyle = {
  padding:         'var(--space-1) 0',
  border:          'none',
  background:      'none',
  color:           'var(--color-text-tertiary)',
  fontSize:        13,
  fontFamily:      'var(--font-body)',
  cursor:          'pointer',
  textDecoration:  'underline',
}
