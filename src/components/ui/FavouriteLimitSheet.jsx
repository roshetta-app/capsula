/**
 * src/components/ui/FavouriteLimitSheet.jsx
 *
 * Phase 7 — shown when a free account tries to add a favourite past its
 * per-list cap (see useFavourites.js / constants/features.js for the cap
 * numbers).
 *
 * signin-sheet-copy-and-notes-emptystate — rebuilt as a thin wrapper
 * around the shared PaywallGateSheet.jsx shell instead of hand-building
 * its own bottom sheet. Content now comes from the caps in
 * constants/features.js directly (countLabel, message) rather than the
 * old FAVOURITES_LIMIT_MESSAGE_DRUGS/CONDITIONS strings, which carried
 * the longer pre-redesign wording.
 *
 * Props:
 *   isOpen     boolean
 *   listType   'drugs' | 'conditions'
 *   onClose    () => void
 */

import { Heart } from 'lucide-react'
import PaywallGateSheet from './PaywallGateSheet'
import { FAVOURITES_CAP_DRUGS, FAVOURITES_CAP_CONDITIONS } from '../../constants/features'

const CAPS = {
  drugs:      FAVOURITES_CAP_DRUGS,
  conditions: FAVOURITES_CAP_CONDITIONS,
}

export default function FavouriteLimitSheet({ isOpen, listType, onClose }) {
  const cap = CAPS[listType]

  return (
    <PaywallGateSheet
      isOpen={isOpen}
      onClose={onClose}
      icon={Heart}
      countLabel={`${cap}/${cap}`}
      headline="Saved Limit Reached"
      message={`Limit of ${cap} saved ${listType} reached. Go Pro for unlimited access.`}
      ctaSubtitle="Unlock unlimited favourites"
      dismissLabel="Maybe Later"
    />
  )
}
