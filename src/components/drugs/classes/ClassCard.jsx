/**
 * src/components/drugs/classes/ClassCard.jsx
 *
 * 2026-10-08 (colours): the matched word follows the card's tone (violet on a
 * class card, blue on a family card).
 *
 * 2026-10-08 (refactor, phase 2b): the one card for classes and families,
 * replacing three near-copies: SubclassRow (class sheet family list, moved here
 * in 2a), ResultCard (Class search results) and Row (saved classes sheet). Each
 * keeps exactly its old sizes and colours through the 'variant' prop. No
 * behaviour change.
 *
 * Variants:
 *   'list'    family list of the class sheet (default): count tag, arrow
 *   'search'  Class search results: kicker, highlighted name, detail, matched word
 *   'saved'   saved classes sheet: no count, a trailing button (the heart) outside the tap area
 *
 * Props:
 *   name       text of the card
 *   highlight  typed text to draw heavier inside the name (search)
 *   kicker     small blue label above the name (search)
 *   detail     grey text under the name that may wrap (search)
 *   subline    grey text under the name kept to one line with '...' (saved)
 *   matches    node for the matched keyword (search); drawn after 'matches:'
 *   count      number of drugs for the small tag; leave out for no tag
 *   Icon       icon component for the tile
 *   tone       'accent' (blue tile) or 'class' (purple tile)
 *   featured   the blue 'All drugs' look (list)
 *   trailing   node drawn after the tap area (saved)
 *   onClick    tap handler
 *
 * Also exports ClassIconTile, the rounded tile with the icon, so the saved
 * classes card on the Favourites screen uses the same one.
 */
import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import CountTag from '../../ui/CountTag.jsx'
import { MoleculeIcon } from './ClassIcons.jsx'
import { highlightMatch } from '../../../utils/highlightMatch'

// Size of the icon tile.
const ICON_TILE = 34

export function ClassIconTile({ Icon, tone = 'accent', transparent = false, size = ICON_TILE }) {
  const isClass = tone === 'class'
  return (
    <span
      aria-hidden="true"
      style={{
        width:           size,
        height:          size,
        borderRadius:    size < ICON_TILE ? 8 : 10,
        backgroundColor: transparent ? 'transparent' : (isClass ? 'var(--color-class-light)' : 'var(--color-accent-light)'),
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        flexShrink:      0,
      }}
    >
      <Icon size={Math.round(size / 2)} strokeWidth={1.9} color={isClass ? 'var(--color-class)' : 'var(--color-accent)'} />
    </span>
  )
}

const press = 'opacity var(--motion-fast) var(--ease-settle), transform var(--motion-fast) var(--ease-settle)'

