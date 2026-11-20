/**
 * src/pages/UnknownAddressScreen.jsx
 * Roshetta plan, Phase K, step 12.5 (cases K19 and F4).
 *
 * The screen for every address that matches no other route (the catch-all "*") and for the four
 * words the drug page would read as a drug name (/drugs/browse, /drugs/group, /drugs/category,
 * /drugs/generic). If the address is a known slip (utils/addressFixes.js) the person is sent to
 * the screen they meant, replacing this one so Back does not return to the wrong address, and the
 * query and hash are kept. Otherwise the shared "not available" screen shows.
 */

import { Navigate, useLocation } from 'react-router-dom'
import NotAvailableScreen from './NotAvailableScreen'
import { fixAddress } from '../utils/addressFixes'

export default function UnknownAddressScreen() {
  const { pathname, search, hash } = useLocation()
  const fixed = fixAddress(pathname)
  if (fixed) return <Navigate to={fixed + search + hash} replace />
  return <NotAvailableScreen />
}
