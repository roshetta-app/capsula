/**
 * src/components/ui/RowStarButton.jsx
 * drug_library_ui_ux — step 1d.5 (decision 4.15)
 *
 * Trailing favourite button, shared by ConditionCard rows (Favourites'
 * conditions tab) and SharedDrugCard rows (Favourites' drugs tab / Drugs
 * screen). Moved here from its previous private home inside
 * FavouritesScreen.jsx so both card types use the exact same button —
 * per user instruction, reusing the existing heart button rather than
 * building a new bookmark-icon component.
 *
 * Owns no favouriting/confirm logic itself — just the heart icon and the
 * show/hide rule (decision 4.15: hidden entirely, not an empty outline,
 * when the row isn't favourited). What happens on tap (direct toggle vs.
 * opening a confirm step) is decided entirely by whichever screen supplies
 * onPress — screen-owned, not card-owned, per decision 4.16.
 *
 * New in this move: the `isFavourited` prop and its early-return. The
 * original, private version never needed this check, since it was only
 * ever placed on rows already known to be favourites. Existing callers on
 * the conditions tab are unaffected — they pass `isFavourited={true}`,
 * matching the always-shown behavior they already had.
 *
 * Props:
 *   isFavourited  boolean    — whether this row is currently saved. When
 *                               false, renders nothing at all.
 *   onPress       () => void — called on tap, after stopPropagation so the
 *                               row's own tap (navigate to detail) doesn't
 *                               also fire.
 */

import { Heart } from 'lucide-react'

const FAV_ACCENT = 'var(--color-favourite)'

export default function RowStarButton({ isFavourited, onPress }) {
  if (!isFavourited) return null

  function handleTap(e) {
    e.stopPropagation()
    onPress()
  }

  return (
    <button
      onClick={handleTap}
      aria-label="Remove from favourites"
      style={{
        background:              'none',
        border:                  'none',
        cursor:                  'pointer',
        padding:                 '14px 8px',   // 44px tap height
        display:                 'flex',
        alignItems:              'center',
        justifyContent:          'center',
        flexShrink:              0,
        WebkitTapHighlightColor: 'transparent',
        outline:                 'none',
        color:                   FAV_ACCENT,
      }}
    >
      <Heart size={13} fill={FAV_ACCENT} strokeWidth={1.8} />
    </button>
  )
}
