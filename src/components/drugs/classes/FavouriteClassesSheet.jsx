/**
 * src/components/drugs/classes/FavouriteClassesSheet.jsx
 *
 * 2026-10-08 (refactor, phase 1): moved from drugs/ to drugs/classes/. No behaviour change.
 *
 * 2026-10-08 (refactor, phase 2b): the card and the row moved out to
 * FavouriteClassesCard.jsx and FavouriteClassRow.jsx; this file keeps only the
 * sheet. No behaviour change.
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
import { Heart } from 'lucide-react'
import SheetShell from '../../ui/SheetShell'
import FavouriteClassRow from './FavouriteClassRow.jsx'

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
            <FavouriteClassRow
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
