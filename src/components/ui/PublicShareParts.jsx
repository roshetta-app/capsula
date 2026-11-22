/**
 * src/components/ui/PublicShareParts.jsx
 * 2026-11-22 (Public profile plan, step 14.5a): the pieces the roshetta and group share sheets have in
 * common for the Private / Public choice, so the two sheets say the same things in the same way.
 *
 *   VisibilityRow   two choices, Private and Public, the current one marked (not used for old links)
 *   OldLinkTag      a small grey tag for a link made before the profile existed
 *   MakePublicPanel "Make it public to share it?" (or "Make this link public?" for an old link) with
 *                   the plain lines, the copy notice and two buttons; with no username yet it says
 *                   to set up the public profile first and has no Make public button
 *
 * No data and no database in here: the sheet hands in what to show and what to do.
 */

import { Eye, PencilOff, UserRound, Copy as CopyIcon } from 'lucide-react'
import { COPY_NOTICE, SETUP_FIRST, refusalText } from '../../utils/publicShare'

const TEXT = { fontFamily: 'var(--font-body)' }

export function VisibilityRow({ mode, onChoosePrivate, onChoosePublic, disabled = false }) {
  const options = [
    { key: 'private', label: 'Private', onClick: onChoosePrivate },
    { key: 'public', label: 'Public', onClick: onChoosePublic },
  ]
  return (
    <div
      role="group"
      aria-label="Who can see it"
      style={{
        display: 'flex', gap: 4, padding: 4, marginBottom: 'var(--space-4)',
        borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface-muted)',
      }}
    >
      {options.map(({ key, label, onClick }) => {
        const on = mode === key
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            disabled={disabled}
            onClick={on ? undefined : onClick}
            style={{
              flex: 1, minHeight: 44, borderRadius: 'var(--radius-sm, 8px)', border: 'none',
              cursor: on || disabled ? 'default' : 'pointer', outline: 'none', WebkitTapHighlightColor: 'transparent',
              backgroundColor: on ? 'var(--color-surface)' : 'transparent',
              color: on ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              boxShadow: on ? '0 1px 2px rgba(0,0,0,0.12)' : 'none',
              fontSize: 15, fontWeight: 600, opacity: disabled ? 0.6 : 1, ...TEXT,
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

export function OldLinkTag() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 'var(--radius-full)',
      backgroundColor: 'var(--color-surface-muted)', color: 'var(--color-text-secondary)',
      fontSize: 13, fontWeight: 600, ...TEXT,
    }}>
      Old link
    </span>
  )
}

function Line({ Icon, children }) {
  return (
    <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <Icon size={18} color="var(--color-text-secondary)" strokeWidth={1.8} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
      <span style={{ fontSize: 15, lineHeight: 1.45, color: 'var(--color-text-primary)', ...TEXT }}>{children}</span>
    </li>
  )
}

/**
 * Props:
 *   kind      'roshetta' | 'group'
 *   old       true for an old link (title and lines change; the link itself stays the same)
 *   canSetUp  true when a username exists; false shows "Set up your public profile first." instead of buttons
 *   busy      true while saving
 *   refusal   a reason from the database (item_web, item_phone) to show under the lines, or null
 *   onConfirm () => void   Make public
 *   onCancel  () => void   Not now
 */
export function MakePublicPanel({ kind, old = false, canSetUp, busy = false, refusal = null, onConfirm, onCancel }) {
  const noun = kind === 'group' ? 'group' : 'roshetta'
  const viewLine = kind === 'group'
    ? 'Anyone with the link can view this group: its name, description and drugs.'
    : 'Anyone with the link can view this roshetta: its name, description, drugs, doses and text.'
  const refusalLine = refusalText(refusal)
  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 'var(--space-3)', ...TEXT }}>
        {old ? 'Make this link public?' : 'Make it public to share it?'}
      </div>
      <ul style={{ listStyle: 'none', margin: '0 0 var(--space-4)', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Line Icon={UserRound}>
          {old
            ? `This ${noun} will show on your public profile, with your name. The link stays the same.`
            : `This ${noun} will show on your public profile, with your name.`}
        </Line>
        <Line Icon={Eye}>{viewLine}</Line>
        <Line Icon={PencilOff}>They can&apos;t change it.</Line>
        <Line Icon={CopyIcon}>{COPY_NOTICE}</Line>
      </ul>

      {refusalLine && (
        <p role="alert" style={{ margin: '0 0 var(--space-3)', fontSize: 14, lineHeight: 1.45, color: 'var(--color-danger)', fontWeight: 600, ...TEXT }}>
          {refusalLine}
        </p>
      )}

      {canSetUp ? (
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          style={{
            width: '100%', minHeight: 48, borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
            backgroundColor: 'var(--color-accent-solid)', color: '#fff', fontSize: 15, fontWeight: 600, opacity: busy ? 0.7 : 1,
            WebkitTapHighlightColor: 'transparent', outline: 'none', ...TEXT,
          }}
        >
          {busy ? 'Making public\u2026' : 'Make public'}
        </button>
      ) : (
        <p style={{ margin: 0, padding: '12px 14px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface-muted)', fontSize: 15, fontWeight: 600, lineHeight: 1.4, color: 'var(--color-text-primary)', ...TEXT }}>
          {SETUP_FIRST}
        </p>
      )}

      <button
        type="button"
        onClick={onCancel}
        disabled={busy}
        style={{
          display: 'block', width: '100%', minHeight: 44, marginTop: 'var(--space-2)', background: 'none', border: 'none',
          cursor: 'pointer', fontSize: 15, fontWeight: 600, color: 'var(--color-text-secondary)',
          WebkitTapHighlightColor: 'transparent', outline: 'none', ...TEXT,
        }}
      >
        Not now
      </button>
    </div>
  )
}
