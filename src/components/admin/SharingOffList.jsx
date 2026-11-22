/**
 * src/components/admin/SharingOffList.jsx
 * 2026-11-22 (step 14.9c-4b): the list of people whose sharing is turned off, on the Reports screen, so that
 * Restore sharing is always reachable, even for someone with no open report. Names and usernames are drawn as
 * plain text only. Hidden entirely while it is still loading; a failed read says so in one line.
 *
 * Props: off ({ status, people }), onChanged.
 */

import TakedownActions from './TakedownActions'
import { TAKEDOWN_WORDS as W } from '../../utils/takedownAdmin'

const plainText = { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }
const heading = { fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', margin: 'var(--space-5) 0 var(--space-1)' }

export default function SharingOffList({ off, onChanged }) {
  if (!off || off.status === 'loading') return null
  if (off.status !== 'ok') {
    if (off.status === 'forbidden' || off.status === 'offline') return null
    return <div role="alert" style={{ marginTop: 'var(--space-5)', fontSize: 13, color: '#DC2626' }}>{W.sectionError}</div>
  }
  return (
    <>
      <h2 style={heading}>{W.sectionTitle}</h2>
      <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-2)' }}>{W.sectionLine}</div>
      {off.people.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{W.sectionEmpty}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {off.people.map(p => (
            <div key={p.profileId} style={{
              display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                <span dir="auto" style={{ ...plainText, fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>{p.name ?? 'No name'}</span>
                {p.handle && <span dir="ltr" style={{ ...plainText, fontSize: 13, color: 'var(--color-text-secondary)' }}>@{p.handle}</span>}
                <span style={{ padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 600, backgroundColor: '#FEE2E2', color: '#991B1B' }}>{W.tag}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-2)' }}>
                <TakedownActions profileId={p.profileId} name={p.name} handle={p.handle} sharingOff={true} onChanged={onChanged} />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
