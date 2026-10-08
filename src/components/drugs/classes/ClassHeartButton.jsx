/**
 * src/components/drugs/classes/ClassHeartButton.jsx
 *
 *  * 2026-10-08 (refactor, phase 1): moved from ui/ to drugs/classes/ (only the
 *   class sheet uses it). No code change.
 *
 * 2026-10-08 (favourite classes and families): the heart in the class sheet
 * that saves or removes a drug class or family. Outline when not saved, filled
 * in the favourite colour when saved. 44px tap area. Owns no logic: the caller
 * decides what a tap does (see useFavouriteClasses).
 *
 * Props:
 *   active   boolean     whether the class / family is saved
 *   onPress  () => void
 *   label    string      what the heart is for, e.g. 'class' or 'family'
 */

import { Heart } from 'lucide-react'

const FAV = 'var(--color-favourite)'

export default function ClassHeartButton({ active, onPress, label = 'class' }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onPress() }}
      aria-label={active ? `Remove ${label} from favourites` : `Add ${label} to favourites`}
      aria-pressed={active}
      style={{
        width:                   44,
        height:                  44,
        display:                 'flex',
        alignItems:              'center',
        justifyContent:          'center',
        flexShrink:              0,
        padding:                 0,
        border:                  'none',
        background:              'none',
        cursor:                  'pointer',
        WebkitTapHighlightColor: 'transparent',
        outline:                 'none',
      }}
    >
      <Heart
        size={20}
        strokeWidth={1.8}
        color={active ? FAV : 'var(--color-text-secondary)'}
        fill={active ? FAV : 'none'}
      />
    </button>
  )
}
