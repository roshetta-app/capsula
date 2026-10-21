/**
 * src/components/drugs/groups/GroupStateMessage.jsx
 * 2026-10-18 (Drug groups plan, step 3.5): the one look for every empty,
 * error and limit message in the groups screens, so they all match.
 *
 * Props:
 *   variant      'card' (default, centred block) | 'banner' (one slim line)
 *   tone         'neutral' (default) | 'warning'   (banner only)
 *   title        main line
 *   body         optional second line
 *   actionLabel  optional button text (for example 'Retry', 'Sign in')
 *   onAction     tap handler for that button
 *   flat         card variant only: no box, just the centred icon and text (the Drugs home,
 *                step 11.5). Default false, so every other screen keeps the boxed look.
 */

import { Folder } from 'lucide-react'

const font = 'var(--font-body)'

export default function GroupStateMessage({
  variant = 'card', tone = 'neutral', title, body, actionLabel, onAction, flat = false,
}) {
  if (variant === 'banner') {
    const warn = tone === 'warning'
    return (
      <div
        role="status"
        style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
          padding: '8px var(--space-3)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: warn ? 'var(--color-warning-light)' : 'var(--color-surface)',
          border: warn ? 'none' : '1px solid var(--color-border)',
          color: warn ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
          fontSize: 12, fontWeight: 500, fontFamily: font, lineHeight: 1.35,
        }}
      >
        <span style={{ flex: 1, minWidth: 0 }}>{title}</span>
        {actionLabel && (
          <button
            type="button"
            onClick={onAction}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '0 var(--space-2)', minHeight: 44, minWidth: 44,
              color: warn ? 'var(--color-text-primary)' : 'var(--color-accent-text)',
              textDecoration: warn ? 'underline' : 'none',
              fontSize: 12, fontWeight: 700, fontFamily: font,
              WebkitTapHighlightColor: 'transparent', flexShrink: 0,
            }}
          >
            {actionLabel}
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      role="status"
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 'var(--space-2)', textAlign: 'center',
        ...(flat
          ? { padding: 'var(--space-4) var(--space-4)' }
          : {
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 16, padding: 'var(--space-5) var(--space-4)',
            }),
      }}
    >
      <div style={{
        width: flat ? 44 : 36, height: flat ? 44 : 36, borderRadius: flat ? 14 : '50%',
        backgroundColor: flat ? 'var(--color-accent-light)' : 'var(--color-surface-muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Folder size={flat ? 20 : 17} color={flat ? 'var(--color-accent)' : 'var(--color-text-tertiary)'} aria-hidden="true" />
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: font }}>
        {title}
      </div>
      {body && (
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: font, lineHeight: 1.4 }}>
          {body}
        </div>
      )}
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          style={{
            marginTop: 'var(--space-1)',
            padding: '0 20px', minHeight: 44, borderRadius: 'var(--radius-md)',
            border: 'none', cursor: 'pointer',
            backgroundColor: 'var(--color-accent)', color: '#fff',
            fontSize: 13, fontWeight: 600, fontFamily: font,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
