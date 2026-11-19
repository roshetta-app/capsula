// One card in the My drug groups row on Home (Phase H step 9.5, redrawn as a folder in Phase I
// step 10.1, then switched to the SAME folder the Drugs screen card and the group page use: the shared
// folder numbers and colours from drugs/groups/folderStyles.js, the group's own wash, a tab at the
// top left, the name in bold (up to two lines) and the count in the group's colour with a small pill
// icon in front of it). "Waiting" in the warning colour sits at the end of the count row while
// changes are not saved. Also exports the grey dashed New card that starts the row. Dark mode needs
// nothing extra (the colour comes from the same tokens). The height is a minimum so large text never
// cuts the name (step 9.8).

import { useState } from 'react'
import { CloudUpload, Pill } from 'lucide-react'
import { FOLDER_TAB_WIDTH, FOLDER_TAB_HEIGHT, FOLDER_BODY_RADIUS, folderWash, folderCountColor } from '../drugs/groups/folderStyles'
import { resolveToken } from '../../utils/specialtyTokens'
import { useIsDark } from '../../utils/specialtyIcon'
import { groupCardLabel, groupCountText } from '../../utils/homeGroups'
import { CARD_W_CSS, CARD_H } from './HomeRoshettaCard'

const font = 'var(--font-body)'

function pressProps(setPressed) {
  return {
    onPointerDown: () => setPressed(true),
    onPointerUp: () => setPressed(false),
    onPointerLeave: () => setPressed(false),
    onPointerCancel: () => setPressed(false),
  }
}

export function HomeGroupCard({ group, waiting = false, onOpen }) {
  const [pressed, setPressed] = useState(false)
  const isDark = useIsDark()
  const colors = resolveToken(group?.color, isDark)
  const count = group?.brandIds?.length ?? 0
  // Tab and body share one opaque colour, so the folder has no seam and no border (as on the Drugs screen).
  const wash = folderWash(colors.fg)
  const countColor = folderCountColor(colors.fg)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      aria-label={groupCardLabel(group, waiting)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen?.() } }}
      {...pressProps(setPressed)}
      style={{
        fontSize: 16, flex: `0 0 ${CARD_W_CSS}`, width: CARD_W_CSS, minWidth: 0, scrollSnapAlign: 'start',
        display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
        cursor: 'pointer', outline: 'none', WebkitTapHighlightColor: 'transparent',
        opacity: pressed ? 0.8 : 1, transform: pressed ? 'scale(0.985)' : 'scale(1)',
        transition: 'opacity var(--motion-fast) var(--ease-settle), transform var(--motion-fast) var(--ease-settle)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: FOLDER_TAB_WIDTH, height: FOLDER_TAB_HEIGHT + 1, marginBottom: -1, flexShrink: 0, alignSelf: 'flex-start',
          backgroundColor: wash, borderTopLeftRadius: 12,
          clipPath: 'polygon(0 0, 74% 0, 100% 100%, 0 100%)',
        }}
      />
      <div
        style={{
          flex: '1 1 auto', minWidth: 0, minHeight: CARD_H - FOLDER_TAB_HEIGHT, boxSizing: 'border-box',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10,
          position: 'relative', overflow: 'hidden',
          backgroundColor: wash, borderRadius: FOLDER_BODY_RADIUS, padding: 14,
        }}
      >
        <div
          dir="ltr"
          style={{
            position: 'relative', textAlign: 'left', fontSize: 16, fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.01em', color: 'var(--color-text-primary)', fontFamily: font,
            display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden', overflowWrap: 'anywhere',
          }}
        >
          {group?.name ?? ''}
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, minWidth: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, color: countColor }}>
            <Pill size={14} strokeWidth={2.2} aria-hidden="true" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2, fontFamily: font, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
              {groupCountText(count)}
            </span>
          </span>
          {waiting && (
            <span role="img" aria-label="Waiting to save" title="Waiting to save" style={{ display: 'flex', flexShrink: 0, color: 'var(--color-warning)' }}>
              <CloudUpload size={14} aria-hidden="true" />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
