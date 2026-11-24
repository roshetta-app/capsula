/**
 * src/components/ui/BellSheets.jsx
 *
 * Step 1c (2026-11-24) — what a bell opens. A signed-in person gets the notices
 * list (NoticesSheet), which has a Settings link into the on/off sheet; a guest
 * has no personal notices, so the bell opens the on/off sheet (NotificationSheet)
 * straight away, exactly as before. Both bells (Home and Topics) use this so they
 * behave the same.
 *
 * Props:
 *   isOpen   boolean   the bell was tapped
 *   onClose  () => void
 */

import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import NoticesSheet from './NoticesSheet'
import NotificationSheet from './NotificationSheet'

export default function BellSheets({ isOpen, onClose }) {
  const { user } = useAuth()
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Closing from either sheet puts the next bell tap back on the list.
  function close() {
    setSettingsOpen(false)
    onClose()
  }

  if (!user) return <NotificationSheet isOpen={isOpen} onClose={onClose} />

  return (
    <>
      <NoticesSheet
        isOpen={isOpen && !settingsOpen}
        onClose={close}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <NotificationSheet isOpen={isOpen && settingsOpen} onClose={close} />
    </>
  )
}
