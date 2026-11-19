// The states of the two Home rows, drawn in the look of their real cards (2026-11-20).
//
// Both rows use the same plain white (the app's card colour) so they read as a pair:
//  - My roshettas keeps the quiet "pad": a small label over a hairline, a faint Rx in the corner.
//  - My drug groups keeps the folder shape (tab and body), in white.
// The guest, empty and could-not-load cards are laid out in two columns: the title and the line on
// the start side, the button on the end side (they wrap under each other only when the text is
// very large). Loading is three pads or three folders made of grey bars, and the featured card has
// its own skeleton.
//
// Everything comes from the app's own variables, so dark mode follows the app. Sizes follow the
// real cards (CARD_W_CSS wide, CARD_H at least), so large text grows them the same way.

import { FileText, TriangleAlert } from 'lucide-react'
import { shimmer } from '../drugs/home/shimmer'
import FolderShell from '../drugs/groups/FolderShell'
import { FOLDER_TAB_WIDTH, FOLDER_TAB_HEIGHT, FOLDER_BODY_RADIUS } from '../drugs/groups/folderStyles'
import { DEFAULT_LOOK } from '../../utils/roshettaSpecialty'
import { useIsDark } from '../../utils/specialtyIcon'
import { CARD_W_CSS, CARD_H } from './HomeRoshettaCard'
import { FEATURED_H } from './FeaturedCardView'

const font = 'var(--font-body)'
const WHITE = 'var(--color-surface)'
// Bars are a little of the text colour over the colour they sit on, so they show in light and dark.
const BAR_COLOR = 'color-mix(in srgb, var(--color-text-primary) 10%, var(--color-surface))'
const bar = (width, height = 12) => shimmer({ width, height, borderRadius: 6, backgroundColor: BAR_COLOR })

