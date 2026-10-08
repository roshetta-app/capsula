/**
 * src/components/drugs/classes/ClassCard.jsx
 *
 * 2026-10-08 (refactor, phase 2): the tappable card of the class sheet's family
 * list, moved here from ClassSheet.jsx (it was called SubclassRow there).
 * Same look and sizes as before. The search results and the saved list still
 * have their own cards; they move onto this one in the next step.
 *
 * Props:
 *   name      text of the card
 *   count     number of drugs, shown in the small tag before the arrow
 *   Icon      icon component for the tile
 *   onClick   tap handler
 *   featured  the blue 'All drugs' look (no tile background, blue text)
 *   words     keyword words shown as one grey line under the name
 */
import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import CountTag from '../../ui/CountTag.jsx'
import { MoleculeIcon } from './ClassIcons.jsx'
import { capFirst } from './classGrouping.js'

// Size of the icon tile and the gap after it.
const ICON_TILE = 34
const ICON_GAP  = 12

export default function ClassCard({ name, count, Icon = MoleculeIcon, onClick, featured = false, words = [] }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        display:         'flex',
        alignItems:      'center',
        gap:             10,
        width:           '100%',
        boxSizing:       'border-box',
        flexShrink:      0,
        minHeight:       56,
        padding:         '14px 16px',
        border:          'none',
        borderRadius:    16,
        backgroundColor: featured ? 'var(--color-accent-light)' : 'var(--color-surface-muted)',
        opacity:         pressed ? 0.8 : 1,
        transform:       pressed ? 'scale(0.985)' : 'scale(1)',
        transition:      'opacity var(--motion-fast) var(--ease-settle), transform var(--motion-fast) var(--ease-settle)',
        fontFamily:      'var(--font-body)',
        textAlign:       'left',
        cursor:          'pointer',
        WebkitTapHighlightColor: 'transparent',
        outline:         'none',
      }}
    >
      {/* Icon and name share one row, so the icon is centred on the name
          (all its lines). */}
      <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: ICON_GAP }}>
        <span
          aria-hidden="true"
          style={{
            width:           ICON_TILE,
            height:          ICON_TILE,
            borderRadius:    10,
            backgroundColor: featured ? 'transparent' : 'var(--color-accent-light)',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            flexShrink:      0,
          }}
        >
          <Icon size={17} strokeWidth={1.9} color="var(--color-accent)" />
        </span>
        <span style={{
          flex:       1,
          minWidth:   0,
          fontSize:   15,
          fontWeight: featured ? 600 : 500,
          lineHeight: 1.3,
          color:      featured ? 'var(--color-accent)' : 'var(--color-text-primary)',
        }}>
          {name}
          {words.length > 0 && (
            <span style={{
              display:      'block',
              marginTop:    2,
              fontSize:     12.5,
              fontWeight:   400,
              lineHeight:   1.3,
              color:        'var(--color-text-secondary)',
              whiteSpace:   'nowrap',
              overflow:     'hidden',
              textOverflow: 'ellipsis',
            }}>
              {words.map(capFirst).join(', ')}
            </span>
          )}
        </span>
      </span>
      {/* Drug count: the same small rounded-square tag used in the Related
          drugs sheet, a little smaller, just before the chevron. */}
      <CountTag
        style={{
          minWidth: 20, height: 18, padding: '0 5px', borderRadius: 6, fontSize: 11,
          ...(featured ? { backgroundColor: 'transparent', color: 'var(--color-accent)' } : null),
        }}
      >
        <span aria-label={`${count} ${count === 1 ? 'drug' : 'drugs'}`}>{count}</span>
      </CountTag>
      <ChevronRight
        aria-hidden="true"
        size={16}
        strokeWidth={2}
        color={featured ? 'var(--color-accent)' : 'var(--color-text-tertiary)'}
        style={{ flexShrink: 0 }}
      />
    </button>
  )
}
