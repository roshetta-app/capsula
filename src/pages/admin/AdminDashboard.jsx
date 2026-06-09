import { useNavigate } from 'react-router-dom'
import { LogOut, ChevronRight } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCapsules, faNotesMedical, faStethoscope, faChartBar } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../../hooks/useAuth'

/**
 * AdminDashboard — /admin
 *
 * Nav cards: Drug Library → /admin/drugs
 *            Conditions   → /admin/conditions
 *            Specialties  → /admin/specialties   (added 3H)
 *            Analytics    → /admin/analytics     (added 3J)
 */

const NAV_CARDS = [
  {
    path:    '/admin/drugs',
    label:   'Drug Library',
    sub:     'Manage generics, formulations & stock',
    faIcon:  faCapsules,
  },
  {
    path:    '/admin/conditions',
    label:   'Conditions',
    sub:     'Manage clinical cards & prescriptions',
    faIcon:  faNotesMedical,
  },
  {
    path:    '/admin/specialties',
    label:   'Specialties',
    sub:     'Manage specialty list, icons & order',
    faIcon:  faStethoscope,
  },
  {
    path:    '/admin/analytics',
    label:   'Analytics',
    sub:     'Content health, search gaps, usage',
    faIcon:  faChartBar,
  },
]

export default function AdminDashboard() {
  const { signOut } = useAuth()
  const navigate    = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div style={{
      minHeight: '100dvh',
      backgroundColor: 'var(--color-bg)',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--space-4) var(--space-4)',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
      }}>
        <div>
          <div style={{
            fontSize: 20,
            fontWeight: 700,
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.01em',
          }}>
            Capsula Admin
          </div>
          <div style={{
            fontSize: 12,
            color: 'var(--color-text-tertiary)',
            fontFamily: 'var(--font-mono)',
            marginTop: 2,
          }}>
            Content management
          </div>
        </div>

        <button
          onClick={handleSignOut}
          aria-label="Sign out"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            backgroundColor: 'transparent',
            color: 'var(--color-text-secondary)',
            fontSize: 13,
            fontWeight: 500,
            fontFamily: 'var(--font-body)',
            cursor: 'pointer',
          }}
        >
          <LogOut size={15} />
          Sign out
        </button>
      </header>

      {/* Nav cards */}
      <main style={{
        flex: 1,
        padding: 'var(--space-6) var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        maxWidth: 520,
        width: '100%',
        margin: '0 auto',
      }}>
        {NAV_CARDS.map(card => (
          <button
            key={card.path}
            onClick={() => navigate(card.path)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-4)',
              padding: 'var(--space-4) var(--space-4)',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-card)',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              fontFamily: 'var(--font-body)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {/* Icon */}
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-accent-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: 'var(--color-accent)',
            }}>
              <FontAwesomeIcon icon={card.faIcon} style={{ width: 22, height: 22 }} />
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                marginBottom: 3,
              }}>
                {card.label}
              </div>
              <div style={{
                fontSize: 13,
                color: 'var(--color-text-tertiary)',
                lineHeight: 1.4,
              }}>
                {card.sub}
              </div>
            </div>

            {/* Chevron */}
            <ChevronRight size={18} color="var(--color-text-tertiary)" style={{ flexShrink: 0 }} />
          </button>
        ))}
      </main>
    </div>
  )
}
