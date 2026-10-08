/**
 * src/components/drugs/classes/ClassIcons.jsx
 *
 * 2026-10-08 (refactor, phase 1): the molecule icon moved here from ClassSheet.jsx,
 * unchanged. It is the family icon used on family cards in the class sheet,
 * the Browse search results and the saved classes list.
 *
 * Credit (required by the licence): the molecule icon is 'molecule-light' from the
 * Lets Icons set. 'Lets Icons by Leonid Tsvetkov, CC BY 4.0,
 * https://creativecommons.org/licenses/by/4.0/'. Loaded from the packages
 * @iconify-icons/lets-icons and @iconify/react (offline build, no network calls).
 */

import { Icon as IconifyIcon } from '@iconify/react/dist/offline'
import moleculeLight from '@iconify-icons/lets-icons/molecule-light'

// The molecule icon (thin outline). Takes the same props the cards pass to
// their icon (size, color); strokeWidth is ignored, the line weight is part of the icon.
export function MoleculeIcon({ size = 24, color = 'currentColor' }) {
  return <IconifyIcon icon={moleculeLight} width={size} height={size} color={color} />
}
