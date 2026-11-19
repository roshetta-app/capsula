// The states of the two Home rows, drawn in the look of their real cards (2026-11-20).
//
// Both rows use the same plain white (the app's card colour) with a very faint outline, so they read
// as a pair:
//  - My roshettas keeps the quiet "pad" with the faint Rx in the corner.
//  - My drug groups keeps the folder shape (tab and body), in white, with a faint pill in the corner
//    the way the pad has its Rx.
// The guest, empty and could-not-load cards stack title (with the roshetta or folder icon), one line and a pill button. The create
// buttons carry the icon of what they make (roshetta, folder). Loading is three pads or three
// folders made of grey bars, and the featured card has its own skeleton.
//
// Everything comes from the app's own variables, so dark mode follows the app. Sizes follow the
// real cards (CARD_W_CSS wide, CARD_H at least), so large text grows them the same way.

import { FileText, Folder, Pill } from 'lucide-react'
import { shimmer } from '../drugs/home/shimmer'
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

// Faint outline: a hairline on the pad; on the folder a soft shadow that follows the tab shape.
const OUTLINE = 'color-mix(in srgb, var(--color-text-primary) 7%, transparent)'
const FOLDER_OUTLINE = 'drop-shadow(0 0 0.6px color-mix(in srgb, var(--color-text-primary) 28%, transparent))'

// Stacked: title, one line, one pill button (with an icon when the button makes something).
// `soft` is the light blue button used for "Try again"; the calm cases keep the solid blue one.
function StateStack({ title, body, actionLabel, onAction, ActionIcon = null, TitleIcon = null, soft = false }) {
  return (
    <div style={{ position: 'relative', fontFamily: font, textAlign: 'start' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.01em', color: 'var(--color-text-primary)' }}>
        {TitleIcon && <TitleIcon size={18} strokeWidth={2.2} aria-hidden="true" style={{ flexShrink: 0, color: DEFAULT_LOOK.fg }} />}
        <span style={{ minWidth: 0 }}>{title}</span>
      </div>
      {body && (
        <div style={{ marginTop: 3, fontSize: 13, lineHeight: 1.4, color: 'var(--color-text-secondary)' }}>{body}</div>
      )}
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          style={{
            marginTop: 14, minHeight: 44, padding: '0 20px', borderRadius: 9999, border: 'none', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            backgroundColor: soft ? 'var(--color-accent-light)' : 'var(--color-accent-solid)',
            color: soft ? 'var(--color-accent-text)' : '#fff',
            fontFamily: font, fontSize: 14, fontWeight: 600, outline: 'none', WebkitTapHighlightColor: 'transparent',
          }}
        >
          {ActionIcon && <ActionIcon size={18} strokeWidth={2.2} aria-hidden="true" />}
          {actionLabel}
        </button>
      )}
    </div>
  )
}

// The pad at full width: the faint Rx in the corner, then title, line and button. `tone="error"`
// makes the button the soft one. `withIcon` puts the roshetta icon in the button (the create case).
export function HomeRoshettaStateCard({ tone = 'neutral', title, body, actionLabel, onAction, withIcon = false }) {
  const isDark = useIsDark()
  const isError = tone === 'error'
  return (
    <div
      role={isError ? 'status' : undefined}
      style={{
        position: 'relative', overflow: 'hidden', boxSizing: 'border-box',
        backgroundColor: WHITE, border: `1px solid ${OUTLINE}`, borderRadius: 16, padding: '16px 16px 18px',
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
      <StateStack title={title} body={body} actionLabel={actionLabel} onAction={onAction} ActionIcon={withIcon ? FileText : null} TitleIcon={FileText} soft={isError} />
    </div>
  )
}

// The folder at full width, in white: the same tab and body as a real group card, a faint pill in
// the corner (as the pad has its Rx), then title, line and button. `withIcon` puts the folder icon
// in the button (the create case).
export function HomeGroupStateCard({ tone = 'neutral', title, body, actionLabel, onAction, withIcon = false }) {
  const isDark = useIsDark()
  const isError = tone === 'error'
  return (
    <div role={isError ? 'status' : undefined} style={{ display: 'flex', flexDirection: 'column', filter: FOLDER_OUTLINE }}>
      <div
        aria-hidden="true"
        style={{
          width: FOLDER_TAB_WIDTH, height: FOLDER_TAB_HEIGHT + 1, marginBottom: -1, flexShrink: 0, alignSelf: 'flex-start',
          backgroundColor: WHITE, borderTopLeftRadius: 12, clipPath: 'polygon(0 0, 74% 0, 100% 100%, 0 100%)',
        }}
      />
      <div
        style={{
          position: 'relative', overflow: 'hidden', boxSizing: 'border-box',
          backgroundColor: WHITE, borderRadius: FOLDER_BODY_RADIUS, padding: '16px 16px 18px',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: 'absolute', insetInlineEnd: 10, bottom: -14, pointerEvents: 'none', display: 'flex',
            transform: 'rotate(-28deg)',
            color: isDark ? 'var(--color-text-primary)' : DEFAULT_LOOK.bg, opacity: isDark ? 0.05 : 0.9,
          }}
        >
          <Pill size={96} strokeWidth={1.6} />
        </span>
        <StateStack title={title} body={body} actionLabel={actionLabel} onAction={onAction} ActionIcon={withIcon ? Folder : null} TitleIcon={Folder} soft={isError} />
      </div>
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
        backgroundColor: WHITE, border: `1px solid ${OUTLINE}`, borderRadius: 16,
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
    <div key={i} style={{ fontSize: 16, flex: `0 0 ${CARD_W_CSS}`, width: CARD_W_CSS, display: 'flex', flexDirection: 'column', boxSizing: 'border-box', filter: FOLDER_OUTLINE }}>
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
        display: 'flex', flexDirection: 'column', backgroundColor: WHITE, border: `1px solid ${OUTLINE}`,
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
