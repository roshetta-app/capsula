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
 */

import { Folder } from 'lucide-react'

const font = 'var(--font-body)'

export default function GroupStateMessage({
  variant = 'card', tone = 'neutral', title, body, actionLabel, onAction,
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
          backgroundColor: warn ? 'var(--color-warning-light)' : 'var(--color-surface-muted)',
          color: warn ? 'var(--color-warning)' : 'var(--color-text-secondary)',
          fontSize: 12, fontWeight: 500, fontFamily: font, lineHeight: 1.35,
        }}
      >
        <span style={{ flex: 1, minWidth: 0 }}>{title}</span>
        {actionLabel && (
          <button
            type="button"
            onClick={onAction}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px 2px',
              color: warn ? 'var(--color-warning)' : 'var(--color-accent)',
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
        backgroundColor: 'var(--color-surface-muted)',
        borderRadius: 16, padding: 'var(--space-5) var(--space-4)',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        backgroundColor: 'var(--color-surface)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Folder size={17} color="var(--color-text-tertiary)" aria-hidden="true" />
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
            padding: '8px 20px', borderRadius: 'var(--radius-md)',
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
