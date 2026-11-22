/**
 * src/components/admin/TakedownActions.jsx
 * 2026-11-22 (step 14.9c-4b): the buttons Turn off sharing / Restore sharing / Take username back for one person.
 * Used on the profile cards of the Reports screen, on the flagged profiles of the Blocked words screen and in the
 * Sharing turned off list. Each button asks first in plain words (utils/takedownAdmin.js); the database writes the
 * Audit Log line itself. Renders buttons for the row it sits in, plus a short answer line after an action.
 *
 * Props: profileId, name, handle, sharingOff (true, false, or null when unknown), disabled, onChanged (called after
 * an action that worked or was already done, so the screen reads again).
 */

import { useState } from 'react'
import ConfirmModal from './ConfirmModal'
import { runTakedownAction } from '../../utils/takedownAdminContent'
import { takedownButtons, confirmCopy, resultText } from '../../utils/takedownAdmin'

const buttonBase = {
  padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600,
  fontFamily: 'var(--font-body)', cursor: 'pointer',
}

export default function TakedownActions({ profileId, name, handle, sharingOff = null, disabled = false, onChanged }) {
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  async function run() {
    const action = pending
    setPending(null)
    setBusy(true)
    setNotice('')
    const r = await runTakedownAction(action, profileId)
    setBusy(false)
    setNotice(resultText(r.status))
    if (r.status === 'ok' || r.status === 'gone') onChanged?.()
  }

  const off = disabled || busy
  const copy = pending ? confirmCopy(pending, { name, handle }) : null
  const okNotice = notice === resultText('ok')

  return (
    <>
      {takedownButtons({ handle, sharingOff }).map(a => (
        <button
          key={a.key}
          type="button"
          disabled={off}
          onClick={() => setPending(a.key)}
          style={{
            ...buttonBase,
            border: a.danger ? 'none' : '1px solid var(--color-border)',
            backgroundColor: a.danger ? 'var(--color-error, #ef4444)' : 'var(--color-surface)',
            color: a.danger ? '#fff' : 'var(--color-text-primary)',
            opacity: off ? 0.55 : 1, cursor: off ? 'default' : 'pointer',
          }}
        >
          {a.label}
        </button>
      ))}
      {notice && (
        <span role="status" style={{ flexBasis: '100%', fontSize: 13, color: okNotice ? '#065F46' : '#DC2626' }}>{notice}</span>
      )}
      <ConfirmModal
        isOpen={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={run}
        title={copy?.title}
        message={copy?.message}
        confirmLabel={copy?.confirmLabel}
        confirmVariant={copy?.confirmVariant}
      />
    </>
  )
}
