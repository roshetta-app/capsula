/**
 * src/components/drugs/groups/FailedChangesSheet.jsx
 * 2026-10-20 (Drug groups plan, step 17.6b): the list of changes the server
 * refused ("1 change could not be saved, tap to see"), each with its reason in
 * plain words, and two choices for the whole list:
 *   Retry    tries them again (retryFailedChanges)
 *   Discard  drops them after one question, and shows the groups as the server has them
 * Nothing is dropped without the person choosing Discard.
 *
 * Props: isOpen, onClose
 */

import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import SheetShell from '../../ui/SheetShell'
import ConfirmSheet from '../../ui/ConfirmSheet'
import { useFavouritesContext } from '../../../context/FavouritesContext'
import { useDrugContext } from '../../../context/DrugContext'
import { describeFailedChange } from '../../../utils/groupSyncStatus'
import { toTitleCase } from '../../../utils/drugTitleFormat'

const BUTTON = {
  flex: 1, minHeight: 44, borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
  fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)',
  WebkitTapHighlightColor: 'transparent', outline: 'none',
}

export default function FailedChangesSheet({ isOpen, onClose }) {
  const { groups, failedList = [], retryFailedChanges, discardFailedChanges } = useFavouritesContext()
  const { drugs } = useDrugContext()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const drugNameById = useMemo(() => {
    const m = new Map()
    for (const d of drugs ?? []) m.set(d.id, toTitleCase(d.tradenameClean || ''))
    return m
  }, [drugs])

  const items = useMemo(() => failedList.map(change => ({
    id: change.id,
    ...describeFailedChange(change, {
      groupName: groups.find(g => g.id === change.groupId)?.name ?? null,
      drugName: drugNameById.get(change.data?.brandId) || null,
    }),
  })), [failedList, groups, drugNameById])

  // Nothing left to show (retried and saved, or discarded): close.
  useEffect(() => {
    if (isOpen && failedList.length === 0) onClose()
  }, [isOpen, failedList.length, onClose])

  function handleRetry() {
    onClose()
    retryFailedChanges()
  }

  async function handleDiscard() {
    await discardFailedChanges()
    onClose()
  }

  return (
    <>
      <SheetShell isOpen={isOpen} onClose={onClose} ariaLabel="Changes not saved">
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)',
          padding: '0 var(--space-4) var(--space-3)', flexShrink: 0,
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)' }}>
            Changes not saved
          </div>
          <button
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
          <p style={{
            margin: '0 0 var(--space-3)', fontSize: 14, lineHeight: 1.55,
            color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)',
          }}>
            The server did not take {items.length === 1 ? 'this change' : 'these changes'}. Your other changes were saved.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxHeight: '40vh', overflowY: 'auto' }}>
            {items.map(item => (
              <div key={item.id} style={{
                padding: '10px 12px', borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-surface-muted)',
              }}>
                <div dir="ltr" style={{
                  fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-body)', overflowWrap: 'anywhere', textAlign: 'start',
                }}>
                  {item.title}
                </div>
                <div style={{ marginTop: 2, fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
                  {item.reason}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
            <button
              onClick={() => setConfirmOpen(true)}
              style={{ ...BUTTON, backgroundColor: 'var(--color-surface-muted)', color: 'var(--color-danger)' }}
            >
              Discard
            </button>
            <button onClick={handleRetry} style={{ ...BUTTON, backgroundColor: 'var(--color-accent-solid)', color: '#fff' }}>
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
        message="They won't be saved. Your groups go back to how they were last saved."
        confirmLabel="Discard"
        confirmingLabel={'Discarding\u2026'}
        destructive
      />
    </>
  )
}
