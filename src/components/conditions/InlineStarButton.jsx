/**
 * src/components/conditions/InlineStarButton.jsx
 *
 * Trailing star button for ConditionCard rows.
 * Reads and writes to FavouritesContext (already exists in the app).
 *
 * Props:
 *   conditionId   string   — the condition's UUID from Supabase
 *   conditionName string   — used only for aria-label
 *
 * Visual states:
 *   - Saved:   Star icon, filled amber (#F59E0B), aria-label "Remove from favourites"
 *   - Unsaved: Star icon, outline, color var(--color-text-tertiary), aria-label "Add to favourites"
 *
 * Tap behaviour:
 *   - Calls toggleCondition(conditionId) from FavouritesContext
 *   - stopPropagation() so the card row tap (navigate to detail) is NOT fired
 *   - 44×44px minimum tap target (padding compensates for visual icon size of 16px)
 */

import { Star } from 'lucide-react'
import { useFavouritesContext } from '../../context/FavouritesContext'

export default function InlineStarButton({ conditionId, conditionName }) {
  const { favourites, toggleCondition } = useFavouritesContext()

  const isSaved = favourites.conditions.includes(conditionId)

  function handleTap(e) {
    e.stopPropagation()
    toggleCondition(conditionId)
  }

  return (
    <button
      onClick={handleTap}
      aria-label={
        isSaved
          ? `Remove ${conditionName} from favourites`
          : `Add ${conditionName} to favourites`
      }
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
        color:                   isSaved ? '#F59E0B' : 'var(--color-text-tertiary)',
        transition:              'color 0.15s ease',
      }}
    >
      <Star
        size={16}
        fill={isSaved ? '#F59E0B' : 'none'}
        strokeWidth={1.8}
      />
    </button>
  )
}
