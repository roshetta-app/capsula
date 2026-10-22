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
 *   flat         card variant only: the grey folder card with left-aligned text and button (step 8.10; the Drugs home,
 *                step 11.5). Default false, so every other screen keeps the boxed look.
 *   secondary    soft button (white fill, blue words) instead of the main blue one; for 'Try again'
 *   actionIcon   optional icon component drawn before the button text (for example Plus)
 *   open         card variant only: no box. A big tinted icon, a larger title and body, and a wide button,
 *                straight on the page (the empty group, 2026-10-23). 'icon' is the icon component and
 *                'accent' is { bg, fg } for its circle; both optional.
 *
 * 2026-10-23 (UI refresh): the Drugs home cards get more space above and below (20px instead of
 * 14px); 'actionIcon' and 'open' are new.
 */

import { Folder } from 'lucide-react'
import FolderShell from './FolderShell'
import { FOLDER_GREY_WASH } from './folderStyles'

const font = 'var(--font-body)'

export default function GroupStateMessage({
  variant = 'card', tone = 'neutral', title, body, actionLabel, onAction, flat = false, secondary = false,
  actionIcon: ActionIcon = null, open = false, icon: HeroIcon = Folder, accent = null,
}) {
  if (variant === 'banner') {
    const warn = tone === 'warning'
    return (
      <div
        role="status"
        style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
          padding: '8px var(--space-3)',
          borderRadius: 14,
          backgroundColor: warn ? 'var(--color-warning-light)' : FOLDER_GREY_WASH,
          border: 'none',
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

  // Step 8.10: the full states on the Drugs home ('flat') are the grey folder card, text and button
  // inside, left-aligned like the group cards.
  if (flat) {
    return (
      <div role="status">
        <FolderShell wash={FOLDER_GREY_WASH} minHeight={114} padding="20px 14px">
          <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.25, color: 'var(--color-text-primary)', fontFamily: font }}>
            {title}
          </div>
          {body && (
            <div style={{ fontSize: 13, lineHeight: 1.35, color: 'color-mix(in srgb, var(--color-text-primary) 72%, transparent)', fontFamily: font }}>
              {body}
            </div>
          )}
          {actionLabel && (
            <button
              type="button"
              onClick={onAction}
              style={{
                alignSelf: 'flex-start', minHeight: 44, padding: '0 20px', borderRadius: 12,
                display: 'inline-flex', alignItems: 'center', gap: 8,
                border: 'none', cursor: 'pointer',
                backgroundColor: secondary ? 'var(--color-surface)' : 'var(--color-accent-solid)',
                color: secondary ? 'var(--color-accent-text)' : '#fff',
                fontSize: 14, fontWeight: 600, fontFamily: font,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {ActionIcon && <ActionIcon size={18} strokeWidth={2.4} aria-hidden="true" />}
              {actionLabel}
            </button>
          )}
        </FolderShell>
      </div>
    )
  }

  // 2026-10-23: the open look, no box.
  if (open) {
    return (
      <div
        role="status"
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
          gap: 'var(--space-2)', padding: 'var(--space-8, 40px) var(--space-4) var(--space-4)',
        }}
      >
        <div style={{
          width: 88, height: 88, borderRadius: '50%', marginBottom: 'var(--space-3)',
          backgroundColor: accent?.bg ?? 'var(--color-accent-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <HeroIcon size={40} strokeWidth={1.8} color={accent?.fg ?? 'var(--color-accent)'} aria-hidden="true" />
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2, color: 'var(--color-text-primary)', fontFamily: font }}>
          {title}
        </div>
        {body && (
          <div style={{ fontSize: 15, lineHeight: 1.45, maxWidth: 300, color: 'var(--color-text-secondary)', fontFamily: font }}>
            {body}
          </div>
        )}
        {actionLabel && (
          <button
            type="button"
            onClick={onAction}
            style={{
              marginTop: 'var(--space-4)', minHeight: 52, padding: '0 28px', borderRadius: 16,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              border: 'none', cursor: 'pointer',
              backgroundColor: 'var(--color-accent-solid)', color: '#fff',
              fontSize: 16, fontWeight: 600, fontFamily: font,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {ActionIcon && <ActionIcon size={20} strokeWidth={2.4} aria-hidden="true" />}
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
            backgroundColor: 'var(--color-accent-solid)', color: '#fff',
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