// Two columns: title and line on the start side, one pill button on the end side. `soft` is the
// light blue button used for "Try again"; the calm cases keep the solid blue one.
function StateRow({ title, body, actionLabel, onAction, soft = false }) {
  return (
    <div style={{ position: 'relative', marginTop: 12, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px 16px', fontFamily: font }}>
      <div style={{ flex: '1 1 150px', minWidth: 0, textAlign: 'start' }}>
        <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.01em', color: 'var(--color-text-primary)' }}>{title}</div>
        {body && (
          <div style={{ marginTop: 3, fontSize: 13, lineHeight: 1.4, color: 'var(--color-text-secondary)' }}>{body}</div>
        )}
      </div>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          style={{
            flexShrink: 0, minHeight: 44, padding: '0 20px', borderRadius: 9999, border: 'none', cursor: 'pointer',
            backgroundColor: soft ? 'var(--color-accent-light)' : 'var(--color-accent-solid)',
            color: soft ? 'var(--color-accent-text)' : '#fff',
            fontFamily: font, fontSize: 14, fontWeight: 600, outline: 'none', WebkitTapHighlightColor: 'transparent',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

// The pad at full width: label row (icon and "Roshetta") over a hairline, then the two columns.
// `tone="error"` swaps the icon for the amber triangle and makes the button the soft one.
export function HomeRoshettaStateCard({ tone = 'neutral', title, body, actionLabel, onAction }) {
  const isDark = useIsDark()
  const isError = tone === 'error'
  return (
    <div
      role={isError ? 'status' : undefined}
      style={{
        position: 'relative', overflow: 'hidden', boxSizing: 'border-box',
        backgroundColor: WHITE, borderRadius: 16, padding: '12px 14px 16px',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute', insetInlineEnd: 6, bottom: -20, pointerEvents: 'none', userSelect: 'none',
          fontSize: 96, fontWeight: 700, fontStyle: 'italic', lineHeight: 1,
          color: isDark ? 'var(--color-text-primary)' : DEFAULT_LOOK.bg, opacity: isDark ? 0.035 : 0.7,
          fontFamily: 'Georgia, \'Times New Roman\', serif',
        }}
      >
        Rx
      </span>
      <div
        aria-hidden="true"
        style={{
          position: 'relative', display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 7,
          borderBottom: `1px solid ${isDark ? 'var(--color-border)' : DEFAULT_LOOK.bg}`,
          color: isError ? 'var(--color-warning)' : DEFAULT_LOOK.fg,
        }}
      >
        {isError
          ? <TriangleAlert size={12} strokeWidth={2.2} style={{ flexShrink: 0 }} />
          : <FileText size={12} strokeWidth={2} style={{ flexShrink: 0 }} />}
        <span style={{ fontSize: 11, fontWeight: 400, lineHeight: 1.4, color: 'var(--color-text-tertiary)', fontFamily: font }}>Roshetta</span>
      </div>
      <StateRow title={title} body={body} actionLabel={actionLabel} onAction={onAction} soft={isError} />
    </div>
  )
}

// The folder at full width, in white: the same tab and body as a real group card, then the two
// columns. `tone="error"` makes the button the soft one.
export function HomeGroupStateCard({ tone = 'neutral', title, body, actionLabel, onAction }) {
  const isError = tone === 'error'
  return (
    <div role={isError ? 'status' : undefined}>
      <FolderShell wash={WHITE} minHeight={CARD_H - FOLDER_TAB_HEIGHT - 20} padding="14px 14px 16px" gap={0}>
        <StateRow title={title} body={body} actionLabel={actionLabel} onAction={onAction} soft={isError} />
      </FolderShell>
    </div>
  )
}

// Loading, My roshettas: three pads made of bars (label over a hairline, two name lines, a short
// date line). The row around them cuts the last one off at the screen edge.
export function HomeRoshettaSkeletonCards() {
  return [0, 1, 2].map(i => (
    <div
      key={i}
      style={{
        fontSize: 16, flex: `0 0 ${CARD_W_CSS}`, width: CARD_W_CSS, minHeight: CARD_H, boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', padding: '12px 14px',
        backgroundColor: WHITE, borderRadius: 16,
      }}
    >
      <div style={{ paddingBottom: 9, borderBottom: '1px solid var(--color-border)' }}>
        <div style={bar('55%', 10)} />
      </div>
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={bar('88%')} />
        <div style={bar('60%')} />
      </div>
      <div style={{ flex: 1 }} />
      <div style={bar('38%', 10)} />
    </div>
  ))
}

// Loading, My drug groups: three white folders (the same tab and body as the real card) made of
// bars (two name lines, a short count line).
export function HomeGroupSkeletonCards() {
  return [0, 1, 2].map(i => (
    <div key={i} style={{ fontSize: 16, flex: `0 0 ${CARD_W_CSS}`, width: CARD_W_CSS, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <div
        style={{
          width: FOLDER_TAB_WIDTH, height: FOLDER_TAB_HEIGHT + 1, marginBottom: -1, flexShrink: 0, alignSelf: 'flex-start',
          backgroundColor: WHITE, borderTopLeftRadius: 12, clipPath: 'polygon(0 0, 74% 0, 100% 100%, 0 100%)',
        }}
      />
      <div
        style={{
          minHeight: CARD_H - FOLDER_TAB_HEIGHT, boxSizing: 'border-box', padding: 14,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10,
          backgroundColor: WHITE, borderRadius: FOLDER_BODY_RADIUS,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={bar('82%', 13)} />
          <div style={bar('52%', 13)} />
        </div>
        <div style={bar('36%', 10)} />
      </div>
    </div>
  ))
}

// Loading, the big featured card at the top of Home: the same size and rounding as the real card
// (FEATURED_H, 24), white, with bars where the label, the name (two lines), the line and the
// button go, and a soft round shape where the picture goes.
export function FeaturedCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'relative', overflow: 'hidden', width: '100%', boxSizing: 'border-box',
        minHeight: FEATURED_H, borderRadius: 24, padding: '18px 20px',
        display: 'flex', flexDirection: 'column', backgroundColor: WHITE,
      }}
    >
      <div style={{ position: 'absolute', insetInlineEnd: 20, top: '50%', marginTop: -48, width: 96, height: 96, borderRadius: '50%', ...shimmer({ backgroundColor: BAR_COLOR, borderRadius: '50%' }) }} />
      <div style={{ width: 'calc(100% - 132px)', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={bar('42%', 11)} />
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div style={bar('90%', 22)} />
          <div style={bar('64%', 22)} />
        </div>
        <div style={{ marginTop: 12 }}><div style={bar('72%', 12)} /></div>
        <div style={{ marginTop: 'auto', ...shimmer({ width: 112, height: 36, borderRadius: 999, backgroundColor: BAR_COLOR }) }} />
      </div>
    </div>
  )
}
