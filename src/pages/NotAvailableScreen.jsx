/**
 * src/pages/NotAvailableScreen.jsx
 * Roshetta plan, Phase K, step 12.5 (no dead ends, cases K18 and K19).
 *
 * The one screen for "there is nothing here": an address that matches no screen, and a drug,
 * generic or topic that is missing, removed or reached by a wrong link. Before this, an unknown
 * address drew nothing at all, the drug page offered only a way to the Drugs list, and the topic
 * page had no button.
 *
 * It always gives a way out:
 *   - Home      always. Replaces this screen, like the other "not available" screens do.
 *   - Back      only when a screen is really behind this one (the history has an earlier step),
 *               named after that screen when it is known ("Drugs"), "Back" otherwise.
 * The bottom bar stays, so the tabs are one tap away too.
 *
 * Props (all optional):
 *   title   main line, default "This page isn't available"
 *   body    second line, default says the address may be wrong or the page removed
 *   Icon    a lucide icon component, default FileX
 *
 * Not used by the shared group and roshetta pages (/g, /r) or the group and roshetta screens:
 * those already have their own clear problem screens with a button out.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileX, ChevronLeft } from 'lucide-react'
import BottomNav from '../components/BottomNav'
import { useBackLabel } from '../hooks/useBackLabel'
import { useScreenTitle } from '../hooks/useScreenTitle'
import { hasStepBehind } from '../utils/arrivalRecord'
import { HOME_PATH } from '../utils/navRules'

const font = 'var(--font-body)'

const primaryButton = {
  minHeight: 44, padding: '0 var(--space-6)', borderRadius: 'var(--radius-md)',
  border: 'none', cursor: 'pointer', backgroundColor: 'var(--color-accent-solid)', color: '#fff',
  fontSize: 14, fontWeight: 600, fontFamily: font, WebkitTapHighlightColor: 'transparent',
}

const softButton = {
  minHeight: 44, padding: '0 var(--space-4)', background: 'none', border: 'none', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 4,
  color: 'var(--color-accent-text)', fontSize: 14, fontWeight: 500, fontFamily: font,
  WebkitTapHighlightColor: 'transparent',
}

export default function NotAvailableScreen({
  title = "This page isn't available",
  body = 'The address may be wrong, or the page may have been removed.',
  Icon = FileX,
}) {
  const navigate = useNavigate()
  const backLabel = useBackLabel()
  useScreenTitle('Not available')
  // Read once when the screen opens: whether a screen sits behind this one.
  const [canGoBack] = useState(() => hasStepBehind(window.history.state))

  return (
    <div style={{
      minHeight: '100dvh', boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
      backgroundColor: 'var(--color-bg)', fontFamily: font, color: 'var(--color-text-primary)',
    }}>
      <main style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 'var(--space-3)', padding: 'var(--space-6)', paddingBottom: 'calc(60px + var(--space-6))',
        textAlign: 'center',
      }}>
        <Icon size={36} color="var(--color-text-tertiary)" aria-hidden="true" />
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--color-text-primary)' }}>{title}</h1>
        <p style={{ margin: 0, maxWidth: 320, fontSize: 14, lineHeight: 1.5, color: 'var(--color-text-secondary)' }}>{body}</p>
        <div style={{ marginTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-1)' }}>
          <button type="button" onClick={() => navigate(HOME_PATH, { replace: true })} style={primaryButton}>
            Go to Home
          </button>
          {canGoBack && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label={backLabel ? `Back to ${backLabel}` : 'Back'}
              style={softButton}
            >
              <ChevronLeft size={16} aria-hidden="true" />
              {backLabel ?? 'Back'}
            </button>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
