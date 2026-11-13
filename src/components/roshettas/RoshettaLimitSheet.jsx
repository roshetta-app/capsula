/**
 * src/components/roshettas/RoshettaLimitSheet.jsx
 * 2026-11-14 (Roshetta plan, step 4.1c): the "you hit a limit" and "read only" sheet
 * for roshettas. A thin wrapper around the shared PaywallGateSheet, the same way
 * GroupLimitSheet is, so it looks and behaves like the groups one (icon, count line,
 * title, short body, one main button, "Not now"). A Pro account gets one OK button,
 * no Upgrade and no lock.
 *
 * The words are in src/utils/roshettaLimitText.js (checked without a screen).
 * When roshettas were not saved because of the limit, their names are listed under
 * the sentence ("Not saved: Chest pain."). Names are the person's own text, so they
 * are drawn as plain text and follow their own direction (Arabic from the right).
 *
 * Not on any screen yet: step 4.1d mounts it next to GroupLimitSheet, fed by the
 * hook's `roshettaLimit` and `dismissRoshettaLimit`.
 *
 * Props:
 *   isOpen   boolean
 *   kind     'roshettas' | 'drugs' | 'readonly'   (kept by the hook while the sheet closes)
 *   isPro    boolean   (kept the same way)
 *   names    string[]  roshettas that were not saved (empty for a tap)
 *   onClose  () => void
 */

import { FileText } from 'lucide-react'
import PaywallGateSheet from '../ui/PaywallGateSheet'
import { limitSheetWords, notSavedLine } from '../../utils/roshettaLimitText'

export default function RoshettaLimitSheet({ isOpen, kind, isPro = false, names = [], onClose }) {
  const words = limitSheetWords(kind, isPro)
  // A read only sheet never lists names (nothing was refused by name).
  const notSaved = kind === 'readonly' ? '' : notSavedLine(names)
  // Read only is the lapsed-account message, so it always offers Upgrade; a Pro account
  // at a limit has nothing to upgrade to and gets one OK button.
  const upgradeShown = kind === 'readonly' ? true : !isPro

  const message = (
    <>
      {words.message.map((piece, i) =>
        piece.strong ? <strong key={i}>{piece.text}</strong> : <span key={i}>{piece.text}</span>
      )}
      {notSaved && (
        <span dir="auto" style={{ display: 'block', marginTop: 'var(--space-2)' }}>{notSaved}</span>
      )}
    </>
  )

  return (
    <PaywallGateSheet
      isOpen={isOpen}
      onClose={onClose}
      icon={FileText}
      countLabel={words.countLabel}
      headline={words.headline}
      message={message}
      dismissLabel={words.dismissLabel}
      showUpgrade={upgradeShown}
      lockBadge={upgradeShown}
    />
  )
}
