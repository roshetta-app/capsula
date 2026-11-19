/**
 * src/components/roshettas/RoshettaFailedChangesSheet.jsx
 * Phase J, step 11.8: the list of roshetta changes the server refused ("2 changes not saved",
 * tap "See" on the Home status line), each with its reason in plain words, and two choices for
 * the whole list, the same pattern as the drug groups sheet:
 *   Try again  sends them again (retryFailedChanges)
 *   Discard    drops them after one question and shows the roshettas as the server has them
 * Nothing is dropped without the person choosing Discard. Closes by itself when the list is empty.
 *
 * Props: isOpen, onClose
 */

import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import SheetShell from '../ui/SheetShell'
import ConfirmSheet from '../ui/ConfirmSheet'
import { useFavouritesContext } from '../../context/FavouritesContext'
import { describeFailedRoshettaChange, discardMessage } from '../../utils/roshettaFailedText'

const font = 'var(--font-body)'
const BUTTON = {
  flex: 1, minHeight: 44, borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
  fontSize: 14, fontWeight: 600, fontFamily: font, WebkitTapHighlightColor: 'transparent', outline: 'none',
}

export default function RoshettaFailedChangesSheet({ isOpen, onClose }) {
  const { roshettasApi } = useFavouritesContext()
  const { roshettas = [], failedList = [], retryFailedChanges, discardFailedChanges } = roshettasApi ?? {}
  const [confirmOpen, setConfirmOpen] = useState(false)

  const items = useMemo(() => failedList.map(change => ({
    id: change.id,
    ...describeFailedRoshettaChange(change, { roshettaName: roshettas.find(r => r.id === change.roshettaId)?.name ?? null }),
  })), [failedList, roshettas])

  // Nothing left to show (tried again and saved, or discarded): close.
  useEffect(() => {
    if (isOpen && failedList.length === 0) onClose()
  }, [isOpen, failedList.length, onClose])

  function handleRetry() {
    onClose()
    retryFailedChanges?.()
  }

  async function handleDiscard() {
    await discardFailedChanges?.()
    onClose()
  }

  return (
    <>
      <SheetShell isOpen={isOpen} onClose={onClose} ariaLabel="Changes not saved">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', padding: '0 var(--space-4) var(--space-3)', flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: font }}>Changes not saved</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 44, height: 44, borderRadius: '50%', border: 'none', flexShrink: 0,
              backgroundColor: 'var(--color-surface-muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              WebkitTapHighlightColor: 'transparent', outline: 'none',
            }}
          >
            <X size={18} color="var(--color-text-secondary)" aria-hidden="true" />
          </button>
        </div>

        <div style={{ padding: '0 var(--space-4) var(--space-5)' }}>
          <p style={{ margin: '0 0 var(--space-3)', fontSize: 14, lineHeight: 1.55, color: 'var(--color-text-secondary)', fontFamily: font }}>
            The server did not take {items.length === 1 ? 'this change' : 'these changes'}. Your other changes were saved.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxHeight: '40vh', overflowY: 'auto' }}>
            {items.map(item => (
              <div key={item.id} style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface-muted)' }}>
                <div dir="auto" style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: font, overflowWrap: 'anywhere', textAlign: 'start' }}>
                  {item.title}
                </div>
                <div style={{ marginTop: 2, fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: font }}>{item.reason}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
            <button type="button" onClick={() => setConfirmOpen(true)} style={{ ...BUTTON, backgroundColor: 'var(--color-surface-muted)', color: 'var(--color-danger)' }}>
              Discard
            </button>
            <button type="button" onClick={handleRetry} style={{ ...BUTTON, backgroundColor: 'var(--color-accent-solid)', color: '#fff' }}>
              Try again
            </button>
          </div>
        </div>
      </SheetShell>

      <ConfirmSheet
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDiscard}
        title="Discard these changes?"
        message={discardMessage(failedList)}
        confirmLabel="Discard"
        confirmingLabel={'Discarding\u2026'}
        destructive
      />
    </>
  )
}
