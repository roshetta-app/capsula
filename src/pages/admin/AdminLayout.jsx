import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCapsules, faNotesMedical, faStethoscope, faTags,
  faChartBar, faBug, faBell, faClipboardList, faUsers,
} from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../../hooks/useAuth'

/**
 * AdminLayout — shared shell for all /admin/* screens (post-D1/D2).
 *
 * Fixed, always-expanded sidebar (no small-viewport case to design around —
 * admin CMS is web-only, confirmed live, D34/F13 history) + a content pane
 * rendering <Outlet/> for whichever screen is active.
 *
 * Nav list is the same 9 destinations that used to live in AdminDashboard's
 * NAV_CARDS (D2) — carried over here verbatim (path/label/icon), not
 * reinvented. AdminDashboard.jsx itself is retired as a route; its content
 * (stat cards) now lives at the index route via AdminSummary.jsx.
 *
 * Per D4, this shell now owns all admin page chrome — including sign out,
 * which previously lived in AdminDashboard's own header and has no other
 * home now that that header is gone.
 */

const NAV_ITEMS = [
  {
    path:   '/admin/drugs',
    label:  'Drug Library',
    faIcon: faCapsules,
  },
  {
    path:   '/admin/categories',
    label:  'Categories',
    faIcon: faTags,
  },
  {
    path:   '/admin/conditions',
    label:  'Conditions',
    faIcon: faNotesMedical,
  },
  {
    path:   '/admin/specialties',
    label:  'Specialties',
    faIcon: faStethoscope,
  },
  {
    path:   '/admin/analytics',
    label:  'Analytics',
    faIcon: faChartBar,
  },
  {
    path:   '/admin/crash-logs',
    label:  'Crash Logs',
    faIcon: faBug,
  },
  {
    path:   '/admin/notifications',
    label:  'Notifications',
    faIcon: faBell,
  },
  {
    path:   '/admin/audit-log',
    label:  'Audit Log',
    faIcon: faClipboardList,
  },
  {
    path:   '/admin/users',
    label:  'Users',
    faIcon: faUsers,
  },
]

export default function AdminLayout() {
  const { signOut } = useAuth()
  const navigate     = useNavigate()
  const location      = useLocation()

  async function handleSignOut() {
    await signOut()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div style={{
      minHeight: '100dvh',
      backgroundColor: 'var(--color-bg)',
      display: 'flex',
    }}>

      {/* Sidebar */}
      <aside style={{
        width: 248,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        minHeight: '100dvh',
      }}>

        {/* Brand */}
        <div style={{
          padding: 'var(--space-4)',
          borderBottom: '1px solid var(--color-border)',
        }}>
          <div style={{
            fontSize: 18,
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

        {/* Nav list */}
        <nav style={{
          flex: 1,
          padding: 'var(--space-3)',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          overflowY: 'auto',
        }}>
          {NAV_ITEMS.map(item => {
            const active = location.pathname === item.path
              || location.pathname.startsWith(item.path + '/')

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  backgroundColor: active ? 'var(--color-accent-light)' : 'transparent',
                  color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  fontSize: 14,
                  fontWeight: active ? 600 : 500,
                  fontFamily: 'var(--font-body)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  width: '100%',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <FontAwesomeIcon icon={item.faIcon} style={{ width: 16, height: 16, flexShrink: 0 }} />
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Sign out */}
        <div style={{
          padding: 'var(--space-3)',
          borderTop: '1px solid var(--color-border)',
        }}>
          <button
            onClick={handleSignOut}
            aria-label="Sign out"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'transparent',
              color: 'var(--color-text-secondary)',
              fontSize: 13,
              fontWeight: 500,
              fontFamily: 'var(--font-body)',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Content pane — active screen renders here */}
      <main style={{
        flex: 1,
        minWidth: 0,
      }}>
        <Outlet />
      </main>
    </div>
  )
}
