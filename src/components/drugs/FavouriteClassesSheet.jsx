/**
 * src/components/drugs/FavouriteClassesSheet.jsx
 *
 * 2026-10-08 (favourite classes and families): two pieces for the Drugs tab of
 * the Favourites screen.
 *
 *  - FavouriteClassesCard: the "Classes & families" card at the top of the tab.
 *    Shows how many are saved ('3/5' for a free account) and opens the sheet.
 *  - FavouriteClassesSheet: lists every saved class and family, newest first.
 *    Tapping one calls onOpen(item) (the screen opens the class sheet on it).
 *    The heart on each row calls onRemove(item); the screen asks for
 *    confirmation and offers Undo, like the drug rows.
 *
 * Items are { className, familyName } as stored (familyName '' = whole class).
 * The icon tiles use the class icon and colour (Layers for a class, the molecule
 * for a family, both in --color-class), same as the class cards in Browse.
 * Names are shown in title case. The rows carry no 'class' / 'family' wording
 * and no drug count; a family row shows its class name underneath, plain.
 *
 * Props (card):  count, countLabel, onClick
 * Props (sheet): isOpen, onClose, items, onOpen(item), onRemove(item)
 */

import { useState } from 'react'
import { ChevronRight, Heart, Layers } from 'lucide-react'
import SheetShell from '../ui/SheetShell'
import CountTag from '../ui/CountTag'
import RowStarButton from '../ui/RowStarButton'
import { MoleculeIcon } from './sections/ClassBottomSheet'
import { titleCaseWords } from '../../utils/classSearch'

const TILE = 34

function IconTile({ Icon }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: TILE, height: TILE, borderRadius: 10, flexShrink: 0,
        backgroundColor: 'var(--color-class-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Icon size={17} strokeWidth={1.9} color="var(--color-class)" />
    </span>
  )
}

export function FavouriteClassesCard({ count, countLabel, onClick }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', boxSizing: 'border-box',
        minHeight: 64, padding: '14px 16px',
        marginBottom: 'var(--space-3)',
        border: '0.5px solid var(--color-border)', borderRadius: 16,
        backgroundColor: 'var(--color-surface)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        opacity: pressed ? 0.85 : 1,
        transform: pressed ? 'scale(0.985)' : 'scale(1)',
        transition: 'opacity var(--motion-fast) var(--ease-settle), transform var(--motion-fast) var(--ease-settle)',
        fontFamily: 'var(--font-body)', textAlign: 'left', cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent', outline: 'none',
      }}
    >
      <IconTile Icon={Layers} />
      <span style={{
        flex: 1, minWidth: 0, fontSize: 16, fontWeight: 600, lineHeight: 1.3,
        color: 'var(--color-text-primary)',
      }}>
        Classes &amp; families
      </span>
      <CountTag tone={count > 0 ? 'accent' : 'neutral'}>{countLabel ?? count}</CountTag>
      <ChevronRight aria-hidden="true" size={16} strokeWidth={2} color="var(--color-text-tertiary)" style={{ flexShrink: 0 }} />
    </button>
  )
}

function Row({ item, onOpen, onRemove }) {
  const [pressed, setPressed] = useState(false)
  const isFamily = !!item.familyName
  const title    = titleCaseWords(isFamily ? item.familyName : item.className)
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        boxSizing: 'border-box', flexShrink: 0, minHeight: 60,
        padding: '4px 4px 4px 16px',
        borderRadius: 16, backgroundColor: 'var(--color-surface-muted)',
        opacity: pressed ? 0.8 : 1,
        transition: 'opacity var(--motion-fast) var(--ease-settle)',
      }}
    >
      <button
        onClick={() => onOpen(item)}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
        style={{
          flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12,
          padding: '8px 0', border: 'none', background: 'none',
          fontFamily: 'var(--font-body)', textAlign: 'left', cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent', outline: 'none',
        }}
      >
        <IconTile Icon={isFamily ? MoleculeIcon : Layers} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            display: 'block', fontSize: 15, fontWeight: 500, lineHeight: 1.3,
            color: 'var(--color-text-primary)',
          }}>
            {title}
          </span>
          {isFamily && (
            <span style={{
              display: 'block', marginTop: 2, fontSize: 12.5, lineHeight: 1.3,
              color: 'var(--color-text-secondary)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {titleCaseWords(item.className)}
            </span>
          )}
        </span>
        <ChevronRight aria-hidden="true" size={16} strokeWidth={2} color="var(--color-text-tertiary)" style={{ flexShrink: 0 }} />
      </button>
      <RowStarButton isFavourited onPress={() => onRemove(item)} />
    </div>
  )
}

export default function FavouriteClassesSheet({ isOpen, onClose, items, onOpen, onRemove }) {
  // Newest first, same as the other Favourites lists.
  const shown = items.slice().reverse()
  return (
    <SheetShell isOpen={isOpen} onClose={onClose} ariaLabel="Saved classes and families" maxHeight="86svh">
      <div style={{
        display: 'flex', flexDirection: 'column',
        height: 'calc(86svh - 40px - env(safe-area-inset-bottom, 0px))',
        minHeight: 0,
      }}>
        <div style={{
          flexShrink: 0, padding: 'var(--space-2) var(--space-4) var(--space-3)',
          borderBottom: '0.5px solid var(--color-border)',
        }}>
          <p style={{
            margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: 'var(--color-accent)',
          }}>
            Favourites
          </p>
          <p style={{
            margin: '2px 0 0', fontSize: 20, fontWeight: 500, lineHeight: 1.3,
            color: 'var(--color-text-primary)',
          }}>
            Classes &amp; families
          </p>
        </div>
        <div style={{
          flex: 1, minHeight: 0, overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
          padding: 'var(--space-3) var(--space-4) var(--space-6)',
        }}>
          {shown.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 10, padding: '48px 24px', textAlign: 'center',
              color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.5,
            }}>
              <Heart size={28} strokeWidth={1.6} color="var(--color-text-tertiary)" />
              Nothing saved yet. Tap the heart in a class or family to save it here.
            </div>
          ) : shown.map(item => (
            <Row
              key={`${item.className}\u0001${item.familyName}`}
              item={item}
              onOpen={onOpen}
              onRemove={onRemove}
            />
          ))}
        </div>
      </div>
    </SheetShell>
  )
}
