// The states of the two Home rows, drawn in the look of their real cards (2026-11-20).
//
//  - My roshettas keeps the quiet "pad": a plain sheet, a small label over a hairline, a faint Rx
//    in the corner. HomeRoshettaStateCard is that pad at full width (guest, empty, could not
//    load) and HomeRoshettaSkeletonCards are three pads made of grey bars (loading).
//  - My drug groups keeps the folder: HomeGroupSkeletonCards are three grey folders made of grey
//    bars (loading). Its guest, empty and error cards are the grey folder card the Drugs screen
//    already uses (GroupStateMessage with `flat`), so they are not drawn here.
//
// Everything comes from the app's own variables, so dark mode follows the app. Sizes follow the
// real cards (CARD_W_CSS wide, CARD_H at least), so large text grows them the same way.

import { FileText, TriangleAlert } from 'lucide-react'
import { shimmer } from '../drugs/home/shimmer'
import { FOLDER_TAB_WIDTH, FOLDER_TAB_HEIGHT, FOLDER_BODY_RADIUS, FOLDER_GREY_WASH } from '../drugs/groups/folderStyles'
import { DEFAULT_LOOK } from '../../utils/roshettaSpecialty'
import { useIsDark } from '../../utils/specialtyIcon'
import { CARD_W_CSS, CARD_H } from './HomeRoshettaCard'

const font = 'var(--font-body)'
// Bars are a little of the text colour over the colour they sit on, so they show in light and dark.
const BAR_ON_PAD = 'color-mix(in srgb, var(--color-text-primary) 10%, var(--color-surface))'
const BAR_ON_FOLDER = `color-mix(in srgb, var(--color-text-primary) 11%, ${FOLDER_GREY_WASH})`

// The pad at full width: label row (icon and "Roshetta") over a hairline, the title, one line of
// body, one pill button. `tone="error"` swaps the icon for the amber triangle and makes the
// button the soft one (white words on blue is kept for the calm cases).
export function HomeRoshettaStateCard({ tone = 'neutral', title, body, actionLabel, onAction }) {
  const isDark = useIsDark()
  const isError = tone === 'error'
  return (
    <div
      role={isError ? 'status' : undefined}
      style={{
        position: 'relative', overflow: 'hidden', boxSizing: 'border-box',
        backgroundColor: 'var(--color-surface)', borderRadius: 16, padding: '12px 14px 18px',
        fontFamily: font, textAlign: 'start',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute', insetInlineEnd: 6, bottom: -20, pointerEvents: 'none', userSelect: 'none',
          fontSize: 104, fontWeight: 700, fontStyle: 'italic', lineHeight: 1,
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
        <span style={{ fontSize: 11, fontWeight: 400, lineHeight: 1.4, color: 'var(--color-text-tertiary)' }}>Roshetta</span>
      </div>
      <div style={{ position: 'relative', marginTop: 12, fontSize: 16, fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.01em', color: 'var(--color-text-primary)' }}>
        {title}
      </div>
      {body && (
        <div style={{ position: 'relative', marginTop: 4, fontSize: 13, lineHeight: 1.45, color: 'var(--color-text-secondary)' }}>
          {body}
        </div>
      )}
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          style={{
            position: 'relative', marginTop: 14, minHeight: 44, padding: '0 24px', borderRadius: 9999, border: 'none', cursor: 'pointer',
            backgroundColor: isError ? 'var(--color-accent-light)' : 'var(--color-accent-solid)',
            color: isError ? 'var(--color-accent-text)' : '#fff',
            fontFamily: font, fontSize: 14, fontWeight: 600, outline: 'none', WebkitTapHighlightColor: 'transparent',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

const bar = (width, height = 12, color = BAR_ON_PAD) => shimmer({ width, height, borderRadius: 6, backgroundColor: color })

// Loading, My roshettas: three pads made of bars (label over a hairline, two name lines, a short
// date line). The row around them cuts the last one off at the screen edge.
export function HomeRoshettaSkeletonCards() {
  return [0, 1, 2].map(i => (
    <div
      key={i}
      style={{
        fontSize: 16, flex: `0 0 ${CARD_W_CSS}`, width: CARD_W_CSS, minHeight: CARD_H, boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', padding: '12px 14px',
        backgroundColor: 'var(--color-surface)', borderRadius: 16,
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

// Loading, My drug groups: three grey folders (the same tab and body as the real card) made of
// bars (two name lines, a short count line).
export function HomeGroupSkeletonCards() {
  return [0, 1, 2].map(i => (
    <div key={i} style={{ fontSize: 16, flex: `0 0 ${CARD_W_CSS}`, width: CARD_W_CSS, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <div
        style={{
          width: FOLDER_TAB_WIDTH, height: FOLDER_TAB_HEIGHT + 1, marginBottom: -1, flexShrink: 0, alignSelf: 'flex-start',
          backgroundColor: FOLDER_GREY_WASH, borderTopLeftRadius: 12, clipPath: 'polygon(0 0, 74% 0, 100% 100%, 0 100%)',
        }}
      />
      <div
        style={{
          minHeight: CARD_H - FOLDER_TAB_HEIGHT, boxSizing: 'border-box', padding: 14,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10,
          backgroundColor: FOLDER_GREY_WASH, borderRadius: FOLDER_BODY_RADIUS,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={bar('82%', 13, BAR_ON_FOLDER)} />
          <div style={bar('52%', 13, BAR_ON_FOLDER)} />
        </div>
        <div style={bar('36%', 10, BAR_ON_FOLDER)} />
      </div>
    </div>
  ))
}
