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
 * paywall-sheet-copy-tweaks (this session) — headline changed to
 * "Favourites limit reached"; message rewritten to drop "saved" (not how
 * favourites are described elsewhere in the app) and to bold "Pro".
 * PaywallGateSheet's `message` prop takes a plain string or a node, so
 * this passes a JSX fragment to get the bold word in.
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
      headline="Favourites limit reached"
      message={<>You've reached your limit of favourite {listType}, go <strong>Pro</strong> for unlimited access.</>}
      dismissLabel="Maybe Later"
    />
  )
}
