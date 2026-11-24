/**
 * src/components/home/HomeTopBar.jsx
 * Phase H, step 9.3 — the top bar of Home: the CAPSULA wordmark on the left, the notification bell and
 * the dark mode button on the right (plus an Admin pages button for admin accounts only), drawn the same as the Topics screen's own bar (which keeps its own).
 */
import { useNavigate } from 'react-router-dom'
import { Bell, Sun, Moon, Monitor, LayoutDashboard } from 'lucide-react'
import { useTapGuard } from '../../hooks/useTapGuard'
import { useUnreadNotifications } from '../../hooks/useNotifications'
import { useDarkMode } from '../../hooks/useDarkMode'
import { useAuth } from '../../hooks/useAuth'
import { ROUTES } from '../../router'

const THEME_CYCLE = ['light', 'dark', 'system']
const THEME_LABELS = {
  light:  'Light mode \u2014 tap to switch',
  dark:   'Dark mode \u2014 tap to switch',
  system: 'System theme \u2014 tap to switch',
}
const THEME_ICONS = { light: Sun, dark: Moon, system: Monitor }

const roundButton = {
  width: 36, height: 36, borderRadius: 'var(--radius-full)', border: '1.5px solid var(--color-border)',
  backgroundColor: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', flexShrink: 0, color: 'var(--color-text-secondary)', outline: 'none',
  WebkitTapHighlightColor: 'transparent',
}

export default function HomeTopBar() {
  const { theme, setTheme } = useDarkMode()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const unreadNotifications = useUnreadNotifications()
  const { openPage } = useTapGuard()
  // 2026-11-23: the app has no address bar, so admin accounts get a button here that opens /admin.
  // Same rule as AuthGuard (profile.role is 'admin'); everyone else sees nothing.
  const isAdmin = profile?.role === 'admin'
  const ThemeIcon = THEME_ICONS[theme] ?? Sun

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minHeight: 44 }}>
      <img
        src={`${import.meta.env.BASE_URL}logo.svg`}
        alt="Capsula"
        className="capsula-logo"
        style={{ display: 'block', height: 30, width: 'auto' }}
      />
      <span style={{ flex: 1 }} />
      {isAdmin && (
        <button onClick={() => navigate(ROUTES.ADMIN)} aria-label="Admin pages" style={roundButton}>
          <LayoutDashboard size={16} />
        </button>
      )}
      <button
        onClick={() => openPage(ROUTES.NOTIFICATIONS)}
        aria-label={unreadNotifications > 0 ? 'Notifications, you have unread notifications' : 'Notifications'}
        style={{ ...roundButton, position: 'relative' }}
      >
        <Bell size={16} />
        {unreadNotifications > 0 && (
          <span style={{
            position: 'absolute', top: 5, right: 6, width: 9, height: 9,
            borderRadius: '50%', backgroundColor: 'var(--color-danger)',
            border: '1.5px solid var(--color-surface)',
          }} />
        )}
      </button>
      <button
        onClick={() => setTheme(THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length])}
        aria-label={THEME_LABELS[theme]}
        style={roundButton}
      >
        <ThemeIcon size={16} />
      </button>
    </div>
  )
}