export default function ClassCard({
  name,
  highlight = '',
  kicker,
  detail,
  subline,
  matches,
  count,
  Icon = MoleculeIcon,
  tone = 'accent',
  featured = false,
  trailing = null,
  onClick,
  variant = 'list',
}) {
  const [pressed, setPressed] = useState(false)
  const isSearch = variant === 'search'
  const toneColor = tone === 'class' ? 'var(--color-class)' : 'var(--color-accent)'
  const toneTint  = tone === 'class' ? 'var(--color-class-light)' : 'var(--color-accent-light)'
  const isSaved  = variant === 'saved'
  const wrap     = isSearch ? { overflowWrap: 'anywhere' } : null
  const nameSegments = highlight ? highlightMatch(name, highlight) : null

  const pressHandlers = {
    onClick,
    onPointerDown:   () => setPressed(true),
    onPointerUp:     () => setPressed(false),
    onPointerLeave:  () => setPressed(false),
    onPointerCancel: () => setPressed(false),
  }

  const textBlock = (
    <span style={{ flex: 1, minWidth: 0 }}>
      {kicker && (
        <span style={{
          display:       'block',
          fontSize:      10.5,
          fontWeight:    600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color:         'var(--color-accent)',
        }}>
          {kicker}
        </span>
      )}
      <span style={{
        display:    'block',
        marginTop:  kicker ? 1 : 0,
        fontSize:   15,
        fontWeight: featured ? 600 : 500,
        lineHeight: 1.3,
        color:      featured ? toneColor : 'var(--color-text-primary)',
        ...wrap,
      }}>
        {nameSegments
          ? nameSegments.map((seg, i) =>
              seg.bold
                ? <strong key={i} style={{ fontWeight: 800 }}>{seg.text}</strong>
                : <span key={i}>{seg.text}</span>
            )
          : name}
      </span>
      {subline && (
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
          {subline}
        </span>
      )}
      {detail && (
        <span style={{
          display:    'block',
          marginTop:  2,
          fontSize:   12.5,
          lineHeight: 1.3,
          color:      'var(--color-text-secondary)',
          overflowWrap: 'anywhere',
        }}>
          {detail}
        </span>
      )}
      {matches && (
        <span style={{
          display:    'block',
          marginTop:  2,
          fontSize:   12.5,
          lineHeight: 1.3,
          color:      'var(--color-text-secondary)',
          overflowWrap: 'anywhere',
        }}>
          matches:{' '}
          <span style={{ color: tone === 'class' ? 'var(--color-class)' : 'var(--color-accent)', fontWeight: 500 }}>{matches}</span>
        </span>
      )}
    </span>
  )

  const chevron = (
    <ChevronRight
      aria-hidden="true"
      size={16}
      strokeWidth={2}
      color={featured ? toneColor : 'var(--color-text-tertiary)'}
      style={{ flexShrink: 0 }}
    />
  )

  // Saved list: the row is a box, the tap area is a button inside it, and the
  // trailing button (the heart) sits next to it, not inside it.
  if (isSaved) {
    return (
      <div
        style={{
          display:         'flex',
          alignItems:      'center',
          gap:             4,
          boxSizing:       'border-box',
          flexShrink:      0,
          minHeight:       60,
          padding:         '4px 4px 4px 16px',
          borderRadius:    16,
          backgroundColor: 'var(--color-surface-muted)',
          opacity:         pressed ? 0.8 : 1,
          transition:      'opacity var(--motion-fast) var(--ease-settle)',
        }}
      >
        <button
          {...pressHandlers}
          style={{
            flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12,
            padding: '8px 0', border: 'none', background: 'none',
            fontFamily: 'var(--font-body)', textAlign: 'left', cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent', outline: 'none',
          }}
        >
          <ClassIconTile Icon={Icon} tone={tone} />
          {textBlock}
          {chevron}
        </button>
        {trailing}
      </div>
    )
  }

  return (
    <button
      {...pressHandlers}
      style={{
        display:         'flex',
        alignItems:      'center',
        gap:             10,
        width:           '100%',
        ...(isSearch ? { minWidth: 0 } : null),
        boxSizing:       'border-box',
        flexShrink:      0,
        minHeight:       isSearch ? 64 : 56,
        padding:         isSearch ? '12px 16px' : '14px 16px',
        border:          'none',
        borderRadius:    16,
        backgroundColor: featured ? toneTint : 'var(--color-surface-muted)',
        opacity:         pressed ? 0.8 : 1,
        transform:       pressed ? 'scale(0.985)' : 'scale(1)',
        transition:      press,
        fontFamily:      'var(--font-body)',
        textAlign:       'left',
        cursor:          'pointer',
        WebkitTapHighlightColor: 'transparent',
        outline:         'none',
      }}
    >
      {/* Icon and name share one row, so the icon is centred on the name
          (all its lines). */}
      <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
        <ClassIconTile Icon={Icon} tone={tone} transparent={featured} />
        {textBlock}
      </span>
      {/* Drug count: the same small rounded-square tag used in the Related
          drugs sheet, a little smaller, just before the chevron. */}
      {count !== undefined && (
        <CountTag
          style={{
            minWidth: 20, height: 18, padding: '0 5px', borderRadius: 6, fontSize: 11,
            ...(isSearch ? { flexShrink: 0 } : null),
            ...(featured ? { backgroundColor: 'transparent', color: toneColor } : null),
          }}
        >
          <span aria-label={`${count} ${count === 1 ? 'drug' : 'drugs'}`}>{count}</span>
        </CountTag>
      )}
      {chevron}
    </button>
  )
}
