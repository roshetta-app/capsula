/**
 * src/components/drugs/home/BrowseHeader.jsx
 * 2026-10-22 (UI refresh plan, step 8.5): the header of the Browse screens (Categories, Browse by
 * class) and of an opened category.
 *
 *   BrowseTopRow  the back arrow with where it goes ("Drugs", "Categories"), then the big title,
 *                 then an optional small line under it (for example "42 drugs").
 *   BrowseHeader  the tinted block with the rounded bottom edge (same look as the Drugs home
 *                 header), the top row, and whatever is passed as children under it (the search
 *                 pill on Browse by class). Full width: it reaches the screen edges by using the
 *                 layout's side gap as a negative margin, like the home header.
 *
 * Back is the caller's job (onBack), so each screen keeps its own one-step-back rule.
 *
 * 2026-10-22 (step 8.13): BrowseTopRow takes an optional 'icon' (a round badge drawn by the
 * caller) that sits to the left of the title. An opened category uses it for its own icon.
 */

import { ChevronLeft } from 'lucide-react'

export function BrowseTopRow({ backLabel, onBack, title, subtitle = null, icon = null, spaceBelow = 0 }) {
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        aria-label={`Back to ${backLabel}`}
        style={{
          display: 'flex', alignItems: 'center', gap: 2,
          minHeight: 44, margin: '0 0 0 -8px', padding: '0 8px 0 4px',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--color-accent)', fontSize: 15, fontWeight: 600,
          fontFamily: 'var(--font-body)', WebkitTapHighlightColor: 'transparent',
        }}
      >
        <ChevronLeft size={20} strokeWidth={2.2} aria-hidden="true" />
        {backLabel}
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: icon ? 8 : 2, marginBottom: spaceBelow }}>
        {icon}
        <h1 style={{
          margin: 0, minWidth: 0, overflowWrap: 'break-word', fontSize: 26, fontWeight: 700, lineHeight: 1.2,
          color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)',
        }}>
          {title}
        </h1>
      </div>
      {subtitle ? (
        <div style={{ marginTop: 2, fontSize: 14, lineHeight: 1.3, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
          {subtitle}
        </div>
      ) : null}
    </div>
  )
}

export default function BrowseHeader({ backLabel, onBack, title, subtitle = null, children = null }) {
  return (
    <div style={{
      margin: '0 calc(-1 * var(--page-gutter, 16px)) var(--space-4)',
      padding: 'calc(env(safe-area-inset-top, 0px) + 4px) var(--page-gutter, 16px) 16px',
      backgroundColor: 'var(--color-header-tint)',
      borderRadius: '0 0 24px 24px',
    }}>
      <BrowseTopRow backLabel={backLabel} onBack={onBack} title={title} subtitle={subtitle} />
      {children ? <div style={{ marginTop: 'var(--space-3)' }}>{children}</div> : null}
    </div>
  )
}
